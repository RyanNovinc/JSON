# JSON.fit — Claude Code project guide

Expo / React Native fitness + nutrition app (iOS + Android). Package name `json-fit`.

## The one thing to know first

**This app contains no LLM integration.** No Anthropic/OpenAI SDK, no API key, no inference call
anywhere in `src/`. The product is a bring-your-own-AI round trip:

> questionnaire answers → app assembles a long text prompt → copies to clipboard → deep-links out to
> `claude.ai/new` or `chatgpt.com` → user pastes the returned JSON back into the app → app validates
> and imports it.

So `src/data/*Prompt*.ts` is **prompt text assembly**, and `useWorkoutImport` / `Import*Screen` is
**untrusted-JSON parsing**. Don't go looking for a model client; there isn't one.

## Git rules — non-negotiable

- At the start of every session, run `git branch --show-current` and state the
  current branch before doing anything else.
- Never run `git checkout`, `git switch`, `git stash`, `git reset`, `git clean`,
  or any force-push without asking the user first and getting explicit approval.
- Before ending a session, and before any branch operation, commit all
  work-in-progress (including new untracked source files) with a descriptive
  message. Never leave work uncommitted or stashed at the end of a session.
- **Multiple agents share this repo via git worktrees. Never operate in a
  worktree checked out by another agent.** Before ANY write (edit, commit,
  cherry-pick, merge, rebase, ref update), run `git worktree list` and
  `git status`. If a change belongs to a branch that is checked out in another
  worktree, do NOT touch that worktree — do the work on your own throwaway branch
  (`git worktree add ../<name> -b <branch> <tip>`) and verify it there.
- **Landing a commit onto a branch checked out in another worktree: move the ref
  from OUTSIDE, never fast-forward inside their tree.** Never `merge`/`--ff-only`
  into a worktree with uncommitted changes (it runs in their tree). Instead move
  the ref with a compare-and-swap, from the main repo dir or any other worktree:
  `git update-ref refs/heads/<branch> <new-sha> <expected-old-sha>`. It updates the
  ref only if it still points at `<expected-old-sha>` (fails safely if the tip
  moved — re-check and retry) and never reads or writes any working tree, so the
  other agent's uncommitted files are untouched. Confirm first that `<new-sha>` is
  a descendant of `<expected-old-sha>` (a real fast-forward, no history rewrite).
  **Caveat — it desyncs the other worktree:** its HEAD now sits ahead of its index,
  so that agent's `git status` shows the landed file(s) as a pending change, and a
  blanket `git commit -a` there would revert what you landed. That agent must
  re-sync with `git checkout HEAD -- <file>` (preserves its other uncommitted work)
  before its next commit. Always route the ref move through the human so they can
  have the other agent re-sync.
- One branch per agent; branches meet through the human, never by two agents
  committing to the same branch.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, React 19. New architecture **off**. |
| Language | TypeScript 5.9, **not strict** (extends `expo/tsconfig.base`; ~94 files use `any`/`@ts-ignore`) |
| Navigation | React Navigation v6 (stack + bottom-tabs). **Not** Expo Router — there is no `app/` dir. |
| State | React Context only. No Redux/Zustand. `@tanstack/react-query` is installed but near-vestigial. |
| Persistence | AsyncStorage, always behind `WorkoutStorage` (`src/utils/storage.ts`) |
| Styling | Plain `StyleSheet.create`, colocated at the bottom of each file. No styled-components/Tailwind. |
| Payments | RevenueCat (`react-native-purchases`) |
| Backend | A handful of standalone AWS Lambdas (analytics, feedback, share). No auth, no Supabase/Firebase. |
| Tests | Jest (`jest-expo` preset, `testEnvironment: 'node'`) |
| Build | EAS. `npm install` needs `--legacy-peer-deps`; `postinstall` runs `patch-package`. |

## Commands

```bash
npm start              # expo start
npm run ios            # expo run:ios
npm run android        # expo run:android
npm test               # full jest suite
npm run test:persistence   # migration/storage suite — the highest-risk area, run before storage changes
npm run lint           # expo lint
```

## Layout

Only `src/` is live app code (269 `.ts`/`.tsx` files, ~148k lines). The repo root is a junk drawer of
one-off scripts, data blobs, and build artifacts — see "Root is not the project" below.

```
src/
  screens/      113 files. Nearly all UI lives here — screen-heavy, thin component layer.
                Subfolders: questionnaire/ (Q1–Q7 workout intake), nutrition/
  components/    50 files. Modals, paywalls/gates, timers, wizard steps.
  contexts/      10 files. ALL app state.
  utils/         64 files. Storage, migrations, validation, exercise identity/images. Tests in __tests__/
  data/          29 files. Prompt templates + large static datasets.
  services/       6 files. The only network layer.
  hooks/          4 files. Import pipelines, entitlement checks.
  navigation/     3 files. AppNavigator.tsx = every route, one file.
  types/          5 files. Domain types; the only zod usage is types/index.ts
  onboarding/, config/, assets/
```

## Key files

