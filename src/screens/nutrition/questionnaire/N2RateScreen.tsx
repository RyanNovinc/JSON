// src/screens/nutrition/questionnaire/N2RateScreen.tsx
//
// How fast the user wants to lose. CUT ONLY — this screen never renders for a
// recomp or a build, and the routing that leads here has to skip it for them.
//
// ── WHY ONLY A CUT ──────────────────────────────────────────────────────────
//
//   RECOMP  — weight is held by definition. There is no rate to pick, so the
//             explanation lives on the targets screen instead (PhaseTargetNote).
//   GAIN    — muscle builds at a rate the body sets and food does not raise
//             it. Helms 2023 randomised trained lifters to maintenance, a 5%
//             surplus and a 15% surplus: faster weight gain predicted FAT gain
//             strongly and muscle thickness only weakly. Offering a "how fast"
//             choice would invite carrying fat a later trim has to remove.
//
// ── WHY THE OPTIONS DIFFER PER USER ─────────────────────────────────────────
//
// Alpert 2005 put a limit on how fast the fat store can release energy — past
// it, the deficit is made up from lean tissue. The limit scales with FAT MASS,
// so 1%/wk is available to a heavier lifter and not to a lean one:
//
//   90 kg at 25%  needs  990 kcal/day, ceiling 1091  → offered
//   75 kg at 15%  needs  880 kcal/day, ceiling  582  → not offered
//
// `rateOptionsFor` owns that decision. This screen renders whatever it returns
// and never decides for itself which rates are safe.
//
// ── WHAT THE COPY CLAIMS, AND WHAT IT DOES NOT ──────────────────────────────
//
// It does NOT say a fast cut costs you muscle permanently. Garthe's 12-month
// follow-up found no difference between the fast and slow groups a year later,
// on composition or performance. The honest trade is a harder diet — 1,910
// kcal against 2,405 for a 90 kg lifter — and forgoing the strength the slow
// group GAINED while cutting.

import React, { useCallback, useMemo, useState } from 'react';
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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';
import { loadGoalsProfile, updateGoalsProfileField } from '../../../utils/goalsProfileStorage';
import { derivePhase } from '../../../utils/goalsProfile';
import { rateOptionsFor, type RateOption } from '../../../utils/lossRate';
import { leanGainKgPerYear } from '../../../utils/roadmap';
import type { GoalsProfile } from '../../../utils/goalsProfile';

type Nav = StackNavigationProp<any>;
type Params = RouteProp<{ p: { stepOffset?: number; next?: string } }, 'p'>;

