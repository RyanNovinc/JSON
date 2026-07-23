// ============================================================================
// BATCH 4 of 5 — condiments_supplements + the oil/sauce/stock/canned-tomato
// rows that live in pantry_grains but belong to this cluster. 29 rows.
//
// Deferred to batch 5 (spice tsp rows, regardless of category):
// chilli_powder, curry_powder, dried_oregano, dried_basil.
//
// Repointing this batch: NONE.
//
// DENSITY NOTE (the point of the convention): every ml row below carries its
// real density in grams_per_canonical_unit. None default to 1.0 unless the
// liquid genuinely is ~1.0 (stocks, espresso, coconut water).
//
//   sesame_oil 0.92 | soy_sauce 1.16 | oyster_sauce 1.20 | fish_sauce 1.20
//   rice_vinegar 1.01 | apple_cider_vinegar 1.01 | chinese_cooking_wine 0.99
//   red_wine_cooking 0.99 | worcestershire 1.10 | sweet_chilli 1.15
//   tomato_passata 1.03 | stocks 1.00 | espresso 1.00
//
// WHEY WORKING (see report): meals author whey in GRAMS everywhere, so both
// whey rows are plain per-100g with grams_per_canonical_unit = 1. "Scoop" is
// narrative only. The per-100g figures come from the WPC panel cluster and
// cross-check against the DB's own claim (24g protein per 30g scoop = 80g
// protein per 100g).
// ============================================================================

