// src/utils/__tests__/roadmapStorage.test.ts
//
// The snapshot store's whole value is that the baseline survives and that the
// history doesn't fill with noise. Both are asserted here, because both fail
// silently — you'd only discover either months later, when you finally went
// looking for the original plan and it wasn't there.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalsProfile } from '../goalsProfile';
import { deriveRoadmap } from '../roadmap';
import {
  recordRoadmapSnapshot,
  loadRoadmapSnapshots,
  loadLatestRoadmapSnapshot,
  loadBaselineRoadmapSnapshot,
  clearRoadmapSnapshots,
  shouldSnapshot,
  ROADMAP_MODEL_VERSION,
  type RoadmapSnapshot,
} from '../roadmapStorage';

const KEY = '@roadmap_snapshots';

const PROFILE: GoalsProfile = {
  currentWeightKg: 77.3,
  currentBodyFatPct: 20.4,
  goalWeightKg: 90,
  goalBodyFatPct: 13,
  trainingState: 'consistent',
  sex: 'male',
  heightCm: 185,
};

const record = (p: GoalsProfile = PROFILE, route: 'lean' | 'balanced' | 'roomy' = 'balanced') =>
  recordRoadmapSnapshot(p, route, deriveRoadmap(p, route)!);

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ---------------------------------------------------------------------------

describe('an empty store', () => {
  it('reads as empty rather than throwing', async () => {
    expect(await loadRoadmapSnapshots()).toEqual([]);
    expect(await loadLatestRoadmapSnapshot()).toBeUndefined();
    expect(await loadBaselineRoadmapSnapshot()).toBeUndefined();
  });
});

describe('recording', () => {
  it('writes the first snapshot with its inputs frozen alongside the plan', async () => {
    const snap = await record();
    expect(snap).toBeDefined();
    expect(snap!.modelVersion).toBe(ROADMAP_MODEL_VERSION);
    expect(snap!.route).toBe('balanced');
    expect(snap!.inputs.goalWeightKg).toBe(90);
    expect(snap!.inputs.heightCm).toBe(185);
    expect(snap!.roadmap.leanTargetKg).toBeCloseTo(78.3, 1);
    expect(await loadRoadmapSnapshots()).toHaveLength(1);
  });

  it('does not record again when nothing material changed', async () => {
    await record();
    expect(await record()).toBeUndefined();
    expect(await loadRoadmapSnapshots()).toHaveLength(1);
  });

  it('records when the destination changes', async () => {
    await record();
    expect(await record({ ...PROFILE, goalWeightKg: 95 })).toBeDefined();
    expect(await loadRoadmapSnapshots()).toHaveLength(2);
  });

  it('records when the route changes', async () => {
    await record();
    expect(await record(PROFILE, 'lean')).toBeDefined();
  });

  it('records when training state changes, since it drives the whole timeline', async () => {
    await record();
    expect(await record({ ...PROFILE, trainingState: 'returning' })).toBeDefined();
  });

  // Weight and body fat move constantly, and body fat readings jitter by
  // several points. Recording on those would bury the signal in noise and
  // evict the snapshots that matter.
  it('ignores day-to-day weight and body fat movement', async () => {
    await record();
    expect(await record({ ...PROFILE, currentWeightKg: 78.1 })).toBeUndefined();
    expect(await record({ ...PROFILE, currentBodyFatPct: 19.2 })).toBeUndefined();
    expect(await loadRoadmapSnapshots()).toHaveLength(1);
  });
});