export default function N2RateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Params>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const stepOffset = route.params?.stepOffset ?? 0;
  const next = route.params?.next ?? 'N5bAllergies';

  const [profile, setProfile] = useState<GoalsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadGoalsProfile().then((p) => {
        if (cancelled) return;
        setProfile(p);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const result = useMemo(() => {
    if (!profile) return null;
    return rateOptionsFor(profile, derivePhase(profile));
  }, [profile]);

  const options: RateOption[] = result?.applicable ? result.options : [];

  // Preselect from the stored preference where there is one, otherwise the
  // recommendation. The recommendation is the slowest available, always — in
  // Garthe's trial the slow group GAINED lean mass while losing fat and the
  // fast group merely held it. The faster option exists because the user's
  // time is theirs to spend, not because it is the better choice.
  //
  // 'faster' resolves to the LAST option rather than a remembered index,
  // because the list length depends on their fat mass and may be shorter than
  // it was last time. An index would point at the wrong rate, or past the end.
  const preferred =
    profile?.cutPace === 'faster' ? Math.max(0, options.length - 1) : options.findIndex((o) => o.recommended);
  const chosen = selected ?? (preferred >= 0 ? preferred : 0);

  const kcalFor = (o: RateOption) => {
    const maintenance = estimateMaintenance(profile);
    return maintenance ? Math.round(maintenance - o.deficitKcalPerDay) : null;
  };

  const advance = async () => {
    const option = options[chosen];
    if (!option || saving) return;
    setSaving(true);
    try {
      // TWO WRITES, AND THE ORDER OF IMPORTANCE IS THE OPPOSITE OF THE ORDER
      // THEY APPEAR IN.
      //
      // `cutPace` on the profile is the SOURCE OF TRUTH and the durable one.
      // It survives phase changes, and `syntheticSeedFor` re-resolves it
      // against the user's current fat-mass ceiling every time a nutrition
      // flow starts. That is what stops a 'faster' choice made at 25% body fat
      // handing someone at 14% a rate their fat store cannot supply.
      //
      // `targetRatePercentage` in the answers is a CACHE of that resolution
      // for this run, written because computeMacros reads it directly. It is
      // allowed to go stale; the seed path overwrites it on the next entry.
      const pace = chosen === 0 ? 'steady' : 'faster';
      await updateGoalsProfileField('cutPace', pace);
      await updateNutritionField('targetRatePercentage', Number(option.ratePct.toFixed(2)));
      navigation.navigate(next as never);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  // NO RATE TO PICK — a recomp holds weight, and a build runs at whatever pace
  // the lifter can turn into muscle. Both still land here, because the summary
  // row routes every phase to this screen and a row that goes nowhere is worse
  // than a screen with nothing to change on it.
  //
  // Read-only rather than skipped: the user tapped a row expecting to see
  // something, and "why is this number what it is" is a real question even
  // when the answer is not theirs to change.
  if (!result?.applicable || options.length === 0) {
    return (
      <ReadOnly
        profile={profile}
        stepOffset={stepOffset}
        onBack={() => navigation.goBack()}
      />
    );
  }

  const constrained = result.constrained;
  const single = options.length === 1;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 2}
        totalSteps={stepOffset + 12}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.popToTop()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>How fast do you{'\n'}want to lose?</Text>
        <Text style={styles.subtitle}>
          {single
            ? `At ${Math.round(profile?.currentBodyFatPct ?? 0)}% body fat, this is the pace your body can support.`
            : 'Going faster means a harder diet, and giving up the muscle you could gain while cutting.'}
        </Text>

        {options.map((o, i) => {
          const on = i === chosen;
          const leanPct = Math.round(o.leanFractionOfLoss * 100);
          const fatKg = o.kgPerWeek * (1 - o.leanFractionOfLoss);
          const leanKg = o.kgPerWeek - fatKg;
          const kcal = kcalFor(o);

          return (
            <TouchableOpacity
              key={o.rate}
              style={[
                styles.option,
                on && { borderWidth: 1.5, borderColor: themeColor, backgroundColor: `${themeColor}14` },
              ]}
              onPress={() => setSelected(i)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${o.ratePct}% a week, ${o.kgPerWeek.toFixed(2)} kilos`}
            >
              <View style={styles.optionTop}>
                {on ? <Ionicons name="checkmark" size={15} color={themeColor} /> : null}
                <Text style={[styles.optionRate, on && styles.optionRateOn]}>
                  {o.ratePct}% a week
                </Text>
                {o.recommended ? (
                  <View style={[styles.tag, { borderColor: `${themeColor}52` }]}>
                    <Text style={[styles.tagText, { color: themeColor }]}>RECOMMENDED</Text>
                  </View>
                ) : null}
                <Text style={[styles.optionKg, on && styles.optionKgOn]}>
                  {o.kgPerWeek.toFixed(2)} kg
                </Text>
              </View>

              {on ? (
                <>
                  {/* The split, not a ratio. "1 kg in 10" made the reader do
                      arithmetic; this uses the number already on the card. */}
                  <View style={styles.bar}>
                    <View style={[styles.barFat, { flex: Math.max(1, 100 - leanPct), backgroundColor: themeColor }]} />
                    {leanPct > 0 ? <View style={[styles.barLean, { flex: leanPct }]} /> : null}
                  </View>
                  <View style={styles.barKey}>
                    <View style={styles.keyItem}>
                      <View style={[styles.keyDot, { backgroundColor: themeColor }]} />
                      <Text style={styles.keyText}>{fatKg.toFixed(2)} kg fat</Text>
                    </View>
                    {leanPct > 0 ? (
                      <View style={styles.keyItem}>
                        <View style={[styles.keyDot, { backgroundColor: '#3f3f46' }]} />
                        <Text style={styles.keyText}>{leanKg.toFixed(2)} kg muscle</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.optionLine}>
                    {kcal ? <Text style={styles.strong}>{`Eat around ${kcal.toLocaleString()} a day. `}</Text> : null}
                    {o.recommended
                      ? 'At this pace lifters in the research got stronger and added muscle while losing fat.'
                      : 'Quicker, but a much harder diet to hold.'}
                  </Text>
                </>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.infoLink}
          onPress={() => setInfo(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="information-circle-outline" size={15} color="#52525b" />
          <Text style={[styles.infoLinkText, { color: themeColor }]}>What decides this</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 22 }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: themeColor }]}
          onPress={advance}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#0a0a0b" size="small" />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* FADE, matching the other sheets in the app. */}
      <Modal visible={info} transparent animationType="fade" onRequestClose={() => setInfo(false)}>
        <Pressable style={styles.scrim} onPress={() => setInfo(false)} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          {/* SCROLLABLE — a fixed sheet loses its bottom on a small phone,
              and the bottom is where the source line and the dismiss sit. The
              grab handle stays outside the scroll so it does not travel. */}
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>What decides this</Text>
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
            {constrained
              ? 'Your fat stores can only release so much energy a day, and how much depends on how much fat you carry. Ask for a bigger gap than that and the difference comes out of muscle instead.\n\nThe leaner you get, the lower that limit goes — so fewer options appear here as you go.'
              : 'A faster cut is a harder diet, not a permanent cost. Athletes losing at the slower pace gained muscle and got stronger while losing fat; the faster group shed it in about half the time but gained neither.\n\nTested again a year later, there was no difference between the groups.'}
          </Text>

          <Text style={styles.source}>
            {constrained
              ? 'Alpert, Journal of Theoretical Biology, 2005'
              : 'Garthe et al., Int J Sport Nutr Exerc Metab, 2011'}
          </Text>
          </ScrollView>
          <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={styles.sheetGhost}
              onPress={() => setInfo(false)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.sheetGhostText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Rough maintenance, for display only.
 *
 * Mifflin-St Jeor on lean mass where body fat is known, times a light activity
 * factor. Deliberately NOT the app's real macro calculation: this number only
 * has to give the user a sense of what the diet feels like, and importing the
 * macro engine here would tie a questionnaire screen to it for a sentence.
 * If it ever needs to be exact, take it from the same source the targets
 * screen uses rather than refining this.
 */
function estimateMaintenance(profile: GoalsProfile | null): number | null {
  if (!profile?.currentWeightKg || !profile.heightCm || !profile.ageYears) return null;
  const s = profile.sex === 'female' ? -161 : 5;
  const bmr = 10 * profile.currentWeightKg + 6.25 * profile.heightCm - 5 * profile.ageYears + s;
  return Math.round(bmr * 1.45);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },

  question: { fontSize: 28, fontWeight: '600', color: '#ffffff', lineHeight: 34, letterSpacing: -0.4, marginBottom: 10 },
  subtitle: { fontSize: 13, color: '#71717a', lineHeight: 19, marginBottom: 24 },

  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    borderRadius: 12,
    padding: 15,
    marginBottom: 9,
  },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionRate: { fontSize: 17, fontWeight: '600', color: '#d4d4d8' },
  optionRateOn: { color: '#ffffff' },
  optionKg: { fontSize: 13.5, color: '#52525b', marginLeft: 'auto' },
  optionKgOn: { color: '#8e8e93' },
  tag: { borderWidth: 1, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6 },
  tagText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },

  bar: { flexDirection: 'row', height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 13 },
  barFat: {},
  barLean: { backgroundColor: '#3f3f46' },
  barKey: { flexDirection: 'row', gap: 16, marginTop: 8 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyDot: { width: 7, height: 7, borderRadius: 4 },
  keyText: { fontSize: 11.5, color: '#71717a' },
  optionLine: { fontSize: 12.5, color: '#8e8e93', lineHeight: 18, marginTop: 10 },
  strong: { color: '#c4c4c8', fontWeight: '600' },

  infoLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  infoLinkText: { fontSize: 13 },

  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  cta: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '500', color: '#0a0a0b' },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)' },
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
  sheetGhost: { height: 50, borderRadius: 13, backgroundColor: '#1c1c20', alignItems: 'center', justifyContent: 'center' },
  sheetGhostText: { fontSize: 14, fontWeight: '600', color: '#d4d4d8' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3, marginBottom: 10 },
  sheetBody: { fontSize: 14, lineHeight: 21, color: '#8e8e93' },
  source: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4b4b52',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1c1c20',
  },
});


/**
 * The recomp and build case: the target explained, with nothing to choose.
 *
 * Shares this file rather than living in its own screen because it is the same
 * question — what is my weight meant to do — answered for a phase where the
 * answer is fixed. Splitting it would mean the summary row needed to know which
 * screen to route to, and the row deliberately does not know about phases.
 */
function ReadOnly({
  profile,
  stepOffset,
  onBack,
}: {
  profile: GoalsProfile | null;
  stepOffset: number;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const [info, setInfo] = useState(false);
  const phase = profile ? derivePhase(profile) : null;
  const building = phase === 'bulk' || phase === 'lean_bulk';

  const rate = profile ? leanGainKgPerYear(profile) : null;
  const perWeek = rate ? ((rate[0] + rate[1]) / 2 / 52) * 1.2 : null;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 2}
        totalSteps={stepOffset + 12}
        onBack={onBack}
        onClose={onBack}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>
          {building ? `About ${perWeek ? perWeek.toFixed(2) : '0.25'} kg${'\n'}a week.` : `Your weight stays${'\n'}where it is.`}
        </Text>
        <Text style={styles.subtitle}>
          {building
            ? 'That is the pace your body can turn into muscle, so there is nothing to choose here.'
            : 'You are recomping, so there is no rate to choose.'}
        </Text>

        <View style={[styles.option, { borderWidth: 1.5, borderColor: themeColor, backgroundColor: `${themeColor}14` }]}>
          <View style={styles.optionTop}>
            <Ionicons name="checkmark" size={15} color={themeColor} />
            <Text style={[styles.optionRate, styles.optionRateOn]}>
              {building ? 'A small surplus' : 'Hold your weight'}
            </Text>
          </View>
          <Text style={styles.optionLine}>
            {building
              ? 'Eating more mostly adds fat you would trim off later.'
              : 'Fat comes down and muscle goes up while the scale sits still.'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.infoLink}
          onPress={() => setInfo(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="information-circle-outline" size={15} color="#52525b" />
          <Text style={[styles.infoLinkText, { color: themeColor }]}>What decides this</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 22 }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: themeColor }]}
          onPress={onBack}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>Done</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={info} transparent animationType="fade" onRequestClose={() => setInfo(false)}>
        <Pressable style={styles.scrim} onPress={() => setInfo(false)} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>
              {building ? 'Why not eat more?' : 'What decides this'}
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
            {building
              ? 'There is a ceiling on how fast anyone builds muscle, and food does not raise it. When lifters were put on a large surplus instead of a small one, the extra weight was mostly fat.'
              : 'Three weeks without the scale moving is the plan working, not failing.\n\nThis works best for people new to lifting, coming back after a break, or carrying more body fat.'}
          </Text>
          <Text style={styles.source}>
            {building
              ? 'Helms et al., Sports Medicine – Open, 2023'
              : 'Barakat et al., Strength & Conditioning Journal, 2020'}
          </Text>
          </ScrollView>
          <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={styles.sheetGhost}
              onPress={() => setInfo(false)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.sheetGhostText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}