export const INGREDIENTS_BATCH_4 = {

  // ========================= supplements =========================

  whey_protein_vanilla: {
    id: 'whey_protein_vanilla',
    display_name: 'Vanilla whey protein',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'WPC or isolate. Meals author grams; "1 scoop" ≈ 30g is narrative only. Isolate runs ~90g protein/100g, blends ~70 — override with your tub panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 400, protein_g: 80.0, carbs_g: 7.0, fat_g: 6.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — WPC panels (Bulk Nutrients, MyProtein, ON) cluster 390-410 kcal, 75-82g protein per 100g; consistent with the DB claim of 24g protein per 30g scoop',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Bulk Nutrients WPC Vanilla 1kg, per 100g'
  },

  whey_protein_chocolate: {
    id: 'whey_protein_chocolate',
    display_name: 'Chocolate whey protein',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'WPC or isolate, chocolate flavoured. Cocoa adds ~1-2g carbs per 100g vs vanilla — inside brand variance, so same reference values. Override with your tub panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 400, protein_g: 80.0, carbs_g: 7.0, fat_g: 6.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — WPC panels (Bulk Nutrients, MyProtein, ON) cluster 390-410 kcal, 75-82g protein per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Bulk Nutrients WPC Chocolate 1kg, per 100g'
  },

  protein_bar: {
    id: 'protein_bar',
    display_name: 'Protein bar (store-bought)',
    category: 'condiments_supplements',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian'],
    allergens: ['Dairy'],
    typical_pack_size: 1,
    notes: 'One bar ≈ 60g at ~400 kcal/100g → ~240 kcal, ~20g protein per bar, matching the DB claim of 200-250 kcal, 15-20g. Most contain dairy, many contain nuts/soy — override with your bar.',
    state: 'as_sold',
    macros_per_100g: { kcal: 400, protein_g: 33.0, carbs_g: 38.0, fat_g: 13.0, fiber_g: 6.0 },
    grams_per_canonical_unit: 60,
    macro_source: 'Estimated — AU retail protein bar panels (Quest, Musashi, Aussie Bodies) cluster 350-450 kcal per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Quest Protein Bar 60g, Coles, per 100g'
  },

  // ========================= oils and fats =========================

  olive_oil: {
    id: 'olive_oil',
    display_name: 'Olive oil',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    typical_pack_unit: 'ml',
    notes: 'Canonical unit is GRAMS (meals already author grams), so density never enters the macro path. NOT pantry-negligible — oil is a top-three fat source in this library.',
    state: 'as_sold',
    macros_per_100g: { kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Oil, olive, salad or cooking',
    macro_confidence: 'sourced'
  },

  ghee: {
    id: 'ghee',
    display_name: 'Ghee',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 375,
    notes: 'Clarified butter. Indian section or with cooking oils. Butter substitutes (717 kcal/100g, slightly less fat).',
    state: 'as_sold',
    macros_per_100g: { kcal: 876, protein_g: 0.3, carbs_g: 0, fat_g: 99.5, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Butter oil, anhydrous',
    macro_confidence: 'sourced'
  },

  sesame_oil: {
    id: 'sesame_oil',
    display_name: 'Sesame oil (toasted)',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free'],
    allergens: ['Sesame'],
    typical_pack_size: 250,
    notes: 'Toasted finishing oil. The 0.92 density showcase: 15ml = 13.8g = 122 kcal, not 133.',
    state: 'as_sold',
    macros_per_100g: { kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100.0, fiber_g: 0 },
    grams_per_canonical_unit: 0.92,
    macro_source: 'USDA SR Legacy — Oil, sesame, salad or cooking (per 100g); density 0.92',
    macro_confidence: 'sourced'
  },

  // ========================= asian sauces =========================

  soy_sauce: {
    id: 'soy_sauce',
    display_name: 'Soy sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: ['Soy', 'Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Light/all-purpose soy. Contains soy and (usually) wheat — tamari for gluten-free.',
    state: 'as_sold',
    macros_per_100g: { kcal: 53, protein_g: 8.1, carbs_g: 4.9, fat_g: 0.6, fiber_g: 0.8 },
    grams_per_canonical_unit: 1.16,
    macro_source: 'USDA SR Legacy — Soy sauce made from soy and wheat, shoyu (per 100g); density 1.16',
    macro_confidence: 'sourced'
  },

  oyster_sauce: {
    id: 'oyster_sauce',
    display_name: 'Oyster sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: [],
    allergens: ['Shellfish', 'Soy', 'Gluten/Wheat'],
    typical_pack_size: 250,
    notes: 'Thick savoury Chinese sauce. Contains shellfish, soy, and usually wheat.',
    state: 'as_sold',
    macros_per_100g: { kcal: 51, protein_g: 1.4, carbs_g: 11.0, fat_g: 0.3, fiber_g: 0.3 },
    grams_per_canonical_unit: 1.2,
    macro_source: 'USDA SR Legacy — Sauce, oyster, ready-to-serve (per 100g); density 1.2 (thick, sugar-heavy)',
    macro_confidence: 'sourced'
  },

  fish_sauce: {
    id: 'fish_sauce',
    display_name: 'Fish sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 300,
    notes: 'Squid brand standard, Megachef premium. Salty umami, not fishy in the finished dish.',
    state: 'as_sold',
    macros_per_100g: { kcal: 35, protein_g: 5.1, carbs_g: 3.6, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1.2,
    macro_source: 'USDA SR Legacy — Sauce, fish, ready-to-serve (per 100g); density 1.2 (high salt brine)',
    macro_confidence: 'sourced'
  },

  sweet_chilli_sauce: {
    id: 'sweet_chilli_sauce',
    display_name: 'Sweet chilli sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    notes: 'Sugar-forward; 60ml = 69g = ~138 kcal, a real line item on the schnitzel roll.',
    state: 'as_sold',
    macros_per_100g: { kcal: 200, protein_g: 0.5, carbs_g: 49.0, fat_g: 0.2, fiber_g: 0.5 },
    grams_per_canonical_unit: 1.15,
    macro_source: 'Estimated — AU sweet chilli panels (Trident, Coles) cluster 210-240 kcal per 100ml, ÷ density 1.15',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Trident Sweet Chilli Sauce 285ml, per 100ml'
  },

  chinese_cooking_wine: {
    id: 'chinese_cooking_wine',
    display_name: 'Chinese cooking wine (Shaoxing)',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 640,
    notes: 'Shaoxing rice wine; dry sherry or mirin substitute. Kcal are mostly alcohol and partially cook off — see Questions. Macros assume none burned (conservative).',
    state: 'as_sold',
    macros_per_100g: { kcal: 120, protein_g: 0.5, carbs_g: 3.0, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 0.99,
    macro_source: 'Estimated — Shaoxing wine ~15% ABV; kcal dominated by alcohol (7 kcal/g), plus residual sugar. Atwater on P/C/F will not reproduce kcal by design.',
    macro_confidence: 'estimated'
  },

  // ========================= vinegars / wine =========================

  rice_vinegar: {
    id: 'rice_vinegar',
    display_name: 'Rice vinegar',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Plain (unseasoned) rice vinegar. Seasoned variety adds sugar (~+15 kcal/100ml) — check label. Kcal partly from acetic acid, so Atwater will not reproduce it.',
    state: 'as_sold',
    macros_per_100g: { kcal: 18, protein_g: 0, carbs_g: 0.5, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1.01,
    macro_source: 'Estimated — plain rice vinegar panels cluster 15-22 kcal per 100ml; energy largely from acetic acid',
    macro_confidence: 'estimated'
  },

  apple_cider_vinegar: {
    id: 'apple_cider_vinegar',
    display_name: 'Apple cider vinegar',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: "Cornwell's, Bragg's, or house brand. Kcal partly from acetic acid.",
    state: 'as_sold',
    macros_per_100g: { kcal: 21, protein_g: 0, carbs_g: 0.9, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1.01,
    macro_source: 'USDA SR Legacy — Vinegar, cider (per 100g); density 1.01',
    macro_confidence: 'sourced'
  },

  red_wine_cooking: {
    id: 'red_wine_cooking',
    display_name: 'Red wine (cooking)',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 750,
    notes: 'Any cleanskin cab sav or merlot. Kcal are ~75% alcohol; long braises burn much of it off. Macros assume none burned (conservative) — see Questions. Some wines use animal fining agents (not vegan).',
    state: 'as_sold',
    macros_per_100g: { kcal: 85, protein_g: 0.1, carbs_g: 2.6, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 0.99,
    macro_source: 'USDA SR Legacy — Alcoholic beverage, wine, table, red (per 100g); density 0.99. Kcal include alcohol; Atwater on P/C/F will not reproduce it.',
    macro_confidence: 'sourced'
  },

  worcestershire_sauce: {
    id: 'worcestershire_sauce',
    display_name: 'Worcestershire sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 250,
    notes: 'Lea & Perrins. Contains anchovies — not vegan.',
    state: 'as_sold',
    macros_per_100g: { kcal: 78, protein_g: 0, carbs_g: 19.5, fat_g: 0, fiber_g: 0 },
    grams_per_canonical_unit: 1.1,
    macro_source: 'USDA SR Legacy — Sauce, worcestershire (per 100g); density 1.1',
    macro_confidence: 'sourced'
  },

  // ========================= tomato products =========================

  ketchup_tomato: {
    id: 'ketchup_tomato',
    display_name: 'Tomato ketchup',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Heinz, MasterFoods, or house brand. Canonical grams — no density needed.',
    state: 'as_sold',
    macros_per_100g: { kcal: 101, protein_g: 1.0, carbs_g: 27.4, fat_g: 0.1, fiber_g: 0.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Catsup',
    macro_confidence: 'sourced'
  },

  tomato_paste: {
    id: 'tomato_paste',
    display_name: 'Tomato paste',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 140,
    notes: "Leggo's or Mutti. Concentrated — distinct from tomato sauce and passata.",
    state: 'as_sold',
    macros_per_100g: { kcal: 82, protein_g: 4.3, carbs_g: 18.9, fat_g: 0.5, fiber_g: 4.1 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Tomato products, canned, paste',
    macro_confidence: 'sourced'
  },

  tomato_passata: {
    id: 'tomato_passata',
    display_name: 'Tomato passata',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 700,
    notes: 'Strained uncooked tomato puree.',
    state: 'as_sold',
    macros_per_100g: { kcal: 32, protein_g: 1.4, carbs_g: 5.5, fat_g: 0.2, fiber_g: 1.4 },
    grams_per_canonical_unit: 1.03,
    macro_source: 'Estimated — passata panels (Mutti, Val Verde, house brand) cluster 28-38 kcal per 100g',
    macro_confidence: 'estimated'
  },

  crushed_tomatoes_canned: {
    id: 'crushed_tomatoes_canned',
    display_name: 'Canned crushed tomatoes',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 800,
    notes: 'Mutti premium; Ardmona or house brand fine. 400g or 800g tins. Eaten with the liquid — as_sold, not drained.',
    state: 'as_sold',
    macros_per_100g: { kcal: 32, protein_g: 1.6, carbs_g: 7.3, fat_g: 0.3, fiber_g: 1.9 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Tomato products, canned, crushed',
    macro_confidence: 'sourced'
  },

  // ========================= jar sauces / pastes =========================

  butter_chicken_jar_sauce: {
    id: 'butter_chicken_jar_sauce',
    display_name: 'Butter chicken simmer sauce (jar)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 485,
    notes: 'The flagship brand-variance case: 90-160 kcal/100g across brands, a ~140 kcal swing on a 200g serve. Override with your jar panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 120, protein_g: 2.0, carbs_g: 9.0, fat_g: 8.5, fiber_g: 1.0 },
    grams_per_canonical_unit: 1,
    macro_source: "Estimated — AU butter chicken simmer sauces span 90-160 kcal per 100g; Patak's used as midpoint reference",
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: "Patak's Butter Chicken Simmer Sauce 450g, Coles, per 100g"
  },

  massaman_curry_paste: {
    id: 'massaman_curry_paste',
    display_name: 'Massaman curry paste',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free'],
    allergens: ['Fish', 'Shellfish', 'Nuts'],
    typical_pack_size: 114,
    notes: 'Maesri cans or Valcom/Ayam jars. Most contain shrimp paste and may contain peanuts — always check the specific brand. Gluten status varies.',
    state: 'as_sold',
    macros_per_100g: { kcal: 160, protein_g: 3.0, carbs_g: 14.0, fat_g: 10.0, fiber_g: 3.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — Thai curry paste panels (Maesri, Valcom, Ayam) cluster 120-200 kcal per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Maesri Massaman Curry Paste 114g, per 100g'
  },

  tamarind_paste: {
    id: 'tamarind_paste',
    display_name: 'Tamarind paste',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Sour-fruity concentrate; dilution varies by brand (pure pulp vs water-cut).',
    state: 'as_sold',
    macros_per_100g: { kcal: 200, protein_g: 2.5, carbs_g: 47.0, fat_g: 0.3, fiber_g: 4.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU tamarind paste/puree panels 160-240 kcal per 100g; USDA raw tamarind pulp is 239',
    macro_confidence: 'estimated'
  },

  ajvar: {
    id: 'ajvar',
    display_name: 'Ajvar (red pepper relish)',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    notes: 'Shop-bought ajvar or roasted-red-pepper relish. Oil content drives brand variance.',
    state: 'as_sold',
    macros_per_100g: { kcal: 90, protein_g: 1.5, carbs_g: 8.0, fat_g: 5.5, fiber_g: 2.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — ajvar panels (Podravka, Zergut) cluster 80-120 kcal per 100g depending on oil content',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Podravka Ajvar Mild 350g, per 100g'
  },

  // ========================= pickles =========================

  jalapenos_pickled: {
    id: 'jalapenos_pickled',
    display_name: 'Pickled jalapeños (sliced)',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 220,
    notes: 'Drained sliced jalapeños; ~140g drained per 220g jar.',
    state: 'canned_drained',
    macros_per_100g: { kcal: 27, protein_g: 0.9, carbs_g: 4.7, fat_g: 0.9, fiber_g: 2.6 },
    grams_per_canonical_unit: 1,
    drained_grams_per_pack: 140,
    macro_source: 'USDA SR Legacy — Peppers, jalapeno, canned, solids and liquids',
    macro_confidence: 'sourced'
  },

  pickled_red_onion: {
    id: 'pickled_red_onion',
    display_name: 'Pickled red onion',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Jarred or homemade (onion + vinegar + sugar).',
    state: 'as_sold',
    macros_per_100g: { kcal: 45, protein_g: 0.9, carbs_g: 10.0, fat_g: 0.1, fiber_g: 1.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — onion (~40 kcal) plus sweetened pickling brine uptake',
    macro_confidence: 'estimated'
  },

  // ========================= stocks =========================

  beef_stock_cube: {
    id: 'beef_stock_cube',
    display_name: 'Beef stock cube',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 60,
    notes: 'OXO or Massel; one cube ≈ 10g. Check label for gluten. Mostly salt — ~22 kcal per cube.',
    state: 'as_sold',
    macros_per_100g: { kcal: 220, protein_g: 12.0, carbs_g: 25.0, fat_g: 8.0, fiber_g: 0.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — Massel/OXO cube panels ~20-25 kcal per 10g cube',
    macro_confidence: 'estimated'
  },

  beef_stock_liquid: {
    id: 'beef_stock_liquid',
    display_name: 'Beef stock (liquid)',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: "Campbell's Real Stock or Massel cartons. Check label for gluten.",
    state: 'as_sold',
    macros_per_100g: { kcal: 10, protein_g: 1.2, carbs_g: 1.0, fat_g: 0.2, fiber_g: 0 },
    grams_per_canonical_unit: 1.0,
    macro_source: "Estimated — liquid beef stock panels (Campbell's, Massel) cluster 8-15 kcal per 100ml; density ~1.0",
    macro_confidence: 'estimated'
  },

  chicken_stock_liquid: {
    id: 'chicken_stock_liquid',
    display_name: 'Chicken stock (liquid, low sodium)',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Ready-to-pour carton, salt-reduced. Distinct from stock cubes.',
    state: 'as_sold',
    macros_per_100g: { kcal: 8, protein_g: 1.0, carbs_g: 0.8, fat_g: 0.1, fiber_g: 0 },
    grams_per_canonical_unit: 1.0,
    macro_source: "Estimated — liquid chicken stock panels (Campbell's, Massel) cluster 6-10 kcal per 100ml; density ~1.0",
    macro_confidence: 'estimated'
  },

  // ========================= flavourings =========================

  vanilla_extract: {
    id: 'vanilla_extract',
    display_name: 'Vanilla extract',
    category: 'condiments_supplements',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free'],
    allergens: [],
    typical_pack_size: 100,
    notes: 'Pure extract. ~12 kcal per tsp on paper, mostly alcohol that bakes off — flagged pantry-negligible.',
    state: 'as_sold',
    macros_per_100g: { kcal: 288, protein_g: 0.1, carbs_g: 12.7, fat_g: 0.1, fiber_g: 0 },
    grams_per_canonical_unit: 4.2,
    macro_source: 'USDA SR Legacy — Vanilla extract (per 100g; 1 tsp = 4.2g). Kcal mostly alcohol.',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  },

  espresso_shot: {
    id: 'espresso_shot',
    display_name: 'Espresso shot',
    category: 'other',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One shot ≈ 30ml (~3 kcal). Substitute 1 tsp instant coffee in 30ml hot water. Not shopped, near-zero macros.',
    state: 'as_sold',
    macros_per_100g: { kcal: 9, protein_g: 0.1, carbs_g: 1.7, fat_g: 0.2, fiber_g: 0 },
    grams_per_canonical_unit: 1.0,
    macro_source: 'USDA SR Legacy — Coffee, brewed, espresso, restaurant-prepared (per 100g); density ~1.0',
    macro_confidence: 'sourced',
    is_pantry_negligible: true
  }

};
