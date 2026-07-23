// ============================================================================
// BATCH 3 of ~6 — pantry_grains part 2: nut butters, nuts, dried fruit,
// chocolate, chia, coconut products, juices, sweeteners, branded desserts.
// Plus the FINAL convention amendments.
//
// >>> RULE (replace the previous header comment in src/data/ingredients.ts): <<<
// macros_per_100g is per 100 GRAMS for every row. Convert amount to grams
// via grams_per_canonical_unit FIRST, then apply. Never apply macros per ml,
// per count, or per tsp directly.
//
//   grams  = amount × grams_per_canonical_unit
//   macros = grams × macros_per_100g / 100
//
//   'g' rows:  grams_per_canonical_unit = 1
//   'ml' rows: grams_per_canonical_unit = density
//   count/tsp/tbsp/cloves rows: grams per that unit
//
// FIELD RENAME (reverses batch 2): macros_per_100_canonical → macros_per_100g.
// Batch 1 rows were already per-100g — the sed rename back is the only change.
// Section A re-issues the two ml rows that batch 2 put on per-100ml values.
//
// >>> ADD TO CLAUDE.md verbatim: <<<
// is_pantry_negligible hides an ingredient from shopping lists and macro
// totals only. Always render its amount in method/cook-mode steps.
//
// Repointing this batch: NONE new. Carried from batch 2 decisions:
// steamed_rice stays 75g, now dry (update its flex_ingredient_id target
// amount and its display text to "makes ~190g cooked").
// ============================================================================

// ---------------------------------------------------------------------------
// SECTION A — re-issued ml rows, back to per-100g (panel ÷ density)
// ---------------------------------------------------------------------------

export const BATCH_3_AMENDMENTS = {

  full_cream_milk: {
    id: 'full_cream_milk',
    display_name: 'Full-cream milk',
    category: 'dairy_refrigerated',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'Standard AU full-cream milk (3.4% fat). Macros per 100g; panel per-100ml values ÷ density 1.03.',
    state: 'as_sold',
    macros_per_100g: { kcal: 62, protein_g: 3.2, carbs_g: 4.7, fat_g: 3.3, fiber_g: 0 },
    grams_per_canonical_unit: 1.03,
    macro_source: 'Coles Full Cream Milk 2L panel (64 kcal, 3.3P, 4.8C, 3.4F per 100ml), ÷ density 1.03',
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
    notes: 'AU thickened cream is standardised at ~35% milk fat. Macros per 100g; per-100ml panel values ÷ density 1.01.',
    state: 'as_sold',
    macros_per_100g: { kcal: 342, protein_g: 2.0, carbs_g: 3.0, fat_g: 35.6, fiber_g: 0 },
    grams_per_canonical_unit: 1.01,
    macro_source: 'Estimated — AU thickened cream panels (Bulla, Pauls) cluster 335-355 kcal per 100ml at 35% fat; ÷ density 1.01',
    macro_confidence: 'estimated'
  }

};

// ---------------------------------------------------------------------------
// SECTION B — pantry_grains part 2 rows (22 rows)
// ---------------------------------------------------------------------------

