// src/screens/CheckInScreen.tsx
//
// The weekly check-in: log today's numbers, then see where that leaves you.
//
// AN EVENT, NOT A CARD. This is deliberately not a panel on a home screen. The
// app has two homes, training and food, and neither is THE home — a card would
// have to live on both or pick a winner, and a card seen on every launch but
// actionable once a week becomes wallpaper inside a fortnight. A badge on the
// Profile tab is invisible until it means something.
//
// LOGGING LIVES INSIDE IT. This is the piece worth copying from apps that do
// this well: you do not build a place to log, you make logging the first step
// of the thing the user came for. It also fixes a real gap — four screens write
// body fat as a bare profile scalar with no date, so they contribute nothing to
// the trend the phase detector reads. Everything logged here is dated.
//
// BODY FAT IS ASKED FOR CONDITIONALLY. Weekly weight, but body fat only when a
// fresh reading would decide something: when the trend is near the phase exit,
// or when it has gone stale enough that the detector has gone blind. Asking
// every week for a number a visual estimate cannot resolve week to week trains
// people to skip it, and a skipped question is worse than an unasked one.
//
// IT ENDS IN AN OFFER, NEVER AN ACT. Plan regeneration is a manual round trip
// through an external AI, so the last beat can say a phase is done and offer the
// next one. It cannot quietly rewrite anyone's targets.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
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
import ScaleRuler from '../components/route/ScaleRuler';
import PhaseLine from '../components/route/PhaseLine';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { deriveRoadmap, type Roadmap } from '../utils/roadmap';
import { loadBodyFatReadings } from '../utils/bodyFatHistory';
import { closeCheckIn, logWeighIn } from '../utils/checkIn';
import { phaseIntentFor, phaseEndWeightKg } from '../utils/phaseIntent';
import {
  loadPhaseJourney,
  recordPhaseTransition,
  currentLegIndex,
  phasePosition,
  phasesAt,
} from '../utils/phaseJourney';
import type { GoalsProfile } from '../utils/goalsProfile';

type NavProp = StackNavigationProp<RootStackParamList>;

const LB_PER_KG = 2.2046226218;
const kgToLb = (kg: number) => kg * LB_PER_KG;
const lbToKg = (lb: number) => lb / LB_PER_KG;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Wide enough that the falloff never shows an edge. */
const GLOW = 760;

/** Within this many points of the phase exit, a fresh reading could decide
 *  whether the phase is over, so it is worth asking for. */
const NEAR_EXIT_PCT = 3;
/** Older than this and the detector has gone blind: its trend window is 45
 *  days, so a reading beyond that contributes nothing. */
const STALE_DAYS = 30;

type Step = 'weight' | 'bodyFat' | 'summary' | 'handover';

