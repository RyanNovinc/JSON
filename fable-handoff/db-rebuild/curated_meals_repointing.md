# curated_meals.ts repointing ledger

Consolidated from ingredient-database batches 1-5. Apply to `src/data/curated_meals.ts`
after the new `ingredients.ts` rows land, in the same commit — the boot validator
(`unit !== canonical_unit`, unknown-id checks) will throw if either side lands alone.

**Summary: 18 meals affected · 22 ingredient-line id swaps · 4 flex_ingredient_id updates · 17 amount changes · 6 note/display edits · 2 confirmed-dead ids (no phantom repoints).**

Conventions used below:
- `id:` old → new (ingredient-line `ingredient_id` swap)
- `amt:` old → new (with unit if the unit field changes too)
- `flex:` old → new (`flex_ingredient_id` pointer)
- `note:` required text edit
- ⚠ = inferred intent, wants a human glance before the rewrite

---

## Global id map (reference)

| old id | new id |
|---|---|
| chicken_thigh | chicken_thigh_skinless |
| parmesan | parmesan_grated |
| cheese_block | cheese_tasty_grated |
| spaghetti | spaghetti_dry |
| macaroni | macaroni_dry |
| black_beans | black_beans_canned |
| sugar_brown_palm_substitute | brown_sugar |
| dried_oregano | oregano_dried |
| coriander_leaves_fresh | coriander_fresh (unit tbsp → g) |
| parsley | parsley_flat_leaf |
| basmati_rice_cooked | basmati_rice_dry (amounts ÷3.0) |

Deleted rows, **confirmed zero meal references** (verified against the generated
usage report, which parses both `methods[].ingredients[]` and
`plates[].additional_ingredients[]`): `red_chilli`, `basil_fresh`. No repoints exist.

---

## Per-meal changes

### butter_chicken
- id: basmati_rice_cooked → basmati_rice_dry
- amt: basmati 180 → **60** (cooked → dry, ÷3.0)
- flex: basmati_rice_cooked → basmati_rice_dry
- id: coriander_leaves_fresh → coriander_fresh
- amt: coriander 1 **tbsp** → 4 **g** (unit field changes; 1 tbsp chopped = 4g)

### carne_asada_bowl
- amt: black_beans_canned 240 → **250** (id already correct; normalised so one
  drained tin = drained_grams_per_pack exactly)

### cheese_snack
- id: cheese_block → cheese_tasty_grated
- flex: cheese_block → cheese_tasty_grated

### chicken_fajita_bowl
- id: black_beans → black_beans_canned
- amt: black beans 400 → **250** (400 was the pack label read as drained contents;
  one 420g tin drains to ~250g)

### chicken_mac_and_cheese
- id: macaroni → macaroni_dry

### chilli_con_carne — ⚠ human glance (see flags)
Both methods (slow_cooker AND stovetop):
- id: basmati_rice_cooked → basmati_rice_dry (single rice reference)
- amt: basmati 250 → **85** (cooked → dry, ÷3.0, matching its own "approximately 85g dry" note)
- id: coriander_leaves_fresh → coriander_fresh
- amt: coriander 1 **tbsp** → 4 **g**
- amt: black_beans_canned 400 → **250** (×2, one per method)
- amt: kidney_beans_canned 400 → **250** (×2, one per method)
- note: replace both black-bean and both kidney-bean ingredient notes with:
  "One 420g tin, drained to ~250g. Drain and rinse before adding."
  (kills the self-contradictory "recipe scales to 400g drained-equivalent" sentence)

### massaman
- id: basmati_rice_cooked → basmati_rice_dry
- amt: basmati 300 → **100** (÷3.0, matching its own "approximately 100g dry" note)
- id: coriander_leaves_fresh → coriander_fresh
- amt: coriander 1 **tbsp** → 4 **g**
- id: sugar_brown_palm_substitute → brown_sugar (amount 30g unchanged; optionally
  append "or palm sugar 1:1" to the line note — the substitution guidance now
  lives on the brown_sugar row)

### no_bake_protein_cheesecake
- note: cream_cheese line "Light block-style; soften at room temp." →
  "Full-fat block-style; soften at room temp." (decision: no cream_cheese_light
  row; the full-fat macro is accepted, ~+220 kcal across the batch)

### pulled_pork
- id: basmati_rice_cooked → basmati_rice_dry
- amt: basmati 280 → **95** (÷3.0, rounded to 5g)
- id: coriander_leaves_fresh → coriander_fresh
- amt: coriander 1.5 **tbsp** → 6 **g**

### roasted_chickpeas
- amt: chickpeas 400 → **250** ("one drained can" — 400 was the pack label)

