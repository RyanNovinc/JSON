# Android Parity Audit — JSON.fit

**Branch:** `feature/meal-prep`  
**Snapshot tag:** `pre-android-audit` → `9a766fc6cce40ad4091e6afba22e449ef48aa033`  
**Audit date:** 2026-06-19  
**Status:** Read-only findings. No code modified. Awaiting approval before any fix is applied.

---

## Quick Summary

| Severity | Count | Description |
|---|---|---|
| P0 (crash) | 1 | Live Activity calls on Android (timer flow) |
| P1 (broken) | 14 | Safe area overlap (39 screens), broken payments, missing notifications setup, missing back-handler on 3 modals, recipe deep links broken |
| P2 (polish) | 6 | Fonts invisible/wrong weight, shadows invisible, stale manifest entry, Play Store URL placeholder, keyboard avoidance disabled |

---

## P0 — Crash Risks

### P0-1 · `expo-live-activity` called unconditionally on Android

**File:** `src/contexts/TimerContext.tsx` lines 6, 379, 452, 476, 622–774

The module is top-level imported and called with no Platform guard:

```ts
// line 6 — unconditional import
import { startActivity, updateActivity, stopActivity } from 'expo-live-activity';
```

`syncLiveActivity()` (line 622) has no `Platform.OS === 'ios'` guard at its entry point. Call sites:

| Line | Call |
|---|---|
| 379 | `await stopActivity(timer.liveActivityId, ...)` inside `startTimer` |
| 452 | `await stopActivity(timer.liveActivityId, ...)` inside `stopTimer` |
| 476 | `await stopActivity(timer.liveActivityId, ...)` inside `resetTimer` |
| 662, 741, 758 | `stopActivity` / `startActivity` / `updateActivity` inside `syncLiveActivity` |

Any Android user who starts a rest timer will hit this code path. The correct pattern already exists in `src/utils/liveActivity.ts` (dynamic require + `Platform.OS !== 'ios'` guard at every call site).

**Fix:** Add `if (Platform.OS !== 'ios') return;` as the first line of `syncLiveActivity`, and add the same guard to the three `stopActivity` call sites in `startTimer`, `stopTimer`, and `resetTimer`. Or mirror the conditional-require pattern from `src/utils/liveActivity.ts`.

---

## P1 — Broken Behavior

### P1-1 · Safe area: `SafeAreaView` from `react-native` instead of `react-native-safe-area-context` (39 files)

**Impact:** `android.edgeToEdgeEnabled: true` in `app.json` causes content to draw under the status bar and navigation bar. `SafeAreaView` from `'react-native'` does **not** apply insets on Android with edge-to-edge — the RN one is a no-op there. Every screen using the wrong import has its header content partially obscured by the status bar.

**Affected screen files (30):**

| File | Import line |
|---|---|
| `src/screens/AppIconScreen.tsx` | L2 |
| `src/screens/BlocksScreen.tsx` | L6 |
| `src/screens/DaysScreen.tsx` | L6 |
| `src/screens/MesocycleBlocksScreen.tsx` | L7 |
| `src/screens/ExerciseDetailScreen.tsx` | L7 |
| `src/screens/ExerciseHelpScreen.tsx` | L8 |
| `src/screens/EquipmentPreferencesQuestionnaireScreen.tsx` | L8 |
| `src/screens/FitnessGoalsQuestionnaireScreen.tsx` | L8 |
| `src/screens/FridgePantryQuestionnaireScreen.tsx` | L8 |
| `src/screens/ImportMealPlanScreen.tsx` | L12 |
| `src/screens/ImportRoutineScreen.tsx` | L12 |
| `src/screens/ManualExerciseEntryScreen.tsx` | L9 |
| `src/screens/MealPlanDayScreen.tsx` | L11 |
| `src/screens/MealPlanDaysScreen.tsx` | L7 |
| `src/screens/MealPlanHelpScreen.tsx` | L8 |
| `src/screens/MealPlanTestScreen.tsx` | L8 |
| `src/screens/MealPlanWeeksScreen.tsx` | L7 |
| `src/screens/MealPrepDetailScreen.tsx` | L7 |
| `src/screens/MethodologyScreen.tsx` | L8 |
| `src/screens/NutritionDashboardScreen.tsx` | L7 |
| `src/screens/NutritionOptionalToolsScreen.tsx` | L7 |
| `src/screens/NutritionRequiredSetupScreen.tsx` | L7 |
| `src/screens/OptionalToolsScreen.tsx` | L7 |
| `src/screens/RequiredSetupScreen.tsx` | L6 |
| `src/screens/SampleMealPlansScreen.tsx` | L6 |
| `src/screens/SamplePlanDetailScreen.tsx` | L8 |
| `src/screens/SimplifiedMealPlanDayScreen.tsx` | L9 |
| `src/screens/WeekVolumeScreen.tsx` | L8 |
| `src/screens/WorkoutDashboardScreen.tsx` | L7 |
| `src/screens/WorkoutReviewScreen.tsx` | L7 |

