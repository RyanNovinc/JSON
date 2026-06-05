import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export async function recordImport() {
  const count = Number(await AsyncStorage.getItem('importCount')) || 0;
  await AsyncStorage.setItem('importCount', String(count + 1));
}

export async function shouldPromptReview() {
  const count = Number(await AsyncStorage.getItem('importCount')) || 0;
  const last = Number(await AsyncStorage.getItem('lastReviewPrompt')) || 0;
  const promptedVer = await AsyncStorage.getItem('reviewPromptVersion');
  const version = Constants.expoConfig?.version;
  const enoughUsage = count >= 3;
  const coolOff = Date.now() - last > 1000 * 60 * 60 * 24 * 120; // 120 days
  const newVersion = promptedVer !== version;
  return enoughUsage && coolOff && newVersion;
}

export async function markReviewPrompted() {
  await AsyncStorage.setItem('lastReviewPrompt', String(Date.now()));
  await AsyncStorage.setItem('reviewPromptVersion', Constants.expoConfig?.version ?? '');
}