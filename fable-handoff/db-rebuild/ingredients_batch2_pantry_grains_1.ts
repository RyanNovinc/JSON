// ============================================================================
// BATCH 2 of ~6 — pantry_grains part 1: rices, pastas, flours, sugars,
// leavening, canned legumes, plus batch 1 amendments.
//
// >>> RULE (put this at the top of src/data/ingredients.ts): <<<
// Macros are per 100 units of canonical_unit — per 100g for 'g' rows,
// per 100ml for 'ml' rows, straight off the panel. NEVER reconvert across
// units when applying macros. grams_per_canonical_unit exists for shopping
// aggregation (grams to buy), not for macro math.
//
// FIELD RENAME: macros_per_100g → macros_per_100_canonical.
// Batch 1 values are unchanged by the rename; run
//   sed -i 's/macros_per_100g/macros_per_100_canonical/g'
// over the types file and batch 1, then paste Section A over the three
// batch 1 rows it amends.
//
// Merges applied in this batch (delete the losing rows once repointed):
//   spaghetti                  → spaghetti_dry
//   macaroni                   → macaroni_dry
//   black_beans                → black_beans_canned
//   sugar_brown_palm_substitute→ brown_sugar        (NEW, 11th duplicate)
//   cheese_block               → cheese_tasty_grated (per your Q2 answer)
// Rename applied:
//   basmati_rice_cooked        → basmati_rice_dry
// ============================================================================

// ---------------------------------------------------------------------------
// SECTION A — batch 1 amendments (paste over the batch 1 rows of same id)
// ---------------------------------------------------------------------------

export const BATCH_1_AMENDMENTS = {

  // Re-issued per-100ml. Values are the panel's per-100ml column verbatim.
  full_cream_milk: {
    id: 'full_cream_milk',
    display_name: 'Full-cream milk',
    category: 'dairy_refrigerated',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'Standard AU full-cream milk (3.4% fat). Macros per 100ml, panel verbatim.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 64, protein_g: 3.3, carbs_g: 4.8, fat_g: 3.4, fiber_g: 0 },
    grams_per_canonical_unit: 1.03,
    macro_source: 'Coles Full Cream Milk 2L panel, per 100ml',
    macro_confidence: 'sourced'
  },

  thickened_cream: {
    id: 'thickened_cream',
    display_name: 'Thickened cream',
    category: 'dairy_refrigerated',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 300,
    notes: 'AU thickened cream is standardised at ~35% milk fat. Macros per 100ml.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 345, protein_g: 2.0, carbs_g: 3.0, fat_g: 36.0, fiber_g: 0 },
    grams_per_canonical_unit: 1.01,
    macro_source: 'Estimated — AU thickened cream panels (Bulla, Pauls, house brand) cluster 335-355 kcal per 100ml at 35% fat',
    macro_confidence: 'estimated'
  },

  // Merge target for cheese_block. Display name now reads naturally for
  // grated, block, string cheese, and Babybel-style portions.
  cheese_tasty_grated: {
    id: 'cheese_tasty_grated',
    display_name: 'Tasty cheese',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Standard Australian tasty cheddar — grated bags, blocks, string cheese, or Babybel-style portions. Bega, Coles, or Woolworths. MERGED: absorbs former `cheese_block` id.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 403, protein_g: 24.9, carbs_g: 1.3, fat_g: 33.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, cheddar (matches Bega Tasty panel within 2%)',
    macro_confidence: 'sourced'
  }

};

// ---------------------------------------------------------------------------
// SECTION B — pantry_grains part 1 rows (23 rows)
// ---------------------------------------------------------------------------