**Affected component files (9):**

| File |
|---|
| `src/components/FloatingWorkoutIndicator.tsx` |
| `src/components/NutritionPaywallScreenSimple.tsx` |
| `src/components/nutrition/NutritionStep1.tsx` through `NutritionStep7.tsx` |

**Fix (all 39 files):** Replace `import { ..., SafeAreaView } from 'react-native'` with `import { SafeAreaView } from 'react-native-safe-area-context'` and remove `SafeAreaView` from the `react-native` destructure. `react-native-safe-area-context` is already installed and used correctly in other screens.

---

### P1-2 · Hardcoded bottom insets on absolute-positioned bars

These screens have `position:'absolute', bottom:0` elements with hardcoded pixel padding that will be obscured by the Android gesture navigation bar.

| File | Style | Hardcoded value | Insets available? |
|---|---|---|---|
| `src/screens/WorkoutLogScreen.tsx` | `bottomBar` (~L3151) | `paddingBottom: 28` | Yes — `insets` at L260, unused here |
| `src/screens/WorkoutLogScreen.tsx` | `overlayHeader` (~L3313) | `paddingTop: 50` | Yes — unused |
| `src/screens/FitnessGoalsQuestionnaireScreen.tsx` | `navigationContainer` (~L2444) | `paddingBottom: 34` | No — `useSafeAreaInsets` not called |
| `src/screens/SamplePlanDetailScreen.tsx` | `footer` (~L416) | `paddingBottom: 30` | Yes — `insets.top` used for header but `insets.bottom` unused on footer |
| `src/screens/MealPlanDaysScreen.tsx` | `datePickerSheet` (~L510) | `paddingBottom: 34` | No — not called |

**Fix:** Replace hardcoded values with `insets.bottom + N` via `useSafeAreaInsets()`.

---

### P1-3 · `FloatingWorkoutIndicator` — wrong safe-area package + hardcoded `marginBottom: 34`

**File:** `src/components/FloatingWorkoutIndicator.tsx` lines ~89, 112

Uses the wrong `SafeAreaView` package (see P1-1) AND has `position:'absolute', bottom:0, marginBottom:34` hardcoded. On Android gesture nav, the floating timer widget will sit behind the navigation bar.

**Fix:** Remove `SafeAreaView` wrapper and switch to `useSafeAreaInsets()` with `paddingBottom: insets.bottom + offset` on the container.

---

### P1-4 · Payments: Android RevenueCat API key is a placeholder

**File:** `src/config/revenueCatConfig.ts` line 23

```ts
androidApiKey: 'goog_YOUR_GOOGLE_API_KEY_HERE',
```

`Purchases.configure()` is called unconditionally with this invalid key. Every purchase attempt on Android will fail. There is no `Platform.OS` guard preventing the paywall from appearing — Android users will reach the paywall, attempt to purchase, and get an error.

**Secondary issue:** The iOS production key (`appl_GISpMfUXbUvJLSKcoRrUZPcZWRp`) is committed in plaintext. Both keys should move to environment variables before shipping.

**Fix:** Obtain a Google Play Billing / RevenueCat Android API key and set it. Consider `process.env.REVENUECAT_ANDROID_KEY` loaded via `app.config.js` extra.

---

### P1-5 · Payments: `com.android.vending.BILLING` permission likely missing

**File:** `android/app/src/main/AndroidManifest.xml`

Google Play Billing requires the `BILLING` permission. It is not explicitly declared. RevenueCat's AAR dependency may inject it via manifest merger, but it should be verified after `prebuild` and declared explicitly.

**Fix:** Add `<uses-permission android:name="com.android.vending.BILLING" />` to `AndroidManifest.xml` (or confirm it appears in the merged manifest after build).

---

### P1-6 · Notifications: `POST_NOTIFICATIONS` permission missing (Android 13+)

**File:** `AndroidManifest.xml` / `app.json` android.permissions

Android 13 (API 33+) requires `android.permission.POST_NOTIFICATIONS` declared in the manifest AND a runtime permission request before any notification can appear. Neither exists. `requestPermissionsAsync()` in `src/contexts/CookTimerContext.tsx:68–70` silently fails on modern Android.

