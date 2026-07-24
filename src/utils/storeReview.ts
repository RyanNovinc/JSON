/**
 * Crash-safe wrapper around `expo-store-review`.
 *
 * `expo-store-review`'s native entry is `requireNativeModule('ExpoStoreReview')`,
 * which THROWS synchronously at import time when the native module isn't in the
 * running binary (a build made before the package was added). Because our review
 * call sites sit in the app's boot chain (App → AppNavigator → ProfileScreen →
 * FeedbackTab), that throw would take down the whole app at launch — and since we
 * ship JS via EAS Update to a live install base, an OTA bundle could land on users
 * still on the old native binary and crash every one of them at boot.
 *
 * So we require the module defensively: if the native side is missing, every
 * function degrades to a silent no-op / `false` instead of throwing. Once an EAS
 * rebuild ships the native module, the real implementation loads and works with
 * no code change here. Import THIS module, never `expo-store-review` directly.
 */

type StoreReviewModule = {
  isAvailableAsync?: () => Promise<boolean>;
  requestReview?: () => Promise<void>;
};

let nativeModule: StoreReviewModule | null = null;
try {
  // Wrapping the require in try/catch catches the synchronous throw from
  // requireNativeModule() on binaries that don't contain ExpoStoreReview.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nativeModule = require('expo-store-review') as StoreReviewModule;
} catch {
  nativeModule = null;
}

/** True only when the native module is present AND the platform can prompt. Never throws. */
export async function isAvailableAsync(): Promise<boolean> {
  try {
    return (await nativeModule?.isAvailableAsync?.()) ?? false;
  } catch {
    return false;
  }
}

/** Requests the native review prompt. Silent no-op if unavailable. Never throws. */
export async function requestReview(): Promise<void> {
  try {
    await nativeModule?.requestReview?.();
  } catch {
    // no-op — the OS owns whether a dialog appears; failures are non-fatal.
  }
}
