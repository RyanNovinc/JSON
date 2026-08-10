// src/components/route/RouteBodyFatField.tsx
//
// Beat 2's body fat input.
//
// WHY NOT JUST RESTYLE BodyFatField. That component is shared with the
// returning-user Quick check and Goals & Stats, where its compact form-row
// layout is correct: those screens ask several things at once. Beat 2 asks one
// thing, so it wants beat 1's shape — a huge number and an instrument under
// it — and giving the shared component two layouts would be worse than having
// two components.
//
// The VALUE CONTRACT is imported, not copied: BodyFatFieldValue and its
// resolver come from BodyFatField. This writes exactly the same bodyFatPct and
// bodyFatSource the other two screens write.
//
// THE BAND IS A CONTROL, NOT A READBACK. Beat 1 lets you tap the number or
// drag the instrument. A dead bar sitting exactly where beat 1 puts a live one
// was the inconsistency, not the second input. Dragging writes reportedText,
// so the source stays 'reported' — see the note at the bottom of this comment.
//
// NO TAPE MODE HERE. BodyFatField still offers it, and the Quick check and
// Goals & Stats still use it. It is out of this flow because the route beats
// already ask for height and weight on their own screens, and a third input
// method earns less than the space it costs when the scale and the pictures
// already cover knowing and not knowing.
//
// KNOWN COMPROMISE: a user who only ever drags has estimated, but is recorded
// as 'reported'. Distinguishing that needs a fourth BodyFatSource, which is a
// storage change touching the other two screens.

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import BodyPictogram from './BodyPictogram';
import ScaleRuler from './ScaleRuler';
import { resolveBodyFat, type BodyFatFieldValue } from '../BodyFatField';
import type { Sex } from '../../utils/goalsProfile';
import { BODY_FAT_TIERS, tierRange } from '../../utils/roadmap';

interface Props {
  value: BodyFatFieldValue;
  onChange: (next: BodyFatFieldValue) => void;
  sex?: Sex;
  heightCm?: number;
  /** The estimator is opened from the screen's top bar, so the screen owns
   *  whether it is showing. */
  estimatorOpen?: boolean;
  onCloseEstimator?: () => void;
  themeColor: string;
}

/** Readback zones for a CURRENT body fat, shifted for female the same way the
 *  goal ribbon shifts. Presentation only: nothing here decides a value. */
// The top zone is deliberately NOT red. This band labels the body the user
// has right now, and red reads as a warning about it. Red is reserved for the
// goal gauge, where it marks a claim about records rather than about a person.
const ZONES = [
  { to: 12, label: 'Lean', colour: '#38bdf8' },
  { to: 16, label: 'Athletic', colour: '#34d399' },
  { to: 22, label: 'Average', colour: '#f0b429' },
  { to: Infinity, label: 'Higher', colour: '#a1a1aa' },
];

// MAX sits above the top tier's ceiling on purpose: a user over 35% must be
// able to see their pin move rather than have it stick at the end.
/** Shown when nothing has been entered yet, so the scale is never blank. */
const PLACEHOLDER_PCT = 20;

/** Large enough to tell the widths apart at a glance. */
const TIER_FIGURE_HEIGHT = 82;

/** Widest the current body fat scale runs, in percent. */
const BF_MIN = 5;
const BF_MAX = 45;

const zoneFor = (pct: number, sex?: Sex) => {
  const shift = sex === 'female' ? 9 : 0;
  return ZONES.find((z) => pct < z.to + (z.to === Infinity ? 0 : shift)) ?? ZONES[ZONES.length - 1];
};

