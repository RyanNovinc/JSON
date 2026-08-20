// src/components/route/EvidenceSheet.tsx
//
// The sheet behind every landmark on the frame gauge that makes a claim: the
// verdict line, the dashed ceiling, the gold band.
//
// TWO LEVELS, ON PURPOSE. Someone four screens into the app wants "uncommon,
// not impossible, got it" and then to keep moving. So level one is a title
// that IS the answer plus at most three short sentences, and every grade,
// citation and caveat lives behind a single disclosure row. The reference
// panel is not deleted, it is demoted.
//
// The disclosure row does double duty: "Based on 5 studies" is a trust signal
// in four words for the majority who will never tap it, and a door for the few
// who will.
//
// WHAT THE COPY MAY CLAIM. roadmap.ts states the house rule outright: anything
// graded [B] or [C] must reach the user as a range with an estimate label. The
// ceiling is [B] and the muscle half of the rated band is [B], so the word
// "estimate" is in the level one copy, not buried at level two. Nothing here
// comments on health or on how the user would look, because those are separate
// claims needing evidence this app does not have.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATTRACTIVE_BF_CENTRE } from '../../utils/attractivenessTargets';
import type { EvidenceTopic, FrameZoneKey } from '../../utils/routeZones';

type Grade = 'A' | 'B';

interface Block {
  key: string;
  body: string;
  grade?: Grade;
  gradeLabel?: string;
}

interface Props {
  visible: boolean;
  topic: EvidenceTopic;
  /** Only used for the ceiling topic, to pick the right headline. */
  zoneKey: FrameZoneKey;
  goalWeightKg: number;
  goalBodyFatPct: number;
  leanTargetKg: number;
  /**
   * The user's own lean stop, for the 'lean-stop' topic. Sex-dependent — 12 for
   * men and 22 for women — so the copy states THEIR number rather than a
   * constant, and the sheet does not import operatingBands to find out.
   */
  leanStopPct?: number;
  /** The narrowest permitted range, for the 'range-width' topic. */
  minWidthPct?: number;
  onClose: () => void;
}

/** Level one. Title first, because the title alone is a complete answer for
 *  anyone who closes the sheet immediately. */
function levelOne(
  topic: EvidenceTopic,
  zoneKey: FrameZoneKey,
  goalWeightKg: number,
  goalBodyFatPct: number,
  leanTargetKg: number,
  leanStopPct?: number,
  minWidthPct?: number,
): { icon: string; tint: string; title: string; lines: string[]; more: string } {
  const w = goalWeightKg.toFixed(1);
  const lean = Math.round(leanTargetKg);
  const bf = Math.round(goalBodyFatPct);

  // THE STOP IS A MARGIN, AND THE COPY SAYS SO. The honest version is that the
  // number is chosen rather than measured, and that the constraint people
  // actually hit first is arithmetic — a small fat store cannot supply a normal
  // deficit — not a health threshold. Claiming a threshold here would be
  // claiming evidence this app does not have.
  if (topic === 'lean-stop') {
    const stop = leanStopPct ?? 12;
    return {
      icon: 'shield-outline',
      tint: '#d8a13f',
      title: `${stop}% is as lean as the plan goes`,
      lines: [
        'Below this your fat store cannot release energy fast enough to cover a normal deficit, so the difference starts coming off muscle instead.',
        'The number itself is a margin rather than a measured line, set well above where anything has been recorded going wrong.',
      ],
      more: 'Where this comes from',
    };
  }

  // A PRACTICALITY LIMIT, NOT A PHYSIOLOGICAL ONE, and the difference matters:
  // nothing bad happens to a person in a one-point range, the APP just cannot
  // tell whether it worked.
  if (topic === 'range-width') {
    const w2 = minWidthPct ?? 2;
    return {
      icon: 'resize-outline',
      tint: '#d8a13f',
      title: `${w2} points is as narrow as it goes`,
      lines: [
        'A tighter range means each stretch of building and each cut finishes before a bathroom scale could show it worked.',
        'Nothing is wrong with living in a one point range. The app just could not tell you whether you were on track, so it will not plan one.',
      ],
      more: 'Where this comes from',
    };
  }

  if (topic === 'rated') {
    return {
      icon: 'sparkles',
      tint: '#f5d565',
      title: 'Rated best',
      lines: [
        `The shape people rated most attractive in studies: around ${ATTRACTIVE_BF_CENTRE}% body fat with moderate muscle. Leaner scored slightly worse, and so did bigger.`,
        "It's an average of strangers' ratings, not a target.",
      ],
      more: 'Based on 5 studies',
    };
  }

  if (zoneKey === 'beyond') {
    return {
      icon: 'close-circle-outline',
      tint: '#f87171',
      title: 'Past the estimate',
      lines: [
        `${w} kg at ${bf}% means ${lean} kg of lean mass, above where drug-free lifters have been measured at your height.`,
        'The ceiling itself is an estimate from one small study, and some people do exceed it.',
      ],
      more: 'Where this comes from',
    };
  }

  if (zoneKey === 'grey') {
    return {
      icon: 'alert-circle-outline',
      tint: '#f0b429',
      title: 'Uncommon, not impossible',
      lines: [
        `${w} kg at ${bf}% means carrying ${lean} kg of lean mass at your height. Most drug-free lifters top out below that, even after years.`,
        'A few get there.',
      ],
      more: 'Where this comes from',
    };
  }

  return {
    icon: 'checkmark-circle-outline',
    tint: '#34d399',
    title: 'Realistic',
    lines: [
      `${w} kg at ${bf}% means ${lean} kg of lean mass, which sits inside what drug-free lifters have been measured carrying at your height.`,
      'It still takes years of consistent training.',
    ],
    more: 'Where this comes from',
  };
}

