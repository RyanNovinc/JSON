// src/utils/__tests__/weightHistory.test.ts
//
// The invariant these exist for: a weight the user tells us must land in BOTH
// stores, or neither shows the same thing.
//
// The bug: RouteScreen and ConfirmStatsScreen wrote GoalsProfile.currentWeightKg
// directly and left no dated entry, so ConfirmStats showed the new weight above
// the line "logged 5 days ago" — the profile had moved and the history had not.
//
// Storage is mocked. What is under test is the ORCHESTRATION: the order of the
// writes, the guards that stop a failed read from wiping history, and the
// mirror running only after the entry is verified.

import { recordWeightEntry, daysSinceLastWeighIn } from '../weightHistory';
import { WorkoutStorage } from '../storage';
import { updateGoalsProfileField } from '../goalsProfileStorage';
import { recordBodyFatReading } from '../bodyFatHistory';

jest.mock('../storage');
jest.mock('../goalsProfileStorage');
jest.mock('../bodyFatHistory');

const mockLoadResult = WorkoutStorage.loadWeightHistoryResult as jest.Mock;
const mockSave = WorkoutStorage.saveWeightHistory as jest.Mock;
const mockUpdateProfile = updateGoalsProfileField as jest.Mock;
const mockRecordBf = recordBodyFatReading as jest.Mock;

/** Reads back whatever was last saved, which is the happy path. */
function wireHappyStore(initial: any[] = []) {
  let stored = initial;
  mockLoadResult.mockImplementation(async () => ({ ok: true, entries: stored }));
  mockSave.mockImplementation(async (entries: any[]) => {
    stored = entries;
  });
  return () => stored;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateProfile.mockResolvedValue(undefined);
  mockRecordBf.mockResolvedValue(undefined);
});

describe('recordWeightEntry — both stores or neither', () => {
  it('writes an entry AND mirrors the profile', async () => {
    const read = wireHappyStore();

    const result = await recordWeightEntry({ weightKg: 79.6, unit: 'kg', origin: 'test' });

    expect(result.ok).toBe(true);
    expect(read()).toHaveLength(1);
    expect(read()[0].weight).toBe(79.6);
    expect(mockUpdateProfile).toHaveBeenCalledWith('currentWeightKg', 79.6);
  });

  it('prepends rather than replacing existing history', async () => {
    const read = wireHappyStore([{ id: 'old', weight: 80, unit: 'kg', date: '2026-08-01T00:00:00Z' }]);

    await recordWeightEntry({ weightKg: 79, unit: 'kg' });

    expect(read()).toHaveLength(2);
    expect(read()[1].id).toBe('old');
  });

  // THE DATA-LOSS PATH. A plain [] cannot distinguish "no entries yet" from
  // "could not read", and saving [entry, ...[]] after a failed read replaces
  // the user's entire history with one row.
  it('refuses to save when the store cannot be read', async () => {
    mockLoadResult.mockResolvedValue({ ok: false, reason: 'corrupt' });

    const result = await recordWeightEntry({ weightKg: 79, unit: 'kg' });

    expect(result).toEqual({ ok: false, reason: 'unreadable' });
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  // A silently dropped write used to surface weeks later as a missing weigh-in.
  it('reports failure when the entry cannot be read back', async () => {
    mockLoadResult.mockResolvedValue({ ok: true, entries: [] });
    mockSave.mockResolvedValue(undefined);

    const result = await recordWeightEntry({ weightKg: 79, unit: 'kg' });

    expect(result).toEqual({ ok: false, reason: 'unverified' });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('stores in the display unit but mirrors kilograms to the profile', async () => {
    const read = wireHappyStore();

    await recordWeightEntry({ weightKg: 79.6, unit: 'lbs' });

    expect(read()[0].unit).toBe('lbs');
    expect(read()[0].weight).toBeCloseTo(175.5, 0);
    // The profile is always kg — every plan calculation depends on that.
    expect(mockUpdateProfile).toHaveBeenCalledWith('currentWeightKg', 79.6);
  });

  it('records a body-fat reading only when one was given', async () => {
    wireHappyStore();

    await recordWeightEntry({ weightKg: 79, unit: 'kg', bodyFatPct: 18, bodyFatSource: 'visual' });
    expect(mockRecordBf).toHaveBeenCalledWith(18, 'visual', undefined);

    jest.clearAllMocks();
    mockUpdateProfile.mockResolvedValue(undefined);
    wireHappyStore();

    await recordWeightEntry({ weightKg: 79, unit: 'kg' });
    // A blank body-fat field means "not measured today", never "reset to
    // unknown" — so nothing is written for it.
    expect(mockRecordBf).not.toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalledWith('currentBodyFatPct', expect.anything());
  });

  it('rejects a nonsense weight without touching either store', async () => {
    wireHappyStore();

    expect(await recordWeightEntry({ weightKg: 0, unit: 'kg' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  // The profile mirror is deliberately non-fatal: the weigh-in is already
  // safely stored, and a stale profile is a far smaller problem than a lost
  // entry.
  it('still reports success when the profile mirror throws', async () => {
    wireHappyStore();
    mockUpdateProfile.mockRejectedValue(new Error('disk full'));

    const result = await recordWeightEntry({ weightKg: 79, unit: 'kg' });

    expect(result.ok).toBe(true);
  });
});

describe('daysSinceLastWeighIn', () => {
  it('returns null when there is no history', async () => {
    mockLoadResult.mockResolvedValue({ ok: true, entries: [] });
    expect(await daysSinceLastWeighIn()).toBeNull();
  });

  it('returns null when the store cannot be read', async () => {
    mockLoadResult.mockResolvedValue({ ok: false, reason: 'corrupt' });
    expect(await daysSinceLastWeighIn()).toBeNull();
  });

  // Latest by DATE, not by array position. Entries are prepended today, but
  // nothing guarantees order for records written by older versions.
  it('uses the newest entry regardless of order in the array', async () => {
    const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    mockLoadResult.mockResolvedValue({
      ok: true,
      entries: [
        { id: 'a', weight: 80, unit: 'kg', date: days(9) },
        { id: 'b', weight: 79, unit: 'kg', date: days(2) },
        { id: 'c', weight: 81, unit: 'kg', date: days(30) },
      ],
    });

    expect(await daysSinceLastWeighIn()).toBe(2);
  });
});