- `App.tsx` — provider nesting (order matters): `GestureHandlerRootView → SafeAreaProvider →
  QueryClientProvider → ThemeProvider → WeightUnitProvider → RevenueCatProvider → ActiveWorkoutProvider`.
  Also awaits `runMigrations()` **before rendering anything**.
- `src/navigation/AppNavigator.tsx` (1777 lines) — 5 tabs (Workouts, Nutrition, Create, Library,
  Profile) plus ~50 flat root-level modal routes. Custom `getStateFromPath` for deep links.
- `src/utils/storage.ts` — `WorkoutStorage` static class + `STORAGE_KEYS`. Wraps `robustStorage.ts`
  (chunking/checksum/corruption recovery) with an AsyncStorage fallback.
- `src/utils/migrationFramework.ts` — `SCHEMA_VERSION` lives here. Migrations are blocking.
- `src/data/workoutPrompt.ts` + `planningPrompt.ts` — workout prompt assembly.
- `src/data/mealPlanPromptBuilder.ts` — meal plan prompt assembly.
- `src/hooks/useWorkoutImport.ts` (1662 lines) — the JSON import + validation pipeline.
- `src/utils/premiumFeatures.ts` — `PremiumFeature` enum + free-tier limits. Gate via `useJSONPro()`.

## Nutrition macro model (ingredient DB rebuild)

The ingredient database (`src/data/ingredients.ts`) now carries macros. Three rules govern it —
keep them exact; they are load-bearing for macro computation:

- **`macros_per_100g` is per 100 GRAMS for every row**, regardless of `canonical_unit`. Convert the
  authored amount to grams via `grams_per_canonical_unit` FIRST, then apply. Never apply macros per
  ml, per count, or per tsp directly.
  - `grams = amount × grams_per_canonical_unit`; `macros = grams × macros_per_100g / 100`
  - `'g'` rows: `grams_per_canonical_unit = 1`. `'ml'` rows: it is the density.
    `count`/`tsp`/`tbsp`/`cloves` rows: grams per that unit.
- **`is_pantry_negligible` hides an ingredient from shopping lists and macro totals only.** Always
  render its amount in method / cook-mode steps.
- **`atwater_exempt` marks rows whose kcal cannot be reconstructed from P/C/F** (alcohol, acetic
  acid, or non-standard USDA energy factors). Any Atwater validation must skip these rows, and should
  compute available carbs as `(carbs − fiber)` with fiber at 2 kcal/g.

Two legacy rows (`chipotle_in_adobo`, `sweetcorn`) were not supplied by the rebuild and carry no
macro fields yet — the macro fields on `Ingredient` are optional for that reason. Do not fabricate
their macros.

## Conventions

- **Naming:** `PascalCase.tsx` for screens/components (routes are always `*Screen.tsx`);
  `camelCase.ts` for utils/services/hooks (`use*.ts`).
- **Components:** function components + hooks only. No class components.
- **Contexts:** `createContext<T | undefined>(undefined)` + a `useX()` hook that **throws** if
  unwrapped. Context values are `useMemo`'d. Follow this pattern.
- **Never call `AsyncStorage` directly** — always go through `WorkoutStorage`.
- **Logging:** heavy, emoji-prefixed, tagged — `console.log('🔄 [MIGRATIONS] …')`. Match this style
  or the logs stop being greppable.
- **Tests** are logic/persistence tests, not component tests. They live in `src/utils/__tests__/`.
- **Dark-only.** The app is not themeable light/dark (`userInterfaceStyle: "dark"`, black bg, zero
  `useColorScheme` usage). `ThemeContext` toggles only an *accent color*: cyan `#22d3ee` ↔ pink
  `#ec4899`. The Nutrition tab re-wraps with `NutritionThemeProvider` to override the accent to green.

## Gotchas

1. **Migrations block first render.** Any storage read before `runMigrations()` resolves is a bug.
2. **The Create tab is a fake tab.** It renders a stub; a `tabPress` listener calls `preventDefault()`
   and navigates to the `CreateFlow` modal. Don't try to add a screen to it.