export default function RouteBodyFatField({
  value,
  onChange,
  sex,
  heightCm,
  themeColor,
  estimatorOpen = false,
  onCloseEstimator,
}: Props) {

  const set = (patch: Partial<BodyFatFieldValue>) => {
    const merged = { ...value, ...patch };
    onChange({ ...merged, bodyFatPct: resolveBodyFat(merged, sex, heightCm) });
  };

  const resolved = resolveBodyFat(value, sex, heightCm);

  // ------------------------------------------------------------------ main
  const bandPct = resolved ?? PLACEHOLDER_PCT;
  const zone = zoneFor(bandPct, sex);

  /** Which tier the current value falls in. Derived rather than remembered, so
   *  the estimator can never contradict the number on the screen behind it. */
  const activeTier = (() => {
    for (let i = 0; i < BODY_FAT_TIERS.length; i++) {
      if (bandPct <= tierRange(BODY_FAT_TIERS[i], sex)[1]) return i;
    }
    return BODY_FAT_TIERS.length - 1;
  })();

  // Tapping a cell selects it and the sheet STAYS OPEN. Selecting and
  // dismissing on the same tap gave no moment to see what was chosen, no
  // chance to compare against the neighbour, and changed the value behind a
  // screen that was already disappearing. Confirming is a separate act.
  const [pending, setPending] = useState(activeTier);
  useEffect(() => {
    // Opening always starts from where the value actually is.
    if (estimatorOpen) setPending(activeTier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatorOpen]);

  const pendingPct = (() => {
    const [lo, hi] = tierRange(BODY_FAT_TIERS[pending], sex);
    return pending === BODY_FAT_TIERS.length - 1 ? lo + 6 : Math.round((lo + hi) / 2);
  })();

  return (
    <View>
      <View style={styles.bigRow}>
        <TextInput
          style={[styles.bigValue, styles.bigInput]}
          keyboardType="decimal-pad"
          value={value.reportedText}
          onChangeText={(t) => set({ source: 'reported', reportedText: t.replace(/[^0-9.]/g, '') })}
          maxLength={4}
          placeholder={String(PLACEHOLDER_PCT)}
          placeholderTextColor="#2f2f35"
          returnKeyType="done"
        />
        <Text style={styles.bigUnit}>%</Text>
      </View>

      {/* Same shape as the height beat: label, number, scale. */}
      <ScaleRuler
        value={bandPct}
        min={BF_MIN}
        max={BF_MAX}
        step={1}
        pxPerUnit={13}
        isMajor={(v) => Math.round(v) % 5 === 0}
        formatLabel={(v) => String(Math.round(v))}
        tickColor={(v) => zoneFor(v, sex).colour}
        // Dragging is always a reported value, even if the number arrived from
        // a tier: the moment they move it themselves, it is theirs.
        onChange={(next) => set({ source: 'reported', reportedText: String(next) })}
        themeColor={themeColor}
      />

      {/* Under the scale, where it names the ticks the needle is sitting in
          rather than floating between the number and the instrument. */}
      <Text style={[styles.zoneLabel, { color: zone.colour }]}>{zone.label}</Text>

      <Modal
        visible={estimatorOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseEstimator}
      >
        <Pressable style={styles.scrim} onPress={onCloseEstimator} />
        <View style={styles.estimatorSheet}>
          <View style={styles.grab} />
          <Text style={styles.estimatorTitle}>Pick the closest</Text>
          <Text style={styles.estimatorLede}>
            Lands within a few points for most people.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {BODY_FAT_TIERS.map((tier, i) => {
                const [lo, hi] = tierRange(tier, sex);
                const last = i === BODY_FAT_TIERS.length - 1;
                const pick = last ? lo + 6 : Math.round((lo + hi) / 2);
                // Highlight follows the CURRENT value, not the last tap. Keying
                // it off tierIndex meant the sheet kept showing a tier the user
                // had long since dragged away from.
                const active = i === pending;
                return (
                  <TouchableOpacity
                    key={tier.t}
                    style={[styles.cell, active && { borderColor: themeColor, backgroundColor: '#102024' }]}
                    onPress={() => setPending(i)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={tier.description}
                    accessibilityState={{ selected: active }}
                  >
                    <View style={styles.cellFig}>
                      <BodyPictogram
                        bodyFatPct={pick}
                        sex={sex}
                        height={TIER_FIGURE_HEIGHT}
                        color={active ? themeColor : '#52525b'}
                      />
                    </View>
                    {/* The top tier reads open ended. Printing a ceiling there
                        tells anyone above it they are off the scale. */}
                    <Text style={[styles.cellRange, active && { color: themeColor }]}>
                      {last ? `${lo}%+` : `${lo}\u2013${hi}%`}
                    </Text>
                    <Text style={styles.cellDesc} numberOfLines={2}>
                      {tier.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Names the number it is about to set, so confirming is not a leap
              of faith about what the picture meant. */}
          <TouchableOpacity
            style={[styles.useBtn, { backgroundColor: themeColor }]}
            onPress={() => {
              set({ source: 'visual', tierIndex: pending, reportedText: String(pendingPct) });
              onCloseEstimator?.();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.useBtnText}>Use {pendingPct}%</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  estimatorSheet: {
    maxHeight: '78%',
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2f2f35', alignSelf: 'center', marginBottom: 14 },
  useBtn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  useBtnText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
  estimatorTitle: { fontSize: 19, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  estimatorLede: { fontSize: 12.5, color: '#5b5b62', marginBottom: 14 },
  // Clamped to exactly two lines so a long description cannot push a cell taller than its neighbour.
  cellDesc: { fontSize: 10.5, lineHeight: 14, height: 28, color: '#5b5b62', textAlign: 'center', marginTop: 3 },


  bigRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 7, marginBottom: 4 },
  bigValue: {
    fontSize: 76,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -3,
    lineHeight: 80,
    // Same reason as the route screen: proportional digits change width as the
    // value changes, which reads as the number wobbling while you drag.
    fontVariant: ['tabular-nums'],
    minWidth: 150,
    textAlign: 'center',
  },
  bigInput: { padding: 0 },
  bigPlaceholder: { color: '#2f2f35' },
  bigUnit: { fontSize: 22, fontWeight: '600', color: '#52525b' },

  zoneLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 6 },



  // Three across. Recognising yourself is easier against neighbours than in
  // isolation, which is the whole reason this mode exists.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 2 },
  // Fixed height, two per row. Cells that sized to their own text made every
  // row a different height, which is what read as messy.
  cell: {
    width: '48.5%',
    height: 158,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cellFig: { flex: 1, justifyContent: 'center' },
  cellRange: { fontSize: 13, fontWeight: '700', color: '#8e8e93' },



});