/**
 * HowItWorksModal.tsx
 *
 * A short education screen that explains how JSON.fit expects you to train:
 * how to pick your weight, what RIR means, when to add load, and how the
 * numbers move from week to week inside a block.
 *
 * Opened from the workout overflow menu ("How it works").
 *
 * Style matches the app: black bg, cyan accent, Outfit for text, DM Mono for
 * labels and numbers.
 *
 * Safe area note: react-native-safe-area-context's SafeAreaView does NOT get
 * correct insets inside a RN Modal (the modal is a separate native layer the
 * provider never measures), so the parent reads the insets and passes them in
 * as topInset / bottomInset. We apply them as plain padding here.
 *
 * Copy note: this screen deliberately uses no hyphens or dashes in its prose.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HowItWorksModalProps {
  visible: boolean;
  onClose: () => void;
  themeColor?: string;
  /** Safe area insets, read by the parent (which is under the provider). */
  topInset?: number;
  bottomInset?: number;
}

const DEFAULT_THEME = '#22d3ee';

// RIR effort scale, from easiest to hardest, used by the little effort meter.
const RIR_SCALE = [
  { rir: '4', label: 'Easy' },
  { rir: '3', label: 'Light' },
  { rir: '2', label: 'Working' },
  { rir: '1', label: 'Hard' },
  { rir: '0', label: 'Failure' },
];

export default function HowItWorksModal({
  visible,
  onClose,
  themeColor = DEFAULT_THEME,
  topInset = 0,
  bottomInset = 0,
}: HowItWorksModalProps) {
  const [mounted, setMounted] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slide, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.root,
          {
            opacity: slide,
            transform: [
              { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          },
        ]}
      >
        <View style={[styles.safe, { paddingTop: topInset }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>How it works</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#9898a4" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <Text style={styles.lede}>
              Your plan gives you a rep target and an RIR target for every set. You choose the
              weight. Here is how to make those numbers work for you.
            </Text>

            {/* Picking your weight */}
            <Section accent={themeColor} kicker="01" title="Picking your weight">
              The app never sets your weight, because only you know what you can lift on the day.
              For each set, pick a load that lets you hit the rep target at the listed RIR. If a
              movement is new to you, start lighter than you think and build up. The first session
              is just for finding your numbers.
            </Section>

            {/* What is RIR */}
            <Section accent={themeColor} kicker="02" title="What is RIR?">
              RIR means reps in reserve. It is how many more reps you could have done before
              failing. So RIR 2 means you stopped with about two clean reps still in the tank, and
              RIR 0 means you took the set all the way to failure. A lower number means you pushed
              closer to your limit, so the set was harder.
            </Section>

            {/* Effort meter */}
            <View style={styles.meterWrap}>
              <View style={styles.meterBar}>
                {RIR_SCALE.map((step, i) => {
                  const t = i / (RIR_SCALE.length - 1);
                  const color = mix('#1f6f7a', themeColor, t);
                  return <View key={step.rir} style={[styles.meterSeg, { backgroundColor: color }]} />;
                })}
              </View>
              <View style={styles.meterLabels}>
                {RIR_SCALE.map((step) => (
                  <View key={step.rir} style={styles.meterTick}>
                    <Text style={styles.meterRir}>{step.rir}</Text>
                    <Text style={styles.meterLabel}>{step.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.meterCaption}>
                The number on top is the RIR. The word under it is roughly how the set should feel.
              </Text>
            </View>

            {/* When to add weight */}
            <Section accent={themeColor} kicker="03" title="When to add weight">
              Hold the same weight until you can hit every rep target at the prescribed RIR with
              clean form. Once a weight feels under control across all of your sets, nudge it up a
              little next time. Earn the jump before you take it. Adding load too early just buries
              your reps and your technique.
            </Section>

            {/* Week to week */}
            <Section accent={themeColor} kicker="04" title="Week to week">
              Across a block the rep targets usually come down, and the RIR target comes down with
              them. Fewer reps at a lower RIR means you are grinding closer to failure, which is the
              signal that the weight is ready to move up.
            </Section>

            {/* Worked example */}
            <View style={[styles.example, { borderColor: hexA(themeColor, 0.3) }]}>
              <Text style={[styles.exampleKicker, { color: themeColor }]}>FOR EXAMPLE</Text>
              <Text style={styles.exampleBody}>
                Week one asks for 10 reps at RIR 2 on the curl and you get 9. You fell a rep short,
                so you hold the weight. Week two asks for 8 reps at RIR 1. That same weight will
                feel easier at 8 reps, so now you have earned the right to push it up. Keep the
                effort high and let the numbers guide the load.
              </Text>
            </View>

            {/* Blocks */}
            <Section accent={themeColor} kicker="05" title="Blocks">
              A block is a run of weeks that build on each other. You open a block with a weight you
              can manage, then chase the shifting rep and RIR targets until it ends. The next block
              resets to fresh targets, ideally with you a little stronger than where you started.
            </Section>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Small reusable section block: cyan kicker number, title, body copy.
function Section({
  accent,
  kicker,
  title,
  children,
}: {
  accent: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.kicker, { color: accent }]}>{kicker}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

// hex + alpha helper
function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Linear blend between two hex colors (used for the effort meter ramp).
function mix(from: string, to: string, t: number): string {
  const a = parse(from);
  const b = parse(to);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    color: '#f0f0f2',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lede: {
    color: '#d4d4d8',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Outfit-Regular',
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  kicker: {
    fontSize: 12,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 1,
    marginRight: 10,
  },
  sectionTitle: {
    color: '#f0f0f2',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  body: {
    color: '#9898a4',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'Outfit-Regular',
  },

  // Effort meter
  meterWrap: {
    marginTop: 2,
    marginBottom: 28,
  },
  meterBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  meterSeg: {
    flex: 1,
    height: '100%',
  },
  meterLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  meterTick: {
    flex: 1,
    alignItems: 'center',
  },
  meterRir: {
    color: '#f0f0f2',
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
  },
  meterLabel: {
    color: '#55555f',
    fontSize: 9,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.4,
    marginTop: 3,
  },
  meterCaption: {
    color: '#55555f',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Outfit-Regular',
    marginTop: 12,
  },

  // Worked example card
  example: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  exampleKicker: {
    fontSize: 10,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  exampleBody: {
    color: '#d4d4d8',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'Outfit-Regular',
  },
});