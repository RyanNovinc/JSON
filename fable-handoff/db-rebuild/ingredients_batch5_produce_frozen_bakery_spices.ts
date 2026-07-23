// ============================================================================
// BATCH 5 of 5 (FINAL) — produce (30) + frozen (9) + bakery (7) + spices,
// dried herbs, salt, seeds (24). 70 rows.
//
// NEW FIELD (add to the interface and header docs):
//   atwater_exempt?: boolean  // kcal derives from ethanol/acetic acid or
//                             // non-Atwater factors (high-fiber cocoa/spices)
//                             // — skip the Atwater cross-check
//
// >>> ADD TO CLAUDE.md verbatim: <<<
// atwater_exempt marks rows whose kcal cannot be reconstructed from P/C/F
// (alcohol, acetic acid, or non-standard USDA energy factors). Any Atwater
// validation must skip these rows, and should compute available carbs as
// (carbs − fiber) with fiber at 2 kcal/g.
//
// AMENDMENTS TO EARLIER BATCHES (one-line edits, no re-issue needed):
//   batch 4: add atwater_exempt: true to red_wine_cooking,
//            chinese_cooking_wine, rice_vinegar, apple_cider_vinegar,
//            vanilla_extract
//   batch 3: add atwater_exempt: true to cocoa_powder (USDA uses reduced
//            energy factors for cocoa; naive Atwater overshoots ~90%)
//
// Merges applied this batch (decided pairs 1, 2, 3):
//   dried_oregano          → oregano_dried
//   coriander_leaves_fresh → coriander_fresh  (tbsp → grams, 1 tbsp = 4g)
//   parsley                → parsley_flat_leaf
// Deletions (both dead, zero meal references):
//   red_chilli   (red_chilli_fresh survives)
//   basil_fresh  (thai_basil_fresh and dried_basil cover the live uses)
// Recategorised to pantry_grains for spice-aisle consistency:
//   chilli_powder, curry_powder, dried_basil (were condiments_supplements)
// ============================================================================