describe('shouldSnapshot', () => {
  const base: RoadmapSnapshot = {
    createdAt: '2026-08-01T00:00:00.000Z',
    modelVersion: ROADMAP_MODEL_VERSION,
    route: 'balanced',
    inputs: {
      currentWeightKg: 77.3,
      currentBodyFatPct: 20.4,
      goalWeightKg: 90,
      goalBodyFatPct: 13,
      trainingState: 'consistent',
      sex: 'male',
      heightCm: 185,
    },
    roadmap: deriveRoadmap(PROFILE)!,
  };
  const at = (iso: string) => new Date(iso).getTime();

  it('says yes when there is nothing stored', () => {
    expect(shouldSnapshot(undefined, PROFILE, 'balanced')).toBe(true);
  });

  it('says no a day later with no changes', () => {
    expect(shouldSnapshot(base, PROFILE, 'balanced', at('2026-08-02T00:00:00Z'))).toBe(false);
  });

  // A user who changes nothing still needs a trail, or the history clusters
  // entirely around edits and says nothing about the passage of time.
  it('samples again after 30 days even when nothing changed', () => {
    expect(shouldSnapshot(base, PROFILE, 'balanced', at('2026-09-05T00:00:00Z'))).toBe(true);
  });

  // Our own constants will move as the research improves. Without this, a
  // future deviation calculation would read a change in OUR model as the
  // user's progress.
  it('says yes when the stored snapshot predates the current model version', () => {
    const old = { ...base, modelVersion: ROADMAP_MODEL_VERSION - 1 };
    expect(shouldSnapshot(old, PROFILE, 'balanced', at('2026-08-02T00:00:00Z'))).toBe(true);
  });

  it('says yes when height or sex changes, since both move the plausibility verdict', () => {
    expect(shouldSnapshot(base, { ...PROFILE, heightCm: 175 }, 'balanced', at('2026-08-02T00:00:00Z'))).toBe(true);
    expect(shouldSnapshot(base, { ...PROFILE, sex: 'female' }, 'balanced', at('2026-08-02T00:00:00Z'))).toBe(true);
  });
});

describe('the cap', () => {
  it('never evicts the baseline or the newest entry', async () => {
    for (let i = 0; i < 20; i++) {
      await record({ ...PROFILE, goalWeightKg: 90 + i });
    }
    const all = await loadRoadmapSnapshots();

    expect(all.length).toBeGreaterThan(0);
    expect(all.length).toBeLessThanOrEqual(12);
    // Baseline is the original plan — the only thing that can answer "how far
    // off was the first promise".
    expect(all[0].inputs.goalWeightKg).toBe(90);
    expect((await loadBaselineRoadmapSnapshot())!.inputs.goalWeightKg).toBe(90);
    expect((await loadLatestRoadmapSnapshot())!.inputs.goalWeightKg).toBe(109);
  });

  it('keeps snapshots in chronological order', async () => {
    for (let i = 0; i < 5; i++) await record({ ...PROFILE, goalWeightKg: 90 + i });
    const all = await loadRoadmapSnapshots();
    const times = all.map((s) => new Date(s.createdAt).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('resilience', () => {
  it('drops malformed entries instead of crashing every reader', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify([{ nonsense: true }, null, 'a string']),
    );
    expect(await loadRoadmapSnapshots()).toEqual([]);
  });

  it('survives a non-array payload', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
    expect(await loadRoadmapSnapshots()).toEqual([]);
  });

  it('survives unparseable JSON', async () => {
    await AsyncStorage.setItem(KEY, '{{{');
    expect(await loadRoadmapSnapshots()).toEqual([]);
  });

  it('clears', async () => {
    await record();
    await clearRoadmapSnapshots();
    expect(await loadRoadmapSnapshots()).toEqual([]);
  });
});

// Kept deliberately at the END of the file. It mutates AsyncStorage.setItem,
// and spying on a module that is already a jest mock does not always restore
// cleanly — an earlier placement silently emptied the store for the tests that
// followed it. Isolated here, and restored in a finally, a leak can only
// affect tests that no longer exist.
describe('write failures', () => {
  it('returns undefined rather than throwing, so the route screen still renders', async () => {
    const original = AsyncStorage.setItem;
    (AsyncStorage as any).setItem = jest.fn().mockRejectedValue(new Error('disk full'));
    try {
      await expect(record()).resolves.toBeUndefined();
    } finally {
      (AsyncStorage as any).setItem = original;
    }
  });

  it('leaves the store usable afterwards', async () => {
    expect(await record()).toBeDefined();
    expect(await loadRoadmapSnapshots()).toHaveLength(1);
  });
});