export const INGREDIENTS_BATCH_2 = {

  // ========================= rice =========================

  // RENAMED from basmati_rice_cooked. Every usage converts cooked → dry at
  // ÷3.0 (the factor the DB and the meal notes already assert). Repointing
  // list is in the batch report.
  basmati_rice_dry: {
    id: 'basmati_rice_dry',
    display_name: 'Basmati rice (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Measured DRY. Dry-to-cooked yield is ~1:3 by weight. Microwave pouches (SunRice, 250g cooked) equal ~85g dry.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 365, protein_g: 7.1, carbs_g: 80.0, fat_g: 0.7, fiber_g: 1.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Rice, white, long-grain, regular, raw, unenriched',
    macro_confidence: 'sourced'
  },

  // Kept as ONE id, state dry — steamed_rice normalises to dry instead of a
  // jasmine_rice_cooked split. See report for the amount decision.
  jasmine_rice: {
    id: 'jasmine_rice',
    display_name: 'Jasmine rice (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Measured DRY. Dry-to-cooked yield ~1:2.5-3 by absorption method. 1 cup dry ≈ 185g.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 365, protein_g: 7.1, carbs_g: 80.0, fat_g: 0.7, fiber_g: 1.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Rice, white, long-grain, regular, raw, unenriched',
    macro_confidence: 'sourced'
  },

  // ========================= pasta / noodles =========================

  // MERGE TARGET: absorbs `spaghetti`. Kept the _dry id for consistency with
  // macaroni_dry / lasagne_sheets_dry / basmati_rice_dry.
  spaghetti_dry: {
    id: 'spaghetti_dry',
    display_name: 'Spaghetti (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'San Remo or Barilla. Measured dry; dry-to-cooked yield ~1:2.5. ~125g dry per generous bulking serve. MERGED: absorbs former `spaghetti` id.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 371, protein_g: 13.0, carbs_g: 74.7, fat_g: 1.5, fiber_g: 3.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Pasta, dry, unenriched',
    macro_confidence: 'sourced'
  },

  // MERGE TARGET: absorbs `macaroni`.
  macaroni_dry: {
    id: 'macaroni_dry',
    display_name: 'Macaroni / short pasta (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Elbow macaroni or any short shape (penne, spirals). San Remo or Barilla. Measured dry; yield ~1:2.2. High-protein pasta is an optional swap. MERGED: absorbs former `macaroni` id.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 371, protein_g: 13.0, carbs_g: 74.7, fat_g: 1.5, fiber_g: 3.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Pasta, dry, unenriched',
    macro_confidence: 'sourced'
  },

  lasagne_sheets_dry: {
    id: 'lasagne_sheets_dry',
    display_name: 'Lasagne sheets (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 375,
    notes: 'San Remo (egg-free) or Barilla. Check label — some brands contain eggs. 250g-375g boxes.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 371, protein_g: 13.0, carbs_g: 74.7, fat_g: 1.5, fiber_g: 3.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Pasta, dry, unenriched',
    macro_confidence: 'sourced'
  },

  noodles: {
    id: 'noodles',
    display_name: 'Noodles (egg / soba / udon / rice)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 400,
    notes: 'Generic dried noodles, measured dry (~70g dry per serve). Rice noodles are the gluten-free option (and drop protein to ~6g/100g).',
    state: 'dry',
    macros_per_100_canonical: { kcal: 350, protein_g: 11.0, carbs_g: 72.0, fat_g: 2.0, fiber_g: 3.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — dried egg/soba/udon/rice noodle panels cluster 330-370 kcal per 100g dry',
    macro_confidence: 'estimated'
  },

  gnocchi: {
    id: 'gnocchi',
    display_name: 'Gnocchi (store-bought)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Vacuum-packed potato gnocchi, weighed as sold. Boil till they float, 2-3 min.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 160, protein_g: 4.0, carbs_g: 33.0, fat_g: 0.7, fiber_g: 2.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU shelf gnocchi panels cluster 150-175 kcal per 100g as sold',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Coles Potato Gnocchi 500g, per 100g'
  },

  // ========================= oats / flours =========================

  rolled_oats_raw: {
    id: 'rolled_oats_raw',
    display_name: 'Rolled oats (raw)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Standard rolled oats, not quick oats, measured dry. Most AU oats are not certified gluten-free (cross-contamination).',
    state: 'dry',
    macros_per_100_canonical: { kcal: 379, protein_g: 13.2, carbs_g: 67.7, fat_g: 6.5, fiber_g: 10.1 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cereals, oats, regular and quick, not fortified, dry',
    macro_confidence: 'sourced'
  },

  oat_flour: {
    id: 'oat_flour',
    display_name: 'Oat flour',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    typical_pack_unit: 'g',
    notes: 'Home-blended rolled oats per the recipes, so oat macros apply. Commercial oat flour (partially debranned) runs higher at ~404 kcal/100g.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 379, protein_g: 13.2, carbs_g: 67.7, fat_g: 6.5, fiber_g: 10.1 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cereals, oats, regular and quick, not fortified, dry (home-blended oat flour)',
    macro_confidence: 'sourced'
  },

  flour_plain: {
    id: 'flour_plain',
    display_name: 'Plain flour',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 1000,
    notes: 'All-purpose white flour. White Wings or house-brand, 1kg-2kg bags.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 364, protein_g: 10.3, carbs_g: 76.3, fat_g: 1.0, fiber_g: 2.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Wheat flour, white, all-purpose, unenriched',
    macro_confidence: 'sourced'
  },

  breadcrumbs: {
    id: 'breadcrumbs',
    display_name: 'Breadcrumbs (panko or fine)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 150,
    notes: 'For binding and coating. Panko creates a lighter, crispier texture than fine crumbs; macros are near-identical.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 395, protein_g: 13.4, carbs_g: 72.0, fat_g: 5.3, fiber_g: 4.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Bread crumbs, dry, grated, plain',
    macro_confidence: 'sourced'
  },

  cornstarch: {
    id: 'cornstarch',
    display_name: 'Cornstarch',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    notes: 'Cornflour/cornstarch for thickening and velveting. 1 tbsp ≈ 8g.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 381, protein_g: 0.3, carbs_g: 91.3, fat_g: 0.1, fiber_g: 0.9 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cornstarch',
    macro_confidence: 'sourced'
  },

  // ========================= leavening =========================

  baking_powder: {
    id: 'baking_powder',
    display_name: 'Baking powder',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 125,
    typical_pack_unit: 'g',
    notes: 'Raising agent. ~2 kcal per tsp at typical use — macro noise.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 53, protein_g: 0, carbs_g: 27.7, fat_g: 0, fiber_g: 0.2 },
    grams_per_canonical_unit: 4.6,
    macro_source: 'USDA SR Legacy — Leavening agents, baking powder, double-acting (per 100g; 1 tsp = 4.6g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  bicarb_soda: {
    id: 'bicarb_soda',
    display_name: 'Bicarb soda (baking soda)',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 100,
    typical_pack_unit: 'g',
    notes: 'IMPORTANT for cevapi texture — do not skip in the kitchen; zero macros on the plate.',
    state: 'dry',
    macros_per_100_canonical: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 4.6,
    macro_source: 'USDA SR Legacy — Leavening agents, baking soda (zero macros)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  // ========================= sugars =========================

  sugar_white: {
    id: 'sugar_white',
    display_name: 'White sugar',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'CSR or house-brand. 1 tsp ≈ 4g. NOT pantry-negligible — sugar counts.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 387, protein_g: 0, carbs_g: 100.0, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Sugars, granulated',
    macro_confidence: 'sourced'
  },

  // MERGE TARGET: absorbs `sugar_brown_palm_substitute` (11th duplicate —
  // its own notes say it IS CSR brown sugar). Palm-sugar guidance folded in.
  brown_sugar: {
    id: 'brown_sugar',
    display_name: 'Brown sugar',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'CSR or house-brand, 500g-1kg bags. 1 tbsp ≈ 12g. Substitutes 1:1 for palm sugar in Thai recipes. MERGED: absorbs former `sugar_brown_palm_substitute` id.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 380, protein_g: 0.1, carbs_g: 98.1, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Sugars, brown',
    macro_confidence: 'sourced'
  },

  // ========================= canned legumes =========================
  // DECIDED convention applied: state canned_drained, macros per 100g of
  // drained beans, drained_grams_per_pack = drained yield of one tin.

  // MERGE TARGET: absorbs `black_beans`. Pack 420 per the decided text
  // ("a 420g tin yields roughly 250g"); old halves said 400 vs 420.
  black_beans_canned: {
    id: 'black_beans_canned',
    display_name: 'Canned black beans',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 420,
    notes: 'Coles or Old El Paso. Drain and rinse; amounts are DRAINED weight. One 400-420g tin drains to ~250g. MERGED: absorbs former `black_beans` id.',
    state: 'canned_drained',
    macros_per_100_canonical: { kcal: 132, protein_g: 8.9, carbs_g: 23.7, fat_g: 0.5, fiber_g: 8.7 },
    grams_per_canonical_unit: 1,
    drained_grams_per_pack: 250,
    macro_source: 'USDA SR Legacy — Beans, black, mature seeds, cooked, boiled, without salt (drained canned ≈ boiled)',
    macro_confidence: 'sourced'
  },

  kidney_beans_canned: {
    id: 'kidney_beans_canned',
    display_name: 'Canned red kidney beans',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 420,
    notes: 'SPC, Edgell, or Coles. Drain and rinse; amounts are DRAINED weight. One 400-420g tin drains to ~250g.',
    state: 'canned_drained',
    macros_per_100_canonical: { kcal: 127, protein_g: 8.7, carbs_g: 22.8, fat_g: 0.5, fiber_g: 6.4 },
    grams_per_canonical_unit: 1,
    drained_grams_per_pack: 250,
    macro_source: 'USDA SR Legacy — Beans, kidney, red, mature seeds, cooked, boiled, without salt (drained canned ≈ boiled)',
    macro_confidence: 'sourced'
  },

  chickpeas: {
    id: 'chickpeas',
    display_name: 'Chickpeas (canned)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Canned chickpeas; amounts are DRAINED weight. One 400g tin drains to ~250g. Dry well before roasting for crunch.',
    state: 'canned_drained',
    macros_per_100_canonical: { kcal: 140, protein_g: 7.5, carbs_g: 20.5, fat_g: 2.7, fiber_g: 6.0 },
    grams_per_canonical_unit: 1,
    drained_grams_per_pack: 250,
    macro_source: 'Estimated — AU canned drained panels (Edgell, Coles) run 115-140 kcal/100g vs USDA boiled at 164; DB prior of 140 sits in the panel range',
    macro_confidence: 'estimated'
  },

  // Canned but eaten WITH the sauce — as_sold, not drained.
  baked_beans: {
    id: 'baked_beans',
    display_name: 'Baked beans',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    typical_pack_unit: 'g',
    notes: 'Canned baked beans in tomato sauce, weighed as sold including sauce. Some brands contain gluten — check label.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 80, protein_g: 4.9, carbs_g: 13.5, fat_g: 0.4, fiber_g: 4.9 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU baked bean panels (Heinz, SPC, house brand) cluster 78-91 kcal per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Heinz Baked Beanz in Tomato Sauce, per 100g'
  },

  // ========================= other dry carbs =========================

  corn_chips: {
    id: 'corn_chips',
    display_name: 'Corn chips',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: [],
    typical_pack_size: 240,
    notes: 'Plain salted corn/tortilla chips (the modeled default). Flavoured varieties differ and may add dairy — check label.',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 497, protein_g: 7.0, carbs_g: 65.6, fat_g: 23.4, fiber_g: 4.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Snacks, tortilla chips, plain, white corn, salted',
    macro_confidence: 'sourced'
  },

  granola: {
    id: 'granola',
    display_name: 'Granola',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian'],
    allergens: ['Nuts'],
    typical_pack_size: 400,
    notes: "Toasted oat-and-nut clusters, ~30g per 1/3 cup. Most contain nuts and are not certified gluten-free — check label for nut-free or GF varieties.",
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 450, protein_g: 10.0, carbs_g: 55.0, fat_g: 20.0, fiber_g: 8.0 },
    grams_per_canonical_unit: 1,
    macro_source: "Estimated — AU granola panels (Carman's, Coles, Woolworths) cluster 420-480 kcal per 100g",
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: "Carman's Classic Fruit & Nut Granola, Coles, per 100g"
  },

  water: {
    id: 'water',
    display_name: 'Water',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Tap water. Zero macros; quantities still matter for cooking, so the recipe view must render negligible-flagged amounts (see Questions).',
    state: 'as_sold',
    macros_per_100_canonical: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1.0,
    macro_source: 'Definitionally zero',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  }

};