export const INGREDIENTS_BATCH_3 = {

  // ========================= nut butters =========================

  peanut_butter_natural: {
    id: 'peanut_butter_natural',
    display_name: 'Peanut butter (natural)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 375,
    notes: "100% peanut, no added sugar or oil. Mayver's, Pic's, or house-brand natural.",
    state: 'as_sold',
    macros_per_100g: { kcal: 598, protein_g: 22.2, carbs_g: 22.3, fat_g: 51.1, fiber_g: 5.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Peanut butter, smooth style, without salt',
    macro_confidence: 'sourced'
  },

  almond_butter: {
    id: 'almond_butter',
    display_name: 'Almond butter',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 250,
    notes: "100% almonds, no added oils or sugar. Mayver's, Pic's, or house-brand natural.",
    state: 'as_sold',
    macros_per_100g: { kcal: 614, protein_g: 21.0, carbs_g: 18.8, fat_g: 55.5, fiber_g: 10.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Nuts, almond butter, plain, without salt added',
    macro_confidence: 'sourced'
  },

  macadamia_butter: {
    id: 'macadamia_butter',
    display_name: 'Macadamia nut butter',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 250,
    notes: '100% macadamia, no added oils or sugar — pure nut, so raw-nut macros apply. The most calorie-dense spread in the library. Health food store or online.',
    state: 'as_sold',
    macros_per_100g: { kcal: 718, protein_g: 7.9, carbs_g: 13.8, fat_g: 75.8, fiber_g: 8.6 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Nuts, macadamia nuts, raw (100% macadamia butter equals nut values)',
    macro_confidence: 'sourced'
  },

  // ========================= whole nuts / dried fruit =========================

  peanuts_roasted_unsalted: {
    id: 'peanuts_roasted_unsalted',
    display_name: 'Roasted peanuts (unsalted)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 375,
    notes: 'Crush or chop for garnish. Salted works fine if unsalted unavailable.',
    state: 'as_sold',
    macros_per_100g: { kcal: 585, protein_g: 23.7, carbs_g: 21.5, fat_g: 49.7, fiber_g: 8.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Peanuts, all types, dry-roasted, without salt',
    macro_confidence: 'sourced'
  },

  mixed_nuts: {
    id: 'mixed_nuts',
    display_name: 'Mixed nuts',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free'],
    allergens: ['Nuts'],
    typical_pack_size: 400,
    notes: 'Roasted almonds, cashews, walnuts and similar. Calorie-dense — a small handful is a serving. Blend ratio moves the numbers; override with your pack panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 600, protein_g: 18.0, carbs_g: 16.0, fat_g: 52.0, fiber_g: 7.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — nut-mix panels vary with blend ratio; AU roasted mixed nut packs cluster 580-630 kcal per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Coles Roasted Unsalted Mixed Nuts 400g, per 100g'
  },

  dried_fruit: {
    id: 'dried_fruit',
    display_name: 'Dried fruit mix',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Raisins, cranberries, apricots. Sweetened cranberries push the sugar up; override with your pack panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 305, protein_g: 2.5, carbs_g: 72.0, fat_g: 0.5, fiber_g: 5.0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU mixed dried fruit panels (Sunbeam, house brand) cluster 290-330 kcal per 100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Sunbeam Fruit Medley 400g, per 100g'
  },

  medjool_dates: {
    id: 'medjool_dates',
    display_name: 'Medjool dates',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Pitted weight; one date ≈ 24g pitted. Distinct from smaller dried dates.',
    state: 'as_sold',
    macros_per_100g: { kcal: 277, protein_g: 1.8, carbs_g: 75.0, fat_g: 0.2, fiber_g: 6.7 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Dates, medjool',
    macro_confidence: 'sourced'
  },

  // ========================= chocolate / seeds / coconut (dry) =========================

  chocolate_chips: {
    id: 'chocolate_chips',
    display_name: 'Chocolate chips',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 250,
    typical_pack_unit: 'g',
    notes: 'Dark/semisweet baking chips (the modeled default). Milk chips run slightly lower kcal, higher sugar; very dark chips can be dairy-free — check label.',
    state: 'as_sold',
    macros_per_100g: { kcal: 479, protein_g: 4.2, carbs_g: 63.9, fat_g: 30.0, fiber_g: 5.9 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Candies, semisweet chocolate',
    macro_confidence: 'sourced'
  },

  dark_chocolate: {
    id: 'dark_chocolate',
    display_name: 'Dark chocolate (70%+)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 100,
    typical_pack_unit: 'g',
    notes: '70-85% cacao bar; ~30g (2-3 squares) is a serving. Old row said 550 kcal — USDA 70-85% is 598; the old figure matched sweeter ~60% bars. May contain milk/soy traces; very dark can be dairy-free.',
    state: 'as_sold',
    macros_per_100g: { kcal: 598, protein_g: 7.8, carbs_g: 45.9, fat_g: 42.6, fiber_g: 10.9 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Chocolate, dark, 70-85% cacao solids',
    macro_confidence: 'sourced'
  },

  cocoa_powder: {
    id: 'cocoa_powder',
    display_name: 'Cocoa powder (unsweetened)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Unsweetened cocoa, not drinking chocolate. 1 tbsp ≈ 5g. High fiber makes net carbs much lower than they look.',
    state: 'as_sold',
    macros_per_100g: { kcal: 228, protein_g: 19.6, carbs_g: 57.9, fat_g: 13.7, fiber_g: 33.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cocoa, dry powder, unsweetened',
    macro_confidence: 'sourced'
  },

  chia_seeds: {
    id: 'chia_seeds',
    display_name: 'Chia seeds',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: '1 tbsp ≈ 12g. Health food aisle or baking section.',
    state: 'as_sold',
    macros_per_100g: { kcal: 486, protein_g: 16.5, carbs_g: 42.1, fat_g: 30.7, fiber_g: 34.4 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Seeds, chia seeds, dried',
    macro_confidence: 'sourced'
  },

  desiccated_coconut: {
    id: 'desiccated_coconut',
    display_name: 'Desiccated coconut',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Unsweetened, fine-grade. 1 tbsp ≈ 6g.',
    state: 'as_sold',
    macros_per_100g: { kcal: 660, protein_g: 6.9, carbs_g: 23.7, fat_g: 64.5, fiber_g: 16.3 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Nuts, coconut meat, dried (desiccated), not sweetened',
    macro_confidence: 'sourced'
  },

  // ========================= coconut liquids / juices (ml, per-100g ÷ density) =========================

  coconut_cream: {
    id: 'coconut_cream',
    display_name: 'Coconut cream',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Thick canned variety, not coconut milk. Brand variance is large (180-230 kcal/100ml) — Ayam is the reference; override with your can panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 225, protein_g: 2.2, carbs_g: 4.0, fat_g: 22.5, fiber_g: 0 },
    grams_per_canonical_unit: 0.98,
    macro_source: 'Estimated — Ayam Coconut Cream panel ~220-230 kcal per 100ml, ÷ density 0.98',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Ayam Coconut Cream 400ml, per 100ml'
  },

  coconut_milk: {
    id: 'coconut_milk',
    display_name: 'Coconut milk (canned, full-fat)',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Full-fat canned coconut milk. Fat-dense — count carefully. Not the carton drinking variety.',
    state: 'as_sold',
    macros_per_100g: { kcal: 197, protein_g: 2.0, carbs_g: 2.8, fat_g: 21.3, fiber_g: 0 },
    grams_per_canonical_unit: 0.97,
    macro_source: 'USDA SR Legacy — Nuts, coconut milk, canned (per 100g)',
    macro_confidence: 'sourced'
  },

  coconut_water: {
    id: 'coconut_water',
    display_name: 'Coconut water',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Unsweetened, unflavoured. Cocobella or Raw C.',
    state: 'as_sold',
    macros_per_100g: { kcal: 19, protein_g: 0.7, carbs_g: 3.7, fat_g: 0.2, fiber_g: 1.1 },
    grams_per_canonical_unit: 1.0,
    macro_source: 'USDA SR Legacy — Nuts, coconut water (per 100g; density ≈ 1.0)',
    macro_confidence: 'sourced'
  },

  mango_nectar: {
    id: 'mango_nectar',
    display_name: 'Mango nectar',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Pulpy fruit drink with puree (Berri), thicker than clear juice.',
    state: 'as_sold',
    macros_per_100g: { kcal: 53, protein_g: 0.2, carbs_g: 12.5, fat_g: 0.1, fiber_g: 0.3 },
    grams_per_canonical_unit: 1.04,
    macro_source: 'Estimated — Berri Mango Nectar panel ~55 kcal per 100ml, ÷ density 1.04',
    macro_confidence: 'estimated'
  },

  apple_juice_cloudy: {
    id: 'apple_juice_cloudy',
    display_name: 'Cloudy apple juice',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Unfiltered/cloudy (Daily Juice, Nudie). Clear apple juice substitutes with identical macros.',
    state: 'as_sold',
    macros_per_100g: { kcal: 46, protein_g: 0.1, carbs_g: 11.3, fat_g: 0.1, fiber_g: 0.2 },
    grams_per_canonical_unit: 1.04,
    macro_source: 'USDA SR Legacy — Apple juice, canned or bottled, unsweetened (per 100g)',
    macro_confidence: 'sourced'
  },

  orange_juice: {
    id: 'orange_juice',
    display_name: 'Orange juice',
    category: 'produce',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Citrus marinade base (with lime) or drinking.',
    state: 'as_sold',
    macros_per_100g: { kcal: 45, protein_g: 0.7, carbs_g: 10.4, fat_g: 0.2, fiber_g: 0.2 },
    grams_per_canonical_unit: 1.04,
    macro_source: 'USDA SR Legacy — Orange juice, raw (per 100g)',
    macro_confidence: 'sourced'
  },

  // ========================= sweeteners =========================

  honey: {
    id: 'honey',
    display_name: 'Honey',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: '1 tbsp ≈ 21g (honey is dense — canonical grams already accounts for it).',
    state: 'as_sold',
    macros_per_100g: { kcal: 304, protein_g: 0.3, carbs_g: 82.4, fat_g: 0, fiber_g: 0.2 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Honey',
    macro_confidence: 'sourced'
  },

  maple_syrup: {
    id: 'maple_syrup',
    display_name: 'Maple syrup',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Pure maple, not pancake syrup. 1 tbsp = 20ml ≈ 27g (old note claimed 20ml = 20g; maple is dense at 1.33). Density now handles the conversion.',
    state: 'as_sold',
    macros_per_100g: { kcal: 260, protein_g: 0, carbs_g: 67.0, fat_g: 0.1, fiber_g: 0 },
    grams_per_canonical_unit: 1.33,
    macro_source: 'USDA SR Legacy — Syrups, maple (per 100g); density 1.33',
    macro_confidence: 'sourced'
  },

  jam: {
    id: 'jam',
    display_name: 'Jam (mixed berry or apricot)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Standard fruit jam; 1 tbsp ≈ 20g. Reduced-sugar varieties run far lower — override if using one.',
    state: 'as_sold',
    macros_per_100g: { kcal: 278, protein_g: 0.4, carbs_g: 68.9, fat_g: 0.1, fiber_g: 1.1 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Jams and preserves',
    macro_confidence: 'sourced',
    user_overridable: true,
    brand_reference: 'IXL Strawberry Jam 480g, per 100g'
  },

  // ========================= branded desserts =========================

  oreo_cookies: {
    id: 'oreo_cookies',
    display_name: 'Oreo cookies',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian'],
    allergens: ['Gluten/Wheat', 'Soy'],
    typical_pack_size: 137,
    notes: 'Mondelez Oreos; one cookie ≈ 11g (~53 kcal). Contain soy lecithin and are not dairy-free despite popular belief.',
    state: 'as_sold',
    macros_per_100g: { kcal: 480, protein_g: 5.0, carbs_g: 69.0, fat_g: 20.0, fiber_g: 2.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Oreo Original pack panel (Mondelez AU), per 100g',
    macro_confidence: 'sourced',
    user_overridable: true,
    brand_reference: 'Oreo Original 133g, Coles, per 100g'
  },

  instant_pudding_mix: {
    id: 'instant_pudding_mix',
    display_name: 'Instant pudding mix',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: [],
    typical_pack_size: 100,
    notes: 'Dry mix weight; ~1 tbsp = 12g. The anti-icy thickener for protein ice cream — mostly sugar and modified starch.',
    state: 'dry',
    macros_per_100g: { kcal: 380, protein_g: 0, carbs_g: 93.0, fat_g: 0.5, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: "Estimated — dry instant pudding mixes (Cottee's, Jell-O style) cluster 360-390 kcal per 100g dry",
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: "Cottee's Instant Pudding Vanilla, per 100g dry"
  }

};