export default function CheckInScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { globalUnit } = useWeightUnit();
  const imperial = globalUnit === 'lbs';

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bfAgeDays, setBfAgeDays] = useState<number | null>(null);
  const [completedPhases, setCompletedPhases] = useState(0);

  const [step, setStep] = useState<Step>('weight');
  const [weightKg, setWeightKg] = useState(0);
  const [bodyFat, setBodyFat] = useState(0);
  const [loggedBodyFat, setLoggedBodyFat] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([loadGoalsProfile(), loadBodyFatReadings(), loadPhaseJourney()]).then(
        ([p, readings, journey]) => {
        if (cancelled) return;
        setProfile(p);
        setCompletedPhases(journey.length);
        setWeightKg(p?.currentWeightKg ?? 75);
        setBodyFat(Math.round(p?.currentBodyFatPct ?? 20));
        const latest = readings[readings.length - 1];
        setBfAgeDays(
          latest ? Math.floor((Date.now() - new Date(latest.dateISO).getTime()) / DAY_MS) : null,
        );
        setLoading(false);
        },
      );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const roadmap: Roadmap | null = useMemo(
    () => (profile ? deriveRoadmap(profile, profile.routePreference ?? 'balanced') : null),
    [profile],
  );

  /**
   * The phase the user is STANDING IN, and the one after it.
   *
   * Not roadmap.phases[0] and [1]. Those are definitions — opener, block,
   * block, reveal — so phases[0] is always the opener no matter how far along
   * the user is. Reading names from it made the screen say "that's build done"
   * to someone finishing their third trim, and comparing body fat against its
   * exit tested the wrong threshold entirely.
   */
  const legs = roadmap ? phasesAt(roadmap, completedPhases) : { current: undefined, next: undefined };
  const exitPct = legs.current?.exitBodyFatPct;

  /**
   * The body fat step ALWAYS appears. An earlier version hid it unless a
   * reading would change something, which meant the app decided for the user:
   * someone who had just had a scan, or who genuinely looks different, had no
   * way in, and the check-in felt broken when the step vanished.
   *
   * What changes is the pressure, not the presence. When a reading would
   * settle whether the phase is over, it asks and says why. Otherwise it shows
   * the current value and asks whether it still looks right, with skipping as
   * the obvious answer. That is what keeps a weekly visual estimate from being
   * mistaken for a weekly measurement — the trend medians three readings in 45
   * days, so the same guess re-entered weekly would look like consensus.
   */
  const bodyFatDue = useMemo(() => {
    if (profile?.currentBodyFatPct == null) return true;
    if (bfAgeDays == null || bfAgeDays >= STALE_DAYS) return true;
    if (exitPct == null) return false;
    return Math.abs(profile.currentBodyFatPct - exitPct) <= NEAR_EXIT_PCT;
  }, [profile?.currentBodyFatPct, bfAgeDays, exitPct]);

  const totalSteps = 3;
  const stepIndex = step === 'weight' ? 1 : step === 'bodyFat' ? 2 : totalSteps;

  const go = (next: Step) => {
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const submitWeight = async () => {
    await logWeighIn(weightKg, imperial ? 'lbs' : 'kg');
    go('bodyFat');
  };

  const submitBodyFat = async () => {
    // Logged as its own dated reading rather than folded into the weigh-in, so
    // the two can be given minutes apart without one overwriting the other.
    await logWeighIn(weightKg, imperial ? 'lbs' : 'kg', bodyFat, profile?.bodyFatSource);
    setLoggedBodyFat(true);
    go('summary');
  };

  const finish = async () => {
    await closeCheckIn();
    navigation.goBack();
  };

  /**
   * Closes the check-in and hands off to the place plans get built. The app
   * cannot regenerate anything itself — that is a round trip through an
   * external AI — so this can only ever be an offer, never an act.
   */
  /**
   * Recorded on CONFIRMATION, not on detection. The user agreeing is what makes
   * the transition true; the app noticing is a suggestion built on a median of
   * three estimates.
   *
   * BOTH endings record it. Someone who accepts the phase change but defers the
   * rebuild has still moved on, and pretending otherwise would leave the
   * counter stuck and prompt them again next week about a crossing they have
   * already acknowledged.
   */
  const confirmTransition = async () => {
    if (legs.current) {
      await recordPhaseTransition({
        fromKind: legs.current.kind,
        toKind: legs.next?.kind,
        thresholdPct: legs.current.exitBodyFatPct,
        trendPct: profile?.currentBodyFatPct,
      });
    }
    await closeCheckIn();
  };

  const startNextPhase = async () => {
    await confirmTransition();
    navigation.navigate('CreateFlow' as never);
  };

  const confirmWithoutBuilding = async () => {
    await confirmTransition();
    navigation.goBack();
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
        <Text style={styles.empty}>Set your route before checking in.</Text>
      </View>
    );
  }

  const startWeight = profile.currentWeightKg ?? weightKg;
  const weekDeltaKg = weightKg - startWeight;
  const current = loggedBodyFat ? bodyFat : Math.round(profile.currentBodyFatPct ?? bodyFat);
  const phaseName = legs.current?.kind ?? 'your phase';
  const nextPhase = legs.next;

  // NOTE: what the user came INTO this phase at is not recorded anywhere. A
  // phase carries only its exit, so saying "you came in at X" would mean
  // substituting a band edge and presenting it as their number.

  const intent = phaseIntentFor(legs.current?.kind ?? '');
  const phaseEndKg =
    legs.current != null
      ? phaseEndWeightKg(legs.current.kind, weightKg, current, legs.current.exitBodyFatPct)
      : null;

  // Direction depends on the phase you are in: a build ends by going UP through
  // the ceiling, everything else by coming DOWN through the floor.
  const crossed =
    exitPct != null && legs.current != null
      ? legs.current.kind === 'build'
        ? current >= exitPct
        : current <= exitPct
      : false;

  return (
    <View style={styles.container}>
      <View
        style={[styles.glow, { width: GLOW, height: GLOW, left: -GLOW * 0.24, top: -GLOW * 0.24 }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="checkInGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={themeColor} stopOpacity={0.13} />
              <Stop offset="1" stopColor={themeColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#checkInGlow)" />
        </Svg>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={19} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.body, { opacity: fade }]}>
        {/* The counter only applies to the logging steps. Once a phase has
            ended, the position in the journey is the more useful number, and
            the handover is not a step in a check-in at all — it is what the
            check-in found.

            The +1 when crossed matters: the line lights the leg being entered,
            so an eyebrow reading the leg being LEFT put the two in direct
            contradiction — "phase 2 of 8" above a line pointing at the third
            segment. They have to answer the same question. */}
        <Text style={styles.eyebrow}>
          {(step === 'summary' || step === 'handover') && roadmap
            ? `PHASE ${
                phasePosition(roadmap, completedPhases + (crossed ? 1 : 0)).index
              } OF ${phasePosition(roadmap, completedPhases).total}`
            : `CHECK-IN \u00b7 ${stepIndex} OF ${totalSteps}`}
        </Text>

        {step === 'weight' ? (
          <>
            <Text style={styles.headline}>What do you{'\n'}weigh today?</Text>
            <Text style={styles.lede}>
              {profile.currentWeightKg
                ? `Last logged at ${
                    imperial
                      ? `${Math.round(kgToLb(profile.currentWeightKg))} lbs`
                      : `${profile.currentWeightKg.toFixed(1)} kg`
                  }.`
                : 'Your first weigh-in.'}
            </Text>

            <View style={styles.bigNum}>
              <Text style={styles.bigValue}>
                {imperial ? Math.round(kgToLb(weightKg)) : weightKg.toFixed(1)}
              </Text>
              <Text style={styles.bigUnit}>{imperial ? 'lbs' : 'kg'}</Text>
            </View>

            <ScaleRuler
              value={imperial ? Math.round(kgToLb(weightKg)) : Math.round(weightKg * 10) / 10}
              min={imperial ? 77 : 35}
              max={imperial ? 440 : 200}
              step={imperial ? 1 : 0.1}
              tickStep={imperial ? 1 : 0.5}
              pxPerUnit={imperial ? 6 : 13}
              isMajor={(v) =>
                Math.round(v) % (imperial ? 10 : 5) === 0 && Math.abs(v - Math.round(v)) < 0.01
              }
              formatLabel={(v) => String(Math.round(v))}
              onChange={(next) => setWeightKg(imperial ? lbToKg(next) : next)}
              themeColor={themeColor}
            />
          </>
        ) : null}

        {step === 'bodyFat' ? (
          <>
            <Text style={styles.headline}>
              {bodyFatDue ? `Worth checking${'\n'}your body fat.` : `Still about${'\n'}right?`}
            </Text>
            <Text style={styles.lede}>
              {bodyFatDue
                ? exitPct != null && profile.currentBodyFatPct != null
                  ? `Your trend is close to ${Math.round(exitPct)}%, where this phase ends. One fresh reading decides whether you move on.`
                  : 'The app needs a recent reading before it can tell when this phase is done.'
                : bfAgeDays != null
                  ? `Last estimated ${bfAgeDays === 0 ? 'today' : bfAgeDays === 1 ? 'yesterday' : `${bfAgeDays} days ago`}. Change it if it looks off, otherwise skip.`
                  : 'Change it if it looks off, otherwise skip.'}
            </Text>

            <View style={styles.bigNum}>
              <Text style={styles.bigValue}>{bodyFat}</Text>
              <Text style={styles.bigUnit}>%</Text>
            </View>

            <ScaleRuler
              value={bodyFat}
              min={5}
              max={45}
              step={1}
              pxPerUnit={13}
              isMajor={(v) => Math.round(v) % 5 === 0}
              formatLabel={(v) => String(Math.round(v))}
              onChange={(next) => setBodyFat(next)}
              themeColor={themeColor}
            />


          </>
        ) : null}

        {step === 'summary' ? (
          <>
            <Text style={styles.headline}>
              {crossed ? `That's ${phaseName} done.` : `Still in ${phaseName}.`}
            </Text>
            <Text style={styles.lede}>
              {crossed
                ? finishedSentence(current, nextPhase?.kind)
                : deltaSentence(weekDeltaKg, imperial)}
            </Text>

            {/* What this phase is asking of them, in the number they actually
                measure. Only while they are still in it: once it is over the
                instruction is the next phase's, and that is the handover's
                job. */}
            {!crossed ? (
              <View style={[styles.intent, { borderLeftColor: themeColor }]}>
                <View style={styles.intentHead}>
                  <Text style={styles.intentKey}>THIS PHASE</Text>
                  {/* The explanation only needs reading once, so it lives
                      behind this rather than on screen every week. What stays
                      is the instruction and the number to check it against. */}
                  <TouchableOpacity
                    onPress={() => setIntentOpen(true)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Why this phase works this way"
                  >
                    <Ionicons name="information-circle-outline" size={16} color="#4b4b52" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.intentTitle}>{intent.title}</Text>
                {phaseEndKg != null ? (
                  <Text style={styles.intentScale}>
                    {'Ends around '}
                    <Text style={styles.intentScaleStrong}>
                      {imperial
                        ? `${Math.round(kgToLb(phaseEndKg))} lbs`
                        : `${phaseEndKg.toFixed(1)} kg`}
                    </Text>
                    {legs.current ? `, at ${Math.round(legs.current.exitBodyFatPct)}%` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.stats}>
              <Stat
                label="THIS WEEK"
                value={`${weekDeltaKg >= 0 ? '+' : ''}${
                  imperial ? Math.round(kgToLb(weekDeltaKg)) : weekDeltaKg.toFixed(1)
                } ${imperial ? 'lbs' : 'kg'}`}
                accent={themeColor}
              />
              <Stat label="BODY FAT" value={`${current}%`} />
              {crossed ? (
                <Stat label="NEXT" value={nextPhase ? cap(nextPhase.kind) : 'Done'} />
              ) : (
                <Stat label="SCALE" value={intent.word} accent={themeColor} />
              )}
            </View>

            {roadmap ? (
              <View style={styles.line}>
                <PhaseLine
                  profile={profile}
                  roadmap={roadmap}
                  // Counted from the journey log, so a user on their third
                  // trim lights their third trim. Deriving it from the phase
                  // kind lit every trim in the roadmap at once.
                  legIndex={
                    currentLegIndex(roadmap, completedPhases) + (crossed ? 1 : 0)
                  }
                  color={themeColor}
                  animate
                />
              </View>
            ) : null}
          </>
        ) : null}
        {step === 'handover' ? (
          <>
            <Text style={styles.headline}>
              {nextPhase ? `Now you${'\u2019'}re on a ${nextPhase.kind}.` : 'One thing changes.'}
            </Text>
            <Text style={styles.lede}>
              {handoverSentence(legs.current?.kind, nextPhase?.kind)}
            </Text>

            {/* Ranked, because they are not equally urgent. Calories move by
                hundreds between phases; the training prompt only shifts RIR
                and cardio guidance, and per-muscle set targets barely move.
                Telling the user both are equally important would be false and
                would double the work they think they owe. */}
            <View style={styles.handoverList}>
              <View style={styles.handoverItem}>
                <View style={[styles.handoverDot, { backgroundColor: themeColor }]} />
                <View style={styles.handoverBody}>
                  <Text style={styles.handoverTitle}>Rebuild your meal plan</Text>
                  <Text style={styles.handoverSub}>
                    Your calories and your protein target both move with the phase. This is
                    the one that matters.
                  </Text>
                </View>
              </View>
              <View style={styles.handoverItem}>
                <View style={styles.handoverDotQuiet} />
                <View style={styles.handoverBody}>
                  <Text style={styles.handoverTitleQuiet}>Your training can wait</Text>
                  <Text style={styles.handoverSub}>
                    The sets stay much the same. Rebuilding it is better, not urgent, and
                    finishing your current week first costs you nothing.
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : null}
      </Animated.View>

      <Modal
        visible={intentOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIntentOpen(false)}
      >
        <View style={styles.scrim}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.grab} />
            <Text style={styles.sheetTitle}>{intent.title}</Text>
            <Text style={styles.sheetBody}>{intent.detail}</Text>
            <TouchableOpacity
              style={styles.sheetBtn}
              onPress={() => setIntentOpen(false)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.sheetBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
        {step === 'handover' ? (
          <>
            <TouchableOpacity
              style={[styles.ctaFill, { backgroundColor: themeColor }]}
              onPress={startNextPhase}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.ctaFillText}>Build my new meal plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipWeek}
              onPress={confirmWithoutBuilding}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>I&rsquo;ll do it later</Text>
            </TouchableOpacity>
          </>
        ) : step === 'summary' ? (
          crossed ? (
            <>
              <TouchableOpacity
                style={[styles.ctaFill, { backgroundColor: themeColor }]}
                onPress={() => go('handover')}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={styles.ctaFillText}>Start the next phase</Text>
              </TouchableOpacity>
              {/* An out, because rebuilding a plan is a round trip through an
                  external AI and nobody finishing a phase on a Tuesday night
                  is necessarily ready for that. Without it the only escape is
                  the close button, which reads as abandoning something. */}
              <TouchableOpacity
                style={styles.skipWeek}
                onPress={finish}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.skipText}>Not now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.cta} onPress={finish} activeOpacity={0.7}>
              <Text style={[styles.ctaText, { color: themeColor }]}>Done</Text>
              <Ionicons name="chevron-forward" size={16} color={themeColor} />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[styles.ctaFill, { backgroundColor: themeColor }]}
            onPress={step === 'weight' ? submitWeight : submitBodyFat}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.ctaFillText}>
              {step === 'weight'
                ? `Log ${imperial ? `${Math.round(kgToLb(weightKg))} lbs` : `${weightKg.toFixed(1)} kg`}`
                : bodyFatDue
                  ? `Log ${bodyFat}%`
                  : `Yes, still ${bodyFat}%`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Standing the step down is the pressure valve. Without it the only
            way out is the close button, which reads as unfinished. */}
        {step === 'weight' || step === 'bodyFat' ? (
          <TouchableOpacity
            style={styles.skipWeek}
            onPress={step === 'weight' ? finish : () => go('summary')}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>
              {step === 'weight' ? 'Skip this week' : 'Skip'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function handoverSentence(fromKind?: string, toKind?: string): string {
  if (!toKind) return 'Your targets change from here.';
  const eating =
    toKind === 'trim'
      ? 'You will be eating below maintenance now, so your calories come down'
      : toKind === 'build'
        ? 'You will be eating above maintenance now, so your calories go up'
        : 'Your calories move with it';
  return `${fromKind ? `${cap(fromKind)} is behind you. ` : ''}${eating}, and your protein target moves with them.`;
}

function finishedSentence(current: number, nextKind?: string): string {
  return nextKind
    ? `You're at ${current}%. Next is a ${nextKind}, and your targets change with it.`
    : `You're at ${current}%. That was the last phase.`;
}

function deltaSentence(deltaKg: number, imperial: boolean): string {
  const moved = Math.abs(deltaKg) >= 0.05;
  const amount = imperial
    ? `${Math.abs(Math.round(kgToLb(deltaKg)))} lbs`
    : `${Math.abs(deltaKg).toFixed(1)} kg`;
  // Just the week. The distance to the next phase used to live here too, but
  // the block below now states the phase's exit and the stat row carries the
  // current body fat, so saying it a third time was most of the clutter.
  return moved
    ? `${deltaKg > 0 ? 'Up' : 'Down'} ${amount} since your last check-in.`
    : 'Holding steady since your last check-in.';
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statKey}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  empty: { fontSize: 14, lineHeight: 21, color: '#71717a', textAlign: 'center' },
  glow: { position: 'absolute' },

  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 20 },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.9, color: '#5b5b62' },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 36,
    marginTop: 9,
  },
  lede: { fontSize: 13, lineHeight: 20, color: '#6b6b70', marginTop: 10 },

  bigNum: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 26 },
  bigValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -2.4,
    fontVariant: ['tabular-nums'],
  },
  bigUnit: { fontSize: 16, fontWeight: '600', color: '#5b5b62' },

  intent: { borderLeftWidth: 2, paddingLeft: 13, marginTop: 22 },
  intentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  intentKey: { fontSize: 8, fontWeight: '700', letterSpacing: 1.3, color: '#4b4b52' },
  intentTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginTop: 5 },
  intentScale: { fontSize: 12.5, lineHeight: 18, color: '#8e8e93', marginTop: 8 },
  intentScaleStrong: { color: '#e4e4e7', fontWeight: '600' },

  stats: { flexDirection: 'row', gap: 8, marginTop: 22 },

  handoverList: { marginTop: 24, gap: 16 },
  handoverItem: { flexDirection: 'row', gap: 11 },
  handoverDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  handoverDotQuiet: { width: 7, height: 7, borderRadius: 4, marginTop: 6, backgroundColor: '#2f2f35' },
  handoverBody: { flex: 1 },
  handoverTitle: { fontSize: 14.5, fontWeight: '600', color: '#ffffff' },
  handoverTitleQuiet: { fontSize: 14.5, fontWeight: '600', color: '#8e8e93' },
  handoverSub: { fontSize: 12.5, lineHeight: 18, color: '#6b6b70', marginTop: 3 },
  stat: {
    flex: 1,
    backgroundColor: '#0f0f11',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c1c20',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statKey: { fontSize: 8, fontWeight: '700', letterSpacing: 1, color: '#4b4b52' },
  statValue: { fontSize: 13.5, fontWeight: '700', color: '#e4e4e7', marginTop: 4 },

  line: { marginTop: 22, marginHorizontal: -6 },

  skipWeek: { height: 40, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 12.5, fontWeight: '500', color: '#5b5b62' },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  sheetBody: { fontSize: 14, lineHeight: 22, color: '#b4b4b8', marginBottom: 18 },
  sheetBtn: { height: 50, borderRadius: 13, backgroundColor: '#1c1c20', alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontSize: 14, fontWeight: '600', color: '#d4d4d8' },

  ctaBar: { paddingHorizontal: 22, paddingTop: 8 },
  ctaFill: { height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ctaFillText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
  cta: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaText: { fontSize: 15.5, fontWeight: '600' },
});