### satay_chicken
- id: chicken_thigh → chicken_thigh_skinless
- flex: chicken_thigh → chicken_thigh_skinless
  (line note references "Swap chicken_breast" — unaffected)

### sheet_pan_salmon_potatoes
- id: parsley → parsley_flat_leaf

### sheet_pan_sausage_veg
- id: dried_oregano → oregano_dried

### spaghetti_carbonara
- id: spaghetti → spaghetti_dry
- id: parmesan → parmesan_grated

### spicy_chipotle_chicken_burrito
- id: black_beans → black_beans_canned
- amt: black beans 240 → **250** (normalisation, one tin = 250g exactly)

### steamed_rice
- amt: jasmine_rice 150 → **75** — semantics change from cooked weight to DRY
  weight (decision: keep the meal's own 75g-dry figure; do not derive from the
  hand-authored plate kcal)
- note: "Cooked weight. About 75g raw rice." → "Dry weight; makes ~190g cooked."
- flex: jasmine_rice pointer unchanged, but verify any flex config amount also
  reads 75 (dry) and any display text says "makes ~190g cooked"
- The 195 kcal plate figure is expected to move when macros are recomputed
  (75g dry ≈ 274 kcal) — do not "fix" the amount to preserve the old plate number

### tuna_pasta_bake
- id: macaroni → macaroni_dry
- id: dried_oregano → oregano_dried

### turkey_meatballs_spaghetti
- id: spaghetti → spaghetti_dry
- flex: spaghetti → spaghetti_dry
- id: dried_oregano → oregano_dried

---

## ⚠ Inferred-intent flags (human glance before applying)

1. **chilli_con_carne bean quantities.** The 400 → 250 change assumes the author
   meant ONE tin of each bean per 8-serve batch (the decided convention: 400g
   authorings read the pack label as drained contents). The alternative reading
   of the kidney note's "400g drained-equivalent" is a deliberate 1.6 tins of
   beans. Nothing in either method implies a second tin, and the slow_cooker
   note states "drained weight approximately 250g", so one tin is the strong
   reading — but this is the only place the ledger resolves a contradiction
   rather than applying a clean rule. If the chilli should be beanier, the fix
   is 2 tins → 500g, not a revert to 400.
2. **steamed_rice 75g dry** was ruled explicitly (batch 2 answers), so it is a
   decision, not an inference — listed here only because the plate kcal will
   visibly change and someone reviewing the diff without context may think it
   is a bug.
3. **basmati ÷3.0 rounding**: pulled_pork 280 ÷ 3 = 93.3, written as 95 (5g
   rounding). All other conversions land on round numbers the meals' own notes
   already state (60, 85, 100). If exact thirds are preferred, use 93.

## Sequencing note for the applying session

The coriander lines change their `unit` field (tbsp → g). The boot validator
enforces `unit === canonical_unit` per ingredient id, so ingredients.ts (new
`coriander_fresh` canonical g, old `coriander_leaves_fresh` row deleted) and
these four meal lines must land in the same commit or boot will throw either
way. Same commit should also delete the eleven merged ids and the two dead rows
listed in the global map, then run the usage-report generator to confirm zero
references to any deleted id.

---

## Post-compute corrections

Corrections found by the Phase-2 `computePlateMacros()` divergence pass (after the
database + repointing landed), and their disposition.

### edamame — meal repoint (row kept as pods)

The `edamame` row correctly models **pods** (61 kcal/100g, ~50% edible), but the
`edamame` meal authored its amount in **shelled-bean** terms, so compute read
150g-of-pods (92 kcal) against a plate_macro written for 150g-of-beans (190 kcal) —
a −52% divergence. The reference was right, the amount was in the wrong unit.

- amt: `edamame` 150 → **300** g (pods; ~50% yield → 300g pods ≈ 150g beans = what
  the authored macro reflected)
- `flex_ingredient_id` stays `edamame`; it is a pointer with no separate config
  amount (the flex quantity is the ingredient line's `base_amount`, now 300).
- note: `'Frozen pods.'` → `'Frozen pods; ~300g pods yields ~150g beans.'`
- DB row note tightened to state it both ways: `"Amounts are POD weight. ~50%
  edible: 300g pods ≈ 150g shelled beans (121 kcal, 11.9g protein per 100g shelled,
  USDA)."`
- Recompute lands at **183 kcal / 18 P** vs authored 190 / 17 (~4% drift); plate_macros
  left authored, amount not tuned to preserve the old number.
- Usage report confirms `edamame` is referenced by exactly one meal (`edamame`), so
  this is the complete fix.
