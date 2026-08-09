// src/utils/__tests__/nutritionMacrosPhase.test.ts
//
// Unit tests for computeMacrosPhaseAware and phaseCaloricTarget.
// Pure-function tests — no AsyncStorage or storage mocks needed.

import { computeMacrosPhaseAware, phaseCaloricTarget } from '../nutritionMacros';
import type { GoalsProfile } from '../goalsProfile';
import type { NutritionAnswers } from '../nutritionQuestionnaireStorage';

// Shared base answers covering BMR inputs only (no goal/rate — those are derived from profile).
const baseAnswers: NutritionAnswers = {
  gender: 'male',
  age: 30,
  height: 178, // cm
  activityLevel: 'moderate',
  dietType: 'balanced',
};

// ── phaseCaloricTarget ──────────────────────────────────────────────────────

describe('phaseCaloricTarget', () => {
  const tdee = 2600;
  const weight = 80;

  // ── Bulk: surplus scales with trainingState ─────────────────────────────
  it('bulk, new trainee → +10% surplus', () => {
    expect(phaseCaloricTarget(tdee, 'bulk', weight, undefined, 'new')).toBe(Math.round(tdee * 1.10));
  });

  it('bulk, consistent trainee → +7% surplus', () => {
    expect(phaseCaloricTarget(tdee, 'bulk', weight, undefined, 'consistent')).toBe(Math.round(tdee * 1.07));
  });

  it('bulk, returning trainee → +7% surplus (grouped with consistent)', () => {
    expect(phaseCaloricTarget(tdee, 'bulk', weight, undefined, 'returning')).toBe(Math.round(tdee * 1.07));
  });

  it('bulk, advanced trainee → +5% surplus', () => {
    expect(phaseCaloricTarget(tdee, 'bulk', weight, undefined, 'advanced')).toBe(Math.round(tdee * 1.05));
  });

  it('bulk, no trainingState → +7% default (consistent fallback)', () => {
    expect(phaseCaloricTarget(tdee, 'bulk', weight)).toBe(Math.round(tdee * 1.07));
  });

  // ── Lean bulk: same scaling, smaller magnitudes ─────────────────────────
  it('lean_bulk, new trainee → +7% surplus', () => {
    expect(phaseCaloricTarget(tdee, 'lean_bulk', weight, undefined, 'new')).toBe(Math.round(tdee * 1.07));
  });

  it('lean_bulk, consistent trainee → +5% surplus', () => {
    expect(phaseCaloricTarget(tdee, 'lean_bulk', weight, undefined, 'consistent')).toBe(Math.round(tdee * 1.05));
  });

  it('lean_bulk, returning trainee → +5% surplus (grouped with consistent)', () => {
    expect(phaseCaloricTarget(tdee, 'lean_bulk', weight, undefined, 'returning')).toBe(Math.round(tdee * 1.05));
  });

  it('lean_bulk, advanced trainee → +3% surplus', () => {
    expect(phaseCaloricTarget(tdee, 'lean_bulk', weight, undefined, 'advanced')).toBe(Math.round(tdee * 1.03));
  });

  it('maintain → TDEE unchanged', () => {
    expect(phaseCaloricTarget(tdee, 'maintain', weight)).toBe(tdee);
  });

  it('recomp → small deficit (≤300 kcal)', () => {
    const cal = phaseCaloricTarget(tdee, 'recomp', weight);
    expect(cal).toBeLessThan(tdee);
    expect(tdee - cal).toBeLessThanOrEqual(300);
  });

  it('cut at >20% BF → up to 500 kcal deficit', () => {
    const cal = phaseCaloricTarget(tdee, 'cut', weight, 22);
    expect(tdee - cal).toBeLessThanOrEqual(500);
    expect(cal).toBeLessThan(tdee);
  });

  it('cut at <15% BF → deficit capped by leaner-means-slower ceiling', () => {
    // 80 kg at 12% BF: maxWeeklyLoss = 80 × 0.35% = 0.28 kg → ceiling = (0.28×7700)/7 ≈ 308 kcal
    const cal = phaseCaloricTarget(tdee, 'cut', weight, 12);
    const deficit = tdee - cal;
    expect(deficit).toBeLessThanOrEqual(309); // ceiling ≈ 308
    expect(deficit).toBeGreaterThan(0);
  });

  it('cut at 12% BF has a smaller deficit than cut at 25% BF', () => {
    const calLean  = phaseCaloricTarget(tdee, 'cut', weight, 12);
    const calFatty = phaseCaloricTarget(tdee, 'cut', weight, 25);
    expect(calLean).toBeGreaterThan(calFatty);
  });
});

