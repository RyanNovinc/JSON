import {
  derivePhase,
  computeTargetLeanMass,
  phaseToVolumeTier,
  GoalsProfile,
} from '../goalsProfile';

// Pure-function tests — no storage or AsyncStorage mocks needed.

describe('derivePhase', () => {
  // ── Archetype (a): returning lifter at elevated body fat → recomp ──────────
  it('returning lifter at 20% BF → recomp (muscle-memory window)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 90,
      currentBodyFatPct: 20,
      trainingState: 'returning',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  // ── Archetype (b): consistent trainee at high BF wanting leanness → cut ───
  it('consistent trainee at 22% BF with losing direction → cut', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 90,
      currentBodyFatPct: 22,
      goalWeightKg: 83,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('cut');
  });

  // ── Archetype (c): lean consistent trainee wanting size → lean_bulk ────────
  it('consistent trainee at 11% BF with gaining direction → lean_bulk', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 75,
      currentBodyFatPct: 11,
      goalWeightKg: 82,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
  });

  // ── Archetype (d): ambiguous mid-range falls back to goal-weight direction ─
  it('mid-range BF with gaining direction → bulk (goal-weight fallback)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      currentBodyFatPct: 16,
      goalWeightKg: 87,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('bulk');
  });

  // ── Additional coverage ────────────────────────────────────────────────────

  it('mid-range BF with losing direction → cut (goal-weight fallback)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      currentBodyFatPct: 16,
      goalWeightKg: 73,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('cut');
  });

  it('no goal weight set → maintain (conservative default)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('maintain');
  });

  it('goal weight ≈ current weight → maintain', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalWeightKg: 80.5,
      trainingState: 'advanced',
    };
    expect(derivePhase(profile)).toBe('maintain');
  });

  it('new trainee at 18% BF → recomp (newbie-gains window)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 85,
      currentBodyFatPct: 18,
      trainingState: 'new',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  // No cut-first mandate: new trainee at very high BF still gets recomp, not cut.
  // The newbie-gains window lets them add muscle and lose fat simultaneously.
  it('new trainee at 25% BF → recomp not cut (no cut-first mandate)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 95,
      currentBodyFatPct: 25,
      trainingState: 'new',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  it('advanced trainee at 22% BF wanting leanness (goalBodyFatPct signal) → cut', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 88,
      currentBodyFatPct: 22,
      goalBodyFatPct: 14,
      trainingState: 'advanced',
    };
    expect(derivePhase(profile)).toBe('cut');
  });

  it('consistent trainee at 13% BF wanting to gain → lean_bulk', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 72,
      currentBodyFatPct: 13,
      goalWeightKg: 78,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
  });

  it('advanced trainee with no BF data and gaining direction → bulk', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 82,
      goalWeightKg: 90,
      trainingState: 'advanced',
    };
    expect(derivePhase(profile)).toBe('bulk');
  });
});

describe('computeTargetLeanMass', () => {
  it('computes lean mass correctly: 75 kg at 12% BF → 66 kg lean', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalWeightKg: 75,
      goalBodyFatPct: 12,
      trainingState: 'consistent',
    };
    // 75 × (1 − 0.12) = 66
    expect(computeTargetLeanMass(profile)).toBeCloseTo(66);
  });

  it('returns undefined when goalWeightKg is absent', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalBodyFatPct: 12,
      trainingState: 'consistent',
    };
    expect(computeTargetLeanMass(profile)).toBeUndefined();
  });

  it('returns undefined when goalBodyFatPct is absent', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalWeightKg: 75,
      trainingState: 'consistent',
    };
    expect(computeTargetLeanMass(profile)).toBeUndefined();
  });

  it('returns undefined when both optional fields are absent', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      trainingState: 'new',
    };
    expect(computeTargetLeanMass(profile)).toBeUndefined();
  });
});

describe('phaseToVolumeTier', () => {
  it('bulk → high volume tier (MAV→MRV)', () => {
    const result = phaseToVolumeTier('bulk');
    expect(result.tier).toBe('high');
    expect(result.landmark).toBe('MAV→MRV');
  });

  it('lean_bulk → high volume tier (MAV→MRV)', () => {
    const result = phaseToVolumeTier('lean_bulk');
    expect(result.tier).toBe('high');
    expect(result.landmark).toBe('MAV→MRV');
  });

  it('recomp → moderate volume tier (MAV)', () => {
    const result = phaseToVolumeTier('recomp');
    expect(result.tier).toBe('moderate');
    expect(result.landmark).toBe('MAV');
  });

  it('maintain → moderate volume tier (MEV→MAV)', () => {
    const result = phaseToVolumeTier('maintain');
    expect(result.tier).toBe('moderate');
    expect(result.landmark).toBe('MEV→MAV');
  });

  it('cut → low volume tier (MEV→MAV, biased toward MEV)', () => {
    const result = phaseToVolumeTier('cut');
    expect(result.tier).toBe('low');
    expect(result.landmark).toBe('MEV→MAV');
  });

  it('every phase returns a non-empty rationale string', () => {
    const phases = ['bulk', 'lean_bulk', 'recomp', 'maintain', 'cut'] as const;
    phases.forEach((phase) => {
      expect(phaseToVolumeTier(phase).rationale.length).toBeGreaterThan(0);
    });
  });
});
