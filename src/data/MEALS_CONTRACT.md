# MEALS_CONTRACT.md

How curated meals are structured, scaled, and displayed in JSON.fit. Read this
before adding a meal to `src/data/curated_meals.ts` or authoring Cook Mode steps in
`src/data/meal_substeps.ts`. The types live in `src/types/curated_meals.ts`; the
display logic lives in `src/utils/ingredientScaling.ts`.

---

## 0. The one invariant: the macro panel is the source of truth

The plan generator multiplies one `scale_factor` uniformly across the whole plate.
The macro panel and the day card show that uniform scaled number, and **those macros
are authoritative**. Ingredient amounts and Cook Mode step amounts are *derived for
display, shopping, and cooking*. They round freely, they will not sum exactly to the
panel macros, and that is expected and correct. Never re-derive macros from
ingredients, and never round ingredients in a way that is meant to "match" the panel.

---

## 1. Data schema

`CURATED_MEALS` is `Record<MealSlug, CuratedMeal>`, keyed by slug.

A `CuratedMeal` has:

- `slug`, `display_name`, `cuisine`, `primary_protein`
- `produces_servings` — see section 3.
- `eligible_slots`, `min_scale`, `max_scale`, `contains_allergens`
- `flex_ingredient_id` — the ingredient the generator nudges upstream to hit a
  calorie target. It is a *generation-time* hint. The display utility does **not**
  treat the flex ingredient specially (see section 2).
- `plates[]` — one or more serving styles. Always at least one.
- `methods[]` — one or more cooking methods (stovetop, slow cooker, oven, ...).
- optional `image_filename`, `photo_url`, `meal_prep`.

### Base ingredients vs plate ingredients

Two ingredient lists, and the distinction drives per-serving division (section 3):

- **Base ingredients** live on `method.ingredients` (`CookingMethod.ingredients`).
  They are stored at **batch quantity** — the amount for `produces_servings`
  servings. The core recipe.
- **Plate ingredients** live on `plate.additional_ingredients`
  (`Plate.additional_ingredients`). They are stored **per serving** — the
  accompaniments for one plate (the rice, the bun, the cheese).

Every `MealIngredient` is:

```ts
{ ingredient_id: IngredientId; base_amount: number; unit: CanonicalUnit; scaling: IngredientScaling; notes?: string }
```

- `ingredient_id` is an opaque key (`'chicken_thigh_skinless'`). The human-readable
  name lives in the ingredient library (`src/types/ingredients.ts`), not on the row.
- `base_amount` is **always present and numeric**, and `unit` is **always present**.
  There are no amount-less or unit-less rows. "To taste" and "for garnish" items are
  encoded as a real amount in a real unit with a `notes` string — e.g.
  `coriander_leaves_fresh, 1, tbsp, notes: 'for garnish'`. The display layer never
  needs a pass-through-unchanged branch.
- `scaling` — see section 2.

### Macros

`plate.plate_macros` (`{ kcal, protein_g, carbs_g, fat_g, fiber_g }`) is the full,
authoritative macro picture for that plate (base portion + accompaniments combined),
not a delta. `CookingMethod.macros_override` exists in the type for per-method macro
differences but is currently unused.

### Plate fields the display caller must reconcile

- `plate.base_serving_multiplier` — how many base servings this plate consumes
  (standard 1.0; a stunt plate may be 1.5). The screen folds this into `portions`
  when rendering base ingredients for that plate. It is **not** the job of the
  per-ingredient formatter.
- `plate.is_stunt_plate` — UI label; planner avoids more than one per week.

---

## 2. The `scaling` field: present in data, NOT read for display

Each row carries `scaling: 'scales' | 'fixed' | 'flex'`. **The display utility ignores
it.** Scaling is uniform: the generator scales the whole plate by `scale_factor`, the
panel shows that, and the ingredient list must agree with the panel. Honoring per-row
`fixed` (e.g. holding a side of rice constant) would desync the list from the panel
and break macro accuracy on plated meals.

Leave the field in the data — it documents authoring intent and may feed other
features — but do **not** branch on it when computing displayed amounts. Whether a row
scales, and how it rounds, is decided entirely by its **unit class** (section 4).

---

## 3. `produces_servings`: 1 vs batch, and how the caller divides