// ── computeMacrosPhaseAware ────────────────────────────────────────────────

describe('computeMacrosPhaseAware — returns null when required inputs are missing', () => {
  it('returns null when gender is absent', () => {
    const profile: GoalsProfile = { currentWeightKg: 80, trainingState: 'consistent' };
    const answers: NutritionAnswers = { ...baseAnswers, gender: undefined };
    expect(computeMacrosPhaseAware(answers, profile)).toBeNull();
  });

  it('returns null when activityLevel is absent', () => {
    const profile: GoalsProfile = { currentWeightKg: 80, trainingState: 'consistent' };
    const answers: NutritionAnswers = { ...baseAnswers, activityLevel: undefined };
    expect(computeMacrosPhaseAware(answers, profile)).toBeNull();
  });
});

// ── Archetype 1: Lean bulker (consistent, 11% BF, gaining direction) ────────

describe('Archetype 1 — lean bulker: lean_bulk phase', () => {
  const profile: GoalsProfile = {
    currentWeightKg: 75,
    currentBodyFatPct: 11,
    goalWeightKg: 82,
    trainingState: 'consistent',
  };

  it('derives lean_bulk phase and sets +5% calorie surplus', () => {
    const result = computeMacrosPhaseAware(baseAnswers, profile);
    expect(result).not.toBeNull();
    // TDEE for 75 kg, male, 30y, 178 cm, moderate: BMR ≈ 1718, TDEE ≈ 2662
    // Calories = TDEE × 1.05
    const expectedTdee = result!.tdee;
    expect(result!.calories).toBeCloseTo(expectedTdee * 1.05, 0);
  });

  it('protein is ≥ 1.8 g/kg bodyweight', () => {
    const result = computeMacrosPhaseAware(baseAnswers, profile)!;
    expect(result.protein).toBeGreaterThanOrEqual(Math.round(75 * 1.8));
  });

  it('all macro values are positive integers', () => {
    const result = computeMacrosPhaseAware(baseAnswers, profile)!;
    expect(result.calories).toBeGreaterThan(0);
    expect(result.protein).toBeGreaterThan(0);
    expect(result.carbs).toBeGreaterThan(0);
    expect(result.fat).toBeGreaterThan(0);
  });
});

// ── Archetype 2: Cutter (consistent, 22% BF, losing direction) ─────────────

describe('Archetype 2 — cutter: cut phase', () => {
  const profile: GoalsProfile = {
    currentWeightKg: 88,
    currentBodyFatPct: 22,
    goalWeightKg: 78,
    trainingState: 'consistent',
  };

  const cutAnswers: NutritionAnswers = {
    ...baseAnswers,
    gender: 'male',
    age: 35,
    height: 182,
    dietType: 'high_protein',
  };

  it('applies a deficit and stays under 500 kcal/day', () => {
    const result = computeMacrosPhaseAware(cutAnswers, profile)!;
    expect(result.calories).toBeLessThan(result.tdee);
    expect(result.tdee - result.calories).toBeLessThanOrEqual(500);
  });

  it('protein hits the 2.2 g/kg floor on a cut', () => {
    const result = computeMacrosPhaseAware(cutAnswers, profile)!;
    expect(result.protein).toBeGreaterThanOrEqual(Math.round(88 * 2.2));
  });
});

// ── Archetype 3: Returner-recomp (returning, 18% BF, losing direction) ─────

