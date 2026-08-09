// src/components/import/ImportHeroWorkout.tsx
//
// Hero band for the workout import confirmation modal.
//
// Cycles the lat pulldown start/end frames on a 1s interval, the same motion the
// exercise card uses in WorkoutLogScreen. The frames are the same bundled
// require()'d PNGs that exerciseImages.ts points at, referenced directly here
// rather than through resolveExerciseImagePair: this hero always shows lat
// pulldown, so there is no name to resolve and no async miss to handle.
//
// expo-image, not RN's Image. RN's swaps the bitmap with a flash on source
// change; expo-image cross-fades via `transition`, which is what makes the cycle
// read as movement instead of a flicker.

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const FRAMES = {
  blue: {
    start: require('../../../exercise-images/lat-pulldown/blue/start.png'),
    end: require('../../../exercise-images/lat-pulldown/blue/end.png'),
  },
  pink: {
    start: require('../../../exercise-images/lat-pulldown/pink/start.png'),
    end: require('../../../exercise-images/lat-pulldown/pink/end.png'),
  },
};

interface Props {
  /** Match the app's active theme. Defaults to blue, same as exerciseImages.ts. */
  pink?: boolean;
  height?: number;
}

export default function ImportHeroWorkout({ pink = false, height = 132 }: Props) {
  const [phase, setPhase] = useState<'start' | 'end'>('start');

  // No drag gating here, unlike the exercise card: this modal has no gesture
  // competing for the JS thread, so the flip can run unconditionally.
  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p === 'start' ? 'end' : 'start'));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const set = pink ? FRAMES.pink : FRAMES.blue;

  return (
    <View style={[styles.band, { height }]}>
      <Image
        source={phase === 'end' ? set.end : set.start}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={220}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    width: '100%',
    // Pure black, matching the frames' own background. contentFit="contain"
    // letterboxes a 16:9 frame inside this band, so any other colour shows as
    // visible bars down the sides. #000 makes those bars disappear into the art.
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
});