- `produces_servings === 1` — the recipe makes a single serving. Base amounts are
  per-serving as written.
- `produces_servings > 1` — a batch cooked whole and portioned across the week
  (observed values: 3, 4, 5, 6, 8, 10, 12). Base amounts are batch totals.

The caller passes `producesServings` into `displayIngredient` so it can convert to
per serving:

- **Base rows:** pass `meal.produces_servings`. The formatter divides by it.
- **Plate rows:** pass `1`. Plate accompaniments are already per serving.

Two more inputs compose on top:

- `portions` — integer servings being cooked. Default 1; a meal-prep flow sets it
  higher (or folds in `base_serving_multiplier`).
- `planScale` — the plan's `scale_factor` for this meal. Default 1.

---

## 4. Unit vocabulary and the scaling + rounding rule

The units in use are **`g`, `ml`, `tsp`, `tbsp`, `count`, `cloves`**. (`kg` and `l`
are handled for forward-compat but are not currently used. `cup` and `pinch` appear
only in `notes` prose, never as a unit. Do not introduce `each`; use `count`.)

`perServing = base_amount / producesServings` (or `base_amount` for plate rows, where
`producesServings = 1`).

| Unit class | Units | Multiplier | Rounding / format |
|---|---|---|---|
| Mass / volume | `g`, `ml` | `portions × planScale` | nearest whole integer |
| Mass / volume | `kg`, `l` | `portions × planScale` | 2 dp, trailing zeros stripped |
| Discrete | `count`, `cloves` | `portions × planScale` | base per-serving ≥ 1 → nearest whole, floored at 1; base per-serving < 1 → nearest 1/4 as a fraction (min 1/4, never 0); batch-aromatic rule below |
| Seasoning | `tsp`, `tbsp` | `portions` only — **planScale NOT applied** | nearest 1/4 as a vulgar fraction (`1/4`, `1 1/2`); a positive amount that rounds to 0 → `pinch` |

Why seasonings ignore `planScale`: they are ~0 macro, so scaling them buys no macro
accuracy but produces ugly decimals (`0.9 tsp`). Convention is to season to taste.
Holding them at the per-serving base amount keeps the panel honest and the copy clean.

**Pinch floor.** Any positive `tsp`/`tbsp` amount that rounds to 0 renders as `pinch`.
(Note the 1/4 rule rounds half up, so e.g. `0.125 tsp → 1/4 tsp`; only amounts below
~0.125 become `pinch`.)

**Batch-aromatic rule.** A discrete (`count`/`cloves`) item that works out to less
than 1 per serving in a batch (`producesServings > 1`) is a property of the pot, not
the plate — a bay leaf, cinnamon stick, star anise, or garlic clove. Dividing it per
serving rounds it to 0. Instead it renders at the **batch amount** (scaled by
`planScale`) with a `(for the batch)` tag. So 1 cinnamon stick across an 8-serving
curry shows `1 (for the batch)`, not `0`.

### Output shape

`displayIngredient` returns the **quantity string only**; the caller appends the
ingredient name resolved from `ingredient_id`:

| Class | Returns | Rendered (caller adds name) |
|---|---|---|
| g / ml | `"170 g"` | `170 g chicken thigh` |
| tsp / tbsp | `"1/2 tsp"` | `1/2 tsp ground cumin` |
| pinch | `"pinch"` | `pinch salt` |
| count | `"2"` (bare number) | `2 eggs` |
| count, sub-1 base | `"1/4"` (bare fraction) | `1/4 lime` |
| cloves | `"2 cloves"` / `"1 clove"` | `2 cloves garlic` |
| cloves, sub-1 base | `"1/4 clove"` | `1/4 clove garlic` |
| batch aromatic | `"3 (for the batch)"` | render as `bay leaves: 3 (for the batch)` |

For batch aromatics, prefer a `{name}: {qty}` layout (or place the `(for the batch)`
tag after the name) so it does not read as `3 (for the batch) bay leaves`.

---

## 5. Cook Mode substep prose (`meal_substeps.ts`)

Cook Mode steps are prose strings scaled by a separate **text scaler** in
`meal_substeps.ts` (out of scope for `ingredientScaling.ts`). To make that scaler
catch the right numbers and leave the rest alone, author steps like this:

- **Mass / volume:** write digits immediately followed by the unit, no space —
  `200g`, `350ml`, `1.5kg`, `2l`. The scaler keys on `<number>g|kg|ml|l`. A space
  ("200 g") can be missed.
- **Seasonings:** write `tsp` / `tbsp` (`1 tsp cumin`, `2 tbsp soy`). These are not
  scaled by `planScale`, matching the ingredient list.
- **Discrete items:** write counts (`2 eggs`, `3 bay leaves`, `4 garlic cloves`).
- **Never scaled, write naturally:** temperatures (`180C`, `200°C`), times
  (`45 minutes`, `8 hours`), and dimensions (`3 cm cubes`, `1 inch`). The scaler must
  not touch these.
- **Single-serve meals (`produces_servings === 1`):** the cook steps are scaled
  (they describe one serving).
- **Batch meals (`produces_servings > 1`):** the cook steps are left at **batch
  amounts** (you cook the whole pot), consistent with the batch-aromatic rule in the
  ingredient list.

---

## 6. Adding a new meal: checklist

1. Add the slug to `MealSlug` in `src/types/curated_meals.ts`.
2. Put the **core recipe** on `method.ingredients` at **batch quantity** for
   `produces_servings`. Put **accompaniments** on `plate.additional_ingredients` at
   **per-serving** quantity.
3. Use only `g`, `ml`, `tsp`, `tbsp`, `count`, `cloves`. Put macro-bearing items
   (proteins, grains, dairy, fruit, oils) in `g`/`ml`/`count` — never in a seasoning
   unit. Put spices, salt, leaveners, and small flavourings in `tsp`/`tbsp`.
4. Every row needs a numeric `base_amount` and a `unit`. Encode garnish / to-taste as
   a real amount plus a `notes` string, not as a missing amount.
5. Set `scaling` for documentation/other features, but know the display ignores it —
   so make sure each amount is correct **as a uniformly scaled quantity**. If holding
   something constant matters to you, the uniform model will still scale it; design
   the recipe accordingly.
6. Set `plate_macros` to the true total for the plate (base portion + accompaniments).
   This is the source of truth; the ingredient amounts are allowed to round away from
   it.
7. Fractional `count`/`cloves` on a per-serving row (a plate row, or a single-serve
   recipe) is allowed: it renders as the nearest 1/4 (`lime: 0.25` → `1/4 lime`;
   `egg_whole: 0.17` → `1/4 egg`). See section 7. The fraction is a rounded
   approximation and will not match the panel exactly (`0.17` shows as `1/4`, ~1.5x
   the encoded amount), so still prefer grams when an exact small amount matters.
8. Author Cook Mode steps per section 5.

---

## 7. Edge behaviours worth knowing

- **Fractional `count`/`cloves` on a non-batch row** renders as the nearest 1/4.
  `lime: 0.25, count` (a per-serving plate row) → `1/4 lime`; `egg_whole: 0.17, count`
  (1/6 egg per portion in the lasagne bake plate) → `1/4 egg`. The guard triggers when
  the **base** per-serving amount is below 1 and the batch-aromatic rule has not
  already claimed the row. It uses the same quarter formatter as seasonings (min 1/4,
  never 0, never `pinch`), bare for `count` (`1/4`) and `"1/4 clove"` for `cloves`, and
  still scales by `portions × planScale` (so the same lime reads `1/2 lime` at
  planScale 1.5). It is gated on the **base** amount, not the scaled amount, so a
  genuine 1-per-serving item the plan shrinks still floors to 1 rather than dropping to
  a fraction. The displayed fraction is a rounded approximation and will not match the
  panel exactly — the panel stays the source of truth — so prefer grams when an exact
  small amount actually matters.
- **Batch `tsp` seasonings show their per-serving amount**, which for large batches can
  be `pinch` (e.g. bolognese `salt: 1 tsp` over 8 servings → `1/4 tsp`;
  `black_pepper_ground: 0.5 tsp` over 8 → `pinch`). This is correct per the rules (each
  serving genuinely contains a pinch); the Cook Mode steps show the real batch amount.
  Showing batch seasonings at the pot amount in the ingredient list would be a
  deliberate extension, not a default.