3. **Nutrition screens pushed onto the *root* stack lose the green accent** unless they re-wrap in
   `NutritionThemeProvider` (it's applied inline on the Tab.Screen).
4. **`src/data/curated_meals.ts` is a hand-maintained 9,396-line data file** validated at boot. A bad
   edit crashes the app on launch.
5. **Dead stubs shadow real files.** Metro resolves `.ts`/`.tsx` before `.js`, so
   `src/navigation/AppNavigator.js` and `src/screens/HomeScreen.js` are inert leftovers — but they're
   easy to open by mistake. Always edit the `.tsx`. Same for `src/**/*.backup*`.
6. **`MealPlanningContext` and `SimplifiedMealPlanningContext` are BOTH live** (~15 and ~17 importers
   each). Neither is dead. Check which one a screen actually uses before changing either.
7. **`ExerciseHistoryScreen.tsx` at the repo root is LIVE**, not a stray — `src/screens/WorkoutLogScreen.tsx`
   imports `ExerciseHistoryModal` from `'../../ExerciseHistoryScreen'`. Never delete a root file without
   grepping for imports first.
8. **Hardcoded secrets:** the analytics `sharedSecret` and Lambda URLs are literals in `App.tsx` and
   `src/services/*`.
9. **Platform branches:** ~89 `Platform.OS` checks. iOS-only: Live Activities. Claude has no
   registered URL scheme, so the deep-link opens Safari — hence the "re-copy clipboard before
   launching" defense in `PromptReadyScreen`.
10. **`importFromText` resolves before it has done anything.** `processWorkoutData` in
    `useWorkoutImport.ts` is `async`, but defers *all* its real work (validate, parse, set
    state) into an unawaited `setTimeout(…, 800)` — a cosmetic "processing" delay. So
    `await importFromText(json)` resolves ~800ms **before validation has even run**, and
    tells you nothing about whether the import succeeded. Await the resulting *state*
    (`showConfirmation` / `errorMessage`), never the call. Known production API defect, not
    yet fixed; `src/utils/__tests__/awaitingImportCleanup.test.ts` shows the workaround.
11. **Modals: use `AppModal`, never a raw RN `<Modal>`.** On Android a `<Modal>` is a detached
    native window — it does NOT inherit the `GestureHandlerRootView` or `SafeAreaProvider` from
    `App.tsx`. So a `react-native-gesture-handler` touchable inside a raw `<Modal>` **silently
    receives no touches on Android** (iOS is fine — RNGH attaches recognizers directly to
    views). This made every workout/meal-plan import uncompletable on Android. Two valid fixes:
    import `TouchableOpacity` from `react-native` (preferred — nothing in this app needs RNGH
    touchables), or wrap in `src/components/AppModal.tsx`. Also **always pass `onRequestClose`**
    — without it the Android hardware back button does nothing and the modal is a trap.
12. **The Workout↔Nutrition swipe relies on gesture coordination that does not exist.**
    `ModeTransitionContainer` wraps `HomeScreen` + `NutritionHomeScreen` in an RNGH
    `PanGestureHandler` and threads a `panGestureRef` down to both. **Neither screen ever uses
    it**, and there is no `simultaneousHandlers` / `waitFor` anywhere in the app — so the
    tap-vs-swipe arbitration those screens appear to depend on is not actually wired up. It
    works today by luck of RNGH's defaults. Both screens keep RNGH touchables (and use
    `AppModal`) for that reason. Someone should look at this deliberately; do not casually
    swap their touchables to `react-native` without understanding the gesture interaction.
13. **Deduplication is covered by no test, and a green `npm test` implies otherwise.** The
    fingerprint dedupe lives behind `_metadata.exportType === 'unified_mesocycle_structure'`
    in `handleUnifiedMesocycleImport`, reachable only via `confirmImport`. The old
    `importDeduplication.test.ts` never tested it and was deleted (2026-07-29) rather than
    left `describe.skip`ped — four permanently-skipped tests encoding a wrong model of where
    dedupe lives. Its analysis, the four independent reasons it could never have worked, and
    a spec for the real suite are in `docs/import-deduplication-coverage-gap.md`. Read that
    before writing it.
14. **`expo prebuild` is DESTRUCTIVE on `ios/`.** The `expo-live-activity` plugin calls
    `addTarget` non-idempotently, so prebuilding over the existing `ios/` duplicates
    targets/build-phases and corrupts `project.pbxproj` (`pod install` then fails with
    `[Xcodeproj] Consistency issue: no parent for object`). Never run bare prebuild over
    tracked `ios/`. EAS is unaffected (`.easignore` strips `ios/`, so it does a clean
    prebuild). `ios/JSONfit/Info.plist` is intentionally **hand-maintained** for the
    file-association keys (`CFBundleDocumentTypes`, `UTExportedTypeDeclarations`);
    `app.json`'s `ios.infoPlist` remains the EAS source of truth — keep both updated
    together.

## Root is not the project

The repo root holds ~120 files that are **not** app code: one-off `debug_*.js` / `test_*.js` scripts,
scratch `.json` data blobs, marketing HTML, and Lambda `.zip` bundles. Don't read or edit anything at
the root unless explicitly asked — but don't assume a root file is dead either (see gotcha 7).
Live at root: `App.tsx`, `ExerciseHistoryScreen.tsx` (imported by `WorkoutLogScreen`), `app.json`,
`package.json`, `eas.json`, `tsconfig.json`, `metro.config.js`, `index.js`.

Background docs (prompt specs, past audits, image-pipeline reports) live in `docs/` — read on demand,
not by default; they describe past work and can drift from `src/`, which is the source of truth.

## Hotspots (large files — read selectively, don't load whole)

`curated_meals.ts` 9.4k · `BudgetCookingQuestionnaireScreen` 4.1k · `FitnessGoalsQuestionnaireScreen`
3.7k · `WorkoutLogScreen` 3.6k · `exerciseImages.ts` 3.4k · `ImportRoutineScreen` 3.2k ·
`NutritionHomeScreen` 2.9k · `HomeScreen` 2.6k · `AppNavigator.tsx` 1.8k · `useWorkoutImport.ts` 1.7k
