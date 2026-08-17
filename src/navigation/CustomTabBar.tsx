import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, NUTRITION_GREEN } from '../contexts/ThemeContext';
import { useCheckInDue } from '../hooks/useCheckInDue';

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
 *
 * Per-route `tabBarStyle` handling (the built-in bar does all of this for
 * free; we replace it wholesale, so we reimplement the parts we use):
 * - `{ display: 'none' }`   → bar unmounts for that route.
 * - `{ position: 'absolute' }` → OVERLAY mode: the bar floats over the
 *   screen (left/right/bottom 0) instead of taking layout space, and the
 *   rest of the route's tabBarStyle (backgroundColor, borderTopWidth, …) is
 *   merged over the defaults. Used by Cook, whose full-bleed cards run
 *   edge-to-edge under a translucent bar.
 * - The bar reports its real height (0 when hidden) through
 *   BottomTabBarHeightCallbackContext, so useBottomTabBarHeight /
 *   BottomTabBarHeightContext are accurate. Without this, React Navigation
 *   serves a mount-time estimate based on the DEFAULT bar's metrics, which
 *   is what screens were silently reading before.
 *
 * CHECK-IN DOT. The Profile icon carries a dot while a weekly check-in is
 * waiting. It is NOT wired through React Navigation's `tabBarBadge`: that is
 * read off route options, and the state has to be visible from whichever tab
 * the user is actually standing on, not from Profile's own options. It reads
 * the same source of truth ProfileScreen does, so both dots clear on the same
 * write rather than drifting apart.
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

const BAR_BACKGROUND = '#0f0f10';
const ICON_SIZE = 24;

// === Sparkle pulse animation tuning ===
// MAX_SCALE: peak size at top of breath. Higher = more visible.
// DURATION:  one full breath in→out in ms. Higher = slower.
const PULSE_MIN_SCALE = 1.0;
const PULSE_MAX_SCALE = 1.08;
const PULSE_DURATION_MS = 2400;

export function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();
  const checkInDue = useCheckInDue();

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

  // React Navigation provides this setter so a custom bar can report its real
  // height into BottomTabBarHeightContext. The default bar does it via
  // onLayout; if we never call it, every screen reads a stale mount-time
  // estimate instead of our actual 56 + safe-area height.
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  // Honour per-route `options.tabBarStyle` on the focused route. The built-in
  // tab bar does this for free, but we replace it wholesale — so without
  // these checks the option is silently ignored. Read from the FOCUSED route
  // only, so both behaviours are per-route: switching to any other tab
  // renders the bar normally again. Must stay below the hooks above.
  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = StyleSheet.flatten(
    descriptors[focusedRoute.key]?.options?.tabBarStyle as ViewStyle | undefined
  );
  const hidden = focusedTabBarStyle?.display === 'none';
  // Overlay mode: float over the screen instead of taking layout space.
  const overlay = focusedTabBarStyle?.position === 'absolute';

  // The dot's ring punches a hole in whatever the bar is currently painted, so
  // it has to follow the route's backgroundColor. Otherwise the ring stays
  // opaque #0f0f10 over Cook's translucent bar and reads as a dark smudge.
  const dotRingColor = (focusedTabBarStyle?.backgroundColor as string) ?? BAR_BACKGROUND;

  // A hidden bar renders nothing, so no onLayout fires — report 0 explicitly
  // or the height context keeps whatever value it last had.
  useEffect(() => {
    if (hidden) {
      onHeightChange?.(0);
    }
  }, [hidden, onHeightChange]);

  if (hidden) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: bottomPad },
        overlay && styles.overlay,
        // Route-supplied styles win (backgroundColor, borderTopWidth, …).
        focusedTabBarStyle,
      ]}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
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

          const showDot = route.name === 'Profile' && checkInDue;

          return (
            <Pressable
              key={route.key}
              style={styles.tabSlot}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={
                showDot ? `${config.label}, weekly check-in ready` : config.label
              }
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={isFocused ? config.active : config.inactive}
                  size={ICON_SIZE}
                  color={activeColor}
                />
                {showDot && (
                  <View
                    style={[
                      styles.checkInDot,
                      { backgroundColor: themeColor, borderColor: dotRingColor },
                    ]}
                  />
                )}
              </View>
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
    backgroundColor: BAR_BACKGROUND,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  // Overlay mode: anchored over the screen content. position itself comes
  // from the route's tabBarStyle; this pins the edges.
  overlay: {
    left: 0,
    right: 0,
    bottom: 0,
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
  // Fixed to the icon's own box so the dot can hang off its corner without
  // nudging the icon or the label out of line with the other tabs.
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  checkInDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
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
    borderColor: BAR_BACKGROUND,
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