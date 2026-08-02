// src/utils/__tests__/goalsProfileRepair.test.ts
//
// Diagnostic, not a gate. Answers one question without a device build:
// when the sanitiser drops the corrupt currentBodyFatPct, what happens to the
// macro targets every meal plan is built from?
//
// The stored profile below is the REAL one pulled off the simulator. If any
// value is wrong, correct it here rather than trusting the printout.
//
// Run:  npx jest src/utils/__tests__/goalsProfileRepair.test.ts

import { sanitizeGoalsProfile } from '../goalsProfileStorage';
import { derivePhase } from '../goalsProfile';
import { computeMacrosPhaseAware } from '../nutritionMacros';

// Exactly as found in AsyncStorage under @goals_profile.
const STORED: any = {
  currentWeightKg: 82,
  currentBodyFatPct: 183,   // <-- the height, typed into the body-fat box
  goalWeightKg: 90,         // <-- above current weight
  goalBodyFatPct: 13,
  trainingState: 'consistent',
};

// From nutrition_questionnaire_results. Correct these if they're wrong.
const ANSWERS: any = {
  gender: 'male',
  age: 28,
  height: 183,
  weight: 82,
  activityLevel: 'moderate',
  dietType: 'high_protein',
};

const show = (label: string, profile: any) => {
  let phase = 'n/a';
  let macros: any = null;
  try {
    phase = derivePhase(profile);
  } catch (e: any) {
    phase = `threw: ${e?.message}`;
  }
  try {
    macros = computeMacrosPhaseAware(ANSWERS, profile);
  } catch (e: any) {
    macros = { error: e?.message };
  }
  console.log(
    `\n--- ${label} ---\n` +
      `  profile : ${JSON.stringify(profile)}\n` +
      `  phase   : ${phase}\n` +
      `  macros  : ${macros ? JSON.stringify(macros) : 'null'}`
  );
  return { phase, macros };
};

describe('goals profile repair', () => {
  it('drops the impossible fields', () => {
    const { profile, repaired } = sanitizeGoalsProfile(STORED);
    expect(repaired).toBe(true);
    expect(profile.currentBodyFatPct).toBeUndefined();
    expect(profile.currentWeightKg).toBe(82);
    // 90 kg is a plausible human weight, so it SURVIVES the sanitiser. It is
    // wrong for this user, but wrong-for-you is not the same as impossible,
    // and storage has no way to tell the difference. That one is on the user
    // to correct in Goals & Stats.
    expect(profile.goalWeightKg).toBe(90);
  });

  it('prints what the repair does to the targets', () => {
    const before = show('BEFORE (corrupt, what your plans were built to)', STORED);
    const after = show('AFTER (repaired)', sanitizeGoalsProfile(STORED).profile);

    console.log(
      `\n=== VERDICT ===\n` +
        `  phase   : ${before.phase}  ->  ${after.phase}\n` +
        `  calories: ${before.macros?.calories ?? '?'}  ->  ${after.macros?.calories ?? '?'}\n` +
        `  protein : ${before.macros?.protein ?? '?'}  ->  ${after.macros?.protein ?? '?'}\n`
    );

    expect(true).toBe(true);
  });
});