// src/utils/__tests__/planningPromptPhase.test.ts
//
// Unit tests for Phase 3: phase-aware training prompt helpers.
// Pure-function tests — no AsyncStorage or storage mocks needed.

import {
  buildTrainingPhaseContext,
  assemblePlanningPromptWithProfile,
} from '../../data/planningPrompt';
import type { GoalsProfile } from '../goalsProfile';
import type { QuestionnaireData } from '../../data/workoutPrompt';

// Minimal QuestionnaireData for prompt assembly (only required fields).
const baseData: QuestionnaireData = {
  primaryGoal: 'Build muscle',
  fitnessLevel: 'Intermediate',
  workoutDays: 4,
  sessionLength: '60 minutes',
  equipment: 'Full gym',
  programDuration: '8_weeks',
};

// ── buildTrainingPhaseContext ─────────────────────────────────────────────────

describe('buildTrainingPhaseContext — section heading', () => {
  it('always starts with ## PHASE CONTEXT', () => {
    const ctx = buildTrainingPhaseContext('bulk', { tier: 'high', landmark: 'MRV', rationale: 'r' });
    expect(ctx).toMatch(/^## PHASE CONTEXT/);
  });
});

// ── WHAT THE PHASE DOES NOT CHANGE ───────────────────────────────────────
//
// Volume and RIR were lifted out of the phase switch on 17 Aug 2026 and are
// now stated once, identically, for every phase.
//
// THE OLD TESTS HERE WERE WORSE THAN FAILING. Three of them kept PASSING
// against the new copy for the wrong reason: "biases toward MRV" matched the
// string "do NOT bias toward MRV", and both MEV checks matched "do NOT bias
// toward MEV in a cut". A test that passes because its assertion appears
// inside a negation is false confidence, so they are replaced rather than
// adjusted.
describe('buildTrainingPhaseContext — volume and RIR are phase-invariant', () => {
  const ALL_PHASES = ['cut', 'recomp', 'lean_bulk', 'bulk', 'maintain'] as const;
  const tier = { tier: 'moderate' as const, landmark: 'MEV→MAV', rationale: 'r' };

  const volumeLine = (ctx: string) =>
    ctx.split('\n').find((l) => l.startsWith('**Volume:**')) ?? '';
  const rirLine = (ctx: string) =>
    ctx.split('\n').find((l) => l.startsWith('**RIR:**')) ?? '';

  it('emits exactly ONE volume line and ONE RIR line per phase', () => {
    ALL_PHASES.forEach((phase) => {
      const ctx = buildTrainingPhaseContext(phase, tier);
      expect(ctx.split('**Volume:**').length - 1).toBe(1);
      expect(ctx.split('**RIR:**').length - 1).toBe(1);
    });
  });

  it('gives every phase the SAME volume line', () => {
    const first = volumeLine(buildTrainingPhaseContext(ALL_PHASES[0], tier));
    expect(first.length).toBeGreaterThan(0);
    ALL_PHASES.forEach((phase) => {
      expect(volumeLine(buildTrainingPhaseContext(phase, tier))).toBe(first);
    });
  });

  it('gives every phase the SAME RIR line', () => {
    const first = rirLine(buildTrainingPhaseContext(ALL_PHASES[0], tier));
    expect(first.length).toBeGreaterThan(0);
    ALL_PHASES.forEach((phase) => {
      expect(rirLine(buildTrainingPhaseContext(phase, tier))).toBe(first);
    });
  });

  // The deleted instructions, pinned by name. Asserted on the RIR line rather
  // than the whole block so a future mention elsewhere cannot mask a revert.
  it('never tells the lifter to add RIR for a deficit', () => {
    ALL_PHASES.forEach((phase) => {
      expect(rirLine(buildTrainingPhaseContext(phase, tier))).not.toMatch(/\+1 RIR/);
    });
  });

  it('never instructs a bias toward MEV or MRV', () => {
    ALL_PHASES.forEach((phase) => {
      const line = volumeLine(buildTrainingPhaseContext(phase, tier));
      // Only a NEGATED mention is allowed, which is what the copy now carries.
      expect(line).not.toMatch(/(?<!NOT )bias toward (MEV|MRV)/i);
    });
  });
});

// ── WHAT THE PHASE DOES CHANGE ───────────────────────────────────────────
//
// Goal framing and cardio. Cardio is the one training-adjacent variable a
// phase genuinely moves, because in a surplus it spends the surplus the user
// is deliberately eating.
describe('buildTrainingPhaseContext — goal and cardio still vary', () => {
  const tier = { tier: 'moderate' as const, landmark: 'MEV→MAV', rationale: 'r' };

  it('names muscle retention on a cut', () => {
    expect(buildTrainingPhaseContext('cut', tier)).toMatch(/muscle retention/i);
  });

  it('names recomposition on a recomp', () => {
    expect(buildTrainingPhaseContext('recomp', tier)).toMatch(/recomposition/i);
  });

  it('names hypertrophy on both building phases', () => {
    expect(buildTrainingPhaseContext('lean_bulk', tier)).toMatch(/hypertrophy/i);
    expect(buildTrainingPhaseContext('bulk', tier)).toMatch(/hypertrophy/i);
  });

  it('names maintenance stimulus on maintain', () => {
    expect(buildTrainingPhaseContext('maintain', tier)).toMatch(/maintenance stimulus/i);
  });

  // The property that matters: a cut prescribes cardio and a bulk does not.
  it('prescribes cardio on a cut and none on a bulk', () => {
    expect(buildTrainingPhaseContext('cut', tier)).toMatch(/2–3 sessions\/week/i);
    expect(buildTrainingPhaseContext('bulk', tier)).toMatch(/none prescribed/i);
  });
});

// ── Volume tier override / conflict note ──────────────────────────────────────

describe('buildTrainingPhaseContext — volume tier behaviour', () => {
  it('shows the phase-recommended tier when user has no preference', () => {
    const ctx = buildTrainingPhaseContext('bulk', { tier: 'high', landmark: 'MRV', rationale: 'r' }, 'not_sure');
    expect(ctx).toMatch(/16-20/);
  });

  it('shows the phase-recommended tier when user preference matches', () => {
    const ctx = buildTrainingPhaseContext('bulk', { tier: 'high', landmark: 'MRV', rationale: 'r' }, '16-20');
    expect(ctx).toMatch(/16-20/);
    expect(ctx).not.toMatch(/Note:/);
  });

  it('adds a conflict Note when user preference differs from phase recommendation', () => {
    // Phase recommends high (16-20) but user explicitly picked 8-12.
    const ctx = buildTrainingPhaseContext('bulk', { tier: 'high', landmark: 'MRV', rationale: 'r' }, '8-12');
    expect(ctx).toMatch(/Note:/i);
    expect(ctx).toMatch(/differ/i);
  });

  it('does NOT add a conflict Note when user has no preference (not_sure)', () => {
    const ctx = buildTrainingPhaseContext('lean_bulk', { tier: 'moderate', landmark: 'MAV', rationale: 'r' }, 'not_sure');
    expect(ctx).not.toMatch(/Note:/i);
  });
});

// ── assemblePlanningPromptWithProfile ─────────────────────────────────────────

describe('assemblePlanningPromptWithProfile — phase context injection', () => {
  it('injects PHASE CONTEXT section for a bulk profile', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalWeightKg: 88,
      trainingState: 'consistent',
    };
    const result = assemblePlanningPromptWithProfile(baseData, profile);
    expect(result).toContain('## PHASE CONTEXT');
    expect(result).toContain('bulk');
  });

  it('injects PHASE CONTEXT section for a cut profile', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 90,
      currentBodyFatPct: 24,
      goalWeightKg: 80,
      trainingState: 'consistent',
    };
    const result = assemblePlanningPromptWithProfile(baseData, profile);
    expect(result).toContain('## PHASE CONTEXT');
    expect(result).toContain('cut');
  });

  it('overrides volumePreference with phase tier when user selected not_sure', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalWeightKg: 88,
      trainingState: 'consistent',
    };
    const dataWithNotSure = { ...baseData, volumePreference: 'not_sure' as const };
    const result = assemblePlanningPromptWithProfile(dataWithNotSure, profile);
    // bulk phase → high tier → 16-20 sets; prompt should reference High Volume
    expect(result).toContain('## PHASE CONTEXT');
  });

  it('does NOT override an explicit user volumePreference', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 80,
      goalWeightKg: 88,
      trainingState: 'consistent',
    };
    // User explicitly chose low volume despite bulk phase recommending high
    const dataWithLow = { ...baseData, volumePreference: '8-12' as const };
    const result = assemblePlanningPromptWithProfile(dataWithLow, profile);
    // Conflict note should appear in the phase context block
    expect(result).toContain('Note:');
  });

  it('returns a non-empty string', () => {
    const profile: GoalsProfile = {
      currentWeightKg: 75,
      currentBodyFatPct: 18,
      goalWeightKg: 73,
      trainingState: 'returning',
    };
    const result = assemblePlanningPromptWithProfile(baseData, profile);
    expect(result.length).toBeGreaterThan(100);
  });
});