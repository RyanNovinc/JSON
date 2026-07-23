// ============================================================================
// BATCH 1 of ~6 — meat_seafood (18 rows after merges) + dairy_refrigerated (17)
// 35 rows total. Two merges applied: chicken_thigh → chicken_thigh_skinless,
// parmesan → parmesan_grated. Repointing list is in the accompanying report.
//
// SECTION A pastes into src/types/ingredients.ts (interface extension).
// SECTION B rows paste into the INGREDIENTS record in src/data/ingredients.ts,
// replacing the existing rows of the same id. Delete the `chicken_thigh` and
// `parmesan` rows once the meals are repointed.
//
// Convention notes baked into this batch:
// - macros_per_100g always corresponds to `state`. Meats are RAW.
// - For ml ingredients, macros are per 100 GRAMS (panel per-100ml values have
//   been divided by density). grams_per_canonical_unit carries the density,
//   so the engine must convert ml → g first, then apply macros.
// - lamb_shank: grams_per_canonical_unit = 240 = edible raw meat per standard
//   400g bone-in shank (60% meat yield). Macros are per 100g of raw meat.
//   See Questions in the report before locking this in.
// ============================================================================

// ---------------------------------------------------------------------------
// SECTION A — paste into src/types/ingredients.ts
// ---------------------------------------------------------------------------

/**
 * What the authored gram amount refers to. This is what you weigh at the
 * bench: raw meat, dry rice, drained beans, or the product as purchased.
 */
export type IngredientState = 'raw' | 'dry' | 'cooked' | 'canned_drained' | 'as_sold';

export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

// Add to the existing Ingredient interface (keep every current field):
//
//   state: IngredientState;
//   macros_per_100g: Macros;              // per 100g of `state`
//   grams_per_canonical_unit: number;     // 1 for 'g'; density for 'ml'; g/item for count/tsp/tbsp/cloves
//   macro_source: string;
//   macro_confidence: 'sourced' | 'estimated';
//   drained_grams_per_pack?: number;      // canned goods only
//   is_pantry_negligible?: boolean;
//   user_overridable?: boolean;
//   brand_reference?: string;

// ---------------------------------------------------------------------------
// SECTION B — rows. Paste over the matching ids in INGREDIENTS.
// ---------------------------------------------------------------------------

