import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalsProfile } from './goalsProfile';

const KEY = '@goals_profile';

export async function loadGoalsProfile(): Promise<GoalsProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoalsProfile;
  } catch (e) {
    console.error('loadGoalsProfile failed', e);
    return null;
  }
}

export async function saveGoalsProfile(profile: GoalsProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('saveGoalsProfile failed', e);
  }
}

export async function updateGoalsProfileField<K extends keyof GoalsProfile>(
  field: K,
  value: GoalsProfile[K]
): Promise<void> {
  const current = await loadGoalsProfile();
  if (!current) return;
  await saveGoalsProfile({ ...current, [field]: value });
}

export async function clearGoalsProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearGoalsProfile failed', e);
  }
}

// Returns true only when the minimum required fields are present.
// goalBodyFatPct, goalWeightKg, and currentBodyFatPct are all optional.
export async function hasGoalsProfile(): Promise<boolean> {
  const profile = await loadGoalsProfile();
  return profile != null && profile.currentWeightKg > 0 && !!profile.trainingState;
}