describe('Archetype 3 — returner-recomp: recomp phase', () => {
  const profile: GoalsProfile = {
    currentWeightKg: 80,
    currentBodyFatPct: 18,
    goalWeightKg: 78,
    trainingState: 'returning',
  };

  const recompAnswers: NutritionAnswers = {
    gender: 'female',
    age: 28,
    height: 165,
    activityLevel: 'light',
    dietType: 'balanced',
  };

  it('derives recomp (not cut) due to returning-trainee rule', () => {
    // recomp: returning + elevated BF (18% ≥ 15%) → recomp regardless of direction
    const result = computeMacrosPhaseAware(recompAnswers, profile)!;
    // Recomp deficit is ≤ 300 kcal (maintenance-adjacent), whereas cut would be up to 500
    expect(result.tdee - result.calories).toBeLessThanOrEqual(300);
  });

  it('protein is ≥ 2.0 g/kg for recomp', () => {
    const result = computeMacrosPhaseAware(recompAnswers, profile)!;
    expect(result.protein).toBeGreaterThanOrEqual(Math.round(80 * 2.0));
  });

  it('recomp and a gentle cut (lean person on cut) converge to similar prescriptions', () => {
    const leanCutProfile: GoalsProfile = {
      currentWeightKg: 75,
      currentBodyFatPct: 12,
      goalWeightKg: 72,
      trainingState: 'advanced',
    };
    const leanCutResult    = computeMacrosPhaseAware(baseAnswers, leanCutProfile)!;
    const recompResult     = computeMacrosPhaseAware(recompAnswers, profile)!;
    // Both should be near-maintenance: deficit within 350 kcal for both
    expect(leanCutResult.tdee - leanCutResult.calories).toBeLessThanOrEqual(350);
    expect(recompResult.tdee  - recompResult.calories).toBeLessThanOrEqual(300);
  });
});

// ── trainingState-scaled surplus (end-to-end via computeMacrosPhaseAware) ──

describe('trainingState-scaled surplus', () => {
  const sharedAnswers: NutritionAnswers = {
    gender: 'male',
    age: 30,
    height: 178,
    activityLevel: 'moderate',
    dietType: 'balanced',
  };

  // Reaching the 'bulk' phase now takes TWO things: a gaining direction AND an
  // explicit routePreference of 'roomy', with known body fat at or under that
  // route's ceiling (roomy male: 18%). phase-selection.md gates the full
  // surplus on the user accepting faster gain, so it is a preference outcome
  // rather than a derived one. These profiles previously relied on gaining +
  // no body-fat data falling through to bulk, which now yields lean_bulk —
  // see the last test in this block.
  const bulkBase = {
    currentWeightKg: 80,
    currentBodyFatPct: 12,
    goalWeightKg: 87,
    routePreference: 'roomy',
  } as const;

  const newProfile: GoalsProfile    = { ...bulkBase, trainingState: 'new' };
  const advProfile: GoalsProfile    = { ...bulkBase, trainingState: 'advanced' };
  const retProfile: GoalsProfile    = { ...bulkBase, trainingState: 'returning' };
  const conProfile: GoalsProfile    = { ...bulkBase, trainingState: 'consistent' };

  it('new lifter gets more bulk calories than advanced lifter at identical stats', () => {
    const newResult = computeMacrosPhaseAware(sharedAnswers, newProfile)!;
    const advResult = computeMacrosPhaseAware(sharedAnswers, advProfile)!;
    expect(newResult.calories).toBeGreaterThan(advResult.calories);
  });

  it('returning lifter gets same bulk calories as consistent (not new)', () => {
    const retResult = computeMacrosPhaseAware(sharedAnswers, retProfile)!;
    const conResult = computeMacrosPhaseAware(sharedAnswers, conProfile)!;
    expect(retResult.calories).toBe(conResult.calories);
  });

  it('returning bulk calories are strictly less than new bulk calories', () => {
    const retResult = computeMacrosPhaseAware(sharedAnswers, retProfile)!;
    const newResult = computeMacrosPhaseAware(sharedAnswers, newProfile)!;
    expect(retResult.calories).toBeLessThan(newResult.calories);
  });

  it('new bulk is exactly +10% TDEE, advanced bulk is exactly +5% TDEE', () => {
    const newResult = computeMacrosPhaseAware(sharedAnswers, newProfile)!;
    const advResult = computeMacrosPhaseAware(sharedAnswers, advProfile)!;
    const tdee = newResult.tdee; // same TDEE for same stats
    expect(newResult.calories).toBe(Math.round(tdee * 1.10));
    expect(advResult.calories).toBe(Math.round(tdee * 1.05));
  });

  // The other half of the gate: identical stats and the same gaining direction,
  // but no routePreference, must land on the SMALLER lean_bulk surplus. A user
  // who never asked for faster gain should not be handed bulk calories.
  it('without the roomy route the same stats get the lean_bulk surplus', () => {
    const { routePreference, ...defaultRoute } = bulkBase;
    const profile: GoalsProfile = { ...defaultRoute, trainingState: 'new' };
    const result = computeMacrosPhaseAware(sharedAnswers, profile)!;
    // lean_bulk for a new trainee is +7%, against +10% for bulk.
    expect(result.calories).toBe(Math.round(result.tdee * 1.07));
    expect(result.calories).toBeLessThan(
      computeMacrosPhaseAware(sharedAnswers, newProfile)!.calories,
    );
  });

  // Above the band, the roomier route no longer unlocks any surplus at all —
  // since 9 Aug 2026 (D0) a gaining user above their route's ceiling (roomy:
  // 18%) derives RECOMP, the same phase the route screen shows for the same
  // profile. This test previously expected the lean_bulk surplus, which was
  // the roadmap-vs-badge contradiction pinned as behaviour.
  //
  // Note this uses a 'consistent' trainee deliberately. At 19% body fat a 'new'
  // or 'returning' trainee hits the newbie-recomp window first and never
  // reaches the gaining rules at all, so it would test the wrong branch.
  it('roomy route above its ceiling derives recomp calories, not a surplus', () => {
    const profile: GoalsProfile = {
      ...bulkBase,
      currentBodyFatPct: 19,
      trainingState: 'consistent',
    };
    const result = computeMacrosPhaseAware(sharedAnswers, profile)!;
    // recomp is maintenance-adjacent: tdee minus min(300, 8% of tdee).
    expect(result.calories).toBe(
      result.tdee - Math.min(300, Math.round(result.tdee * 0.08)),
    );
    expect(result.calories).toBeLessThan(result.tdee);
  });
});

