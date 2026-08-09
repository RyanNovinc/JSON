// src/components/BodyFatField.tsx
//
// The three ways a user can give us their body fat, as one reusable field.
//
// WHY IT IS SHARED. Body fat is asked for in at least three places — the
// shared intake, the returning-user Quick check, and Goals & Stats. It was
// only ever a plain number box in two of them, so the estimator was
// unreachable for anyone who was not on their first run. Any screen that asks
// for body fat should ask the same way.
//
// The three modes exist because most people simply do not know their number:
//   reported — they have a reading from a scan, smart scale or calipers
//   visual   — a descriptive tier, ±3-5 points, comparable to consumer BIA
//   tape     — circumference method, ±3-4 points, better than most scales
//
// The SOURCE is reported alongside the value. An estimate from a description
// and a DEXA scan are both "20%", but only one should be trusted when the app
// later compares two readings to decide whether the user has made progress.

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BodyFigure from './BodyFigure';
import type { Sex, BodyFatSource } from '../utils/goalsProfile';
import {
  BODY_FAT_TIERS,
  bodyFatFromTier,
  tierRange,
  navyBodyFat,
  leanMassKg,
} from '../utils/roadmap';

export interface BodyFatFieldValue {
  /** Resolved percentage, or undefined when nothing usable has been given. */
  bodyFatPct?: number;
  source: BodyFatSource;
  /** Raw text for the 'reported' mode, kept so the field is controlled. */
  reportedText: string;
  tierIndex: number | null;
  waistText: string;
  neckText: string;
  hipText: string;
}

export const emptyBodyFatValue = (initialPct?: number): BodyFatFieldValue => ({
  bodyFatPct: initialPct,
  source: 'reported',
  reportedText: initialPct != null ? String(initialPct) : '',
  tierIndex: null,
  waistText: '',
  neckText: '',
  hipText: '',
});

/** Resolves the value for whichever mode is active. Exported for tests. */
export function resolveBodyFat(v: BodyFatFieldValue, sex?: Sex, heightCm?: number): number | undefined {
  if (v.source === 'reported') {
    const n = parseFloat(v.reportedText);
    return Number.isFinite(n) && n >= 3 && n <= 60 ? n : undefined;
  }
  if (v.source === 'visual') {
    return v.tierIndex != null ? bodyFatFromTier(BODY_FAT_TIERS[v.tierIndex], sex) : undefined;
  }
  return navyBodyFat({
    sex,
    waistCm: parseFloat(v.waistText),
    neckCm: parseFloat(v.neckText),
    heightCm: heightCm ?? NaN,
    hipCm: v.hipText ? parseFloat(v.hipText) : undefined,
  });
}

interface Props {
  value: BodyFatFieldValue;
  onChange: (next: BodyFatFieldValue) => void;
  sex?: Sex;
  heightCm?: number;
  /** Used only for the lean/fat feedback line. Omit to hide it. */
  weightKg?: number;
  themeColor: string;
  /** Card background, so the ab marks are cut out in the right colour. */
  surfaceColor?: string;
}

const MODES: Array<[BodyFatSource, string]> = [
  ['reported', 'I know it'],
  ['visual', 'Help me estimate'],
  ['tape', 'Tape measure'],
];

