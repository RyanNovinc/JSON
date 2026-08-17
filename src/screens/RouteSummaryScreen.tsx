// src/screens/RouteSummaryScreen.tsx
//
// What the user sees when they open their route again, rather than setting it
// for the first time.
//
// EVERY ROW IS A DOOR. Tapping one opens RouteScreen at the beat that set that
// value, with `single` so the CTA reads Done and returns here instead of
// walking the remaining beats. Changing your height should cost one tap in and
// one tap out, not seven screens.
//
// THE HEADER IS A SENTENCE, not a dashboard. The rows below already list every
// number, so restating them at display size is repetition. A sentence answers
// "what am I doing again" in one read, which is the actual question someone has
// when they come back to this weeks later.
//
// NOTHING IS EDITABLE IN PLACE. Every value has an instrument behind it in the
// flow, with its own bands, warnings and evidence sheets. A text field here
// would be a second, worse way to set the same number.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { deriveRoadmap, type Roadmap } from '../utils/roadmap';
import { ROUTE_OPTIONS } from './RouteScreen';
import { loadPhaseJourney, expandPhases } from '../utils/phaseJourney';
import { sharePlanPdfFor } from '../utils/planPdf';
import type { GoalsProfile, TrainingState } from '../utils/goalsProfile';

type NavProp = StackNavigationProp<RootStackParamList>;

const LB_PER_KG = 2.2046226218;
const kgToLb = (kg: number) => kg * LB_PER_KG;
const feetInches = (cm: number) => {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
};

/** Wide enough that the falloff never shows an edge. */
const GLOW = 760;

interface Row {
  label: string;
  value: string;
  /** Which beat of RouteScreen sets this. */
  beat: number;
}

const PHASE_NAME: Record<string, string> = {
  recomp: 'Recomp',
  build: 'Build',
  trim: 'Trim',
  reveal: 'The reveal',
};

/** Matches the beat 5 wording rather than the raw enum. */
const TRAINING_LABEL: Record<TrainingState, string> = {
  new: 'New to lifting',
  consistent: 'Training consistently',
  returning: 'Coming back',
  advanced: 'Advanced',
};

/** The display name of whichever route the profile currently holds. */
function currentRouteName(profile: GoalsProfile): string {
  return (
    ROUTE_OPTIONS.find((o) => o.id === (profile.routePreference ?? 'balanced'))?.name ?? 'Balanced'
  );
}