// ── Backwards-compatibility: no GoalsProfile ──────────────────────────────
// (Not tested here — that path uses the existing computeMacros, already tested
// implicitly by the nutrition questionnaire flow. Only the new path is new.)

// ── Profile-sourced sex / age / height ─────────────────────────────────────
//
// These three moved onto GoalsProfile with the shared intake. The profile wins
// where it has a value, and the questionnaire answers stay as the fallback so
// nothing written before those fields existed breaks.

describe('sex, age and height resolve from the profile first', () => {
  const answersOnly: NutritionAnswers = {
    gender: 'male',
    age: 30,
    height: 178,
    activityLevel: 'moderate',
    dietType: 'balanced',
  };

  const baseProfile: GoalsProfile = {
    currentWeightKg: 80,
    goalWeightKg: 87,
    trainingState: 'consistent',
  };

  it('falls back to the answers when the profile has none of them', () => {
    const result = computeMacrosPhaseAware(answersOnly, baseProfile)!;
    // Mifflin-St Jeor, male: 10(80) + 6.25(178) - 5(30) + 5 = 1767.5
    expect(result.bmr).toBe(1768);
  });

  it('prefers the profile height over a stale answer', () => {
    const profile: GoalsProfile = { ...baseProfile, heightCm: 190 };
    const result = computeMacrosPhaseAware(answersOnly, profile)!;
    // 10(80) + 6.25(190) - 5(30) + 5 = 1842.5
    expect(result.bmr).toBe(1843);
  });

  it('prefers the profile age over a stale answer', () => {
    const profile: GoalsProfile = { ...baseProfile, ageYears: 50 };
    const result = computeMacrosPhaseAware(answersOnly, profile)!;
    // 10(80) + 6.25(178) - 5(50) + 5 = 1667.5
    expect(result.bmr).toBe(1668);
  });

  it('prefers the profile sex over a stale answer', () => {
    const profile: GoalsProfile = { ...baseProfile, sex: 'female' };
    const result = computeMacrosPhaseAware(answersOnly, profile)!;
    // Female: 10(80) + 6.25(178) - 5(30) - 161 = 1601.5
    expect(result.bmr).toBe(1602);
  });

  it("averages the two formulas for 'prefer not to say'", () => {
    const profile: GoalsProfile = { ...baseProfile, sex: 'prefer_not_to_say' };
    const result = computeMacrosPhaseAware(answersOnly, profile)!;
    // (1767.5 + 1601.5) / 2 = 1684.5
    expect(result.bmr).toBe(1685);
  });

  it('resolves entirely from the profile when the answers carry no BMR fields', () => {
    const profile: GoalsProfile = {
      ...baseProfile,
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
    };
    const bare: NutritionAnswers = {
      activityLevel: 'moderate',
      dietType: 'balanced',
    };
    const result = computeMacrosPhaseAware(bare, profile)!;
    expect(result.bmr).toBe(1768);
  });

  it('still returns null when neither source supplies them', () => {
    const bare: NutritionAnswers = { activityLevel: 'moderate', dietType: 'balanced' };
    expect(computeMacrosPhaseAware(bare, baseProfile)).toBeNull();
  });
});