export const INGREDIENTS_BATCH_1 = {

  // ========================= meat_seafood =========================

  chicken_thigh_skinless: {
    id: 'chicken_thigh_skinless',
    display_name: 'Chicken thigh, boneless skinless',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Sold fresh in butcher section. Boneless skinless is the bulker default. Juicier than breast; swap chicken_breast for leaner macros. MERGED: absorbs former `chicken_thigh` id.',
    state: 'raw',
    macros_per_100g: { kcal: 144, protein_g: 19.0, carbs_g: 0, fat_g: 7.9, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 2646171 — Chicken, thigh, boneless, skinless, raw (Foundation Foods)',
    macro_confidence: 'sourced'
  },

  chicken_breast: {
    id: 'chicken_breast',
    display_name: 'Chicken breast',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Skinless chicken breast, weighed raw. Meals author raw weight (200g raw per serve).',
    state: 'raw',
    macros_per_100g: { kcal: 120, protein_g: 22.5, carbs_g: 0, fat_g: 2.6, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 171077 — Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw',
    macro_confidence: 'sourced'
  },

  chicken_mince: {
    id: 'chicken_mince',
    display_name: 'Chicken mince (ground chicken)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Ground chicken, weighed raw. Finely chopped thigh or breast works too.',
    state: 'raw',
    macros_per_100g: { kcal: 143, protein_g: 17.4, carbs_g: 0, fat_g: 8.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Chicken, ground, raw',
    macro_confidence: 'sourced'
  },

  turkey_mince: {
    id: 'turkey_mince',
    display_name: 'Turkey mince',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Lean ground turkey (93/7), weighed raw. Chicken mince substitutes if unavailable.',
    state: 'raw',
    macros_per_100g: { kcal: 150, protein_g: 18.7, carbs_g: 0, fat_g: 8.3, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Turkey, ground, 93% lean / 7% fat, raw',
    macro_confidence: 'sourced'
  },

  beef_mince_regular: {
    id: 'beef_mince_regular',
    display_name: 'Beef mince (regular fat)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: "Coles or Woolworths 3-star mince (~80/20) — don't use lean for bolognese. Weighed raw. Sold in 500g-1kg trays.",
    state: 'raw',
    macros_per_100g: { kcal: 254, protein_g: 17.2, carbs_g: 0, fat_g: 20.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 174036 — Beef, ground, 80% lean meat / 20% fat, raw',
    macro_confidence: 'sourced'
  },

  sirloin_steak: {
    id: 'sirloin_steak',
    display_name: 'Sirloin steak',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    typical_pack_unit: 'g',
    notes: 'Lean sirloin (rump or topside also work), weighed raw and trimmed. Ribeye is richer, flank leaner.',
    state: 'raw',
    macros_per_100g: { kcal: 135, protein_g: 22.2, carbs_g: 0, fat_g: 5.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 174763 — Beef, top sirloin, steak, separable lean only, trimmed to 1/8in fat, choice, raw',
    macro_confidence: 'sourced'
  },

  beef_chuck: {
    id: 'beef_chuck',
    display_name: 'Beef chuck',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Also sold as casserole steak, chuck steak, or gravy beef. Weighed raw, lean and fat as cubed. Braising renders fat you can skim; macros assume fat is eaten.',
    state: 'raw',
    macros_per_100g: { kcal: 233, protein_g: 18.7, carbs_g: 0, fat_g: 17.6, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 174040 — Beef, chuck roast, separable lean and fat, raw',
    macro_confidence: 'sourced'
  },

  lamb_shank: {
    id: 'lamb_shank',
    display_name: 'Lamb shank (bone-in)',
    category: 'meat_seafood',
    canonical_unit: 'count',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 4,
    notes: 'Standard shank ~400g raw bone-in, ~60% meat yield (~240g edible raw meat per shank). Macros computed over the edible 240g, not the 400g purchase weight.',
    state: 'raw',
    macros_per_100g: { kcal: 195, protein_g: 18.5, carbs_g: 0, fat_g: 13.5, fiber_g: 0 },
    grams_per_canonical_unit: 240,
    macro_source: 'Estimated — raw lamb leg/shank, lean and fat: USDA Australian imported lamb leg entries cluster 180-210 kcal/100g raw',
    macro_confidence: 'estimated'
  },

  lamb_mince: {
    id: 'lamb_mince',
    display_name: 'Lamb mince (lean; or regular)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'DEFAULT lean lamb mince (~85/15), weighed raw. Regular (~80/20, ~282 kcal/100g) is juicier but much fattier. Beef or a lamb-beef mix is a milder/cheaper swap.',
    state: 'raw',
    macros_per_100g: { kcal: 200, protein_g: 19.5, carbs_g: 0, fat_g: 13.5, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — interpolated between USDA SR ground lamb 80/20 raw (282 kcal, 16.6P, 23.4F) and lean lamb; consistent with Coles lean lamb mince panel',
    macro_confidence: 'estimated'
  },

  pork_shoulder_boneless: {
    id: 'pork_shoulder_boneless',
    display_name: 'Pork shoulder, boneless',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: "Ask at the Coles or Woolworths butcher counter for 'pork shoulder roast' — boneless, skin off, fat cap on. Typically 2-2.5kg pieces. Weighed raw; cooked yield ~55% of raw weight.",
    state: 'raw',
    macros_per_100g: { kcal: 236, protein_g: 17.2, carbs_g: 0, fat_g: 18.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 167843 — Pork, fresh, shoulder, whole, separable lean and fat, raw',
    macro_confidence: 'sourced'
  },

  bacon: {
    id: 'bacon',
    display_name: 'Bacon (rashers)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    typical_pack_unit: 'g',
    notes: 'Streaky or middle rashers, weighed raw. USDA streaky reference; AU trimmed middle/short-cut bacon is much leaner (can be under half these values) — override with your pack panel.',
    state: 'raw',
    macros_per_100g: { kcal: 393, protein_g: 13.7, carbs_g: 0.7, fat_g: 37.6, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 168277 — Pork, cured, bacon, unprepared',
    macro_confidence: 'sourced',
    user_overridable: true,
    brand_reference: 'Coles Middle Bacon Rashers, per 100g (check pack panel)'
  },

  pancetta_diced: {
    id: 'pancetta_diced',
    display_name: 'Pancetta (diced)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 100,
    notes: "Coles deli counter or Don's brand, pre-diced 100g-200g packs. Bacon lardons substitute. Weighed as sold (cured, raw).",
    state: 'as_sold',
    macros_per_100g: { kcal: 375, protein_g: 15.0, carbs_g: 0.5, fat_g: 35.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — cured pork belly; AU diced pancetta panels (Don, Primo) cluster 330-420 kcal/100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: "Don Diced Pancetta 100g, Coles"
  },

  breakfast_sausage: {
    id: 'breakfast_sausage',
    display_name: 'Breakfast sausage mince',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    typical_pack_unit: 'g',
    notes: 'Pork or turkey breakfast sausage, casings removed (or sausage mince). Weighed raw; turkey is leaner. Brown and crumble.',
    state: 'raw',
    macros_per_100g: { kcal: 290, protein_g: 15.0, carbs_g: 2.0, fat_g: 24.5, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — pork sausage mince, raw; AU sausage mince panels cluster 270-320 kcal/100g',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Coles Sausage Mince 500g, per 100g raw'
  },

  sausage: {
    id: 'sausage',
    display_name: 'Sausages (chicken/turkey default; or pork)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'DEFAULT leaner chicken sausage, weighed raw. Pork sausage (~300 kcal/100g raw) pushes fat much higher. Most contain wheat rusk — gluten-free varieties exist, check the label.',
    state: 'raw',
    macros_per_100g: { kcal: 190, protein_g: 14.0, carbs_g: 4.0, fat_g: 13.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU supermarket chicken sausage panels cluster 170-210 kcal/100g raw',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Coles Chicken Sausages 500g, per 100g raw'
  },

  beef_jerky: {
    id: 'beef_jerky',
    display_name: 'Beef jerky',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: 'Dried beef jerky, weighed as sold. Brand variance is huge (250-410 kcal/100g); marinades often contain soy/gluten — check the label.',
    state: 'as_sold',
    macros_per_100g: { kcal: 250, protein_g: 35.0, carbs_g: 11.0, fat_g: 7.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: "Estimated — midpoint of AU jerky panels (Jack Link's, Local Legends); brand variance 250-410 kcal/100g",
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: "Jack Link's Original Beef Jerky 50g, per 100g"
  },

  tuna: {
    id: 'tuna',
    display_name: 'Tuna (canned / pouch)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 95,
    typical_pack_unit: 'g',
    notes: 'Tuna in springwater, drained weight. A 95g pouch is ~95g drained (pouches carry no brine); a 425g can drains to ~280g. Flavoured pouches add minor carbs/fat — check panel.',
    state: 'canned_drained',
    macros_per_100g: { kcal: 116, protein_g: 25.5, carbs_g: 0, fat_g: 0.8, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    drained_grams_per_pack: 95,
    macro_source: 'USDA SR Legacy — Fish, tuna, light, canned in water, drained solids',
    macro_confidence: 'sourced'
  },

  smoked_salmon: {
    id: 'smoked_salmon',
    display_name: 'Smoked salmon',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 100,
    typical_pack_unit: 'g',
    notes: 'Cold-smoked salmon slices, weighed as sold (ready to eat).',
    state: 'as_sold',
    macros_per_100g: { kcal: 117, protein_g: 18.3, carbs_g: 0, fat_g: 4.3, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Fish, salmon, chinook, smoked',
    macro_confidence: 'sourced'
  },

  salmon_fillet: {
    id: 'salmon_fillet',
    display_name: 'Salmon fillet',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 500,
    notes: 'Skin-on or skinless Atlantic salmon fillet, weighed raw. Naturally fatty and calorie-dense. Distinct from smoked_salmon (cured, breakfast).',
    state: 'raw',
    macros_per_100g: { kcal: 208, protein_g: 20.4, carbs_g: 0, fat_g: 13.4, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 175167 — Fish, salmon, Atlantic, farmed, raw',
    macro_confidence: 'sourced'
  },

  // ========================= dairy_refrigerated =========================

  egg_whole: {
    id: 'egg_whole',
    display_name: 'Egg (whole)',
    category: 'dairy_refrigerated',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Eggs'],
    typical_pack_size: 12,
    notes: 'Free-range standard size: ~60g in shell, ~50g edible. Macros per 100g of raw edible egg; one egg = 50g.',
    state: 'raw',
    macros_per_100g: { kcal: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5, fiber_g: 0 },
    grams_per_canonical_unit: 50,
    macro_source: 'USDA FDC 171287 — Egg, whole, raw, fresh',
    macro_confidence: 'sourced'
  },

  full_cream_milk: {
    id: 'full_cream_milk',
    display_name: 'Full-cream milk',
    category: 'dairy_refrigerated',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'Standard AU full-cream milk (3.4% fat). Macros are per 100g; panel per-100ml values converted at density 1.03.',
    state: 'as_sold',
    macros_per_100g: { kcal: 62, protein_g: 3.2, carbs_g: 4.7, fat_g: 3.3, fiber_g: 0 },
    grams_per_canonical_unit: 1.03,
    macro_source: 'Coles Full Cream Milk 2L panel (64 kcal, 3.3P, 4.8C, 3.4F per 100ml), converted to per 100g at density 1.03',
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
    notes: 'AU thickened cream is standardised at ~35% milk fat. Macros per 100g; per-100ml panel values converted at density 1.01.',
    state: 'as_sold',
    macros_per_100g: { kcal: 340, protein_g: 2.0, carbs_g: 3.0, fat_g: 35.5, fiber_g: 0 },
    grams_per_canonical_unit: 1.01,
    macro_source: 'Estimated — AU thickened cream panels (Bulla, Pauls, house brand) cluster 335-355 kcal per 100ml at 35% fat',
    macro_confidence: 'estimated'
  },

  butter_salted: {
    id: 'butter_salted',
    display_name: 'Salted butter',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 250,
    notes: 'Western Star, Lurpak, or supermarket house-brand. Sold in 250g-500g blocks.',
    state: 'as_sold',
    macros_per_100g: { kcal: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA FDC 173410 — Butter, salted',
    macro_confidence: 'sourced'
  },

  sour_cream: {
    id: 'sour_cream',
    display_name: 'Sour cream',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 200,
    notes: 'Full-fat cultured sour cream. Pauls, Bulla, or supermarket brand, 200g-300g tubs.',
    state: 'as_sold',
    macros_per_100g: { kcal: 198, protein_g: 2.4, carbs_g: 4.6, fat_g: 19.4, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cream, sour, cultured',
    macro_confidence: 'sourced'
  },

  cheese_tasty_grated: {
    id: 'cheese_tasty_grated',
    display_name: 'Tasty cheese (grated)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Standard Australian tasty cheddar. Bega, Coles, or Woolworths brand. Pre-grated bags or grate a block.',
    state: 'as_sold',
    macros_per_100g: { kcal: 403, protein_g: 24.9, carbs_g: 1.3, fat_g: 33.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, cheddar (matches Bega Tasty panel within 2%)',
    macro_confidence: 'sourced'
  },

  cheese_block: {
    id: 'cheese_block',
    display_name: 'Cheese (cheddar / tasty)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 250,
    typical_pack_unit: 'g',
    notes: 'Block cheddar/tasty, string cheese, or Babybel-style portions. Same food as cheese_tasty_grated — see merge question in the batch report.',
    state: 'as_sold',
    macros_per_100g: { kcal: 403, protein_g: 24.9, carbs_g: 1.3, fat_g: 33.1, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, cheddar',
    macro_confidence: 'sourced'
  },

  mozzarella_shredded: {
    id: 'mozzarella_shredded',
    display_name: 'Mozzarella (shredded)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 375,
    notes: 'Perfect Italiano or Bega. Pre-shredded bags or grate a block. Sold in 250g-500g bags.',
    state: 'as_sold',
    macros_per_100g: { kcal: 300, protein_g: 22.2, carbs_g: 2.2, fat_g: 22.4, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, mozzarella, whole milk',
    macro_confidence: 'sourced'
  },

  parmesan_grated: {
    id: 'parmesan_grated',
    display_name: 'Parmesan (grated)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 100,
    notes: 'Perfect Italiano or Paesanella; pre-grated tubs or grate a block. Pecorino Romano is the authentic carbonara upgrade. MERGED: absorbs former `parmesan` id.',
    state: 'as_sold',
    macros_per_100g: { kcal: 431, protein_g: 38.5, carbs_g: 4.1, fat_g: 28.6, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, parmesan, grated',
    macro_confidence: 'sourced'
  },

  feta: {
    id: 'feta',
    display_name: 'Feta cheese',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 200,
    typical_pack_unit: 'g',
    notes: 'Crumbled.',
    state: 'as_sold',
    macros_per_100g: { kcal: 264, protein_g: 14.2, carbs_g: 4.1, fat_g: 21.3, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, feta',
    macro_confidence: 'sourced'
  },

  ricotta_full_fat: {
    id: 'ricotta_full_fat',
    display_name: 'Ricotta (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Paesanella or Perfect Italiano. 250g-500g tubs in the refrigerated cheese section.',
    state: 'as_sold',
    macros_per_100g: { kcal: 174, protein_g: 11.3, carbs_g: 3.0, fat_g: 13.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, ricotta, whole milk',
    macro_confidence: 'sourced'
  },

  cream_cheese: {
    id: 'cream_cheese',
    display_name: 'Cream cheese',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 250,
    typical_pack_unit: 'g',
    notes: 'Full-fat (Philadelphia-style). Soften before spreading. Note: no_bake_protein_cheesecake authors "light" cream cheese (~230 kcal/100g) — see Questions.',
    state: 'as_sold',
    macros_per_100g: { kcal: 342, protein_g: 5.9, carbs_g: 4.1, fat_g: 34.2, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, cream',
    macro_confidence: 'sourced'
  },

  cottage_cheese: {
    id: 'cottage_cheese',
    display_name: 'Cottage cheese (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Full-fat (4%) cottage cheese. Blend until smooth if you dislike the curd texture.',
    state: 'as_sold',
    macros_per_100g: { kcal: 98, protein_g: 11.1, carbs_g: 3.4, fat_g: 4.3, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Cheese, cottage, creamed, large or small curd',
    macro_confidence: 'sourced'
  },

  greek_yoghurt_plain: {
    id: 'greek_yoghurt_plain',
    display_name: 'Plain Greek yoghurt',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'High-protein / nonfat varieties (Chobani Fit, YoPro, Pauls Protein+) are the bulker default this row models. Distinct from greek_yoghurt_plain_full_fat.',
    state: 'as_sold',
    macros_per_100g: { kcal: 59, protein_g: 10.2, carbs_g: 3.6, fat_g: 0.4, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Yogurt, Greek, plain, nonfat',
    macro_confidence: 'sourced',
    user_overridable: true,
    brand_reference: 'Chobani Fit Plain Greek Yogurt 907g, Coles, per 100g'
  },

  greek_yoghurt_plain_full_fat: {
    id: 'greek_yoghurt_plain_full_fat',
    display_name: 'Plain Greek yoghurt (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'No added sugar, no flavouring, full-fat. Pauls, Chobani Plain Whole Milk, Five:am, or house-brand plain Greek.',
    state: 'as_sold',
    macros_per_100g: { kcal: 97, protein_g: 9.0, carbs_g: 3.9, fat_g: 5.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'USDA SR Legacy — Yogurt, Greek, plain, whole milk',
    macro_confidence: 'sourced'
  },

  greek_yoghurt_vanilla_full_fat: {
    id: 'greek_yoghurt_vanilla_full_fat',
    display_name: 'Vanilla Greek yoghurt (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Has added sugar and vanilla flavouring — distinct from plain. Brand variance is large (95-130 kcal/100g); override with your tub panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 104, protein_g: 7.5, carbs_g: 9.5, fat_g: 4.0, fiber_g: 0 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — midpoint of AU full-fat vanilla Greek panels (Chobani Vanilla, Pauls, Farmers Union Greek Style Vanilla)',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Chobani Vanilla Greek Yogurt 907g, Coles, per 100g'
  },

  coleslaw_mayo: {
    id: 'coleslaw_mayo',
    display_name: 'Coleslaw (mayo-based)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy', 'Eggs'],
    typical_pack_size: 350,
    notes: 'Pre-made deli coleslaw with mayonnaise dressing, 350g tubs. Dressing ratio drives calories; override with your tub panel.',
    state: 'as_sold',
    macros_per_100g: { kcal: 150, protein_g: 1.5, carbs_g: 8.0, fat_g: 12.5, fiber_g: 1.5 },
    grams_per_canonical_unit: 1,
    macro_source: 'Estimated — AU deli coleslaw panels cluster 120-180 kcal/100g depending on dressing ratio',
    macro_confidence: 'estimated',
    user_overridable: true,
    brand_reference: 'Coles Kitchen Creamy Coleslaw 350g, per 100g'
  }

};
