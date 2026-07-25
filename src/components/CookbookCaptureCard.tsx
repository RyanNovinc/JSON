import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity as RNTouchable,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// COOKBOOK EMAIL CAPTURE — mirrors the json.fit website's working signup flow.
// Same AWS subscribe API, same double-opt-in behaviour, distinct source value
// so app vs web signups can be split in analytics.
//
// Used in two places:
//   1. NutritionHomeScreen — promo card, after the first shelf (populated
//      state) and under the example plan card (empty state). Default props.
//   2. ProfileScreen — inside a modal opened by the "Free cookbook" row in
//      the About section. Passes ignoreDismissed + hideWhenSubscribed=false
//      + showDismiss=false, so a deliberate tap always reaches the offer even
//      after the promo banner was dismissed, and an already-subscribed user
//      sees the confirmation instead of the form.
//
// No feature is gated behind the email — it is strictly optional
// (Apple 5.1.1(ii) / Play User Data compliance).
//
// NOTE: adding this makes the app collect an email address. Before shipping,
// update the App Store privacy label + Play Data safety form ("Email Address"
// — collected, linked to user, purpose: marketing/communications, optional)
// and add the newsletter carve-out to the privacy policy.
// ============================================================================
const COOKBOOK_SUBSCRIBE_URL =
  'https://2w2wk18qp8.execute-api.ap-southeast-2.amazonaws.com/subscribe';
const COOKBOOK_DISMISSED_KEY = '@jsonfit_cookbook_capture_dismissed';
const COOKBOOK_SUBSCRIBED_KEY = '@jsonfit_cookbook_capture_subscribed';
// The cookbook keeps the website's green identity (deliberately NOT themeColor
// — the offer should look identical to the site so it reads as the same thing).
const COOKBOOK_GREEN = '#22c55e';
const COOKBOOK_GREEN_DARK = '#041109';

type CookbookStatus = 'idle' | 'sending' | 'success' | 'already' | 'error' | 'farewell';

/**
 * Read the persisted capture state. Exported for ProfileScreen so the
 * "Free cookbook" row can show a "Sent. Check your inbox" subtitle for
 * users who already signed up.
 */
export async function getCookbookCaptureStatus(): Promise<{
  dismissed: boolean;
  subscribed: boolean;
}> {
  try {
    const [dismissed, subscribed] = await Promise.all([
      AsyncStorage.getItem(COOKBOOK_DISMISSED_KEY),
      AsyncStorage.getItem(COOKBOOK_SUBSCRIBED_KEY),
    ]);
    return { dismissed: !!dismissed, subscribed: !!subscribed };
  } catch (error) {
    return { dismissed: false, subscribed: false };
  }
}

interface CookbookCaptureCardProps {
  /**
   * When true, the card renders even if the user dismissed the promo banner.
   * A deliberate tap on the Profile row is intent — dismissal only ever
   * silences the promo placement, never this one. Default false.
   */
  ignoreDismissed?: boolean;
  /**
   * When true (the promo default), a subscribed user never sees the card
   * again on future mounts. When false (Profile modal), a subscribed user
   * sees the persistent "check your inbox" confirmation instead of the form.
   */
  hideWhenSubscribed?: boolean;
  /**
   * Show the X dismiss button. On the promo placements this is true; inside
   * the Profile modal it's false because the modal has its own close.
   */
  showDismiss?: boolean;
  /** Called after a successful signup (including already_subscribed). */
  onSubscribed?: () => void;
}

