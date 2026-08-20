// src/screens/PhasePositionScreen.tsx
//
// "Where are you right now?" — the manual override for which phase of the
// roadmap the user is standing in.
//
// WHY IT EXISTS. The app moves people forward by watching their body-fat trend
// cross a threshold, which is a median of three estimates and can be wrong in
// both directions: it can miss a phase someone genuinely finished, and it can
// advance someone who had one odd scale morning. Without a way in, a wrong
// position is permanent and every downstream number — the phase name, the
// volume tier, the calorie target — is wrong with it.
//
// THE LIST IS THE POSITION, NOT AN INDEX. phaseJourney stores a COUNT of
// confirmed transitions and never a pointer, for the reason in that file's
// header: an index points into a list that can change shape underneath it.
// So "put me on phase 6" is transitions being written, and moving BACKWARD
// genuinely removes history. The confirmation says so rather than dressing it
// up as setting a value.
//
// WHY A PUSHED SCREEN AND NOT A SHEET. Ten phases plus the explanation of what
// tapping one does is more than a sheet should hold, and this is somewhere
// people come back to when something has gone wrong — it deserves a back
// button and a title rather than a dismissable overlay.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
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
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import { deriveRoadmap } from '../utils/roadmap';
import {
  loadPhaseJourney,
  expandPhases,
  setCompletedPhaseCount,
  type ExpandedPhase,
} from '../utils/phaseJourney';
import { clearCrossingDismissals } from '../utils/phaseTransition';
import type { GoalsProfile } from '../utils/goalsProfile';

type NavProp = StackNavigationProp<RootStackParamList>;

const GLOW = 760;

const PHASE_NAME: Record<string, string> = {
  recomp: 'Recomp',
  build: 'Build',
  trim: 'Trim',
  reveal: 'The reveal',
};