export const INGREDIENTS_BATCH_5 = {

  // ============================ PRODUCE ============================
  // All fresh produce is state 'raw', weighed as prepped (peeled banana,
  // avocado flesh) exactly as each row's notes already define.

  garlic_clove: {
    id: 'garlic_clove', display_name: 'Garlic', category: 'produce',
    canonical_unit: 'cloves',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 1, typical_pack_unit: 'bulb',
    notes: 'One clove ≈ 3g. Shopped produce — not pantry-negligible despite tiny macros.',
    state: 'raw',
    macros_per_100g: { kcal: 149, protein_g: 6.4, carbs_g: 33.1, fat_g: 0.5, fiber_g: 2.1 },
    grams_per_canonical_unit: 3,
    macro_source: 'USDA SR Legacy — Garlic, raw (1 clove = 3g per USDA household measure)',
    macro_confidence: 'sourced'
  },

  ginger_fresh: {
    id: 'ginger_fresh', display_name: 'Fresh ginger', category: 'produce',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Minced or grated; 1 tsp grated ≈ 2g. Sold by the knob.',
    state: 'raw',
    macros_per_100g: { kcal: 80, protein_g: 1.8, carbs_g: 17.8, fat_g: 0.8, fiber_g: 2.0 },
    grams_per_canonical_unit: 2,
    macro_source: 'USDA SR Legacy — Ginger root, raw (1 tsp grated = 2g)',
    macro_confidence: 'sourced'
  },

  brown_onion: {
    id: 'brown_onion', display_name: 'Brown onion', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 150, typical_pack_unit: 'count',
    notes: 'One medium onion ≈ 150g. Red onion swaps at identical macros.',
    state: 'raw',
    macros_per_100g: { kcal: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1, fiber_g: 1.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Onions, raw',
    macro_confidence: 'sourced'
  },

  banana: {
    id: 'banana', display_name: 'Banana', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Peeled flesh weight; one medium ≈ 120g peeled.',
    state: 'raw',
    macros_per_100g: { kcal: 89, protein_g: 1.1, carbs_g: 22.8, fat_g: 0.3, fiber_g: 2.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Bananas, raw',
    macro_confidence: 'sourced'
  },

  // MERGE TARGET: absorbs coriander_leaves_fresh (tbsp). 1 tbsp chopped = 4g.
  coriander_fresh: {
    id: 'coriander_fresh', display_name: 'Coriander / cilantro (fresh)', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 30,
    notes: 'Chopped fresh coriander; 1 tbsp chopped ≈ 4g, one bunch ≈ 30g. MERGED: absorbs former `coriander_leaves_fresh` (tbsp) id.',
    state: 'raw',
    macros_per_100g: { kcal: 23, protein_g: 2.1, carbs_g: 3.7, fat_g: 0.5, fiber_g: 2.8 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Coriander (cilantro) leaves, raw; tbsp conversion per USDA chopped fresh herb household measures (parsley 1 tbsp = 3.8g, coriander comparable, rounded to 4g)',
    macro_confidence: 'sourced'
  },

  avocado: {
    id: 'avocado', display_name: 'Avocado', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Flesh only; one medium yields ≈ 200g.',
    state: 'raw',
    macros_per_100g: { kcal: 160, protein_g: 2.0, carbs_g: 8.5, fat_g: 14.7, fiber_g: 6.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Avocados, raw, all commercial varieties',
    macro_confidence: 'sourced'
  },

  spinach_baby: {
    id: 'spinach_baby', display_name: 'Baby spinach leaves', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 120,
    notes: 'Pre-washed; one large handful ≈ 30g.',
    state: 'raw',
    macros_per_100g: { kcal: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, fiber_g: 2.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Spinach, raw',
    macro_confidence: 'sourced'
  },

  lemon_juice: {
    id: 'lemon_juice', display_name: 'Lemon juice', category: 'produce',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Fresh-squeezed preferred; half a lemon ≈ 20ml. Bottled is fine.',
    state: 'raw',
    macros_per_100g: { kcal: 22, protein_g: 0.4, carbs_g: 6.9, fat_g: 0.2, fiber_g: 0.3 },
    grams_per_canonical_unit: 1.02,
    macro_source: 'USDA SR Legacy — Lemon juice, raw (per 100g); density 1.02',
    macro_confidence: 'sourced'
  },

  mint_leaves: {
    id: 'mint_leaves', display_name: 'Fresh mint leaves', category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Whole leaves; one leaf ≈ 0.15g. Shopped by the bunch, so not flagged negligible despite near-zero macros.',
    state: 'raw',
    macros_per_100g: { kcal: 44, protein_g: 3.3, carbs_g: 8.4, fat_g: 0.7, fiber_g: 6.8 },
    grams_per_canonical_unit: 0.15,
    macro_source: 'USDA SR Legacy — Spearmint, fresh (1 leaf ≈ 0.15g assumption)',
    macro_confidence: 'sourced'
  },

  baking_potato: {
    id: 'baking_potato', display_name: 'Baking potato (Sebago or russet)', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Raw weight, flesh and skin. One large ≈ 350g.',
    state: 'raw',
    macros_per_100g: { kcal: 77, protein_g: 2.0, carbs_g: 17.5, fat_g: 0.1, fiber_g: 2.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Potatoes, flesh and skin, raw',
    macro_confidence: 'sourced'
  },

  potato_waxy: {
    id: 'potato_waxy', display_name: 'Waxy potato (Desiree or Dutch Cream)', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Raw weight. Waxy vs starchy is a texture split, not a macro split.',
    state: 'raw',
    macros_per_100g: { kcal: 77, protein_g: 2.0, carbs_g: 17.5, fat_g: 0.1, fiber_g: 2.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Potatoes, flesh and skin, raw',
    macro_confidence: 'sourced'
  },

  potato_baby_chat: {
    id: 'potato_baby_chat', display_name: 'Baby chat potatoes', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 1000,
    notes: 'Raw weight, skins on.',
    state: 'raw',
    macros_per_100g: { kcal: 77, protein_g: 2.0, carbs_g: 17.5, fat_g: 0.1, fiber_g: 2.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Potatoes, flesh and skin, raw',
    macro_confidence: 'sourced'
  },

  lime: {
    id: 'lime', display_name: 'Lime', category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Bone-in-yield pattern: grams = edible portion actually used per lime (juice + flesh ≈ 30g), not the ~65g whole fruit.',
    state: 'raw',
    macros_per_100g: { kcal: 30, protein_g: 0.7, carbs_g: 10.5, fat_g: 0.2, fiber_g: 2.8 },
    grams_per_canonical_unit: 30,
    macro_source: 'USDA SR Legacy — Limes, raw (edible-used ≈ 30g per lime assumption)',
    macro_confidence: 'sourced'
  },

  lemon: {
    id: 'lemon', display_name: 'Lemon', category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 1,
    notes: 'Bone-in-yield pattern: grams = edible portion used per lemon (juice ≈ 45ml ≈ 45g), not the whole fruit. Distinct from lemon_juice (ml) — this row is for juice-plus-wedges meals.',
    state: 'raw',
    macros_per_100g: { kcal: 29, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.3, fiber_g: 2.8 },
    grams_per_canonical_unit: 45,
    macro_source: 'USDA SR Legacy — Lemons, raw, without peel (edible-used ≈ 45g per lemon assumption)',
    macro_confidence: 'sourced'
  },

  cucumber: {
    id: 'cucumber', display_name: 'Cucumber', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 400,
    notes: 'With peel.',
    state: 'raw',
    macros_per_100g: { kcal: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1, fiber_g: 0.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cucumber, with peel, raw',
    macro_confidence: 'sourced'
  },

  cherry_tomatoes: {
    id: 'cherry_tomatoes', display_name: 'Cherry tomatoes', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 250,
    notes: 'Grape tomatoes work too.',
    state: 'raw',
    macros_per_100g: { kcal: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Tomatoes, red, ripe, raw',
    macro_confidence: 'sourced'
  },

  capsicum_red: {
    id: 'capsicum_red', display_name: 'Red capsicum', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One large ≈ 150g. Green substitutes (slightly fewer carbs).',
    state: 'raw',
    macros_per_100g: { kcal: 31, protein_g: 1.0, carbs_g: 6.0, fat_g: 0.3, fiber_g: 2.1 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Peppers, sweet, red, raw',
    macro_confidence: 'sourced'
  },

  carrot: {
    id: 'carrot', display_name: 'Carrot', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One medium ≈ 120g.',
    state: 'raw',
    macros_per_100g: { kcal: 41, protein_g: 0.9, carbs_g: 9.6, fat_g: 0.2, fiber_g: 2.8 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Carrots, raw',
    macro_confidence: 'sourced'
  },

  celery: {
    id: 'celery', display_name: 'Celery', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One stalk ≈ 50g.',
    state: 'raw',
    macros_per_100g: { kcal: 14, protein_g: 0.7, carbs_g: 3.0, fat_g: 0.2, fiber_g: 1.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Celery, raw',
    macro_confidence: 'sourced'
  },

  spring_onion: {
    id: 'spring_onion', display_name: 'Spring onion', category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One stem ≈ 10g; ~6 stems per bunch.',
    state: 'raw',
    macros_per_100g: { kcal: 32, protein_g: 1.8, carbs_g: 7.3, fat_g: 0.2, fiber_g: 2.6 },
    grams_per_canonical_unit: 10,
    macro_source: 'USDA SR Legacy — Onions, spring or scallions, raw (1 stem = 10g per existing DB note)',
    macro_confidence: 'sourced'
  },

  // MERGE TARGET: absorbs `parsley`.
  parsley_flat_leaf: {
    id: 'parsley_flat_leaf', display_name: 'Fresh flat-leaf parsley', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Italian/continental parsley; one bunch ≈ 30g. Curly or dill substitute. MERGED: absorbs former `parsley` id.',
    state: 'raw',
    macros_per_100g: { kcal: 36, protein_g: 3.0, carbs_g: 6.3, fat_g: 0.8, fiber_g: 3.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Parsley, fresh',
    macro_confidence: 'sourced'
  },

  thyme_fresh: {
    id: 'thyme_fresh', display_name: 'Fresh thyme', category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Measured in sprigs; one sprig ≈ 1g. Tied and removed before serving, so ~1 kcal per sprig barely registers anyway. Substitute dried thyme (2 tsp per 5 sprigs).',
    state: 'raw',
    macros_per_100g: { kcal: 101, protein_g: 5.6, carbs_g: 24.4, fat_g: 1.7, fiber_g: 14.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Thyme, fresh (1 sprig ≈ 1g assumption)',
    macro_confidence: 'sourced'
  },

  mushroom_brown: {
    id: 'mushroom_brown', display_name: 'Brown/Swiss mushrooms', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 200,
    notes: 'White button substitutes at near-identical macros.',
    state: 'raw',
    macros_per_100g: { kcal: 22, protein_g: 2.5, carbs_g: 4.3, fat_g: 0.1, fiber_g: 0.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Mushrooms, brown, Italian or crimini, raw',
    macro_confidence: 'sourced'
  },

  pear: {
    id: 'pear', display_name: 'Pear (or apple)', category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 1,
    notes: 'Edible flesh of one medium pear ≈ 165g. Optional marinade tenderiser, grated; apple works, or omit.',
    state: 'raw',
    macros_per_100g: { kcal: 57, protein_g: 0.4, carbs_g: 15.2, fat_g: 0.1, fiber_g: 3.1 },
    grams_per_canonical_unit: 165,
    macro_source: 'USDA SR Legacy — Pears, raw (edible flesh ≈ 165g per medium pear)',
    macro_confidence: 'sourced'
  },

  broccoli: {
    id: 'broccoli', display_name: 'Broccoli florets', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Fresh or frozen florets — macros near-identical.',
    state: 'raw',
    macros_per_100g: { kcal: 34, protein_g: 2.8, carbs_g: 6.6, fat_g: 0.4, fiber_g: 2.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Broccoli, raw',
    macro_confidence: 'sourced'
  },

  thai_basil_fresh: {
    id: 'thai_basil_fresh', display_name: 'Thai basil (fresh)', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 30,
    notes: 'Holy/Thai basil; regular basil is the fallback at identical macros.',
    state: 'raw',
    macros_per_100g: { kcal: 23, protein_g: 3.2, carbs_g: 2.7, fat_g: 0.6, fiber_g: 1.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Basil, fresh',
    macro_confidence: 'sourced'
  },

  red_chilli_fresh: {
    id: 'red_chilli_fresh', display_name: 'Red chilli (sliced)', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50,
    notes: "Bird's eye if available; jalapeno or dried flakes otherwise. Sole survivor of the red_chilli pair — the count-unit twin was dead and is deleted.",
    state: 'raw',
    macros_per_100g: { kcal: 40, protein_g: 1.9, carbs_g: 8.8, fat_g: 0.4, fiber_g: 1.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Peppers, hot chili, red, raw',
    macro_confidence: 'sourced'
  },

  green_beans: {
    id: 'green_beans', display_name: 'Green beans', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 250,
    notes: 'Fresh snap beans.',
    state: 'raw',
    macros_per_100g: { kcal: 31, protein_g: 1.8, carbs_g: 7.0, fat_g: 0.2, fiber_g: 2.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Beans, snap, green, raw',
    macro_confidence: 'sourced'
  },

  lettuce: {
    id: 'lettuce', display_name: 'Lettuce', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 1,
    notes: 'Iceberg or cos — the 2 kcal/100g difference is noise.',
    state: 'raw',
    macros_per_100g: { kcal: 15, protein_g: 1.4, carbs_g: 2.9, fat_g: 0.2, fiber_g: 1.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Lettuce, cos or romaine, raw',
    macro_confidence: 'sourced'
  },

  mixed_berries: {
    id: 'mixed_berries', display_name: 'Mixed berries (fresh or frozen)', category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Strawberries, blueberries, raspberries; fresh or frozen unsweetened.',
    state: 'raw',
    macros_per_100g: { kcal: 48, protein_g: 1.0, carbs_g: 11.0, fat_g: 0.4, fiber_g: 3.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — equal-parts composite of USDA strawberries (32), blueberries (57), raspberries (52) per 100g raw',
    macro_confidence: 'estimated'
  },

  // ============================ FROZEN ============================

  mango_frozen: {
    id: 'mango_frozen', display_name: 'Frozen mango chunks', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Unsweetened; 1 cup ≈ 165g. Freezing does not change macros.',
    state: 'as_sold',
    macros_per_100g: { kcal: 60, protein_g: 0.8, carbs_g: 15.0, fat_g: 0.4, fiber_g: 1.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Mangos, raw (frozen unsweetened equivalent)',
    macro_confidence: 'sourced'
  },

  strawberries_frozen: {
    id: 'strawberries_frozen', display_name: 'Frozen strawberries', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Unsweetened; 1 cup ≈ 150g.',
    state: 'as_sold',
    macros_per_100g: { kcal: 35, protein_g: 0.4, carbs_g: 9.1, fat_g: 0.1, fiber_g: 2.1 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Strawberries, frozen, unsweetened',
    macro_confidence: 'sourced'
  },

  raspberries_frozen: {
    id: 'raspberries_frozen', display_name: 'Frozen raspberries', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Unsweetened; 1 cup ≈ 125g.',
    state: 'as_sold',
    macros_per_100g: { kcal: 52, protein_g: 1.2, carbs_g: 11.9, fat_g: 0.7, fiber_g: 6.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Raspberries, raw (frozen unsweetened equivalent)',
    macro_confidence: 'sourced'
  },

  blueberries_frozen: {
    id: 'blueberries_frozen', display_name: 'Frozen blueberries', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Unsweetened; ½ cup ≈ 75g.',
    state: 'as_sold',
    macros_per_100g: { kcal: 51, protein_g: 0.4, carbs_g: 12.2, fat_g: 0.6, fiber_g: 2.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Blueberries, frozen, unsweetened',
    macro_confidence: 'sourced'
  },

  pineapple_frozen: {
    id: 'pineapple_frozen', display_name: 'Frozen pineapple chunks', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Unsweetened; 1 cup ≈ 165g.',
    state: 'as_sold',
    macros_per_100g: { kcal: 50, protein_g: 0.5, carbs_g: 13.1, fat_g: 0.1, fiber_g: 1.4 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Pineapple, raw, all varieties (frozen unsweetened equivalent)',
    macro_confidence: 'sourced'
  },

  ice_cream_vanilla: {
    id: 'ice_cream_vanilla', display_name: 'Vanilla ice cream', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy', 'Eggs'],
    typical_pack_size: 1000,
    notes: 'Standard vanilla; ½ cup ≈ 60g. Premium runs ~270 kcal/100g, budget ~180 — override if using either. Most contain egg emulsifier.',
    state: 'as_sold',
    macros_per_100g: { kcal: 207, protein_g: 3.5, carbs_g: 23.6, fat_g: 11.0, fiber_g: 0.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Ice creams, vanilla',
    macro_confidence: 'sourced',
    user_overridable: true,
    brand_reference: 'Coles Vanilla Ice Cream 2L, per 100g'
  },

  garlic_bread_frozen: {
    id: 'garlic_bread_frozen', display_name: 'Garlic bread (frozen)', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Dairy', 'Gluten/Wheat'],
    typical_pack_size: 450,
    notes: 'One slice ≈ 40g. Butter ratio drives brand variance.',
    state: 'as_sold',
    macros_per_100g: { kcal: 350, protein_g: 7.5, carbs_g: 40.0, fat_g: 17.5, fiber_g: 2.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU frozen garlic bread panels cluster 330-370 kcal per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Coles Garlic Bread Twin Pack 450g, per 100g'
  },

  edamame: {
    id: 'edamame', display_name: 'Edamame (in pods)', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Soy'],
    typical_pack_size: 500,
    notes: 'Amounts are POD weight (what you weigh at the bench); pods are ~50% edible beans, and macros here are per 100g of pods so the maths lands on what is eaten.',
    state: 'as_sold',
    macros_per_100g: { kcal: 61, protein_g: 6.0, carbs_g: 4.5, fat_g: 2.6, fiber_g: 2.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — USDA edamame, frozen, prepared (121 kcal, 11.9P per 100g shelled) × ~50% edible yield from pods',
    macro_confidence: 'estimated'
  },

  peas: {
    id: 'peas', display_name: 'Peas (frozen)', category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 500,
    notes: 'Frozen green peas.',
    state: 'as_sold',
    macros_per_100g: { kcal: 77, protein_g: 5.2, carbs_g: 13.7, fat_g: 0.4, fiber_g: 4.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Peas, green, frozen, unprepared',
    macro_confidence: 'sourced'
  },

  // ============================ BAKERY ============================

  bagel: {
    id: 'bagel', display_name: 'Bagel', category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 5, typical_pack_unit: 'count',
    notes: 'One bagel ≈ 95g (257 kcal/100g × 95g = 244 kcal, matching the old ~245/bagel claim).',
    state: 'as_sold',
    macros_per_100g: { kcal: 257, protein_g: 10.2, carbs_g: 50.5, fat_g: 1.7, fiber_g: 2.3 },
    grams_per_canonical_unit: 95,
    macro_source: 'USDA SR Legacy — Bagels, plain (1 bagel = 95g)',
    macro_confidence: 'sourced'
  },

  brioche_bun: {
    id: 'brioche_bun', display_name: 'Brioche burger bun', category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Dairy', 'Eggs', 'Gluten/Wheat', 'Soy'],
    typical_pack_size: 4,
    notes: 'One bun ≈ 80g (existing DB figure) → ~264 kcal per bun.',
    state: 'as_sold',
    macros_per_100g: { kcal: 330, protein_g: 8.5, carbs_g: 45.0, fat_g: 12.5, fiber_g: 2.0 },
    grams_per_canonical_unit: 80,
    macro_source: 'Estimated — AU brioche bun panels (Coles bakery, St Pierre) cluster 310-350 kcal per 100g',
    macro_confidence: 'estimated'
  },

  brioche_loaf: {
    id: 'brioche_loaf', display_name: 'Brioche loaf (sliced)', category: 'bakery',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Dairy', 'Eggs', 'Gluten/Wheat', 'Soy'],
    typical_pack_size: 500,
    notes: 'One slice ≈ 40g. Same reference values as the bun — same enriched dough.',
    state: 'as_sold',
    macros_per_100g: { kcal: 330, protein_g: 8.5, carbs_g: 45.0, fat_g: 12.5, fiber_g: 2.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU brioche loaf panels cluster 310-350 kcal per 100g',
    macro_confidence: 'estimated'
  },

  flour_tortilla_small: {
    id: 'flour_tortilla_small', display_name: 'Flour tortilla (small)', category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat', 'Soy'],
    typical_pack_size: 8,
    notes: 'One small tortilla ≈ 30g (~92 kcal).',
    state: 'as_sold',
    macros_per_100g: { kcal: 306, protein_g: 8.2, carbs_g: 49.4, fat_g: 7.5, fiber_g: 3.4 },
    grams_per_canonical_unit: 30,
    macro_source: 'USDA SR Legacy — Tortillas, ready-to-bake or -fry, flour (1 small = 30g per existing DB note)',
    macro_confidence: 'sourced'
  },

  tortilla_large: {
    id: 'tortilla_large', display_name: 'Large flour tortilla (burrito size)', category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 8, typical_pack_unit: 'count',
    notes: 'One large tortilla ≈ 65g (306 kcal/100g × 65g = 199 kcal, matching the old ~200/tortilla claim).',
    state: 'as_sold',
    macros_per_100g: { kcal: 306, protein_g: 8.2, carbs_g: 49.4, fat_g: 7.5, fiber_g: 3.4 },
    grams_per_canonical_unit: 65,
    macro_source: 'USDA SR Legacy — Tortillas, ready-to-bake or -fry, flour (1 burrito size = 65g, back-checked against the DB 200 kcal claim)',
    macro_confidence: 'sourced'
  },

  sourdough_crusty: {
    id: 'sourdough_crusty', display_name: 'Crusty sourdough or baguette', category: 'bakery',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'One thick slice ≈ 50g. Plain crusty breads are mostly vegan; butter-enriched varieties are not.',
    state: 'as_sold',
    macros_per_100g: { kcal: 272, protein_g: 10.7, carbs_g: 51.9, fat_g: 1.9, fiber_g: 2.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Bread, French or Vienna (includes sourdough)',
    macro_confidence: 'sourced'
  },

  bread_roll: {
    id: 'bread_roll', display_name: 'Bread roll / bun', category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 6,
    notes: 'One soft roll ≈ 70g (~190 kcal), matching the old ~270 kcal/100g claim.',
    state: 'as_sold',
    macros_per_100g: { kcal: 272, protein_g: 10.7, carbs_g: 51.9, fat_g: 1.9, fiber_g: 2.2 },
    grams_per_canonical_unit: 70,
    macro_source: 'USDA SR Legacy — Bread, French or Vienna (1 roll = 70g per existing DB note)',
    macro_confidence: 'sourced'
  },

  // ==================== SPICES / DRIED HERBS / SALT / SEEDS ====================
  // All dried cupboard spices carry is_pantry_negligible: true per the brief
  // (the chilli con carne sweep). Sugar, oil, seeds, and fresh produce do NOT.
  // tsp gram weights follow USDA household measures; each is stated in
  // macro_source for eyeball checking.

  salt: {
    id: 'salt', display_name: 'Salt', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Zero macros.',
    state: 'as_sold',
    macros_per_100g: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 5.7,
    macro_source: 'Definitionally zero (1 tsp fine salt = 5.7g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  black_pepper_ground: {
    id: 'black_pepper_ground', display_name: 'Ground black pepper', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 251, protein_g: 10.4, carbs_g: 63.9, fat_g: 3.3, fiber_g: 25.3 },
    grams_per_canonical_unit: 2.3,
    macro_source: 'USDA SR Legacy — Spices, pepper, black (1 tsp ground = 2.3g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  ground_cumin: {
    id: 'ground_cumin', display_name: 'Ground cumin', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 375, protein_g: 17.8, carbs_g: 44.2, fat_g: 22.3, fiber_g: 10.5 },
    grams_per_canonical_unit: 2.1,
    macro_source: 'USDA SR Legacy — Spices, cumin seed (1 tsp = 2.1g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  ground_coriander: {
    id: 'ground_coriander', display_name: 'Ground coriander', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 298, protein_g: 12.4, carbs_g: 55.0, fat_g: 17.8, fiber_g: 41.9 },
    grams_per_canonical_unit: 1.8,
    macro_source: 'USDA SR Legacy — Spices, coriander seed (1 tsp = 1.8g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true,
    atwater_exempt: true
  },

  ground_turmeric: {
    id: 'ground_turmeric', display_name: 'Ground turmeric', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 312, protein_g: 9.7, carbs_g: 67.1, fat_g: 3.3, fiber_g: 22.7 },
    grams_per_canonical_unit: 3.0,
    macro_source: 'USDA SR Legacy — Spices, turmeric, ground (1 tsp = 3.0g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  garam_masala: {
    id: 'garam_masala', display_name: 'Garam masala', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: 'Spice blend — no single USDA entry exists.',
    state: 'as_sold',
    macros_per_100g: { kcal: 340, protein_g: 12.0, carbs_g: 50.0, fat_g: 12.0, fiber_g: 20.0 },
    grams_per_canonical_unit: 2.2,
    macro_source: 'Estimated — composite of the blend components (cumin, coriander, cardamom, cinnamon, pepper); 1 tsp = 2.2g',
    macro_confidence: 'estimated',
    is_pantry_negligible: true
  },

  kashmiri_chilli_powder: {
    id: 'kashmiri_chilli_powder', display_name: 'Kashmiri chilli powder', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: 'Mild, vivid red. Paprika + pinch of cayenne substitutes.',
    state: 'as_sold',
    macros_per_100g: { kcal: 282, protein_g: 14.1, carbs_g: 54.0, fat_g: 12.9, fiber_g: 34.9 },
    grams_per_canonical_unit: 2.3,
    macro_source: 'Estimated — modeled as USDA paprika (its closest analogue); 1 tsp = 2.3g',
    macro_confidence: 'estimated',
    is_pantry_negligible: true
  },

  cinnamon_ground: {
    id: 'cinnamon_ground', display_name: 'Ground cinnamon', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 247, protein_g: 4.0, carbs_g: 80.6, fat_g: 1.2, fiber_g: 53.1 },
    grams_per_canonical_unit: 2.6,
    macro_source: 'USDA SR Legacy — Spices, cinnamon, ground (1 tsp = 2.6g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  cinnamon_stick: {
    id: 'cinnamon_stick', display_name: 'Cinnamon stick', category: 'pantry_grains',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 6,
    notes: 'One stick ≈ 3g. Removed before serving — infuses flavour, contributes ~0 macros.',
    state: 'as_sold',
    macros_per_100g: { kcal: 247, protein_g: 4.0, carbs_g: 80.6, fat_g: 1.2, fiber_g: 53.1 },
    grams_per_canonical_unit: 3,
    macro_source: 'USDA SR Legacy — Spices, cinnamon, ground (1 stick ≈ 3g assumption)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  cayenne_pepper: {
    id: 'cayenne_pepper', display_name: 'Cayenne pepper', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: 'Hot — start low. Distinct from chilli powder (a blend).',
    state: 'as_sold',
    macros_per_100g: { kcal: 318, protein_g: 12.0, carbs_g: 56.6, fat_g: 17.3, fiber_g: 27.2 },
    grams_per_canonical_unit: 1.8,
    macro_source: 'USDA SR Legacy — Spices, pepper, red or cayenne (1 tsp = 1.8g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true,
    atwater_exempt: true
  },

  garlic_powder: {
    id: 'garlic_powder', display_name: 'Garlic powder', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 331, protein_g: 16.6, carbs_g: 72.7, fat_g: 0.7, fiber_g: 9.0 },
    grams_per_canonical_unit: 3.1,
    macro_source: 'USDA SR Legacy — Spices, garlic powder (1 tsp = 3.1g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  onion_powder: {
    id: 'onion_powder', display_name: 'Onion powder', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 341, protein_g: 10.4, carbs_g: 79.1, fat_g: 1.0, fiber_g: 15.2 },
    grams_per_canonical_unit: 2.4,
    macro_source: 'USDA SR Legacy — Spices, onion powder (1 tsp = 2.4g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  // MERGE TARGET: absorbs `dried_oregano`. Noun_form id kept for consistency
  // with thyme_dried and the *_ground family; recategorised into the spice
  // aisle (pantry_grains) so the shopping list stops splitting oregano.
  oregano_dried: {
    id: 'oregano_dried', display_name: 'Dried oregano', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 20, typical_pack_unit: 'g',
    notes: 'MERGED: absorbs former `dried_oregano` id.',
    state: 'as_sold',
    macros_per_100g: { kcal: 265, protein_g: 9.0, carbs_g: 68.9, fat_g: 4.3, fiber_g: 42.5 },
    grams_per_canonical_unit: 1.0,
    macro_source: 'USDA SR Legacy — Spices, oregano, dried (1 tsp leaves = 1.0g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  dried_basil: {
    id: 'dried_basil', display_name: 'Basil, dried', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 15, typical_pack_unit: 'g',
    notes: 'Recategorised to pantry_grains (spice aisle). Fresh basil substitutes 3:1, added at the end.',
    state: 'as_sold',
    macros_per_100g: { kcal: 233, protein_g: 23.0, carbs_g: 47.8, fat_g: 4.1, fiber_g: 37.7 },
    grams_per_canonical_unit: 0.7,
    macro_source: 'USDA SR Legacy — Spices, basil, dried (1 tsp leaves = 0.7g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  thyme_dried: {
    id: 'thyme_dried', display_name: 'Dried thyme', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 20, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 276, protein_g: 9.1, carbs_g: 63.9, fat_g: 7.4, fiber_g: 37.0 },
    grams_per_canonical_unit: 1.0,
    macro_source: 'USDA SR Legacy — Spices, thyme, dried (1 tsp leaves = 1.0g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  paprika_sweet: {
    id: 'paprika_sweet', display_name: 'Sweet paprika', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: '',
    state: 'as_sold',
    macros_per_100g: { kcal: 282, protein_g: 14.1, carbs_g: 54.0, fat_g: 12.9, fiber_g: 34.9 },
    grams_per_canonical_unit: 2.3,
    macro_source: 'USDA SR Legacy — Spices, paprika (1 tsp = 2.3g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  paprika_smoked: {
    id: 'paprika_smoked', display_name: 'Smoked paprika', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: 'Smoking changes flavour, not macros — same USDA paprika values.',
    state: 'as_sold',
    macros_per_100g: { kcal: 282, protein_g: 14.1, carbs_g: 54.0, fat_g: 12.9, fiber_g: 34.9 },
    grams_per_canonical_unit: 2.3,
    macro_source: 'USDA SR Legacy — Spices, paprika (1 tsp = 2.3g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  mustard_powder: {
    id: 'mustard_powder', display_name: 'Mustard powder', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 50, typical_pack_unit: 'g',
    notes: "Keen's is the AU standard.",
    state: 'as_sold',
    macros_per_100g: { kcal: 508, protein_g: 26.1, carbs_g: 28.1, fat_g: 36.2, fiber_g: 12.2 },
    grams_per_canonical_unit: 2.0,
    macro_source: 'USDA SR Legacy — Spices, mustard seed, ground (1 tsp = 2.0g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  nutmeg_ground: {
    id: 'nutmeg_ground', display_name: 'Ground nutmeg', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 30, typical_pack_unit: 'g',
    notes: 'A seed, not a tree-nut allergen despite the name.',
    state: 'as_sold',
    macros_per_100g: { kcal: 525, protein_g: 5.8, carbs_g: 49.3, fat_g: 36.3, fiber_g: 20.8 },
    grams_per_canonical_unit: 2.2,
    macro_source: 'USDA SR Legacy — Spices, nutmeg, ground (1 tsp = 2.2g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  star_anise: {
    id: 'star_anise', display_name: 'Star anise', category: 'pantry_grains',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [], typical_pack_size: 30, typical_pack_unit: 'g',
    notes: 'One whole pod ≈ 1g. Removed before serving.',
    state: 'as_sold',
    macros_per_100g: { kcal: 337, protein_g: 17.6, carbs_g: 50.0, fat_g: 15.9, fiber_g: 14.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — modeled as USDA anise seed (star anise has no SR entry); 1 pod ≈ 1g',
    macro_confidence: 'estimated',
    is_pantry_negligible: true
  },

  bay_leaves_dried: {
    id: 'bay_leaves_dried', display_name: 'Dried bay leaves', category: 'pantry_grains',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One leaf ≈ 0.2g. Removed before serving.',
    state: 'as_sold',
    macros_per_100g: { kcal: 313, protein_g: 7.6, carbs_g: 75.0, fat_g: 8.4, fiber_g: 26.3 },
    grams_per_canonical_unit: 0.2,
    macro_source: 'USDA SR Legacy — Spices, bay leaf (1 leaf ≈ 0.2g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  chilli_powder: {
    id: 'chilli_powder', display_name: 'Chilli powder', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 50,
    notes: 'Mild blend (chili + cumin + oregano + garlic), not pure ground chilli. Recategorised to pantry_grains (spice aisle).',
    state: 'as_sold',
    macros_per_100g: { kcal: 282, protein_g: 13.5, carbs_g: 49.7, fat_g: 14.3, fiber_g: 34.8 },
    grams_per_canonical_unit: 2.7,
    macro_source: 'USDA SR Legacy — Spices, chili powder (1 tsp = 2.7g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  curry_powder: {
    id: 'curry_powder', display_name: 'Curry powder', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [], typical_pack_size: 50,
    notes: 'KEY flavour for satay — negligible in macros, not in the kitchen (flag hides it from shopping/macros only; amount still renders in steps). Recategorised to pantry_grains.',
    state: 'as_sold',
    macros_per_100g: { kcal: 325, protein_g: 14.3, carbs_g: 55.8, fat_g: 14.0, fiber_g: 53.2 },
    grams_per_canonical_unit: 2.0,
    macro_source: 'USDA SR Legacy — Spices, curry powder (1 tsp = 2.0g)',
    macro_confidence: 'sourced',
    is_pantry_negligible: true,
    atwater_exempt: true
  },

  everything_bagel_seasoning: {
    id: 'everything_bagel_seasoning', display_name: 'Everything bagel seasoning', category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Sesame'],
    typical_pack_size: 100,
    notes: 'Sesame/poppy seed blend — seed content puts it at ~14 kcal/tsp, ABOVE the negligibility bar, so no flag.',
    state: 'as_sold',
    macros_per_100g: { kcal: 455, protein_g: 16.0, carbs_g: 25.0, fat_g: 33.0, fiber_g: 12.0 },
    grams_per_canonical_unit: 3.0,
    macro_source: 'Estimated — seed-dominant blend, composite of USDA sesame/poppy seed with dried garlic/onion and salt; 1 tsp = 3.0g',
    macro_confidence: 'estimated'
  },

  sesame_seeds: {
    id: 'sesame_seeds', display_name: 'Sesame seeds', category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free'],
    allergens: ['Sesame'],
    typical_pack_size: 100,
    notes: '1 tbsp ≈ 9g. NOT negligible — 18g of seeds is ~103 kcal.',
    state: 'as_sold',
    macros_per_100g: { kcal: 573, protein_g: 17.7, carbs_g: 23.4, fat_g: 49.7, fiber_g: 11.8 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Seeds, sesame seeds, whole, dried',
    macro_confidence: 'sourced'
  }

};
