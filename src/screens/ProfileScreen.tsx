import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { forceOnboardingShow } from '../onboarding/IntentForkModal';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { WorkoutStorage } from '../utils/storage';
import { getWriteReviewUrl } from '../utils/storeLinks';
import { markRatingEngaged } from '../utils/reviewGate';
import { loadCheckInState, isCheckInDue, daysUntilDue } from '../utils/checkIn';
import { FeedbackModal } from '../components/FeedbackTab';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import AppModal from '../components/AppModal';
import {
  CookbookCaptureCard,
  getCookbookCaptureStatus,
} from '../components/CookbookCaptureCard';

// App version — read from your package.json or app config if you have it,
// otherwise hard-code here. The Workouts redesign memory mentioned v1.2 in
// App Store review, so that's the starting value.
const APP_VERSION = '1.2.0';

/**
 * ProfileScreen — the user-level utility hub.
 *
 * What lives here:
 *  - Training stats strip (sessions this week / this month / all time,
 *    computed from WorkoutStorage.loadWorkoutHistory — same source as the
 *    home screen's week strip; hidden until the first logged workout)
 *  - Weight tracker quick access
 *  - App preferences (theme, weight units)
 *  - About: feedback, free cookbook, rate, json.fit website, privacy, terms
 *  - Developer tools (only shown in __DEV__): reset onboarding, clear data
 *  - App version footer
 *
 * What doesn't live here yet (because there's no user-accounts system):
 *  - Account / sign-in
 *  - Avatar, name, etc.
 *
 * Things this screen REPLACES from elsewhere in the app:
 *  - Theme toggle that used to float top-right on Nutrition
 *  - Weight tracker FAB that used to sit bottom-right on Nutrition
 *  - Profile button that used to sit bottom-left on Nutrition
 *  - Debug console that was buried inside HomeScreen
 *  - Feedback flow that used to be a global slide-from-right panel
 */
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isPinkTheme, setIsPinkTheme, themeColor } = useTheme();
  const { globalUnit, setGlobalUnit } = useWeightUnit();

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // ===== Free cookbook — the row's subtitle reflects whether the user has
  // already signed up, and the modal hosts the shared CookbookCaptureCard.
  // The row deliberately IGNORES the promo banner's dismissed flag: tapping
  // a settings row is intent, so dismissing the Nutrition banner never takes
  // the offer away from someone who goes looking for it here.
  const [cookbookModalVisible, setCookbookModalVisible] = useState(false);
  const [cookbookSubscribed, setCookbookSubscribed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCookbookCaptureStatus().then(({ subscribed }) => {
        if (!cancelled) setCookbookSubscribed(subscribed);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ===== Training stats — sessions this week / this month / all time.
  // Parses history entries exactly like HomeScreen.loadWeekHistory does
  // (timestamp first, then 'YYYY-MM-DD' date strings). Monday week start.
  // Any failure or an empty history simply hides the strip.
  const [trainingStats, setTrainingStats] = useState<{
    week: number;
    month: number;
    total: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const history = await WorkoutStorage.loadWorkoutHistory();
          if (!Array.isArray(history) || history.length === 0) {
            if (!cancelled) setTrainingStats(null);
            return;
          }
          const now = new Date();
          const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          let week = 0;
          let month = 0;
          let total = 0;
          history.forEach((workout: any) => {
            let d: Date | null = null;
            if (workout.timestamp) {
              d = new Date(workout.timestamp);
            } else if (workout.date) {
              const [y, m, dd] = String(workout.date).split('-');
              d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(dd, 10));
            }
            if (!d || isNaN(d.getTime())) return;
            total += 1;
            if (d >= monthStart) month += 1;
            if (d >= weekStart) week += 1;
          });

          if (!cancelled) setTrainingStats(total > 0 ? { week, month, total } : null);
        } catch (error) {
          if (!cancelled) setTrainingStats(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ===== Weekly check-in =====
  // Reloaded on focus so the row settles the moment a check-in closes, rather
  // than still inviting the user to do the thing they just did.
  const [checkIn, setCheckIn] = useState<{ due: boolean; days: number }>({ due: false, days: 7 });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadCheckInState().then((state) => {
        if (cancelled) return;
        setCheckIn({ due: isCheckInDue(state), days: Math.max(0, daysUntilDue(state)) });
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ===== Handlers =====
  const openWeightTracker = () => {
    navigation.navigate('WeightTracker' as never);
  };

  const openGoalsStats = () => {
    navigation.navigate('GoalsStats' as never);
  };

  const openCheckIn = () => {
    navigation.navigate('CheckIn' as never);
  };

  const openExternalUrl = (url: string) => {
    Linking.openURL(url).catch(err =>
      console.error('Failed to open URL:', err)
    );
  };

  const handleRateApp = () => {
    // Tapping through to the store means they've likely rated — silence the
    // automatic prompt permanently. Fire-and-forget so the link opens instantly.
    markRatingEngaged().catch(() => {});
    openExternalUrl(getWriteReviewUrl());
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Show the intro again?',
      'Your workouts, plans and progress are all kept — this only replays the ' +
        'intro screens.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          // Not destructive: nothing is destroyed. The red styling said the
          // opposite of what the action does, which is half of why the row read
          // as dangerous.
          text: 'Show it',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@onboarding/completedAt');
              await AsyncStorage.removeItem('@onboarding/intent');
              // Force the IntentForkModal to show immediately
              forceOnboardingShow();
            } catch (error) {
              console.error('Failed to reset onboarding:', error);
              Alert.alert('Error', 'Failed to reset. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    // ── THE COPY NOW MATCHES WHAT HAPPENS, 19 Aug 2026 ────────────────────
    //
    // This promised "ALL your workouts, meal plans, weight history, and
    // settings" while the reset named 14 keys out of well over a hundred: the
    // weight series, goals profile, roadmap, check-ins, custom meals and every
    // nutrition plan all survived. clearAllData now enumerates and deletes
    // everything bar a short preserve list, so the promise is nearly true —
    // and the two places it still is not are named rather than glossed.
    //
    // Naming the survivors is the point. "Everything" that quietly keeps your
    // theme is a smaller lie than before but still a lie, and a user resetting
    // for privacy reasons deserves to know an install id stays.
    Alert.alert(
      'Clear All Data?',
      'This deletes your workouts, meal plans, weight history, goals and progress. ' +
        'Your theme and units are kept, along with an anonymous install ID. ' +
        'This CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await WorkoutStorage.clearAllData();
              // Reports what actually happened rather than an unconditional
              // success. The old version said "All app data has been deleted"
              // even when the write failed, because clearAllData swallowed its
              // own error and returned void.
              if (result.ok) {
                Alert.alert('Cleared', `${result.removed} items deleted.`);
              } else {
                Alert.alert('Error', 'Could not clear your data. Please try again.');
              }
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Title bar */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            TRAINING STATS — sessions this week / this month / all time.
            Same mini-stat grid language as the Library cards. Hidden
            until the user has logged at least one workout.
            ============================================================ */}
        {trainingStats && (
          <View style={styles.statsStrip}>
            <Text style={styles.statsStripLabel}>TRAINING</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statsCell}>
                <Text style={[styles.statsValue, { color: themeColor }]}>
                  {trainingStats.week}
                </Text>
                <Text style={styles.statsCellLabel}>this week</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCell}>
                <Text style={[styles.statsValue, { color: themeColor }]}>
                  {trainingStats.month}
                </Text>
                <Text style={styles.statsCellLabel}>this month</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCell}>
                <Text style={[styles.statsValue, { color: themeColor }]}>
                  {trainingStats.total.toLocaleString()}
                </Text>
                <Text style={styles.statsCellLabel}>all time</Text>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================
            WEEKLY CHECK-IN — the only row on this screen that changes
            state. When it is due it takes the hero treatment and sits
            above everything; when it is not, it drops to a plain row and
            says when the next one lands.

            It clears on completion rather than on view: clearing when
            someone glances at Profile forgets that they meant to come
            back, and this exists to reach people who are NOT already
            logging. What keeps it from nagging is that it never
            escalates — one dot, no count, no second surface, and the
            flow itself offers to stand the week down.
            ============================================================ */}
        {checkIn.due ? (
          <TouchableOpacity
            style={[styles.heroLink, { borderColor: themeColor, shadowColor: themeColor }]}
            onPress={openCheckIn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start your weekly check-in"
          >
            <View style={[styles.heroLinkIcon, { backgroundColor: themeColor }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#0a0a0b" />
            </View>
            <View style={styles.heroLinkText}>
              <View style={styles.checkInTitleRow}>
                <View style={[styles.checkInDot, { backgroundColor: themeColor }]} />
                <Text style={styles.heroLinkTitle}>Weekly check-in</Text>
              </View>
              <Text style={styles.heroLinkSub}>Ready &middot; takes about a minute</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#71717a" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.row}
            onPress={openCheckIn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Weekly check-in"
          >
            <View style={styles.rowIcon}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#a1a1aa" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Weekly check-in</Text>
              <Text style={styles.rowSub}>
                {checkIn.days <= 0
                  ? 'Ready when you are'
                  : `Next one in ${checkIn.days} ${checkIn.days === 1 ? 'day' : 'days'}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#71717a" />
          </TouchableOpacity>
        )}

        {/* ============================================================
            WEIGHT — demoted from a hero to a plain row.

            It used to carry the same glowing border as the check-in, and
            two heroes stacked on one screen means neither is one. The
            check-in keeps the treatment because it EXPIRES; weight is
            history, always there, and never needs to shout.
            ============================================================ */}
        <TouchableOpacity
          style={styles.row}
          onPress={openWeightTracker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open weight history"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="scale-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Weight</Text>
            <Text style={styles.rowSub}>Your history, trend, and goal</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        {/* ============================================================
            GOALS & STATS — standalone, always-reachable view of
            GoalsProfile (training state, current/goal weight & body fat).
            ============================================================ */}
        <TouchableOpacity
          style={styles.row}
          onPress={openGoalsStats}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View goals and stats"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="trophy-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Goals &amp; stats</Text>
            <Text style={styles.rowSub}>Training state, weight, and goals</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        {/* ============================================================
            PREFERENCES
            ============================================================ */}
        <Text style={styles.sectionTitle}>Preferences</Text>

        {/* Theme toggle */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsPinkTheme(!isPinkTheme)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Switch theme. Current: ${isPinkTheme ? 'pink' : 'cyan'}`}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="color-palette-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Theme</Text>
            <Text style={styles.rowSub}>{isPinkTheme ? 'Pink' : 'Cyan'}</Text>
          </View>
          <View style={[styles.themeSwatch, { backgroundColor: themeColor }]} />
        </TouchableOpacity>

        {/* Weight units toggle — flips globalUnit between kg and lbs */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => setGlobalUnit(globalUnit === 'kg' ? 'lbs' : 'kg')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Switch weight units. Current: ${globalUnit}`}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="speedometer-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Weight units</Text>
            <Text style={styles.rowSub}>{globalUnit === 'kg' ? 'Kilograms' : 'Pounds'}</Text>
          </View>
          <View style={[styles.unitsBadge, { borderColor: themeColor }]}>
            <Text style={[styles.unitsBadgeText, { color: themeColor }]}>
              {globalUnit.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>


        {/* ============================================================
            ABOUT
            ============================================================ */}
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setFeedbackModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Send feedback"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="chatbubble-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Send feedback</Text>
            <Text style={styles.rowSub}>Rate, report a bug, or request a feature</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        {/* Free cookbook — always reachable here, even if the Nutrition promo
            banner was dismissed. Subtitle flips once the user has signed up. */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => setCookbookModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Get the free cookbook"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="book-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Free cookbook</Text>
            <Text style={styles.rowSub}>
              {cookbookSubscribed
                ? 'Sent. Check your inbox'
                : 'All 81 meals as a printable PDF'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={handleRateApp}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Rate JSON.fit on the App Store"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="star-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Rate JSON.fit</Text>
            <Text style={styles.rowSub}>Leave a review on the App Store</Text>
          </View>
          <Ionicons name="open-outline" size={14} color="#71717a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => openExternalUrl('https://json.fit')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Visit json.fit website"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="globe-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Visit json.fit</Text>
            <Text style={styles.rowSub}>Programs, recipes, and the blog</Text>
          </View>
          <Ionicons name="open-outline" size={14} color="#71717a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setPrivacyModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View privacy policy"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="shield-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Privacy policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setTermsModalVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View terms of service"
        >
          <View style={styles.rowIcon}>
            <Ionicons name="document-text-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Terms of service</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        {/* ============================================================
            DATA
            ============================================================ */}
        <Text style={styles.sectionTitle}>Data</Text>

        <TouchableOpacity
          style={styles.row}
          onPress={handleResetOnboarding}
          activeOpacity={0.7}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="refresh-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Reset onboarding</Text>
            {/* Was "Clears data and shows the slideshow again", which was false
                in the one direction that matters: it clears NOTHING. The
                handler removes two onboarding flags and nothing else. The old
                wording scared off the people who wanted this and drew in the
                people who wanted the row above it. */}
            <Text style={styles.rowSub}>Shows the intro again. Keeps everything.</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={handleClearAllData}
          activeOpacity={0.7}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: '#ef4444' }]}>Clear all data</Text>
            <Text style={styles.rowSub}>Deletes your data. Cannot be undone.</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#71717a" />
        </TouchableOpacity>

        {/* Version footer */}
        <Text style={styles.versionText}>JSON.fit v{APP_VERSION}</Text>
      </ScrollView>

      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
      <PrivacyPolicyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
      <TermsOfServiceModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />

      {/* Free cookbook modal — hosts the shared CookbookCaptureCard.
          ignoreDismissed: a deliberate row tap always reaches the offer.
          hideWhenSubscribed=false: subscribed users see the confirmation
          state instead of the form. showDismiss=false: the modal has its
          own close, so the card's X is redundant here. */}
      <AppModal
        visible={cookbookModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCookbookModalVisible(false)}
      >
        <View style={styles.cookbookModalOverlay}>
          <Pressable
            style={styles.cookbookModalBackdrop}
            onPress={() => setCookbookModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.cookbookModalContent}
            pointerEvents="box-none"
          >
            <CookbookCaptureCard
              ignoreDismissed
              hideWhenSubscribed={false}
              showDismiss={false}
              onSubscribed={() => setCookbookSubscribed(true)}
            />
            <TouchableOpacity
              style={styles.cookbookModalClose}
              onPress={() => setCookbookModalVisible(false)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.cookbookModalCloseText}>Close</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // Title bar
  titleBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },

  // ===== Training stats strip =====
  statsStrip: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 12,
  },
  statsStripLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statsCell: {
    flex: 1,
    alignItems: 'center',
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  statsValue: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  statsCellLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Hero link (weight tracker) — home-hero language: black surface,
  // 1.5px themed border, glow.
  heroLink: {
    backgroundColor: '#000',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  heroLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLinkText: { flex: 1 },
  // The dot sits inline with the title rather than floating on the icon: it is
  // a state marker, not a count, and it should read as part of the sentence.
  checkInTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkInDot: { width: 7, height: 7, borderRadius: 4 },
  heroLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroLinkSub: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },

  // Section header
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Row (settings item)
  row: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  rowSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },

  // Theme swatch (right side of theme row)
  themeSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3f3f46',
  },
  unitsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  unitsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ===== Free cookbook modal =====
  cookbookModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cookbookModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cookbookModalContent: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  cookbookModalClose: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cookbookModalCloseText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: '500',
  },

  // Version footer
  versionText: {
    fontSize: 11,
    color: '#52525b',
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: 0.3,
  },
});