export default function PhasePositionScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([loadGoalsProfile(), loadPhaseJourney()]).then(([p, journey]) => {
        if (cancelled) return;
        setProfile(p);
        setCompleted(journey.length);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  const roadmap = profile
    ? deriveRoadmap(profile, profile.routePreference ?? 'balanced')
    : null;

  if (!profile || !roadmap) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.empty}>Set your route to see your phases here.</Text>
      </View>
    );
  }

  const all: ExpandedPhase[] = expandPhases(roadmap);
  const current = Math.min(completed, all.length - 1);

  const confirm = async () => {
    if (pending == null || saving) return;
    setSaving(true);
    try {
      await setCompletedPhaseCount(pending, all);
      // Going back returns the user to a threshold they have already been
      // prompted about and dismissed. Without clearing, the app stays silent
      // on the very crossing it is now waiting for again.
      await clearCrossingDismissals();
      setCompleted(pending);
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const label = (p: ExpandedPhase) => PHASE_NAME[p.kind] ?? p.kind;

  const rangeFor = (i: number) => {
    const from = i === 0 ? profile.currentBodyFatPct : all[i - 1]?.exitBodyFatPct;
    const to = all[i].exitBodyFatPct;
    return from == null ? `to ${Math.round(to)}%` : `${Math.round(from)}% → ${Math.round(to)}%`;
  };

  const phaseRow = (i: number) => {
    const p = all[i];
    const done = i < current;
    const isNow = i === current;

    if (isNow) {
      return (
        <View key={i} style={[styles.nowBlock, { backgroundColor: `${themeColor}14` }]}>
          <Text style={[styles.nowNum, { color: themeColor }]}>{i + 1}</Text>
          <View style={styles.body}>
            <Text style={styles.nowTitle}>{label(p)}</Text>
            <Text style={styles.nowHint}>
              {rangeFor(i)} · {p.estMonths[0]} to {p.estMonths[1]} months
            </Text>
          </View>
          <View style={[styles.tag, { borderColor: `${themeColor}4d` }]}>
            <Text style={[styles.tagText, { color: themeColor }]}>NOW</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={i}
        style={styles.row}
        onPress={() => setPending(i)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Set ${label(p)}, phase ${i + 1}, as your current phase`}
      >
        <Text style={styles.num}>{i + 1}</Text>
        <View style={styles.body}>
          <Text style={[styles.title, done && styles.titleDone]}>{label(p)}</Text>
          <Text style={styles.hint}>{rangeFor(i)}</Text>
        </View>
        {done ? (
          <Ionicons name="checkmark" size={15} color="#3f3f46" />
        ) : (
          // "Set as current" rather than a chevron: a chevron promises
          // navigation, and these perform an action.
          <Text style={styles.set}>Set as current</Text>
        )}
      </TouchableOpacity>
    );
  };

  // EVERY remaining phase, not a window. An earlier version capped the list a
  // few phases past the current one, reasoning that the rest is the same two
  // blocks repeating — but the footnote says "10 phases in total" directly
  // beneath a list that stopped at 6, so the screen contradicted itself, and
  // the phases past the cap could not be selected at all. On a screen whose
  // entire job is setting any position, hiding positions is the one thing it
  // must not do.
  const ahead = all.length;
  const forward = pending != null && pending > current;
  const skipped = pending != null ? Math.abs(pending - current) : 0;

  return (
    <View style={styles.container}>
      <View
        style={[styles.glow, { width: GLOW, height: GLOW, left: -GLOW * 0.24, top: -GLOW * 0.22 }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="phasePosGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={themeColor} stopOpacity={0.13} />
              <Stop offset="1" stopColor={themeColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#phasePosGlow)" />
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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h}>Where are you{'\n'}right now?</Text>
        <Text style={styles.lede}>
          The app watches your body fat trend and offers to move you on. Set it yourself if it has
          got it wrong.
        </Text>

        {/* Three groups rather than one list. Ten rows of Build, Trim, Build,
            Trim is a wall, and the grouping is what lets someone see at a
            glance that most of the journey is the same two blocks repeating. */}
        {current > 0 ? (
          <>
            <Text style={styles.group}>DONE</Text>
            {Array.from({ length: current }, (_, i) => phaseRow(i))}
          </>
        ) : null}

        <Text style={styles.group}>NOW</Text>
        {phaseRow(current)}

        {ahead > current + 1 ? (
          <>
            <Text style={styles.group}>STILL TO COME</Text>
            {Array.from({ length: ahead - current - 1 }, (_, i) => phaseRow(current + 1 + i))}
          </>
        ) : null}

        <Text style={styles.foot}>
          {all.length} phases in total. They repeat: build up to the top of your band, trim back to
          the bottom, then a last cut to your goal.
        </Text>
      </ScrollView>

      {/* Nothing happens on the tap itself. Both directions edit a record the
          app otherwise builds from evidence, so both confirm — but they say
          different things, because they do different things. */}
      <Modal visible={pending != null} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <Pressable style={styles.scrim} onPress={() => setPending(null)} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          {/* SCROLLABLE — a fixed sheet loses its bottom on a small phone,
              and the bottom is where the source line and the dismiss sit. The
              grab handle stays outside the scroll so it does not travel. */}
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>
              {forward ? `Move to phase ${(pending ?? 0) + 1}?` : `Go back to phase ${(pending ?? 0) + 1}?`}
            </Text>
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
            {forward
              ? skipped === 1
                ? `That marks ${label(all[current])} as finished.`
                : `That marks ${skipped} phases as finished, from ${label(all[current])} onward.`
              : `You are on phase ${current + 1}. This puts you back on ${label(
                  all[pending ?? 0],
                )}.`}
          </Text>

          {forward ? null : (
            <View style={styles.warn}>
              <View style={styles.warnDot} />
              <Text style={styles.warnText}>
                <Text style={styles.warnLead}>This removes history. </Text>
                {
                  'The app records the phases you finish rather than storing a number, so going back deletes those records.'
                }
              </Text>
            </View>
          )}

          </ScrollView>
          <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.confirm, { backgroundColor: themeColor }]}
            onPress={confirm}
            disabled={saving}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#06323a" size="small" />
            ) : (
              <Text style={styles.confirmText}>
                {forward ? `Yes, I am on phase ${(pending ?? 0) + 1}` : `Move back to phase ${(pending ?? 0) + 1}`}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancel}
            onPress={() => setPending(null)}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  h: { fontSize: 30, fontWeight: '700', color: '#ffffff', letterSpacing: -0.8, lineHeight: 36, marginTop: 18 },
  lede: { fontSize: 14.5, lineHeight: 21, color: '#71717a', marginTop: 9 },

  group: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.8, color: '#4b4b52', marginTop: 22, marginBottom: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#17171a',
  },
  num: { width: 20, fontSize: 12, color: '#4b4b52', textAlign: 'right' },
  body: { flex: 1 },
  title: { fontSize: 15.5, fontWeight: '600', color: '#8e8e93' },
  titleDone: { color: '#5b5b62' },
  hint: { fontSize: 12, color: '#4b4b52', marginTop: 2 },
  set: { fontSize: 12.5, fontWeight: '600', color: '#5b5b62' },

  // A block, not a highlighted row: it is the one thing here not asking to be
  // tapped, so it should not look like the things that are.
  nowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 11,
  },
  nowNum: { width: 20, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  nowTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  nowHint: { fontSize: 12.5, color: '#8e8e93', marginTop: 3 },
  tag: { borderWidth: 1, borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  tagText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },

  foot: { fontSize: 12.5, lineHeight: 19, color: '#4b4b52', marginTop: 26 },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.66)' },
  /**
   * THE CAP BELONGS HERE, not on the ScrollView inside.
   *
   * A maxHeight on the scroll resolves against this sheet, and this sheet is
   * sized by its own content — so the percentage depended on the thing it was
   * meant to constrain. Short content inflated the sheet toward the top of the
   * screen and the footer got clipped inside the scrollable area.
   *
   * Capping here and laying the sheet out as a column handles both: short
   * content hugs, long content stops and scrolls under a pinned footer.
   */
  sheet: {
    backgroundColor: '#111114',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    paddingTop: 12,
    maxHeight: '82%',
    flexDirection: 'column',
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 16, flexShrink: 0 },
  /**
   * flex shrink with minHeight: 0 — the minHeight is the part that is easy to
   * miss. Without it a flex child will not shrink below its content height, so
   * the ScrollView never engages and the overflow is simply clipped.
   */
  /**
   * PADDING GOES ON contentContainerStyle, NOT style.
   *
   * A ScrollView's `style` is the viewport; padding there does not inset the
   * scrolling content, which is why the first version had text running to the
   * screen edge.
   *
   * flexShrink with minHeight: 0 is what lets the scroll engage at all — a flex
   * child will not shrink below its content height without it, so the overflow
   * is clipped rather than scrolled.
   *
   * Named sheetScrollArea rather than sheetBody because sheetBody is already a
   * TEXT style in these files, and two keys of the same name in one StyleSheet
   * silently resolve to whichever came last.
   */
  sheetScrollArea: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  sheetScrollContent: { paddingHorizontal: 20, paddingBottom: 10 },
  /**
   * The title sits OUTSIDE the scroll. Scrolling a long sheet used to carry the
   * heading away, leaving the reader mid-paragraph with nothing saying what it
   * was about.
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
  sheetTitle: { fontSize: 21, fontWeight: '700', color: '#ffffff', letterSpacing: -0.4 },
  sheetBody: { fontSize: 14, lineHeight: 21, color: '#8e8e93', marginTop: 8 },

  warn: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 14 },
  warnDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#f0b429', marginTop: 7 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#8e8e93' },
  warnLead: { color: '#f0b429', fontWeight: '600' },

  confirm: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#06323a' },
  cancel: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 14, color: '#71717a' },
});