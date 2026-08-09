import {
  derivePhase,
  computeTargetLeanMass,
  computeCurrentLeanMass,
  phaseToVolumeTier,
  GoalsProfile,
} from '../goalsProfile';

// Pure-function tests — no storage or AsyncStorage mocks needed.

describe('derivePhase', () => {
  // ── Archetype (a): returning lifter at elevated body fat → recomp ──────────
  //
  // Note this profile has NO goal weight. That is deliberate: an earlier
  // version of derivePhase put the unknown-direction fallback at the TOP of the
  // rule order, so it returned 'maintain' here and the muscle-memory window was
  // unreachable for anyone who hadn't set a goal weight yet. The recomp and cut
  // rules must both be reachable without one.
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

  // ── Archetype (d): mid-range BF wanting size → lean_bulk, NOT bulk ─────────
  //
  // This case used to expect 'bulk' on the reasoning that mid-range body fat
  // plus a gaining direction should fall through to the fuller surplus. It now
  // expects lean_bulk, for two reasons. phase-selection.md's decision matrix
  // gates the full surplus on the user accepting faster gain, not on their body
  // fat — so 'bulk' is a routePreference outcome, not a derived one. And the
  // researched guidance is not to run a large surplus from mid-range body fat,
  // because it mostly adds fat and lengthens the eventual cut.
  it('mid-range BF with gaining direction → lean_bulk (full surplus is opt-in)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      currentBodyFatPct: 16,
      goalWeightKg: 87,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
  });

  // ── routePreference: the only route to 'bulk' ─────────────────────────────

  it('lean trainee who opted into the roomier route → bulk', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 75,
      currentBodyFatPct: 11,
      goalWeightKg: 82,
      trainingState: 'consistent',
      routePreference: 'roomy',
    };
    expect(derivePhase(profile)).toBe('bulk');
  });

  // Changed 9 Aug 2026 (D0): this used to expect lean_bulk. But 19% sits
  // ABOVE the roomy ceiling of 18, and no surplus runs above the band the
  // user chose — the same rule the roadmap opener applies, which is exactly
  // the point: the route screen and the badge derive from ONE authority now.
  it('roomy route above its own ceiling → recomp, not a surplus', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      currentBodyFatPct: 19,
      goalWeightKg: 88,
      trainingState: 'consistent',
      routePreference: 'roomy',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  it('roomy route with unknown BF → lean_bulk (cannot confirm headroom)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 82,
      goalWeightKg: 90,
      trainingState: 'advanced',
      routePreference: 'roomy',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
  });

  it('the lean route never produces bulk, however lean the user is', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 75,
      currentBodyFatPct: 9,
      goalWeightKg: 84,
      trainingState: 'consistent',
      routePreference: 'lean',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
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

  it('no goal weight and nothing else to act on → maintain', () => {
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

  // Same scale weight, less fat, more muscle. This is the definition of a
  // recomp and it was unreachable for experienced lifters before the rule
  // reorder — the maintain fallback caught it first.
  it('holding weight but wanting to be leaner → recomp', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 85,
      currentBodyFatPct: 20,
      goalWeightKg: 85,
      goalBodyFatPct: 13,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('recomp');
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

  // Reachable with a goal BODY FAT and no goal weight at all.
  it('advanced trainee at 22% BF wanting leanness (goalBodyFatPct signal) → cut', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 88,
      currentBodyFatPct: 22,
      goalBodyFatPct: 14,
      trainingState: 'advanced',
    };
    expect(derivePhase(profile)).toBe('cut');
  });

  // A goal body fat only a point or two below current is inside measurement
  // error, so it must not trigger a phase on its own.
  it('goal BF within the noise margin of current BF → maintain', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 88,
      currentBodyFatPct: 17,
      goalBodyFatPct: 15,
      trainingState: 'advanced',
    };
    expect(derivePhase(profile)).toBe('maintain');
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

  it('advanced trainee with no BF data and gaining direction → lean_bulk', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 82,
      goalWeightKg: 90,
      trainingState: 'advanced',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
  });

  // The case that started this: a big gaining goal paired with a much lower
  // goal body fat. Two wrong answers are pinned out here. The leanness signal
  // must never reverse the instruction to gain into a CUT — an earlier
  // version returned 'cut' and put a user asking to grow into a deficit. And
  // since 9 Aug 2026 (D0) the gaining direction no longer forces an immediate
  // surplus either: 20% sits above the balanced ceiling of 18, so the opener
  // is a recomp — the same phase the route screen shows for this profile.
  // The surplus comes when they re-enter the band; the destination is
  // unchanged.
  it('gaining a lot from above the band → recomp first, never cut', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 77,
      currentBodyFatPct: 20,
      goalWeightKg: 90,
      goalBodyFatPct: 13,
      trainingState: 'consistent',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  // ── The band (D0/D1, 9 Aug 2026) ──────────────────────────────────────────

  // D1 pin: the SAME body derives a DIFFERENT phase under a different route.
  // Intended behaviour, not a bug. The route is the user's declaration of the
  // band they want to live in, so the phase follows the declared band: a
  // lean-route user at 16% has said they want to stay under 15%, and recomp
  // is coherent with that. The middle case also pins the EXPLICIT 'balanced'
  // default for the majority who never reach the route picker.
  it('same body, different route → different phase (the route is a declared band)', () => {
    const base: GoalsProfile = {
      currentWeightKg: 80,
      currentBodyFatPct: 16,
      goalWeightKg: 87,
      trainingState: 'consistent',
    };
    expect(derivePhase({ ...base, routePreference: 'lean' })).toBe('recomp'); // ceiling 15
    expect(derivePhase(base)).toBe('lean_bulk'); // no route set → balanced, ceiling 18
    expect(derivePhase({ ...base, routePreference: 'balanced' })).toBe('lean_bulk');
  });

  it('the band is sex-aware: a gaining woman at 25% is inside hers → lean_bulk', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 65,
      currentBodyFatPct: 25, // balanced female band is 20–27
      goalWeightKg: 70,
      trainingState: 'consistent',
      sex: 'female',
    };
    expect(derivePhase(profile)).toBe('lean_bulk');
  });

  it('a gaining woman above her band ceiling → recomp', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 70,
      currentBodyFatPct: 28, // above the 27 female balanced ceiling
      goalWeightKg: 75,
      trainingState: 'consistent',
      sex: 'female',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  // ── The recomp window is sex-aware (D2, 9 Aug 2026) ───────────────────────

  it('new female trainee at 26% BF → recomp (female window opens at 24)', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 70,
      currentBodyFatPct: 26,
      trainingState: 'new',
      sex: 'female',
    };
    expect(derivePhase(profile)).toBe('recomp');
  });

  // 22% on a woman reads like ~13% on a man — she is lean. The old flat
  // threshold of 15 wrongly swept her into the recomp window.
  it('new female trainee at 22% BF is NOT in the recomp window', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 65,
      currentBodyFatPct: 22,
      trainingState: 'new',
      sex: 'female',
    };
    expect(derivePhase(profile)).toBe('maintain');
  });

  // Erring toward recomp is the safe direction, so the unknown case takes the
  // LOWER (male) threshold and the window fires earlier rather than later.
  it('prefer_not_to_say takes the male threshold for the recomp window', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      currentBodyFatPct: 16,
      trainingState: 'new',
      sex: 'prefer_not_to_say',
    };
    expect(derivePhase(profile)).toBe('recomp');
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

describe('computeCurrentLeanMass', () => {
  it('computes current lean mass: 77.3 kg at 20.4% BF → 61.5 kg lean', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 77.3,
      currentBodyFatPct: 20.4,
      trainingState: 'consistent',
    };
    expect(computeCurrentLeanMass(profile)).toBeCloseTo(61.53, 1);
  });

  it('returns undefined when current body fat is unknown', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 77.3,
      trainingState: 'consistent',
    };
    expect(computeCurrentLeanMass(profile)).toBeUndefined();
  });

  // The pair is what makes a goal legible: the gap between them is the muscle
  // the user actually has to add, which is the number a goal weight hides.
  it('pairs with computeTargetLeanMass to give the muscle gap', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 77.3,
      currentBodyFatPct: 20.4,
      goalWeightKg: 90,
      goalBodyFatPct: 13,
      trainingState: 'consistent',
    };
    const gap =
      computeTargetLeanMass(profile)! - computeCurrentLeanMass(profile)!;
    expect(gap).toBeCloseTo(16.77, 1);
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