export function CookbookCaptureCard({
  ignoreDismissed = false,
  hideWhenSubscribed = true,
  showDismiss = true,
  onSubscribed,
}: CookbookCaptureCardProps) {
  // Start hidden until AsyncStorage confirms the card should show —
  // prevents a one-frame flash for users who opted out.
  const [hidden, setHidden] = useState(true);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<CookbookStatus>('idle');
  const farewellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (farewellTimer.current) clearTimeout(farewellTimer.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { dismissed, subscribed } = await getCookbookCaptureStatus();
      if (!mounted) return;
      if (subscribed) {
        if (hideWhenSubscribed) return; // promo placements: stay hidden
        setStatus('already'); // Profile modal: show the confirmation state
        setHidden(false);
        return;
      }
      if (dismissed && !ignoreDismissed) return;
      setHidden(false);
    })();
    return () => {
      mounted = false;
    };
  }, [ignoreDismissed, hideWhenSubscribed]);

  const handleDismiss = async () => {
    // Already signed up? Nothing left to say — just close. The subscribed
    // flag keeps the promo hidden on future mounts anyway.
    if (status === 'success' || status === 'already') {
      setHidden(true);
      return;
    }
    // Not signed up: show a brief farewell pointing at the Profile row so
    // they know dismissing the banner doesn't lose them the offer, then
    // auto-close. Tapping the farewell closes it early.
    setStatus('farewell');
    farewellTimer.current = setTimeout(() => setHidden(true), 4000);
    try {
      await AsyncStorage.setItem(COOKBOOK_DISMISSED_KEY, '1');
    } catch (error) {
      console.error('Failed to persist cookbook dismissal:', error);
    }
  };

  const handleSubmit = async () => {
    if (status === 'sending') return;
    const value = email.trim();
    if (!value || !value.includes('@') || value.length < 5) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      // Same payload shape as the website form. `website` is the site's bot
      // honeypot — sent empty so the Lambda treats this as a human signup.
      const response = await fetch(COOKBOOK_SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ email: value, website: '', source: 'cookbook-app' }),
      });
      const data = await response.json();
      if (data && data.ok) {
        setStatus(data.status === 'already_subscribed' ? 'already' : 'success');
        try {
          await AsyncStorage.setItem(COOKBOOK_SUBSCRIBED_KEY, '1');
        } catch (storageError) {
          console.error('Failed to persist cookbook subscription:', storageError);
        }
        onSubscribed?.();
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Cookbook subscribe failed:', error);
      setStatus('error');
    }
  };

  if (hidden) return null;

  // Farewell state — compact one-line card shown after dismissing the offer
  // before signing up. Auto-closes after 4s; tapping closes it immediately.
  if (status === 'farewell') {
    return (
      <RNTouchable
        style={[styles.cookbookCard, styles.cookbookFarewellCard]}
        onPress={() => {
          if (farewellTimer.current) clearTimeout(farewellTimer.current);
          setHidden(true);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="bookmark-outline" size={16} color="#a1a1aa" />
        <Text style={styles.cookbookFarewellText}>
          No worries. If you change your mind, you can grab the cookbook anytime from your Profile.
        </Text>
      </RNTouchable>
    );
  }

  const succeeded = status === 'success' || status === 'already';

  return (
    <View style={styles.cookbookCard}>
      {/* Green accent strip — full-width top edge, clipped by overflow:hidden
          so the card's rounded corners stay clean. */}
      <View style={styles.cookbookAccent} />

      {showDismiss && (
        <RNTouchable
          style={styles.cookbookClose}
          onPress={handleDismiss}
          activeOpacity={0.7}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss cookbook offer"
        >
          <Ionicons name="close" size={16} color="#71717a" />
        </RNTouchable>
      )}

      <View style={[styles.cookbookHeaderRow, !showDismiss && styles.cookbookHeaderRowNoClose]}>
        <View style={styles.cookbookBook}>
          <Ionicons name="book" size={18} color={COOKBOOK_GREEN} />
        </View>
        <View style={styles.cookbookHeaderText}>
          <Text style={styles.cookbookEyebrow}>FREE COOKBOOK</Text>
          <Text style={styles.cookbookTitle}>All 81 meals as a printable PDF</Text>
          <Text style={styles.cookbookSub}>Plus new meals by email as they land.</Text>
        </View>
      </View>

      {succeeded ? (
        <View style={styles.cookbookSuccessRow}>
          <View style={styles.cookbookTick}>
            <Ionicons name="checkmark" size={13} color={COOKBOOK_GREEN_DARK} />
          </View>
          <Text style={styles.cookbookSuccessText}>
            {status === 'already'
              ? "You're on the list. Check your inbox for the cookbook."
              : 'Almost there. Check your inbox to confirm and unlock your cookbook.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.cookbookFormRow}>
            <TextInput
              style={[styles.cookbookInput, status === 'error' && styles.cookbookInputError]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="your@email.com"
              placeholderTextColor="#52525b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              editable={status !== 'sending'}
              accessibilityLabel="Email address for the free cookbook"
            />
            <TouchableOpacity
              style={[styles.cookbookBtn, status === 'sending' && styles.cookbookBtnSending]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send me the cookbook"
            >
              {status === 'sending' ? (
                <ActivityIndicator size="small" color={COOKBOOK_GREEN_DARK} />
              ) : (
                <Text style={styles.cookbookBtnText}>Send it</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.cookbookNote}>
            {status === 'error'
              ? "That didn't work. Check the email and try again."
              : 'No spam. Unsubscribe anytime.'}
          </Text>
        </>
      )}
    </View>
  );
}

export default CookbookCaptureCard;

// ============================================================================
// STYLES
// ============================================================================
// Sits between shelves at the scroll's normal 16px padding (shelves break
// out with marginHorizontal: -16; this card deliberately doesn't). Website
// green identity on the app's standard #18181b surface + hairline border so
// it reads as part of the app, not an injected banner. marginBottom: 12
// pairs with the next shelf's marginTop: 12 to keep the feed rhythm.
const styles = StyleSheet.create({
  cookbookCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34,197,94,0.35)',
    overflow: 'hidden',
    padding: 14,
    marginBottom: 12,
    position: 'relative',
  },
  cookbookAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COOKBOOK_GREEN,
  },
  cookbookClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cookbookHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingRight: 26,
  },
  cookbookHeaderRowNoClose: {
    paddingRight: 0,
  },
  cookbookBook: {
    width: 38,
    height: 48,
    borderRadius: 6,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    backgroundColor: '#0a2114',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34,197,94,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cookbookHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cookbookEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COOKBOOK_GREEN,
    marginBottom: 3,
  },
  cookbookTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  cookbookSub: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  cookbookFormRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cookbookInput: {
    flex: 1,
    minWidth: 0,
    height: 42,
    backgroundColor: '#0f0f12',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#f0f0f2',
    fontSize: 14,
  },
  cookbookInputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  cookbookBtn: {
    height: 42,
    minWidth: 82,
    borderRadius: 10,
    backgroundColor: COOKBOOK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  cookbookBtnSending: {
    opacity: 0.7,
  },
  cookbookBtnText: {
    color: COOKBOOK_GREEN_DARK,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cookbookNote: {
    color: '#52525b',
    fontSize: 11,
    marginTop: 8,
  },
  cookbookSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34,197,94,0.3)',
    backgroundColor: 'rgba(34,197,94,0.07)',
  },
  cookbookTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COOKBOOK_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cookbookSuccessText: {
    flex: 1,
    color: '#e9e9ec',
    fontSize: 12.5,
    lineHeight: 17,
  },
  // Farewell state — neutral treatment (no green accent pull), single row.
  cookbookFarewellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: '#27272a',
    paddingVertical: 13,
  },
  cookbookFarewellText: {
    flex: 1,
    color: '#a1a1aa',
    fontSize: 12.5,
    lineHeight: 17,
  },
});