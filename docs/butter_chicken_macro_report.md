# Task 1 — butter_chicken template: verification + macro report

## Environment reality (read this before trusting anything below)

This session ran in claude.ai with a sandboxed container. `/mnt/user-data/uploads` was **empty**; the source arrived as pasted documents (curated_meals.ts, ingredients.ts, types/curated_meals.ts, CLAUDE.md, handoff). There is **no git repo here**. So:

**Verified in this session (against the provided source text, with compute output):**
- butter_chicken is pre-restructure: 3 methods (stovetop_scratch, stovetop_shortcut, slow_cooker), each carrying `basmati_rice_dry: 60g` in its own ingredient list; plates authored at 490 (curry-only) and 720 (rice); no sauce axis.
- Zero occurrences of `sauce_variants`, `base_ingredients`, `resolveMealIngredients`, `sauce_options` anywhere in the provided curated_meals.ts or types file. The restructure was unbuilt, consistent with the handoff.
- All macro numbers below were computed by script (grams-first per CLAUDE.md rules) and the migrated entry was re-verified through mirrored guard + resolver logic: guard `[]`, frozen numbers recompute exactly, curry plate rice-free.

**NOT verifiable here — must run repo-side before landing:**
```
git log --oneline -15
git cat-file -t a63f04e          # expect: fatal, does not exist
git grep -n "sauce_options\|resolveMealIngredients\|base_ingredients" $(git branch -a --format='%(refname)')   # expect: zero
```

## Design calls made (mine to make per handoff; flagging, not asking)

1. **Olive oil dropped from the jar variant.** Ryan's spec defines jar = "jar sauce + cream". The legacy stovetop_shortcut also carried 10g olive oil (88 kcal) that slow_cooker never had, which is exactly the method-changes-macros tangle we're killing. Thigh renders its own fat; the stovetop step now says non-stick pan, splash of oil only if sticking. Proof of invariance: legacy slow_cooker computed == new jar default exactly (633 / 852).
2. **Steps live on the variant, keyed by method id.** Methods are pure metadata (equipment, timing, skill). Key presence = variant availability on that method. The step matrix has to live somewhere; this keeps adding a variant self-contained and keeps methods ingredient-free.
3. **Scratch authored for both methods**, including a new slow-cooker scratch flow (marinate, sear + bloom in pan, transfer, cream last 10 min). Real cooking, keeps the grid complete.
4. **Added `extra_total_minutes` to SauceVariant** (scratch: +30 for marinade + longer simmer). `extra_active_minutes` alone couldn't represent wall-clock honestly.
5. **Method timing/skill advertise the jar default** (stovetop 12/15 skill 2; slow cooker 5/245 skill 2). Scratch carries `skill_min: 3` and its extra minutes.

## Itemised jar default (the macro contract, computed)

```
plate 'butter_chicken' (curry only):
  chicken_thigh_skinless  200g          288.0 kcal  P 38.0  C  0.0  F 15.8  fib 0.0
  coriander_fresh           4g            0.9 kcal  P  0.1  C  0.1  F  0.0  fib 0.1
  butter_chicken_jar_sauce 200g         240.0 kcal  P  4.0  C 18.0  F 17.0  fib 2.0
  thickened_cream          30ml (30.3g) 103.6 kcal  P  0.6  C  0.9  F 10.8  fib 0.0
  TOTAL                                 633 kcal    P 42.7  C 19.1  F 43.6  fib 2.1

plate 'standard' (+ basmati_rice_dry 60g = 219.0 kcal, P 4.3, C 48.0, F 0.4, fib 0.8):
  TOTAL                                 852 kcal    P 47.0  C 67.1  F 44.0  fib 2.9
```

Atwater sanity on jar curry-only: reconstructed 635 vs computed 633 (jar row is `estimated`; within noise).

## Divergence table: authored vs computed, frozen values

| plate | authored today | computed jar (FROZEN) | computed scratch | Δ frozen vs authored |
|---|---|---|---|---|
| butter_chicken (curry only) | 490 / P48 / C14 / F28 / fib3 | **633 / 42.7 / 19.1 / 43.6 / 2.1** | 769 / 49.6 / 24.8 / 53.1 / 4.4 | +143 kcal, fat +15.6 |
| standard (rice) | 720 / P52 / C68 / F24 / fib6 | **852 / 47.0 / 67.1 / 44.0 / 2.9** | 988 / 53.9 / 72.8 / 53.5 / 5.2 | +132 kcal, fat +20.0 |

Disposition: **freeze to computed jar default** (handoff Phase D). The authored numbers are reproducible from no method's ingredients under any variant; the fat figures (28 / 24) were fantasy against 200g thigh + jar sauce + cream (43.6 computed), and the rice plate's fiber 6 was wrong (2.9). Ingredients are right, authored numbers were hand-typed: freeze computed.

Legacy computed per method, for the record (why authored never matched anything):

```
stovetop_scratch   with rice: 988 / 53.9 / 72.8 / 53.5 / 5.2   minus rice: 769 / 49.6 / 24.8 / 53.1 / 4.4
stovetop_shortcut  with rice: 940 / 47.0 / 67.1 / 54.0 / 2.9   minus rice: 721 / 42.7 / 19.1 / 53.6 / 2.1
slow_cooker        with rice: 852 / 47.0 / 67.1 / 44.0 / 2.9   minus rice: 633 / 42.7 / 19.1 / 43.6 / 2.1
```

This also resolves the prior "+102%" mystery: with 219 kcal of rice welded into every method base, a curry-only plate could never exclude it. Rice now lives on the rice plate; the curry plate resolves genuinely rice-free (verified).

Both bugs from the handoff are demonstrably fixed in the template: method choice moves zero macros (no methodId even enters the template resolution path), and the jar↔scratch toggle moves macros because they're computed from ingredients (633 → 769 curry-only).

## Files in this delivery

- `curated_meals.types.ts` — full replacement for `src/types/curated_meals.ts` (SauceVariant, base_ingredients, method doc updates)
- `resolveMealIngredients.ts` — new `src/utils/resolveMealIngredients.ts` (template path + legacy fallback + `resolveMealInstructions` + `methodsForVariant`)
- `validateMealTemplate.ts` — new `src/utils/validateMealTemplate.ts` guard
- `butter_chicken.migrated.ts` — drop-in replacement for the butter_chicken entry
- `mealTemplate.test.ts` — new `src/utils/__tests__/mealTemplate.test.ts`

## Repo-side checklist (Phase C consumers live in files not provided here)

1. Run the git verifications above; state findings before building on them.
2. Drop the four source files in; replace the butter_chicken entry.
3. Wire `validateMealTemplate` into the boot-time meal validation pass.
4. Wire consumers onto the one path: `computePlateMacros` → `resolveMealIngredients`; shopping list builder; meal detail / cook mode ingredient list + steps via `resolveMealInstructions`. Until this is done, anything reading `method.ingredients` directly will see `[]` for butter_chicken — that is the forcing function, not a bug to paper over.
5. Extend the macro divergence test to route template meals through the resolver; run it. If the repo's `computePlateMacros` treats `fixed` rows differently at fractional plate shares, its semantics win (no effect on butter_chicken: produces_servings 1, multiplier 1.0).
6. `npm test` + `npm run test:persistence`.
7. Land on your own throwaway branch; hand to the shared branch via `git update-ref` compare-and-swap from outside any other agent's worktree, per CLAUDE.md. Ship 2's five files are disjoint from all files touched here.
