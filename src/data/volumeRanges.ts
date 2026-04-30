/**
 * Volume Ranges for Hypertrophy Training
 *
 * Single source of truth for weekly set ranges based on:
 * - User's training experience (complete_beginner / beginner / intermediate / advanced)
 * - User's chosen volume tier (Conservative / Moderate / High Volume)
 *
 * Ranges are based on Pelland 2024 meta-regression (fractional counting),
 * Schoenfeld dose-response research, and consensus practical recommendations
 * across evidence-based fitness sources (RP Strength, Cora, Hevy, Stronger By Science).
 *
 * All numbers represent weekly EFFECTIVE sets per muscle group, where
 * Primary tags count 1.0 and Secondary tags count 0.5 (fractional counting).
 */

export type ExperienceTier = 'complete_beginner' | 'beginner' | 'intermediate' | 'advanced';
export type VolumeTier = '8-12' | '12-16' | '16-20'; // Conservative, Moderate, High Volume IDs

export interface VolumeRange {
  majorRange: string;   // e.g., "14-20"
  mediumRange: string;  // e.g., "12-18"
  majorMin: number;     // floor used for verification
  mediumMin: number;
  majorMax: number;     // ceiling used for verification
  mediumMax: number;
}

/**
 * Volume range matrix: 4 experience tiers × 3 volume tiers
 *
 * Each cell contains major muscle range and medium muscle range.
 * Medium muscle ranges are approximately 80% of major.
 */
const VOLUME_MATRIX: Record<ExperienceTier, Record<VolumeTier, VolumeRange>> = {
  complete_beginner: {
    '8-12':  { majorRange: '4-8',  mediumRange: '4-6',  majorMin: 4,  mediumMin: 4,  majorMax: 8,  mediumMax: 6 },
    '12-16': { majorRange: '6-10', mediumRange: '5-8',  majorMin: 6,  mediumMin: 5,  majorMax: 10, mediumMax: 8 },
    '16-20': { majorRange: '10-14',mediumRange: '8-10', majorMin: 10, mediumMin: 8,  majorMax: 14, mediumMax: 10 },
  },
  beginner: {
    '8-12':  { majorRange: '6-10', mediumRange: '5-8',  majorMin: 6,  mediumMin: 5,  majorMax: 10, mediumMax: 8 },
    '12-16': { majorRange: '10-14',mediumRange: '8-12', majorMin: 10, mediumMin: 8,  majorMax: 14, mediumMax: 12 },
    '16-20': { majorRange: '14-18',mediumRange: '12-14',majorMin: 14, mediumMin: 12, majorMax: 18, mediumMax: 14 },
  },
  intermediate: {
    '8-12':  { majorRange: '10-14',mediumRange: '8-12', majorMin: 10, mediumMin: 8,  majorMax: 14, mediumMax: 12 },
    '12-16': { majorRange: '14-20',mediumRange: '12-18',majorMin: 14, mediumMin: 12, majorMax: 20, mediumMax: 18 },
    '16-20': { majorRange: '18-24',mediumRange: '16-22',majorMin: 18, mediumMin: 16, majorMax: 24, mediumMax: 22 },
  },
  advanced: {
    '8-12':  { majorRange: '12-16',mediumRange: '10-14',majorMin: 12, mediumMin: 10, majorMax: 16, mediumMax: 14 },
    '12-16': { majorRange: '16-22',mediumRange: '14-18',majorMin: 16, mediumMin: 14, majorMax: 22, mediumMax: 18 },
    '16-20': { majorRange: '20-28',mediumRange: '16-22',majorMin: 20, mediumMin: 16, majorMax: 28, mediumMax: 22 },
  },
};

/**
 * Get the volume range for a given experience tier and volume tier.
 *
 * @param experience - The user's training experience tier
 * @param volumeTier - The user's selected volume preference (id from questionnaire)
 * @returns VolumeRange object with major/medium ranges and min/max values
 */
export function getVolumeRange(
  experience: ExperienceTier,
  volumeTier: VolumeTier
): VolumeRange {
  return VOLUME_MATRIX[experience][volumeTier];
}

/**
 * Get just the major muscle display range as a string (e.g., "14-20 sets/week").
 * Convenience for UI rendering.
 */
export function getVolumeRangeDisplay(
  experience: ExperienceTier,
  volumeTier: VolumeTier
): string {
  const range = getVolumeRange(experience, volumeTier);
  return `${range.majorRange} sets/week`;
}

/**
 * Tier labels for display.
 */
export const VOLUME_TIER_LABELS: Record<VolumeTier, string> = {
  '8-12': 'Conservative',
  '12-16': 'Moderate (Recommended)',
  '16-20': 'High Volume',
};