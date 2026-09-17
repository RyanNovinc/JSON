import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { navigate, getCurrentRoute, navigationRef } from '../utils/navigationRef';
import { useTheme } from '../contexts/ThemeContext';
import { useLiveWorkoutDuration, formatWorkoutDuration } from '../hooks/useLiveWorkoutDuration';
import { isSameWorkoutSession } from '../utils/activeWorkoutSession';
import { TAB_BAR_HEIGHT, TAB_BAR_CREATE_OVERHANG } from '../navigation/CustomTabBar';

/**
 * Resume bar for a workout that is still running.
 *
 * Where it shows depends on where the user is:
 * - Workouts tab: floats ABOVE the tab bar, clear of the Create button's
 *   overhang, so every tab stays visible and tappable.
 * - Any other tab (Nutrition, Cook, Profile): hidden. CustomTabBar shows the
 *   live timer in place of the Workouts tab label instead, so nothing covers
 *   the content (Cook's feed runs full screen under the bar).
 * - Any screen with no tab bar: sits at the bottom of the screen.
 * - Hidden on AddExercise, and on the WorkoutLog screen for this same workout.
 *
 * Mounted once at the root (AppNavigator), outside the navigators, so it reads
 * the route through navigationRef and re-renders on every navigation change.
 */

// Tab routes where CustomTabBar carries the timer, so the bar stays hidden.
const TIMER_IN_TAB_ROUTES = new Set(['Nutrition', 'Cook', 'Profile']);

// Space between the top of the Create button and the bottom of the bar.
const GAP_ABOVE_CREATE = 8;
// Space between the bar and the bottom safe area on screens with no tab bar.
const GAP_ABOVE_SAFE_AREA = 8;

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FloatingWorkoutIndicator() {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { activeWorkout } = useActiveWorkout();
  const liveDuration = useLiveWorkoutDuration();

  // This component lives outside the navigators, so nothing re-renders it when
  // the route changes. Before, it only caught up on the next timer tick; now
  // that its position depends on the tab, it listens for navigation changes so
  // it moves or hides the moment the user switches tabs.
  const [, setNavTick] = useState(0);
  useEffect(() => {
    const ref: any = navigationRef;
    const target = typeof ref?.addListener === 'function' ? ref : ref?.current;
    if (typeof target?.addListener !== 'function') return;
    const unsubscribe = target.addListener('state', () => setNavTick((t: number) => t + 1));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const currentRoute = getCurrentRoute();
  if (!activeWorkout) return null;

  // Hide on AddExercise screen
  if (currentRoute?.name === 'AddExercise') {
    return null;
  }

  // On Nutrition, Cook or Profile the timer lives in the Workouts tab instead.
  if (currentRoute?.name && TIMER_IN_TAB_ROUTES.has(currentRoute.name)) {
    return null;
  }

  // If we're on a WorkoutLog screen, check if it's the same workout as the active one
  if (currentRoute?.name === 'WorkoutLog' && currentRoute?.params) {
    const currentParams = currentRoute.params as any;
    const activeParams = activeWorkout.routeParams;

    // Same day, block AND week: a week-1 session is a different workout from
    // week 2 of the same day, and the bar must stay up to say so.
    const isSameWorkout = isSameWorkoutSession(currentParams, activeParams);

    // Only hide if it's the same workout
    if (isSameWorkout) {
      return null;
    }
  }

  // Workouts tab: sit above the tab bar and the Create button poking out of it.
  // Everywhere else that reaches here has no tab bar: sit above the safe area.
  const onWorkoutsTab = currentRoute?.name === 'Workouts';
  const bottomOffset = onWorkoutsTab
    ? TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + TAB_BAR_CREATE_OVERHANG + GAP_ABOVE_CREATE
    : insets.bottom + GAP_ABOVE_SAFE_AREA;

  const handlePress = () => {
    console.log('🚀 FLOATING INDICATOR: User tapped floating workout indicator');
    console.log('🚀 FLOATING INDICATOR: Active workout state:', {
      dayName: activeWorkout?.dayName,
      duration: activeWorkout?.duration,
      routeParams: activeWorkout?.routeParams
    });

    // Ensure all required route params are present to prevent crashes
    if (!activeWorkout?.routeParams?.day || !activeWorkout?.routeParams?.blockName) {
      console.warn('🚀 FLOATING INDICATOR: Incomplete route params for workout navigation:', activeWorkout?.routeParams);
      return;
    }

    console.log('🚀 FLOATING INDICATOR: Navigating to WorkoutLog with params:', activeWorkout.routeParams);
    navigate('WorkoutLog', activeWorkout.routeParams);
  };

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.indicator, { borderColor: hexA(themeColor, 0.35) }]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Resume ${activeWorkout.dayName} workout, ${formatWorkoutDuration(liveDuration)}`}
      >
        {/* Theme tint over an opaque base: the bar floats over content, so it
            can't be see-through, and the tint follows the theme colour. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: hexA(themeColor, 0.08) }]} />
        <View style={styles.content}>
          <View style={styles.liveDot}>
            <View style={[styles.liveDotHalo, { backgroundColor: hexA(themeColor, 0.22) }]} />
            <View style={[styles.liveDotCore, { backgroundColor: themeColor }]} />
          </View>
          <Text style={styles.workoutName} numberOfLines={1}>
            {activeWorkout.dayName}
          </Text>
          <Text style={[styles.duration, { color: themeColor }]}>
            {formatWorkoutDuration(liveDuration)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={hexA(themeColor, 0.6)} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  indicator: {
    height: 48,
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    gap: 10,
  },
  liveDot: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotHalo: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  liveDotCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  workoutName: {
    flex: 1,
    fontSize: 15,
    color: '#f0f0f2',
    fontFamily: 'Outfit-SemiBold',
  },
  duration: {
    fontSize: 15,
    fontFamily: 'DMMono-Medium',
  },
});