export default function RouteSummaryScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { globalUnit } = useWeightUnit();
  const imperial = globalUnit === 'lbs';

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedPhases, setCompletedPhases] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Reloads on focus so a value changed in the flow is current the moment the
  // user lands back here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([loadGoalsProfile(), loadPhaseJourney()]).then(([p, journey]) => {
        if (cancelled) return;
        setProfile(p);
        setCompletedPhases(journey.length);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const edit = (beat: number) => navigation.navigate('Route', { startBeat: beat, single: true });

  /**
   * Handed to the share sheet rather than saved directly, because that one step
   * covers save-to-files, print and AirDrop instead of three integrations.
   */
  const exportPdf = async () => {
    if (!profile || exporting) return;
    setExporting(true);
    try {
      // Derived here rather than closed over: roadmap and routeName are
      // declared after this screen's early returns, so referencing them from a
      // handler defined above would throw the moment the button is tapped.
      await sharePlanPdfFor(profile, completedPhases, currentRouteName(profile), imperial);
    } catch {
      Alert.alert('Could not create the file', 'Try again in a moment.');
    } finally {
      setExporting(false);
    }
  };

  const restart = () => {
    Alert.alert(
      'Start the route again?',
      'You will walk every question from the top. Your current answers stay as the starting values.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start again', onPress: () => navigation.navigate('Route', { startBeat: 1 }) },
      ],
    );
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
        <Text style={styles.empty}>Set your route to see it here.</Text>
      </View>
    );
  }

  const roadmap: Roadmap | null = deriveRoadmap(profile, profile.routePreference ?? 'balanced');
  const routeName = currentRouteName(profile);

  const weight = (kg?: number) =>
    kg == null ? 'Not set' : imperial ? `${Math.round(kgToLb(kg))} lbs` : `${kg.toFixed(1)} kg`;

  // Beat numbers must match RouteScreen's order: weight 1, sex 2, body fat 3,
  // height 4, training 5, peak 6, goal weight 7, goal body fat 8, route 9.
  // These were stale after the beats were reordered — tapping Height opened the
  // sex beat — so treat this list as part of that order, not as a description
  // of it.
  const about: Row[] = [
    { label: 'Weight', value: weight(profile.currentWeightKg), beat: 1 },
    {
      label: 'Sex',
      value: profile.sex === 'female' ? 'Female' : profile.sex === 'male' ? 'Male' : 'Not set',
      beat: 2,
    },
    {
      label: 'Body fat',
      value: profile.currentBodyFatPct == null ? 'Not set' : `${Math.round(profile.currentBodyFatPct)}%`,
      beat: 3,
    },
    {
      label: 'Height',
      value:
        profile.heightCm == null
          ? 'Not set'
          : imperial
            ? feetInches(profile.heightCm)
            : `${Math.round(profile.heightCm)} cm`,
      beat: 4,
    },
    { label: 'Training', value: TRAINING_LABEL[profile.trainingState] ?? 'Not set', beat: 5 },
  ];

  // Only a returning lifter has a peak, and it is the only beat in the flow
  // that is conditional, so the row has to be too.
  if (profile.trainingState === 'returning') {
    about.push({
      label: 'Previous peak',
      value: profile.peakWeightKg == null ? 'Not set' : weight(profile.peakWeightKg),
      beat: 6,
    });
  }

  const goal: Row[] = [
    { label: 'Goal weight', value: weight(profile.goalWeightKg), beat: 7 },
    {
      label: 'Goal body fat',
      value: profile.goalBodyFatPct == null ? 'Not set' : `${Math.round(profile.goalBodyFatPct)}%`,
      beat: 8,
    },
  ];

  const how: Row[] = [{ label: 'Route', value: routeName, beat: 9 }];

  const goalWeightText =
    profile.goalWeightKg == null
      ? 'your goal'
      : imperial
        ? `${Math.round(kgToLb(profile.goalWeightKg))} lbs`
        : `${Math.round(profile.goalWeightKg)} kg`;

  const section = (title: string, rows: Row[]) => (
    <>
      <Text style={styles.sectionHead}>{title}</Text>
      <View style={styles.card}>
        {rows.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.row, i === rows.length - 1 && styles.rowLast]}
            onPress={() => edit(r.beat)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}, ${r.value}`}
          >
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={[styles.rowValue, r.value === 'Not set' && styles.rowValueUnset]}>
              {r.value}
            </Text>
            <Ionicons name="chevron-forward" size={15} color="#3f3f46" />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View
        style={[styles.glow, { width: GLOW, height: GLOW, left: -GLOW * 0.24, top: -GLOW * 0.22 }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="summaryGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={themeColor} stopOpacity={0.13} />
              <Stop offset="1" stopColor={themeColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#summaryGlow)" />
        </Svg>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>YOUR ROUTE</Text>
        <Text style={styles.headline}>
          You are heading for{'\n'}
          <Text style={styles.headlineStrong}>
            {goalWeightText} at {profile.goalBodyFatPct == null ? '\u2014' : Math.round(profile.goalBodyFatPct)}%
          </Text>
          ,{'\n'}the {routeName.toLowerCase()} way.
        </Text>
        {roadmap ? (
          <Text style={styles.meta}>
            {roadmap.estYears[0]} to {roadmap.estYears[1]} yr
          </Text>
        ) : null}

        {/* The estimate directly above is the reason this belongs here. Without
            it, a goal past the drug-free ceiling gets a straight-faced multi
            year number and nothing else — the app knowing something it never
            says. 'borderline' is deliberately silent: warning on every
            ambitious goal buries the case that matters. */}
        {roadmap?.plausibility === 'beyond' ? (
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

        {/* WHERE YOU ARE sits ABOVE the questionnaire sections because it is
            the only thing on this screen that is not an answer the user gave —
            it is where they have got to, which the app infers and can get
            wrong. Everything below is a value; this is a position.

            A door, like every other row here, rather than inline forward and
            back buttons: the repair case is "I am three phases out", and that
            is one tap on the list instead of six on a stepper. */}
        {roadmap ? (
          <>
            <Text style={styles.sectionHead}>WHERE YOU ARE</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('PhasePosition')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Change which phase you are on"
            >
              {(() => {
                const all = expandPhases(roadmap);
                const i = Math.min(completedPhases, all.length - 1);
                const cur = all[i];
                const from =
                  i === 0 ? profile.currentBodyFatPct : all[i - 1]?.exitBodyFatPct;
                return (
                  <>
                    <View style={styles.phaseRow}>
                      <View style={styles.phaseBody}>
                        <Text style={styles.phaseTitle}>
                          {PHASE_NAME[cur.kind] ?? cur.kind}
                        </Text>
                        <Text style={styles.phaseHint}>
                          Phase {i + 1} of {all.length}
                          {from != null
                            ? ` · ${Math.round(from)}% → ${Math.round(cur.exitBodyFatPct)}%`
                            : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color="#3f3f46" />
                    </View>

                    {/* Pips rather than a bar: the journey is a fixed number of
                        discrete phases, and a continuous bar would imply the
                        app knows how far through the current one they are. */}
                    <View style={styles.pips}>
                      {all.map((_, n) => (
                        <View
                          key={n}
                          style={[
                            styles.pip,
                            n < i && styles.pipDone,
                            n === i && { backgroundColor: themeColor },
                          ]}
                        />
                      ))}
                    </View>
                  </>
                );
              })()}
            </TouchableOpacity>
          </>
        ) : null}

        {section('ABOUT YOU', about)}
        {section('YOUR GOAL', goal)}
        {section('HOW YOU GET THERE', how)}

        <TouchableOpacity
          style={styles.export}
          onPress={exportPdf}
          disabled={exporting}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          {exporting ? (
            <ActivityIndicator color="#71717a" size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={15} color={themeColor} />
              <Text style={[styles.exportText, { color: themeColor }]}>Save or print my plan</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restart}
          onPress={restart}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Text style={styles.restartText}>Start the route again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  empty: { fontSize: 14, lineHeight: 21, color: '#71717a', textAlign: 'center' },
  glow: { position: 'absolute' },

  topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4 },
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

  scroll: { paddingHorizontal: 20 },
  eyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2, color: '#5b5b62', textAlign: 'center', marginTop: 10 },
  headline: {
    fontSize: 23,
    fontWeight: '600',
    color: '#8e8e93',
    letterSpacing: -0.4,
    lineHeight: 31,
    textAlign: 'center',
    marginTop: 12,
  },
  headlineStrong: { color: '#ffffff', fontWeight: '700' },
  meta: { fontSize: 12.5, color: '#5b5b62', textAlign: 'center', marginTop: 10 },

  // Same treatment as the lock screen's version, so the two read as one voice.
  limitRow: { flexDirection: 'row', gap: 9, marginTop: 16, alignItems: 'flex-start' },
  limitDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#f0b429', marginTop: 7 },
  limitText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#8e8e93' },
  limitLead: { color: '#f0b429', fontWeight: '600' },

  sectionHead: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.8, color: '#4b4b52', marginTop: 26, marginBottom: 8 },

  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  phaseBody: { flex: 1 },
  phaseTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  phaseHint: { fontSize: 12.5, color: '#5b5b62', marginTop: 3 },
  pips: { flexDirection: 'row', gap: 4, paddingHorizontal: 15, paddingBottom: 13 },
  pip: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#1f1f23' },
  pipDone: { backgroundColor: '#3f3f46' },
  card: {
    backgroundColor: '#0f0f11',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c1c20',
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#17171a',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontSize: 13.5, color: '#8e8e93' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#e4e4e7' },
  rowValueUnset: { color: '#4b4b52', fontWeight: '500' },

  export: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 50,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    marginTop: 26,
  },
  exportText: { fontSize: 13, fontWeight: '600' },
  restart: {
    height: 50,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  restartText: { fontSize: 13, fontWeight: '500', color: '#71717a' },
});