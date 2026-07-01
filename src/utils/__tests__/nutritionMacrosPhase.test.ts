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

  // Both profiles have no BF data and gaining direction → 'bulk' phase.
  const newProfile: GoalsProfile    = { currentWeightKg: 80, goalWeightKg: 87, trainingState: 'new' };
  const advProfile: GoalsProfile    = { currentWeightKg: 80, goalWeightKg: 87, trainingState: 'advanced' };
  const retProfile: GoalsProfile    = { currentWeightKg: 80, goalWeightKg: 87, trainingState: 'returning' };
  const conProfile: GoalsProfile    = { currentWeightKg: 80, goalWeightKg: 87, trainingState: 'consistent' };

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
});

// ── Backwards-compatibility: no GoalsProfile ──────────────────────────────
// (Not tested here — that path uses the existing computeMacros, already tested
// implicitly by the nutrition questionnaire flow. Only the new path is new.)