**Fix:** Add `POST_NOTIFICATIONS` to `app.json` `android.permissions` array (Expo will inject it into the manifest). Add a `Notifications.requestPermissionsAsync()` call with proper Android 13 handling.

---

### P1-7 · Notifications: No Android notification channel setup

Android 8.0+ (API 26+) requires a notification channel before posting any notification. `Notifications.setNotificationChannelAsync(...)` is never called anywhere in `src/`. Without a channel, `scheduleNotificationAsync` fails silently on all Android 8.0+ devices.

**Fix:** Call `Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.DEFAULT })` at app startup (before scheduling any notification).

---

### P1-8 · Notifications: No `google-services.json` — FCM/push unavailable

`android/app/google-services.json` does not exist. Push notifications (FCM tokens) will not work on Android without this file. If push is currently iOS-only via APNs, this is a known gap rather than a regression, but it must be resolved before shipping Android.

**Fix:** Add the app to a Firebase project, download `google-services.json`, place it at `android/app/google-services.json`, and add the `@react-native-firebase/app` or `expo-notifications` Firebase plugin to `app.json`.

---

### P1-9 · Back button missing on 3 modals

Three `<Modal>` components are missing `onRequestClose`, so the Android hardware back button does nothing while they're visible.

| File | Line | Modal | Fix |
|---|---|---|---|
| `src/components/PurchaseSuccessModal.tsx` | ~157 | Purchase success celebration | Add `onRequestClose={handleClose}` |
| `src/components/import/ImportConfirmationModal.tsx` | ~135 | Workout import confirmation | Add `onRequestClose={onCancel}` |
| `src/components/import/MealPlanConfirmationModal.tsx` | ~63 | Meal plan import confirmation | Add `onRequestClose={onCancel}` |

All other modals audited (`HowItWorksModal`, `IntentForkModal`, `TimerModal`, `DeleteSetModal`, `ExerciseNotesModal`, `AddItemModal`, `OneRMProgressionModal`, `RepSchemeModal`, `WorkoutHeatmapModal`, `PrivacyPolicyModal`, `TermsOfServiceModal`, `ImportFeedbackModal`, `RestorePurchasesModal`, `FridgePantryPreferencesModal`, `WeightEntrySheet`, `AILaunchSheet`, `FinishWorkoutModal`) correctly have `onRequestClose`.

---

### P1-10 · Deep linking: `/r` recipe path not intercepted on Android

**File:** `android/app/src/main/AndroidManifest.xml` intentFilter (lines 32–37)

Android's App Link intentFilter only intercepts `pathPrefix="/p/"`. The JS navigation config also handles `/r?meal=...&plate=...` (RecipeDetail) but Android never passes those URLs to the app — they open in the browser instead.

iOS handles all `https://json.fit/*` paths via `applinks:json.fit` (no path restriction), so recipe sharing links work on iOS and silently fail on Android.

**Fix:** Add a second intentFilter in `app.json` `intentFilters` for `pathPrefix="/r"` (or remove the path restriction and use `pathPattern=".*"` if the domain is fully owned).

---

## P2 — Polish / Minor Issues

### P2-1 · Custom fonts not loaded — fontWeight falls back on Android

No custom fonts are registered anywhere (`expo-font` is not installed, no `useFonts`/`Font.loadAsync`, no fonts array in `app.json`). Three font families are referenced but never loaded:

- `Outfit-Bold`, `Outfit-SemiBold`, `Outfit-Medium` — `WorkoutLogScreen.tsx`
- `DMMono-Regular`, `DMMono-Medium` — `WorkoutLogScreen.tsx`
- `SpaceMono-Regular` — `SplashScreen.tsx:136`

Additionally, **1,302 uses of non-standard numeric `fontWeight`** (`'500'`, `'600'`, `'800'`, `'900'`, `'300'`) across 113 files will be snapped to the nearest Android system weight (usually `'400'` or `'700'`). Semi-bold text throughout the app will appear as regular weight on Android. This is a pervasive cosmetic delta from iOS.

**Fix (fonts):** Install `expo-font`, add font files to `assets/`, register with `useFonts` in `App.tsx`.  
**Fix (weights):** Ship the fonts that carry those weights, or accept system-font weight snapping as acceptable for launch.

---

### P2-2 · Shadow styles without `elevation` — invisible on Android

| File | Location | Issue |
|---|---|---|
| `src/onboarding/IntentForkModal.tsx` | `barbell` style (~L416) | `shadowColor/Opacity/Offset/Radius` present, no `elevation` |
| `src/components/nutrition/NutritionStep2.tsx` | inline `thumbStyle` on `<Slider>` (~L135) | same |

