// src/utils/__tests__/attractivenessTargets.test.ts
//
// Pins the research sourced sweet spot constants and their conversion into
// the weight band the frame gauge draws. The constants themselves are graded
// in the module header; these tests pin the MATHS and the display gate, so a
// future constant change is a deliberate edit here, never drift.

import {
  ATTRACTIVE_BF_RANGE,
  ATTRACTIVE_BF_CENTRE,
  ATTRACTIVE_NFFMI_RANGE,
  sweetSpotWeightRange,
  sweetSpotApplies,
} from '../attractivenessTargets';
import { ffmiNormalised, leanMassKg } from '../roadmap';

describe('constants', () => {
  it('the body fat centre sits inside its own band', () => {
    expect(ATTRACTIVE_BF_CENTRE).toBeGreaterThanOrEqual(ATTRACTIVE_BF_RANGE[0]);
    expect(ATTRACTIVE_BF_CENTRE).toBeLessThanOrEqual(ATTRACTIVE_BF_RANGE[1]);
  });

  it('the FFMI band sits inside the natural range (untrained 19 to ceiling 25)', () => {
    expect(ATTRACTIVE_NFFMI_RANGE[0]).toBeGreaterThan(19);
    expect(ATTRACTIVE_NFFMI_RANGE[1]).toBeLessThan(25);
  });
});

describe('sweetSpotWeightRange', () => {
  it('round trips through the FFMI model at 180 cm (no height correction)', () => {
    // At exactly 1.80 m the Kouri correction is zero, so the band is just
    // FFMI × height² inflated to scale weight at the body fat.
    const [lo, hi] = sweetSpotWeightRange(180, 13);
    expect(lo).toBeCloseTo((20 * 1.8 * 1.8) / 0.87, 0);
    expect(hi).toBeCloseTo((22 * 1.8 * 1.8) / 0.87, 0);
  });

  it('a taller frame supports a heavier band', () => {
    const short = sweetSpotWeightRange(170, 13);
    const tall = sweetSpotWeightRange(190, 13);
    expect(tall[0]).toBeGreaterThan(short[0]);
    expect(tall[1]).toBeGreaterThan(short[1]);
  });

  it('the band verifies against ffmiNormalised: its edges land ON the FFMI band', () => {
    const heightCm = 185;
    const [lo, hi] = sweetSpotWeightRange(heightCm, 13);
    expect(ffmiNormalised(leanMassKg(lo, 13), heightCm)).toBeCloseTo(20, 1);
    expect(ffmiNormalised(leanMassKg(hi, 13), heightCm)).toBeCloseTo(22, 1);
  });
});

describe('sweetSpotApplies (the display gate)', () => {
  it('draws inside the researched leanness band, with a one point margin', () => {
    expect(sweetSpotApplies(13)).toBe(true);
    expect(sweetSpotApplies(10)).toBe(true);
    expect(sweetSpotApplies(16)).toBe(true); // 15 + 1 margin
  });

  it('refuses to draw where the joint optimum is not met', () => {
    // Leanness outweighs added mass in the evidence; a "most attractive"
    // band at 17%+ would misstate the research.
    expect(sweetSpotApplies(17)).toBe(false);
    expect(sweetSpotApplies(25)).toBe(false);
  });
});