export default function BodyFatField({
  value,
  onChange,
  sex,
  heightCm,
  weightKg,
  themeColor,
  surfaceColor = '#131316',
}: Props) {
  const set = (patch: Partial<BodyFatFieldValue>) => {
    const merged = { ...value, ...patch };
    onChange({ ...merged, bodyFatPct: resolveBodyFat(merged, sex, heightCm) });
  };

  const resolved = resolveBodyFat(value, sex, heightCm);

  return (
    <View>
      <View style={styles.segRow}>
        {MODES.map(([mode, label]) => {
          const active = value.source === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.segBtn, active && { borderColor: themeColor, backgroundColor: '#14181b' }]}
              onPress={() => set({ source: mode })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segTxt, active && { color: themeColor }]} numberOfLines={2}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value.source === 'reported' ? (
        <>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="body-outline" size={18} color="#a1a1aa" />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Body fat</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 18"
                placeholderTextColor="#52525b"
                keyboardType="decimal-pad"
                value={value.reportedText}
                onChangeText={(t) => set({ reportedText: t.replace(/[^0-9.]/g, '') })}
                maxLength={4}
                returnKeyType="done"
              />
            </View>
            {value.reportedText ? <Text style={styles.unit}>%</Text> : null}
          </View>
          <Text style={styles.hint}>
            From a scan, smart scale or calipers. Leave it blank if you'd rather — the app works
            fine without it.
          </Text>
        </>
      ) : null}

      {value.source === 'visual' ? (
        <>
          {BODY_FAT_TIERS.map((tier, i) => {
            const active = value.tierIndex === i;
            const [lo, hi] = tierRange(tier, sex);
            return (
              <TouchableOpacity
                key={tier.t}
                style={[styles.tier, active && { borderColor: themeColor, backgroundColor: '#14181b' }]}
                onPress={() => set({ tierIndex: i })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.tierFig}>
                  <BodyFigure
                    t={tier.t}
                    sex={sex}
                    size={34}
                    color={active ? themeColor : '#52525b'}
                    definitionColor={active ? '#14181b' : surfaceColor}
                  />
                </View>
                <Text style={styles.tierName}>{tier.description}</Text>
                <Text style={[styles.tierRange, { color: themeColor }]}>
                  {lo}–{hi}%
                </Text>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.hint}>
            Pick the closest. This lands within a few points for most people, about the same as a
            smart scale.
          </Text>
        </>
      ) : null}

      {value.source === 'tape' ? (
        <>
          <TapeRow
            label="Waist, at the navel"
            placeholder="e.g. 87"
            text={value.waistText}
            onChangeText={(t) => set({ waistText: t })}
          />
          <TapeRow
            label="Neck, below the larynx"
            placeholder="e.g. 38"
            text={value.neckText}
            onChangeText={(t) => set({ neckText: t })}
          />
          {sex === 'female' ? (
            <TapeRow
              label="Hips, at the widest"
              placeholder="e.g. 96"
              text={value.hipText}
              onChangeText={(t) => set({ hipText: t })}
            />
          ) : null}
          <Text style={styles.hint}>
            {heightCm == null
              ? 'Add your height first and we can work this out.'
              : 'Measure relaxed, not sucked in. This is the most accurate option here — closer than most smart scales.'}
          </Text>
        </>
      ) : null}

      {resolved != null && weightKg != null ? (
        <View style={styles.fb}>
          <Ionicons name="checkmark-circle-outline" size={16} color={themeColor} />
          <Text style={styles.fbText}>
            Working from {resolved}%, that's{' '}
            <Text style={styles.fbStrong}>{leanMassKg(weightKg, resolved).toFixed(1)} kg of lean mass</Text>{' '}
            and{' '}
            <Text style={styles.fbStrong}>
              {(weightKg - leanMassKg(weightKg, resolved)).toFixed(1)} kg of fat
            </Text>
            . The lean number is the one your goal is really about
            {value.source !== 'reported'
              ? ', and you can correct it any time once you get a proper reading'
              : ''}
            .
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TapeRow({
  label,
  placeholder,
  text,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  text: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="resize-outline" size={18} color="#a1a1aa" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#52525b"
          keyboardType="decimal-pad"
          value={text}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          maxLength={5}
        />
      </View>
      {text ? <Text style={styles.unit}>cm</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  segBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  segTxt: { fontSize: 12.5, fontWeight: '600', color: '#a1a1aa', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 13, color: '#a1a1aa', marginBottom: 4 },
  input: { fontSize: 15, color: '#ffffff', padding: 0, margin: 0 },
  unit: { fontSize: 14, color: '#71717a', fontWeight: '500' },
  hint: { fontSize: 12, lineHeight: 18, color: '#52525b', marginTop: 2, marginBottom: 4, paddingHorizontal: 4 },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  tierFig: { width: 36, alignItems: 'center', justifyContent: 'center' },
  tierName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#ffffff', lineHeight: 18 },
  tierRange: { fontSize: 13, fontWeight: '700' },
  fb: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#101416',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c3238',
    borderRadius: 12,
    padding: 13,
    marginTop: 10,
  },
  fbText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: '#a1a1aa' },
  fbStrong: { color: '#ffffff', fontWeight: '600' },
});