/** Level two. Unchanged by zone: the evidence does not depend on where the
 *  user happens to have dragged the line. */
function levelTwo(topic: EvidenceTopic): { blocks: Block[]; sources: string } {
  if (topic === 'lean-stop') {
    return {
      blocks: [
        {
          key: 'WHAT ACTUALLY BINDS FIRST',
          grade: 'B',
          gradeLabel: 'THEORETICAL MODEL [B]',
          body: 'Alpert put a limit on how fast fat can release energy, and the app uses a deliberately conservative figure. Set the deficit a rate needs equal to what a fat store can supply and the bodyweight cancels out, leaving a single body fat percentage: about 11% at the slow rate this app plans, and about 23% at the fast one. That is why the faster option disappears as you lean out.',
        },
        {
          key: 'WHY THE STOP IS HIGHER THAN THAT',
          body: 'Because the arithmetic above is sex blind, and the lean end is not. For women the stop sits at 22%, near where menstrual function is documented as maintained, and a plan that returns someone to that line every cycle for years is a different proposition from one that visits it once.',
        },
        {
          key: 'WHERE HARM HAS ACTUALLY BEEN MEASURED',
          grade: 'B',
          gradeLabel: 'CASE STUDY [B]',
          body: 'One drug-free man taken from 15% to 4.5% lost most of his testosterone and had not fully recovered his strength six months later. That is far below this stop, which is the point: the margin is wide on purpose.',
        },
        {
          key: "WHAT IT DOESN'T TELL YOU",
          body: 'Nothing about you specifically, and nothing about being leaner than this briefly. It is where the app will keep putting you for years, which is a higher bar than where a person can visit.',
        },
      ],
      sources:
        'Alpert 2005, J Theor Biol 233(1):1-13 \u00b7 Rossow et al. 2013, PMID 23412685 \u00b7 Fagerberg 2018, Int J Sport Nutr Exerc Metab \u00b7 Mursu, Hulmi et al. 2023, Nutrients 15(2):382',
    };
  }

  if (topic === 'range-width') {
    return {
      blocks: [
        {
          key: 'MEASURED IN THIS APP',
          gradeLabel: 'OUR OWN MODEL, NOT A TRIAL',
          body: 'Same lifter, widening the range: half a point gives ten cuts and twenty phases, ten of them too short to read on a scale. One point gives six cuts and five. Two points gives four cuts and one, and the one is the final cut, which is short at every width. Two and a half gives none.',
        },
        {
          key: 'WHY SHORTNESS IS THE PROBLEM',
          body: 'A phase ends on a body fat number, and body fat is measured with error. A phase that finishes inside that error cannot be confirmed as finished, so the app would be moving you between phases on noise.',
        },
        {
          key: 'WHAT WIDTH IS NOT',
          grade: 'B',
          gradeLabel: 'PREFERENCE [B]',
          body: 'Nothing says a narrow range builds less muscle or takes longer. The closest trial ran interrupted against continuous restriction in trained lifters and found them identical on strength, hormones, sleep and lean mass, with the interrupted arm reporting less hunger. Width is a preference with a real cost on both sides, and this limit is only about what can be verified.',
        },
      ],
      sources:
        'Peos et al. 2021, Med Sci Sports Exerc 53(8):1685-1698 \u00b7 phase counts from this app\u2019s own roadmap model, not from a trial',
    };
  }

  if (topic === 'rated') {
    return {
      blocks: [
        {
          key: 'THE LEANNESS HALF',
          grade: 'A',
          gradeLabel: 'MEASURED, DXA [A\u2212]',
          body: `Ratings peak around ${ATTRACTIVE_BF_CENTRE}% body fat, across 10 to 15. Single digit body fat rated slightly worse, and no study ties any percentage to facial definition.`,
        },
        {
          key: 'THE MUSCLE HALF',
          grade: 'B',
          gradeLabel: 'EXTRAPOLATED [B]',
          body: 'Toned beats brawny: ratings rise with muscle then fall again. Men overestimate the muscularity women prefer by roughly 13 to 14 kg. No study has measured FFMI against attractiveness directly, so this band is an extrapolation.',
        },
        {
          key: 'A BAND, NOT A NUMBER',
          grade: 'A',
          gradeLabel: '[A]',
          body: 'The rated optimum is a broad plateau that shifts with culture and context, so a single ideal number would claim precision the evidence does not carry.',
        },
        {
          key: "WHAT IT DOESN'T TELL YOU",
          body: 'Raters skew Western. FFMI ignores shoulder to waist proportion, which matters more than mass in these samples. Ratings of photographs are not a promise about your life.',
        },
      ],
      sources:
        'Xia et al. 2025, Personality and Individual Differences \u00b7 Brierley et al. 2016, PLOS ONE \u00b7 Frederick and Haselton 2007, Pers Soc Psychol Bull \u00b7 Sell et al. 2017, Proc R Soc B \u00b7 Pope et al. 2000, Am J Psychiatry',
    };
  }

  return {
    blocks: [
      {
        key: 'WHERE THE CEILING COMES FROM',
        grade: 'B',
        gradeLabel: 'ESTIMATE [B]',
        body: 'One cross-sectional sample of about 74 men who reported not using drugs, whose fat-free mass index extended to roughly 25. A description of that sample, not a measured biological limit.',
      },
      {
        key: 'WHY IT IS A ZONE, NOT A LINE',
        body: 'The app treats 24 as comfortably in range and 25.5 as the outer edge, with a deliberate grey zone between. Documented outliers sit above it naturally.',
      },
      {
        key: "WHAT IT DOESN'T TELL YOU",
        body: 'Nothing about health, and nothing about you specifically. Getting anywhere near it takes many years of consistent training, and most people never test the question.',
      },
    ],
    sources: 'Kouri et al. 1995, PMID 7496846. Graded [B] in roadmap.ts: practitioner extrapolation, not trial evidence.',
  };
}