**Fix:** Add `elevation: N` alongside shadow props, or use `Platform.select`.

---

### P2-3 · Play Store URL placeholder not filled in

**Files:**  
- `src/screens/ProfileScreen.tsx:132`  
- `src/components/FeedbackTab.tsx:111`

Both reference `YOUR_PACKAGE_ID` in the Android Play Store URL string. These links will 404 on Android.

**Fix:** Replace `YOUR_PACKAGE_ID` with `com.RyanNovinc.JSON`.

---

### P2-4 · Stale `exp+json://` scheme in AndroidManifest

**File:** `android/app/src/main/AndroidManifest.xml` line ~30

`scheme="exp+json"` is a leftover Expo Go development artifact. In production builds it is harmless but dead — no JS handler handles this scheme. Safe to remove.

---

### P2-5 · `RECORD_AUDIO` over-declared

`android/app/src/main/AndroidManifest.xml` declares `RECORD_AUDIO` but the app only plays audio (timer ding via `expo-av`). This is an unnecessary sensitive permission that may trigger Play Store review questions.

**Fix:** Remove `RECORD_AUDIO` from the manifest.

---

### P2-6 · `KeyboardAvoidingView` disabled on Android (nutrition questionnaire)

`behavior` prop is only set for iOS (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`), so the keyboard covers input fields on Android in several nutrition questionnaire screens. Affects: `NutritionStep4.tsx` (`KeyboardAwareScreen`), `N3AboutYouScreen.tsx`, `N5DietTypeScreen.tsx`, `N5bAllergiesScreen.tsx`, `N7LocationScreen.tsx`, `N8BudgetScreen.tsx`, `FridgePantryScreen.tsx`.

**Fix:** Use `behavior="height"` on Android, or switch to `react-native-keyboard-aware-scroll-view`.

---

## Items Confirmed OK

- All other `<Modal>` components (14+) correctly have `onRequestClose`.
- `src/onboarding/IntentForkModal.tsx` — `onRequestClose` present, handled correctly.
- `src/navigation/CustomTabBar.tsx` — correctly uses `useSafeAreaInsets()` with `Math.max(insets.bottom, 8)`.
- `src/utils/liveActivity.ts` — Live Activity fully guarded (`Platform.OS !== 'ios'` + conditional require). The correct pattern to copy.
- `app.json` `NSSupportsLiveActivities` is inside `ios.infoPlist` block — correctly iOS-only.
- `Alert.prompt` (iOS-only) — correctly has custom Modal fallbacks on Android in `DaysScreen`, `BlocksScreen`, `MesocycleBlocksScreen`.
- Deep link JS handler (`src/navigation/AppNavigator.tsx`) handles `/p/:shareId`, `/p/program/<slug>`, and `/r` paths correctly in JS — the gap is only the native Android intentFilter not capturing `/r`.

---

## Manual Test Checklist

See next section — or open `ANDROID_TEST_CHECKLIST.md` if written separately.

---

# Android Manual Test Checklist

Run these on the emulator (or physical Android device). Test in order — earlier steps set up state for later ones.

---

### BLOCK A — Safe Area / Status Bar Overlap

These can all be checked quickly by navigating to each screen and visually confirming the top of the content is NOT obscured by the status bar.

**A1 — BlocksScreen header overlap**
1. Launch app → tap Workouts tab → tap any program to open blocks
2. Observe: header title should be fully visible BELOW the status bar
3. Expected (after fix): clear; Current: content may underlap status bar (P1-1)

**A2 — DaysScreen header overlap**
1. From blocks, tap any block to open days
2. Observe top of screen
3. Expected: header clear; Current: may overlap

**A3 — WorkoutLogScreen bottom Finish button**
1. Start a workout (tap a day → Start Workout)
2. Scroll to bottom — or look for the Finish/Log Set button bar
3. On a device with gesture navigation: verify the button is fully above the gesture handle area
4. Expected (after fix): button fully visible; Current: partially obscured (P1-2)

**A4 — FloatingWorkoutIndicator position**
1. Start a rest timer during a workout (log a set → rest timer starts)
2. Minimize or navigate to another screen — the floating workout indicator should appear
3. Check it is NOT behind the bottom navigation bar
4. Expected (after fix): fully visible; Current: clipped under nav bar (P1-3)

**A5 — SamplePlanDetailScreen footer button**
1. Tap Browse or any sample plan flow → tap a sample plan to open detail
2. Scroll to the bottom — "Import this Plan" button
3. Verify the button is NOT behind the navigation bar
4. Expected (after fix): clear; Current: clipped (P1-2)

---

### BLOCK B — Hardware Back Button on Modals

**B1 — PurchaseSuccessModal back button (P1-9)**
1. Trigger a purchase (or find a way to show `PurchaseSuccessModal` — may require completing a test purchase or temporarily hardcoding `visible={true}`)
2. When the success modal appears, press the Android back button (or swipe gesture)
3. Expected (after fix): modal closes; Current: nothing happens

**B2 — ImportConfirmationModal back button (P1-9)**
1. Navigate to import a shared workout (use a shared link or the import flow)
2. When the import confirmation modal appears, press back
3. Expected (after fix): modal closes / import cancelled; Current: nothing happens

**B3 — MealPlanConfirmationModal back button (P1-9)**
1. Navigate to import a meal plan (use a shared link or test import flow)
2. When the meal plan confirmation modal appears, press back
3. Expected (after fix): modal closes; Current: nothing happens

**B4 — IntentForkModal back button (confirm OK)**
1. Clear app data / fresh install to trigger onboarding
2. When the IntentForkModal (full-screen first-launch fork) appears, press back
3. Expected: the modal closes (or a dismissal action fires) — should already work (confirmed `onRequestClose` present)

**B5 — HowItWorksModal back button (confirm OK)**
1. Find the "How It Works" modal trigger (likely in onboarding or a help button)
2. When open, press back
3. Expected: modal closes — should already work

---

### BLOCK C — Deep Links

**C1 — Share link opens ImportSharedContent**
1. In a browser or ADB shell, open: `adb shell am start -a android.intent.action.VIEW -d "https://json.fit/p/testshare123" com.RyanNovinc.JSON`
2. Expected: app opens to ImportSharedContent screen
3. If app opens to home instead: intentFilter not registered / App Link verification failed

**C2 — Recipe link falls through to browser (known gap)**
1. `adb shell am start -a android.intent.action.VIEW -d "https://json.fit/r?meal=someid" com.RyanNovinc.JSON`
2. Expected (current): browser opens (intentFilter for `/r` missing on Android)
3. Expected (after fix): app opens RecipeDetail screen

---

### BLOCK D — Rest Timer / Live Activity (P0-1)

**D1 — Rest timer does not crash on Android**
1. Start a workout
2. Log a set — rest timer should start
3. Observe: app should NOT crash
4. After fix: timer runs normally (no Live Activity UI on Android, but no crash)
5. Current behavior: likely crashes in `syncLiveActivity` → `startActivity`

**D2 — Rest timer counts down on Android**
1. Same as D1 — after the crash is fixed
2. Set duration, start timer, let it count to 0
3. Expected: timer completes, notification fires (if permissions granted), no crash

---

### BLOCK E — Notifications

**E1 — Notification permission prompt**
1. Fresh install on Android 13+ emulator
2. First action that requests notifications (cook timer, rest timer, or any feature using expo-notifications)
3. Expected (after fix): system permission dialog appears
4. Current: no prompt, notification silently fails

**E2 — Cook timer notification fires**
1. Set a cook timer in any recipe
2. Put app in background
3. Expected: notification appears when timer expires
4. Current: likely fails silently (no channel setup, no permission)

---

### BLOCK F — Payments

**F1 — Paywall loads without crash**
1. Navigate to any paywall (Nutrition or any locked feature)
2. Expected (current): paywall appears (even with placeholder key)
3. Tap "Subscribe" or "Purchase"
4. Expected (current with placeholder key): error/failure — do not expect success
5. After fix (real Android key): purchase sheet appears from Google Play

**F2 — Restore purchases on Android**
1. On paywall, find "Restore Purchases"
2. Tap it
3. Expected: some response (error with placeholder key; success after fix)

---

### BLOCK G — Fonts / Weight (Visual Comparison)

**G1 — Semi-bold text appears correct weight**
1. Open any screen with bold section headers (e.g., HomeScreen, WorkoutLogScreen)
2. Compare visual weight of headers vs iOS screenshots
3. Expected (after loading custom fonts): visually matches iOS
4. Current: text appears regular-weight where iOS shows semi-bold/medium

---

### BLOCK H — Play Store Links

**H1 — Rate / Feedback link works**
1. Navigate to Profile → Feedback or any "Rate the app" action
2. Tap the link
3. Expected (after fix): Google Play store page opens
4. Current (with `YOUR_PACKAGE_ID`): 404 / Play Store error

---

*End of audit. No code was modified. All findings are proposals pending approval.*
