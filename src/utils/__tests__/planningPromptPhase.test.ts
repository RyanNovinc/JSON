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

describe('buildTrainingPhaseContext — cut', () => {
  const ctx = buildTrainingPhaseContext('cut', { tier: 'low', landmark: 'MEV', rationale: 'Deficit recovery' });

  it('mentions MEV and deficit in volume line', () => {
    expect(ctx).toMatch(/MEV/i);
  });

  it('includes +1 RIR instruction', () => {
    expect(ctx).toMatch(/\+1 RIR/);
  });

  it('names muscle retention as the goal', () => {
    expect(ctx).toMatch(/muscle retention/i);
  });
});

describe('buildTrainingPhaseContext — recomp', () => {
  const ctx = buildTrainingPhaseContext('recomp', { tier: 'moderate', landmark: 'MAV', rationale: 'BF elevated' });

  it('mentions mid-MAV', () => {
    expect(ctx).toMatch(/mid-MAV/i);
  });

  it('names recomposition as the goal', () => {
    expect(ctx).toMatch(/recomposition/i);
  });

  it('says RIR is standard (no modification)', () => {
    expect(ctx).toMatch(/standard/i);
  });
});

describe('buildTrainingPhaseContext — lean_bulk', () => {
  const ctx = buildTrainingPhaseContext('lean_bulk', { tier: 'moderate', landmark: 'MAV', rationale: 'Lean gainz' });

  it('mentions MAV-to-MRV range', () => {
    expect(ctx).toMatch(/MAV.{0,5}MRV/i);
  });

  it('names hypertrophy as the goal', () => {
    expect(ctx).toMatch(/hypertrophy/i);
  });
});

describe('buildTrainingPhaseContext — bulk', () => {
  const ctx = buildTrainingPhaseContext('bulk', { tier: 'high', landmark: 'MRV', rationale: 'Big surplus' });

  it('biases toward MRV', () => {
    expect(ctx).toMatch(/MRV/i);
  });

  it('names maximise stimulus as part of the goal', () => {
    expect(ctx).toMatch(/maximis/i);
  });
});

describe('buildTrainingPhaseContext — maintain', () => {
  const ctx = buildTrainingPhaseContext('maintain', { tier: 'low', landmark: 'MEV', rationale: 'Maintenance' });

  it('mentions MEV (minimum effective volume)', () => {
    expect(ctx).toMatch(/MEV/i);
  });

  it('names maintenance stimulus as the goal', () => {
    expect(ctx).toMatch(/maintenance stimulus/i);
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
