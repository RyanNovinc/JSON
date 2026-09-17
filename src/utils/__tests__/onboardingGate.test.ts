/**
 * onboardingGate — the "is this install really fresh?" probe behind the
 * first-run gate. Regression for: updating the app replayed onboarding for an
 * existing user because neither gate key was set on their device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasPriorUserData, USER_DATA_KEYS } from '../onboardingGate';

describe('hasPriorUserData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is false on a fresh install with nothing stored', async () => {
    expect(await hasPriorUserData()).toBe(false);
  });

  it('is false when the only data keys hold empty values (boot migrations write [] )', async () => {
    await AsyncStorage.multiSet([
      ['workout_history', '[]'],
      ['meal_plans', ' [ ] '],
      ['weight_tracking_history', '{}'],
      ['my_workout_routines', 'null'],
      ['workout_routines', ''],
    ]);
    expect(await hasPriorUserData()).toBe(false);
  });

  it('ignores a goals profile: the Route intake writes it before the user has finished', async () => {
    await AsyncStorage.setItem('@goals_profile', JSON.stringify({ currentWeightKg: 80 }));
    expect(await hasPriorUserData()).toBe(false);
  });

  it('ignores the gate keys themselves', async () => {
    await AsyncStorage.setItem('@onboarding/intent', 'plan');
    expect(await hasPriorUserData()).toBe(false);
  });

  it.each(USER_DATA_KEYS)('is true when %s holds real data', async (key) => {
    await AsyncStorage.setItem(key, JSON.stringify([{ id: 'x' }]));
    expect(await hasPriorUserData()).toBe(true);
  });

  it('is true for a pre-gate user with a saved routine and no onboarding key at all', async () => {
    await AsyncStorage.setItem(
      'workout_routines',
      JSON.stringify([{ id: 'r1', name: 'Push/Pull/Legs', days: [] }]),
    );
    expect(await AsyncStorage.getItem('@onboarding/completedAt')).toBeNull();
    expect(await AsyncStorage.getItem('onboarding_completed')).toBeNull();
    expect(await hasPriorUserData()).toBe(true);
  });
});
