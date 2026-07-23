import { Platform } from 'react-native';

const IOS_APP_ID = '6758357834';
const ANDROID_PACKAGE = 'com.RyanNovinc.JSON';

export const IOS_LISTING_URL = `https://apps.apple.com/app/id${IOS_APP_ID}`;
export const ANDROID_LISTING_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** Store listing page. */
export function getStoreListingUrl(): string {
  return Platform.OS === 'ios' ? IOS_LISTING_URL : ANDROID_LISTING_URL;
}

/** Opens the write-a-review sheet on iOS; the listing on Android. */
export function getWriteReviewUrl(): string {
  return Platform.OS === 'ios'
    ? `${IOS_LISTING_URL}?action=write-review`
    : ANDROID_LISTING_URL;
}
