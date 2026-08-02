/**
 * PRToast.tsx
 *
 * The "best 1RM yet" notice that appears when a logged set beats the best estimated
 * one-rep max in that exercise's history.
 *
 * ── WHY A TOAST AND NOT A MODAL ─────────────────────────────────────────────
 *
 * This fires the instant a set is logged, which is the middle of a workout: the keyboard
 * may be up, a superset may be about to advance, and the next set is seconds away. A
 * modal would demand a dismissal at exactly the wrong moment and turn a reward into an
 * obstacle. So it slides in, holds, and leaves on its own, and the only thing it asks for
 * is a tap it does not need.
 *
 * ── WHY IT IS TAPPABLE ──────────────────────────────────────────────────────
 *
 * Tapping opens that exercise's 1RM progression chart, which already exists. A
 * celebration that leads somewhere is worth more than one that just congratulates, and
 * the chart is the thing a person actually wants to see after being told they got
 * stronger.
 *
 * ── ON THE WORDING ──────────────────────────────────────────────────────────
 *
 * "Best 1RM yet", not "new record". That number is an Epley estimate off a multi-rep set,
 * not a one-rep max anyone actually lifted, and the honest phrasing costs nothing.
 *
 * The other two kinds are measured rather than estimated, so they get to be blunter:
 * "heaviest yet" and "most reps yet" are simply true.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PRKind } from '../utils/prDetection';

/** How long it stays up before dismissing itself. */
const HOLD_MS = 2600;

export interface PRToastData {
  /** The resolved exercise name, so a selected alternative celebrates ITS own record. */
  exerciseName: string;
  /**
   * Which record was broken. Estimated 1RM is the common case; 'weight' catches a heavy
   * top single that estimates lower than a previous high-rep set, and 'reps' is the only
   * kind a bodyweight exercise can ever produce.
   */
  kind: PRKind;
  /** The new best. Display units for '1rm' and 'weight'; a rep count for 'reps'. */
  value: number;
  /** The improvement over the previous best, same units as `value`. */
  improvement: number;
  unit: 'kg' | 'lbs';
  /** Distinguishes two consecutive PRs on the same exercise; see the effect below. */
  id: number;
}

/**
 * Caption and formatting per record kind. Kept together so the label can never drift from
 * the units beside it — a "MOST REPS YET" reading "14.0 kg" would be worse than no toast.
 */
const KIND_PRESENTATION: Record<
  PRKind,
  { caption: string; format: (value: number, unit: string) => string }
> = {
  '1rm': {
    caption: 'BEST 1RM YET',
    format: (value, unit) => `${value.toFixed(1)} ${unit}`,
  },
  weight: {
    caption: 'HEAVIEST YET',
    format: (value, unit) => `${value.toFixed(1)} ${unit}`,
  },
  reps: {
    caption: 'MOST REPS YET',
    format: (value) => `${Math.round(value)} reps`,
  },
};

export interface PRToastProps {
  data: PRToastData | null;
  themeColor: string;
  /** Opens the relevant detail for this exercise. Receives the kind so the caller can
   *  route a reps record somewhere the 1RM chart would be meaningless. */
  onPress: (exerciseName: string, kind: PRKind) => void;
  /** Called once the exit animation has finished, so the parent can clear its state. */
  onDismissed: () => void;
  /** Distance from the bottom of the screen. The caller knows about the bottom bar. */
  bottom: number;
}

export default function PRToast({
  data,
  themeColor,
  onPress,
  onDismissed,
  bottom,
}: PRToastProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyed on data?.id rather than on the object: two PRs on the same exercise moments
  // apart would otherwise be the same value by every field that matters, and the second
  // would never re-run this. The parent hands out a fresh id each time.
  useEffect(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }

    if (!data) {
      anim.setValue(0);
      return;
    }

    // A success notification rather than an impact: this is the one moment in the workout
    // that is genuinely good news, and it should not feel like the same buzz as a button.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    hideTimeout.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Only report dismissal on a completed exit. A cancelled one means a second PR
        // arrived mid-fade, and clearing the parent's state there would delete it.
        if (finished) onDismissed();
      });
    }, HOLD_MS);

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [data?.id, anim, onDismissed, data]);

  if (!data) return null;

  const presentation = KIND_PRESENTATION[data.kind];

  return (
    <Animated.View
      style={[
        styles.root,
        {
          bottom,
          borderColor: `${themeColor}59`,
          borderLeftColor: themeColor,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        activeOpacity={0.75}
        onPress={() => onPress(data.exerciseName, data.kind)}
        accessibilityRole="button"
        accessibilityLabel={`${presentation.caption.toLowerCase()} for ${
          data.exerciseName
        }, ${presentation.format(data.value, data.unit)}, up ${presentation.format(
          data.improvement,
          data.unit,
        )}. Opens the details.`}
      >
        <Ionicons name="trending-up" size={21} color={themeColor} />

        <View style={styles.body}>
          <Text style={styles.caption}>{presentation.caption}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{presentation.format(data.value, data.unit)}</Text>
            <Text style={[styles.delta, { color: themeColor }]}>
              +{data.kind === 'reps' ? Math.round(data.improvement) : data.improvement.toFixed(1)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#55555f" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#111116',
    borderWidth: 1,
    borderLeftWidth: 3,
    // Square, deliberately. A rounded corner on a single-sided accent border reads as a
    // rendering mistake, and the left rule is what marks this as the app talking rather
    // than another row of the sets table.
    borderRadius: 0,
    // Above the bottom bar and the keyboard accessory (400), below the countdown overlay
    // (500) — a rest can start on the same set that sets the record, and the countdown is
    // the more urgent of the two.
    zIndex: 450,
    elevation: 450,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  body: {
    flex: 1,
  },
  caption: {
    color: '#9898a4',
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Regular',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 3,
  },
  value: {
    color: '#f0f0f2',
    fontSize: 17,
    fontFamily: 'DMMono-Medium',
  },
  delta: {
    fontSize: 11,
    fontFamily: 'DMMono-Medium',
  },
});