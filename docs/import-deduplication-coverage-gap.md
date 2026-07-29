# Import deduplication: no test coverage, and what a real suite needs

> **Status: import deduplication is covered by NO test. It never has been.**
>
> This matters more than it looks. `npm test` is green, and a green run implies the
> dedupe path is exercised. It is not. If fingerprint dedupe broke tomorrow — silently
> creating a duplicate library entry on every re-import — nothing in this repo would
> catch it.

This document replaces `src/utils/__tests__/importDeduplication.test.ts`, deleted 2026-07-29.
That file carried four tests that had never run and could never have passed. It sat
`describe.skip`ped, contributing four permanently-skipped entries to every run. Skipped tests
are the ones people stop reading, and its four bodies encoded a misunderstanding of where the
dedupe logic actually lives — they would have misled whoever picked the work up. The analysis
was worth keeping; the code was not.

## History

The tests were authored 2026-05-25 and **never executed once** — `jest.config.js` was
misconfigured (a `moduleNameMapper` pointing `react-native` at `react-native-web`, which was
never a dependency) from that day until 2026-07-13. Every suite touching react-native died at
config time, presenting as "suite failed to run" rather than as a failure.

When the config was fixed and they finally ran, all four failed. They were skipped rather than
deleted or bent into passing, so the gap stayed honestly red-flagged.

From 2026-07-13 the suite failed at *import* for an unrelated reason
(`useWorkoutImport → TimerContext → expo-av`, "Cannot find native module 'ExponentAV'"), which
masked the underlying state again. That import failure is fixed in
`awaitingImportCleanup.test.ts`, which now mocks `contexts/TimerContext` directly.

## Why the four tests could never have worked

Four independent blockers. Each one alone is fatal.

### 1. The fixtures are not valid programs

All four used `blocks: []`. Production rejects that outright in `validateAndParseJSON`:

```ts
if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
  throw new Error('No training blocks found');      // useWorkoutImport.ts:1137
}
```

Every test died with `[VALIDATE] rejected: structural validation error - No training blocks
found`. The import never proceeded, so `saveRoutines` / `onImportComplete` were never called
and every assertion failed on `Number of calls: 0`. Verified by un-skipping and running.

### 2. Even with valid fixtures they would not reach the dedupe code

The fingerprint dedupe lives in `handleUnifiedMesocycleImport` (`useWorkoutImport.ts:393-449`).
That is reached only from `restoreCompleteState`, and only when the program carries
`_metadata.exportType === 'unified_mesocycle_structure'`. None of the fixtures had `_metadata`
at all.

### 3. They never called the function that dedupes

`handleUnifiedMesocycleImport` is reached only via `confirmImport` (`handleConfirmImport`),
which performs the save. The tests only ever called `importFromText` — which parses and raises
the confirmation modal. It does not save, and it does not dedupe.

### 4. Their `Animated` mock swallowed the success path

Not in the original analysis; found 2026-07-29. The suite mocked react-native with:

```js
Animated: { timing: jest.fn(() => ({ start: jest.fn() })),
            parallel: jest.fn(() => ({ start: jest.fn() })) }
```

`start` never invokes its callback. The entire success path in `handleConfirmImport` runs
*inside* that callback (`useWorkoutImport.ts:1621`):

```js
]).start(async () => {
  setShowConfirmation(false);
  setAccumulatedPrograms([]);
  await checkMesocycleCompletion();
  await WorkoutStorage.setAwaitingImport(false);
  if (options.onImportComplete) options.onImportComplete(parsedProgram);
});
```

So `saveRoutines`, `setAwaitingImport(false)` and `onImportComplete` never fire under that
mock. Even after fixing blockers 1–3, every assertion would still have seen zero calls.

`awaitingImportCleanup.test.ts` gets this right and is the reference:

```js
timing:   jest.fn(() => ({ start: jest.fn((callback) => callback && callback()) })),
parallel: jest.fn(() => ({ start: jest.fn((callback) => callback && callback()) })),
```

That single difference is why one suite can exercise the success path and the other
structurally could not.

## What a real suite needs

All five, together:

1. **Valid multi-block programs** — `routine_name`, `days_per_week`, and a populated `blocks`
   array with at least one day and one exercise. See test 4 in `awaitingImportCleanup.test.ts`
   for a minimally-valid `WorkoutProgram` that survives validation.
2. **A `_metadata.exportType === 'unified_mesocycle_structure'` envelope**, or
   `handleUnifiedMesocycleImport` is never entered.
3. **Drive `importFromText` AND THEN `confirmImport`.** Dedupe happens on save, not on parse.
4. **An `Animated` mock whose `start` invokes its callback** (blocker 4).
5. **A `TimerContext` mock.** `useWorkoutImport` calls `useTimer()` (`useWorkoutImport.ts:103`),
   which throws `useTimer must be used within a TimerProvider` outside a provider, and pulls
   expo-av → expo-haptics → DebugOverlay → @expo/vector-icons → expo-font → expo-asset →
   expo-constants at import time. Mock the context, not the modules under it:

   ```js
   jest.mock('../../contexts/TimerContext', () => ({
     useTimer: () => ({ applyPlanDefaultPace: jest.fn() }),
   }));
   ```

## Harness notes

- `useWorkoutImport` is a React hook. Calling it in a test body throws
  `Cannot read properties of null (reading 'useState')` on React 19 — there is no dispatcher
  outside a render. Drive it through `renderHook` (`@testing-library/react`), which needs a
  DOM, hence `@jest-environment jsdom`.
- **`importFromText` resolves before it has done anything.** `processWorkoutData` defers ALL
  of its real work into an unawaited `setTimeout(…, 800)`, so `await importFromText(…)`
  resolves BEFORE validation has run and tells you nothing about success. Await the resulting
  *state* (`waitFor` on `showConfirmation`) before asserting or before calling `confirmImport`.
  This is CLAUDE.md gotcha 10; `awaitingImportCleanup.test.ts` test 4 is a worked example.
- `jest.clearAllMocks()` does **not** drain a `mockRejectedValueOnce` queue — only
  `resetAllMocks` does. An unconsumed "once" rejection leaks into the *next* test and fails it
  with a confusing error pointing at the previous test's line.
