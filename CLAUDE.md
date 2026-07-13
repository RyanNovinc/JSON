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
11. **Deduplication is covered by no test.** `src/utils/__tests__/importDeduplication.test.ts`
    is `describe.skip`ped: its fixtures never survive validation, and the fingerprint dedupe
    it claims to test lives behind `_metadata.exportType === 'unified_mesocycle_structure'`
    in `handleUnifiedMesocycleImport`, reachable only via `confirmImport` — which that suite
    never calls. Read its header before writing the real suite.

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
