import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, NUTRITION_GREEN } from '../contexts/ThemeContext';

/**
 * Custom bottom tab bar for JSON.fit.
 *
 * Layout: Workouts | Nutrition | [Create floats above] | Cook | Profile
 *
 * Structure:
 * - The bar is a regular row of 5 slots (4 real tabs + 1 spacer middle slot).
 * - The Create button is absolutely positioned, with its top edge floating
 *   above the bar (TikTok/Instagram pattern) so it draws the eye.
 * - The Create label sits in the bar at the same vertical position as the
 *   other tab labels, for visual consistency.
 * - The sparkle icon inside the Create button has a slow breathing pulse.
 *
 * Tapping Create fires `navigation.getParent()?.navigate('CreateFlow')`.
 */

const TAB_CONFIG: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Workouts: { active: 'barbell', inactive: 'barbell-outline', label: 'Workouts' },
  Nutrition: { active: 'restaurant', inactive: 'restaurant-outline', label: 'Nutrition' },
  Cook: { active: 'flame', inactive: 'flame-outline', label: 'Cook' },
  Profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

// Sentinel route name for the empty center slot.
export const CREATE_ROUTE = '__create__';

const BAR_HEIGHT = 56;
const CREATE_SIZE = 52;
const CREATE_OVERHANG = 14; // How far above the bar's top edge the button pokes

// === Sparkle pulse animation tuning ===
// MAX_SCALE: peak size at top of breath. Higher = more visible.
// DURATION:  one full breath in→out in ms. Higher = slower.
const PULSE_MIN_SCALE = 1.0;
const PULSE_MAX_SCALE = 1.08;
const PULSE_DURATION_MS = 2400;

export function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  // Sparkle scale pulse — loops forever while the tab bar is mounted.
  const pulseScale = useRef(new Animated.Value(PULSE_MIN_SCALE)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: PULSE_MAX_SCALE,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: PULSE_MIN_SCALE,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseScale]);

  const onCreatePress = () => {
    navigation.getParent()?.navigate('CreateFlow' as never);
  };

  const bottomPad = Math.max(insets.bottom, 8);

  // Honour `options.tabBarStyle: { display: 'none' }` on the focused route.
  // The built-in tab bar does this for free, but we replace it wholesale — so
  // without this check the option is silently ignored. Read from the FOCUSED
  // route only, so hiding is per-route: switching back to any other tab
  // re-renders the bar normally. Must stay below the hooks above.
  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = StyleSheet.flatten(
    descriptors[focusedRoute.key]?.options?.tabBarStyle as ViewStyle | undefined
  );
  if (focusedTabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          // Center slot — empty spacer. Create button rendered separately.
          if (route.name === CREATE_ROUTE) {
            return <View key={route.key} style={styles.tabSlot} />;
          }

          const config = TAB_CONFIG[route.name];
          if (!config) {
            return <View key={route.key} style={styles.tabSlot} />;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const activeColor = isFocused 
            ? (route.name === 'Nutrition' ? NUTRITION_GREEN.primary : themeColor)
            : '#52525b';

          return (
            <Pressable
              key={route.key}
              style={styles.tabSlot}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={config.label}
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <Ionicons
                name={isFocused ? config.active : config.inactive}
                size={24}
                color={activeColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeColor,
                    fontWeight: isFocused ? '500' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Floating Create button — pokes above the bar's top edge. */}
      <Pressable
        onPress={onCreatePress}
        style={({ pressed }) => [
          styles.createButton,
          {
            backgroundColor: themeColor,
            shadowColor: themeColor,
            bottom: bottomPad + BAR_HEIGHT - CREATE_SIZE + CREATE_OVERHANG,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create a new plan"
      >
        <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
          <Ionicons name="sparkles" size={26} color="#0a0a0b" />
        </Animated.View>
      </Pressable>

      {/* "Create" label — aligned with other tab labels. */}
      <View
        style={[styles.createLabelWrap, { bottom: bottomPad + 2 }]}
        pointerEvents="none"
      >
        <Text style={[styles.createLabel, { color: themeColor }]} numberOfLines={1}>
          Create
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f0f10',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  row: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  createButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: CREATE_SIZE,
    height: CREATE_SIZE,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0f0f10',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  createLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  createLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});