export default function EvidenceSheet({
  visible,
  topic,
  zoneKey,
  goalWeightKg,
  goalBodyFatPct,
  leanTargetKg,
  leanStopPct,
  minWidthPct,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  // Reopening always starts at level one. Someone who read the citations once
  // should not be dropped back into them next time they tap the verdict.
  useEffect(() => {
    if (visible) setExpanded(false);
  }, [visible]);

  const one = levelOne(
    topic,
    zoneKey,
    goalWeightKg,
    goalBodyFatPct,
    leanTargetKg,
    leanStopPct,
    minWidthPct,
  );
  const two = levelTwo(topic);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grab} />

        {expanded ? (
          <>
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => setExpanded(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={15} color="#8e8e93" />
              <Text style={styles.backText}>{one.title}</Text>
            </TouchableOpacity>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {two.blocks.map((b) => (
                <View key={b.key} style={styles.block}>
                  <View style={styles.blockHead}>
                    <Text style={styles.blockKey}>{b.key}</Text>
                    {b.gradeLabel ? (
                      <Text
                        style={[
                          styles.grade,
                          b.grade === 'A' ? styles.gradeA : styles.gradeB,
                        ]}
                      >
                        {b.gradeLabel}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.blockBody}>{b.body}</Text>
                </View>
              ))}
              <View style={styles.sources}>
                <Text style={styles.sourcesText}>{two.sources}</Text>
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.titleRow}>
              <Ionicons name={one.icon as any} size={17} color={one.tint} />
              <Text style={styles.title}>{one.title}</Text>
            </View>
            {one.lines.map((l) => (
              <Text key={l} style={styles.lead}>
                {l}
              </Text>
            ))}

            <TouchableOpacity
              style={styles.more}
              onPress={() => setExpanded(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.moreText}>{one.more}</Text>
              <Ionicons name="chevron-forward" size={15} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.done} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneText}>Got it</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '82%',
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 16 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  title: { fontSize: 19, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3, flex: 1 },
  lead: { fontSize: 14, lineHeight: 22, color: '#b4b4b8', marginBottom: 8 },

  more: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1c1c20',
    marginTop: 10,
    paddingTop: 14,
  },
  moreText: { flex: 1, fontSize: 12.5, color: '#8e8e93' },

  done: {
    height: 48,
    borderRadius: 13,
    backgroundColor: '#1c1c20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  doneText: { fontSize: 14, fontWeight: '600', color: '#d4d4d8' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { fontSize: 12.5, color: '#8e8e93' },

  scroll: { marginBottom: 4 },
  block: { marginBottom: 13 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' },
  blockKey: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, color: '#5b5b62' },
  grade: { fontSize: 9, letterSpacing: 0.4, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  gradeA: { backgroundColor: 'rgba(52,211,153,0.16)', color: '#34d399' },
  gradeB: { backgroundColor: 'rgba(245,213,101,0.16)', color: '#c9b458' },
  blockBody: { fontSize: 12.5, lineHeight: 19, color: '#8e8e93' },

  sources: {
    backgroundColor: '#0c0c0e',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c1c20',
    borderRadius: 11,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  sourcesText: { fontSize: 11, lineHeight: 17, color: '#6b6b70' },
});