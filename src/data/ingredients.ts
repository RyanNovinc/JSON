import { Ingredient, IngredientId } from '../types/ingredients';

export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  chicken_thigh_skinless: {
    id: 'chicken_thigh_skinless',
    display_name: 'Chicken thigh, boneless skinless',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Sold fresh in butcher section. Boneless skinless is the bulker default — higher protein per gram than bone-in.'
  },
  greek_yoghurt_plain: {
    id: 'greek_yoghurt_plain',
    display_name: 'Plain Greek yoghurt',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Use high-protein varieties (Chobani Fit, YoPro, Pauls Protein+) for bulker meals where protein density matters.'
  },
  garam_masala: {
    id: 'garam_masala',
    display_name: 'Garam masala',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
  },
  ground_cumin: {
    id: 'ground_cumin',
    display_name: 'Ground cumin',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
  },
  ground_coriander: {
    id: 'ground_coriander',
    display_name: 'Ground coriander',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
  },
  ground_turmeric: {
    id: 'ground_turmeric',
    display_name: 'Ground turmeric',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
  },
  kashmiri_chilli_powder: {
    id: 'kashmiri_chilli_powder',
    display_name: 'Kashmiri chilli powder',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: 'Mild but vivid red. Substitute with paprika + a pinch of cayenne if unavailable.'
  },
  garlic_clove: {
    id: 'garlic_clove',
    display_name: 'Garlic',
    category: 'produce',
    canonical_unit: 'cloves',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1,
    typical_pack_unit: 'bulb'
  },
  ginger_fresh: {
    id: 'ginger_fresh',
    display_name: 'Fresh ginger',
    category: 'produce',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Minced or grated. Sold by the knob in produce.'
  },
  granola: {
    id: 'granola',
    display_name: 'Granola',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian'],
    allergens: ['Nuts'],
    typical_pack_size: 400,
    notes: 'Toasted oat-and-nut clusters. Carman\'s, Coles, or Woolworths brand. Approximately 450 kcal per 100g; ~30g per 1/3 cup. Most contain nuts and are not certified gluten-free (oat cross-contamination) — check the label for nut-free or GF varieties if relevant.'
  },
  ghee: {
    id: 'ghee',
    display_name: 'Ghee',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 375,
    notes: 'Clarified butter. Found in the Indian section or with cooking oils. Substitute with butter if unavailable.'
  },
  brown_onion: {
    id: 'brown_onion',
    display_name: 'Brown onion',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 150,
    typical_pack_unit: 'count',
    notes: 'One medium brown onion is approximately 150g.'
  },
  tomato_passata: {
    id: 'tomato_passata',
    display_name: 'Tomato passata',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 700
  },
  thickened_cream: {
    id: 'thickened_cream',
    display_name: 'Thickened cream',
    category: 'dairy_refrigerated',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 300
  },
  salt: {
    id: 'salt',
    display_name: 'Salt',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: []
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
    notes: 'Lean sirloin (rump or topside also work). ~140 kcal and ~21g protein per 100g raw. Substitute ribeye for richer, flank for leaner.'
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
    notes: 'Cold-smoked salmon slices. ~117 kcal and ~18g protein per 100g.'
  },
  basmati_rice_cooked: {
    id: 'basmati_rice_cooked',
    display_name: 'Cooked basmati rice',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Measured cooked. Dry-to-cooked yield is roughly 1:3 by weight. Microwave pouches (SunRice etc.) are a valid shortcut at 250g per pouch.'
  },
  coriander_leaves_fresh: {
    id: 'coriander_leaves_fresh',
    display_name: 'Fresh coriander leaves',
    category: 'produce',
    canonical_unit: 'tbsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Sold by the bunch in produce. One bunch yields approximately 1 cup chopped.'
  },
  olive_oil: {
    id: 'olive_oil',
    display_name: 'Olive oil',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    typical_pack_unit: 'ml'
  },
  butter_chicken_jar_sauce: {
    id: 'butter_chicken_jar_sauce',
    display_name: 'Butter chicken simmer sauce (jar)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 485,
    notes: "Patak's, Maharajah's, or supermarket house brand. Check label for nut and gluten content if relevant — most are dairy-only."
  },
  full_cream_milk: {
    id: 'full_cream_milk',
    display_name: 'Full-cream milk',
    category: 'dairy_refrigerated',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000
  },
  banana: {
    id: 'banana',
    display_name: 'Banana',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One medium banana is approximately 120g peeled. Sold by the kilo or as a single bunch.'
  },
  rolled_oats_raw: {
    id: 'rolled_oats_raw',
    display_name: 'Rolled oats (raw)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Standard rolled oats, not quick oats. Sold in 500g-1kg bags. Most Australian rolled oats are not certified gluten-free unless labelled as such (cross-contamination risk).'
  },
  greek_yoghurt_vanilla_full_fat: {
    id: 'greek_yoghurt_vanilla_full_fat',
    display_name: 'Vanilla Greek yoghurt (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Distinct from plain Greek yoghurt — has added sugar and vanilla flavouring. Common brands: Chobani Flip, Pauls, YoPro Vanilla.'
  },
  peanut_butter_natural: {
    id: 'peanut_butter_natural',
    display_name: 'Peanut butter (natural)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 375,
    notes: "100% peanut, no added sugar or oil. Mayver's, Pic's, Coles/Woolworths house-brand natural. Roughly 600 kcal per 100g."
  },
  honey: {
    id: 'honey',
    display_name: 'Honey',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: '1 tbsp is approximately 21g.'
  },
  maple_syrup: {
    id: 'maple_syrup',
    display_name: 'Maple syrup',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Pure maple syrup, not pancake syrup. 1 tbsp is approximately 20ml / 20g.'
  },
  whey_protein_vanilla: {
    id: 'whey_protein_vanilla',
    display_name: 'Vanilla whey protein',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'Standard whey protein concentrate or isolate. 1 scoop is approximately 30g and delivers ~24g protein. Bulk Nutrients, MyProtein, On Whey are common Australian brands. Note: not sold at standard supermarkets — typically online or specialty stores.'
  },
  cinnamon_ground: {
    id: 'cinnamon_ground',
    display_name: 'Ground cinnamon',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
  },
  mango_frozen: {
    id: 'mango_frozen',
    display_name: 'Frozen mango chunks',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Unsweetened, no added sugar. 1 cup chunks is approximately 165g. Sold in the freezer section.'
  },
  mango_nectar: {
    id: 'mango_nectar',
    display_name: 'Mango nectar',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'The pulpy fruit drink, not clear juice. Berri is the standard Australian brand. Distinct from mango juice — nectar is thicker and includes fruit puree.'
  },
  macadamia_butter: {
    id: 'macadamia_butter',
    display_name: 'Macadamia nut butter',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 250,
    notes: "100% macadamia, no added oils or sugar. Higher calorie than peanut or almond butter (~720 kcal per 100g). Less common in supermarkets — may need health food store or online (Mayver's, Pic's)."
  },
  whey_protein_chocolate: {
    id: 'whey_protein_chocolate',
    display_name: 'Chocolate whey protein',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 1000,
    notes: 'Standard whey protein concentrate or isolate, chocolate flavoured. 1 scoop is approximately 30g and delivers ~24g protein. Bulk Nutrients, MyProtein, On Whey are common Australian brands. Not sold at standard supermarkets — typically online or specialty stores.'
  },
  cocoa_powder: {
    id: 'cocoa_powder',
    display_name: 'Cocoa powder (unsweetened)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Unsweetened cocoa, not drinking chocolate. 1 tbsp is approximately 5g. Cadbury Bournville, Coles/Woolworths house brand.'
  },
  strawberries_frozen: {
    id: 'strawberries_frozen',
    display_name: 'Frozen strawberries',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Unsweetened, no added sugar. 1 cup is approximately 150g. Sold in the freezer section.'
  },
  coconut_cream: {
    id: 'coconut_cream',
    display_name: 'Coconut cream',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'The thick canned variety, not coconut milk. Ayam is the standard Australian brand. Calorie content varies significantly by brand (180-230 kcal per 100ml) — Ayam used as reference.'
  },
  almond_butter: {
    id: 'almond_butter',
    display_name: 'Almond butter',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 250,
    notes: "100% almonds, no added oils or sugar. Approximately 620 kcal per 100g. Mayver's, Pic's, or Coles/Woolworths house-brand natural."
  },
  ice_cream_vanilla: {
    id: 'ice_cream_vanilla',
    display_name: 'Vanilla ice cream',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy', 'Eggs'],
    typical_pack_size: 1000,
    notes: 'Standard vanilla ice cream (~200 kcal per 100g). Premium brands like Connoisseur are higher (~270 kcal), budget brands like Coles house-brand are lower (~180 kcal). ½ cup is approximately 60g. Most commercial ice creams contain egg as an emulsifier — check label if eggs are an allergen concern.'
  },
  jam: {
    id: 'jam',
    display_name: 'Jam (mixed berry or apricot)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Standard fruit jam (~260 kcal per 100g). Mixed berry, strawberry, or apricot work well. Coles, Woolworths, or IXL brand. 1 tbsp is approximately 20g.'
  },
  oreo_cookies: {
    id: 'oreo_cookies',
    display_name: 'Oreo cookies',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian'],
    allergens: ['Gluten/Wheat', 'Soy'],
    typical_pack_size: 137,
    notes: 'Standard Mondelez Oreos. One cookie is approximately 11g. Most Oreos in Australia contain soy lecithin. Not dairy-free despite popular belief — check label.'
  },
  raspberries_frozen: {
    id: 'raspberries_frozen',
    display_name: 'Frozen raspberries',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Unsweetened. 1 cup is approximately 125g.'
  },
  desiccated_coconut: {
    id: 'desiccated_coconut',
    display_name: 'Desiccated coconut',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Unsweetened, fine-grade. 1 tbsp is approximately 6g.'
  },
  chia_seeds: {
    id: 'chia_seeds',
    display_name: 'Chia seeds',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: '1 tbsp is approximately 12g. Sold in the health food aisle or with the baking goods.'
  },
  espresso_shot: {
    id: 'espresso_shot',
    display_name: 'Espresso shot',
    category: 'other',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One shot is approximately 30ml. Substitute: 1 tsp instant coffee dissolved in 30ml hot water.'
  },
  everything_bagel_seasoning: {
    id: 'everything_bagel_seasoning',
    display_name: 'Everything bagel seasoning',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Sesame'],
    typical_pack_size: 100,
    notes: 'Sesame, poppy seeds, dried garlic, dried onion, salt. Coles/Woolworths spice aisle. Contains sesame.'
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
    notes: 'Crumbled. ~265 kcal and ~14g protein per 100g.'
  },
  coconut_water: {
    id: 'coconut_water',
    display_name: 'Coconut water',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Unsweetened, unflavoured. Common brands: Cocobella, Raw C. Sold chilled or in tetra-paks at room temperature.'
  },
  pineapple_frozen: {
    id: 'pineapple_frozen',
    display_name: 'Frozen pineapple chunks',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Unsweetened, no added sugar. 1 cup is approximately 165g.'
  },
  spinach_baby: {
    id: 'spinach_baby',
    display_name: 'Baby spinach leaves',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 120,
    notes: 'Pre-washed, sold in 120g-300g bags. One large handful is approximately 30g.'
  },
  avocado: {
    id: 'avocado',
    display_name: 'Avocado',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Flesh only, weight excludes pit and skin. One medium avocado yields approximately 200g of flesh.'
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
    notes: 'Streaky or middle bacon rashers. ~330 kcal and ~25g protein per 100g cooked. Turkey bacon is leaner.'
  },
  bagel: {
    id: 'bagel',
    display_name: 'Bagel',
    category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 5,
    typical_pack_unit: 'count',
    notes: 'Plain or everything bagel, ~245 kcal each. Wholemeal/seeded adds fibre; protein bagels (e.g. Warburtons) boost protein.'
  },
  baked_beans: {
    id: 'baked_beans',
    display_name: 'Baked beans',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    typical_pack_unit: 'g',
    notes: 'Canned baked beans in tomato sauce. ~78 kcal, ~5g protein, ~13g carbs per 100g. Some brands contain gluten — check label.'
  },
  greek_yoghurt_plain_full_fat: {
    id: 'greek_yoghurt_plain_full_fat',
    display_name: 'Plain Greek yoghurt (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Distinct from vanilla Greek yoghurt — no added sugar, no flavouring. Pauls, Chobani Plain, Five:am, or Coles/Woolworths house-brand plain Greek.'
  },
  lemon_juice: {
    id: 'lemon_juice',
    display_name: 'Lemon juice',
    category: 'produce',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Fresh-squeezed preferred. Juice of half a lemon yields approximately 20ml. Bottled juice (Berri ReaLemon) is an acceptable shortcut.'
  },
  mint_leaves: {
    id: 'mint_leaves',
    display_name: 'Fresh mint leaves',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Sold by the bunch in produce. Whole leaves only — do not include stems for smoothies.'
  },
  mixed_berries: {
    id: 'mixed_berries',
    display_name: 'Mixed berries (fresh or frozen)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Strawberries, blueberries, and raspberries — fresh or frozen. Frozen mixed berries (Coles/Woolworths) are cheaper and work fine; thaw or stir in frozen. Approximately 50 kcal per 100g.'
  },
  blueberries_frozen: {
    id: 'blueberries_frozen',
    display_name: 'Frozen blueberries',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Unsweetened, no added sugar. ½ cup is approximately 75g.'
  },
  apple_juice_cloudy: {
    id: 'apple_juice_cloudy',
    display_name: 'Cloudy apple juice',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Unfiltered/cloudy variety, not clear apple juice. Common brands: Daily Juice, Nudie. Substitute with clear apple juice if cloudy unavailable.'
  },
  medjool_dates: {
    id: 'medjool_dates',
    display_name: 'Medjool dates',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Large, soft, premium dates — distinct from smaller dried dates. Pitted weight; one date is approximately 24g pitted. Sold in produce or with dried fruits.'
  },
  apple_cider_vinegar: {
    id: 'apple_cider_vinegar',
    display_name: 'Apple cider vinegar',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: "Cornwell's, Bragg's, or supermarket house brand. Sold with vinegars in the pantry aisle."
  },
  baking_potato: {
    id: 'baking_potato',
    display_name: 'Baking potato (Sebago or russet)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Large baking-grade potato. Sebago is the standard Australian baking potato. One large potato is approximately 350g raw.'
  },
  baking_powder: {
    id: 'baking_powder',
    display_name: 'Baking powder',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 125,
    typical_pack_unit: 'g',
    notes: 'Raising agent for fluffy pancakes. Negligible macros.'
  },
  black_pepper_ground: {
    id: 'black_pepper_ground',
    display_name: 'Ground black pepper',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
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
    notes: 'Pork or turkey breakfast sausage, casings removed (or sausage mince). ~290 kcal and ~15g protein per 100g raw for pork; turkey is leaner. Brown and crumble.'
  },
  brioche_bun: {
    id: 'brioche_bun',
    display_name: 'Brioche burger bun',
    category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Dairy', 'Eggs', 'Gluten/Wheat', 'Soy'],
    typical_pack_size: 4,
    notes: 'Approximately 80g per bun. Sold in 4-packs at Coles, Woolworths, or Bakers Delight.'
  },
  brioche_loaf: {
    id: 'brioche_loaf',
    display_name: 'Brioche loaf (sliced)',
    category: 'bakery',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Dairy', 'Eggs', 'Gluten/Wheat', 'Soy'],
    typical_pack_size: 500,
    notes: 'Sliced brioche loaf — richer and eggier than sandwich bread, ideal for French toast. Coles/Woolworths bakery section. Approximately 40g per slice. Substitute thick-cut sourdough or Texas toast if unavailable.'
  },
  brown_sugar: {
    id: 'brown_sugar',
    display_name: 'Brown sugar',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'CSR or supermarket house-brand. Sold in 500g-1kg bags. 1 tbsp is approximately 12g.'
  },
  butter_salted: {
    id: 'butter_salted',
    display_name: 'Salted butter',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 250,
    notes: 'Western Star, Lurpak, or supermarket house-brand. Sold in 250g-500g blocks.'
  },
  coleslaw_mayo: {
    id: 'coleslaw_mayo',
    display_name: 'Coleslaw (mayo-based)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy', 'Eggs'],
    typical_pack_size: 350,
    notes: 'Pre-made deli coleslaw with mayonnaise dressing. Sold in 350g tubs at Coles/Woolworths deli sections. Can be made from scratch with cabbage, carrot, and mayonnaise.'
  },
  cheese_tasty_grated: {
    id: 'cheese_tasty_grated',
    display_name: 'Tasty cheese (grated)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Standard Australian tasty cheddar. Bega, Coles, or Woolworths brand. Pre-grated bags or grate a block. Sold in 250g-500g bags.'
  },
  cherry_tomatoes: {
    id: 'cherry_tomatoes',
    display_name: 'Cherry tomatoes',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Halved. ~18 kcal per 100g. Grape tomatoes work too.'
  },
  flour_plain: {
    id: 'flour_plain',
    display_name: 'Plain flour',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 1000,
    notes: 'All-purpose white flour. White Wings, Coles or Woolworths house-brand. Sold in 1kg-2kg bags.'
  },
  flour_tortilla_small: {
    id: 'flour_tortilla_small',
    display_name: 'Flour tortilla (small)',
    category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat', 'Soy'],
    typical_pack_size: 8,
    notes: 'Approximately 30g per tortilla. Mission, Old El Paso, or supermarket brand. Sold in 8-packs in the bakery or Mexican-foods aisle.'
  },
  garlic_powder: {
    id: 'garlic_powder',
    display_name: 'Garlic powder',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: 'Masterfoods or supermarket house-brand. Sold in the spice section.'
  },
  ketchup_tomato: {
    id: 'ketchup_tomato',
    display_name: 'Tomato ketchup',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Heinz, MasterFoods, or supermarket brand. Sold in 500g-1kg bottles.'
  },
  lime: {
    id: 'lime',
    display_name: 'Lime',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Sold individually in produce. One lime yields approximately 30ml of juice.'
  },
  macaroni_dry: {
    id: 'macaroni_dry',
    display_name: 'Macaroni pasta (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'San Remo, Barilla, or supermarket brand. Dry-to-cooked yield is approximately 1:2.2 by weight.'
  },
  mustard_powder: {
    id: 'mustard_powder',
    display_name: 'Mustard powder',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: "Keen's is the standard Australian brand. Sold in the spice section."
  },
  onion_powder: {
    id: 'onion_powder',
    display_name: 'Onion powder',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g'
  },
  paprika_sweet: {
    id: 'paprika_sweet',
    display_name: 'Sweet paprika',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: 'Standard sweet (mild) paprika, not smoked or hot. Masterfoods or supermarket brand.'
  },
  pickled_red_onion: {
    id: 'pickled_red_onion',
    display_name: 'Pickled red onion',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Sold in jars at Coles/Woolworths or can be made from scratch. Optional in most recipes.'
  },
  pork_shoulder_boneless: {
    id: 'pork_shoulder_boneless',
    display_name: 'Pork shoulder, boneless',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: "Ask at the Coles or Woolworths butcher counter for 'pork shoulder roast' — boneless, skin off, fat cap on. Typically sold in 2-2.5kg pieces. Cooked yield is approximately 55% of raw weight."
  },
  sour_cream: {
    id: 'sour_cream',
    display_name: 'Sour cream',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 200,
    notes: 'Pauls, Bulla, or supermarket brand. Sold in 200g-300g tubs.'
  },
  spring_onion: {
    id: 'spring_onion',
    display_name: 'Spring onion',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Sold by the bunch (approximately 6 stems per bunch). One stem is approximately 10g.'
  },
  worcestershire_sauce: {
    id: 'worcestershire_sauce',
    display_name: 'Worcestershire sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 250,
    notes: 'Lea & Perrins is the standard brand. Contains anchovies — not vegan. Sold in the condiments aisle.'
  },
  bay_leaves_dried: {
    id: 'bay_leaves_dried',
    display_name: 'Dried bay leaves',
    category: 'pantry_grains',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Sold in small jars in the spice section. Remove before serving.'
  },
  beef_mince_regular: {
    id: 'beef_mince_regular',
    display_name: 'Beef mince (regular fat)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Coles or Woolworths 3-star mince — don\'t use lean for bolognese. Sold in 500g-1kg trays.'
  },
  beef_stock_cube: {
    id: 'beef_stock_cube',
    display_name: 'Beef stock cube',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 60,
    notes: 'OXO or Massel. One cube is approximately 10g. Check label for gluten content — some brands contain wheat. Sold in 6-12 cube packs.'
  },
  carrot: {
    id: 'carrot',
    display_name: 'Carrot',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One medium carrot is approximately 120g. Sold loose by the kilo or in 1kg bags.'
  },
  celery: {
    id: 'celery',
    display_name: 'Celery',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One stalk is approximately 50g. Sold by the bunch (~6 stalks).'
  },
  crushed_tomatoes_canned: {
    id: 'crushed_tomatoes_canned',
    display_name: 'Canned crushed tomatoes',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 800,
    notes: 'Mutti is the premium brand; Ardmona or supermarket house-brand also fine. Sold in 400g or 800g tins.'
  },
  cucumber: {
    id: 'cucumber',
    display_name: 'Cucumber',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Diced or sliced. ~15 kcal per 100g.'
  },
  egg_whole: {
    id: 'egg_whole',
    display_name: 'Egg (whole)',
    category: 'dairy_refrigerated',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Eggs'],
    typical_pack_size: 12,
    notes: 'Free-range standard size (~60g per egg including shell, ~50g without). Sold in 6 or 12-packs.'
  },
  garlic_bread_frozen: {
    id: 'garlic_bread_frozen',
    display_name: 'Garlic bread (frozen)',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Dairy', 'Gluten/Wheat'],
    typical_pack_size: 450,
    notes: 'Coles or Woolworths frozen aisle. Typically sold in 400g-500g packs with 8-10 pre-sliced pieces. Approximately 40g per slice.'
  },
  lasagne_sheets_dry: {
    id: 'lasagne_sheets_dry',
    display_name: 'Lasagne sheets (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 375,
    notes: 'San Remo (egg-free) or Barilla. Check label — some brands contain eggs. Sold in 250g-375g boxes.'
  },
  mozzarella_shredded: {
    id: 'mozzarella_shredded',
    display_name: 'Mozzarella (shredded)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 375,
    notes: 'Perfect Italiano or Bega. Pre-shredded bags or grate a block. Sold in 250g-500g bags.'
  },
  nutmeg_ground: {
    id: 'nutmeg_ground',
    display_name: 'Ground nutmeg',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 30,
    typical_pack_unit: 'g',
    notes: 'Masterfoods or supermarket brand. Despite the name, nutmeg is a seed — not a tree-nut allergen.'
  },
  oregano_dried: {
    id: 'oregano_dried',
    display_name: 'Dried oregano',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 20,
    typical_pack_unit: 'g'
  },
  pancetta_diced: {
    id: 'pancetta_diced',
    display_name: 'Pancetta (diced)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 100,
    notes: 'Coles deli counter or Don\'s brand. Sold pre-diced in 100g-200g packs. Bacon lardons work as a substitute.'
  },
  parmesan_grated: {
    id: 'parmesan_grated',
    display_name: 'Parmesan (grated)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 100,
    notes: 'Perfect Italiano or Paesanella. Pre-grated tubs or grate a block. Sold in 80g-250g packs.'
  },
  red_wine_cooking: {
    id: 'red_wine_cooking',
    display_name: 'Red wine (cooking)',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 750,
    notes: 'Cabernet sauvignon or merlot — any cleanskin works. Some wines use animal-derived fining agents that aren\'t vegan; check label if relevant.'
  },
  ricotta_full_fat: {
    id: 'ricotta_full_fat',
    display_name: 'Ricotta (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Paesanella or Perfect Italiano. Sold in 250g-500g tubs in the refrigerated cheese section.'
  },
  spaghetti_dry: {
    id: 'spaghetti_dry',
    display_name: 'Spaghetti (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'San Remo or Barilla. Standard dry pasta. Dry-to-cooked yield is approximately 1:2.5 by weight.'
  },
  sugar_white: {
    id: 'sugar_white',
    display_name: 'White sugar',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'CSR or supermarket house-brand. 1 tsp is approximately 4g.'
  },
  thyme_dried: {
    id: 'thyme_dried',
    display_name: 'Dried thyme',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 20,
    typical_pack_unit: 'g'
  },
  tomato_paste: {
    id: 'tomato_paste',
    display_name: 'Tomato paste',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 140,
    notes: 'Leggo\'s or Mutti. Sold in 140g tubes, jars, or small tins. Concentrated tomato — distinct from tomato sauce or passata.'
  },
  tortilla_large: {
    id: 'tortilla_large',
    display_name: 'Large flour tortilla (burrito size)',
    category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 8,
    typical_pack_unit: 'count',
    notes: 'Burrito-size flour wraps, ~200 kcal each. Wholemeal adds fibre.'
  },
  beef_chuck: {
    id: 'beef_chuck',
    display_name: 'Beef chuck',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Also sold as casserole steak, chuck steak, or gravy beef. A tough cut that becomes meltingly tender with long slow cooking. Cheaper than premium beef cuts. Sold at the Coles or Woolworths butcher counter, typically in 500g-2kg pieces.'
  },
  beef_stock_liquid: {
    id: 'beef_stock_liquid',
    display_name: 'Beef stock (liquid)',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Pre-made liquid stock. Campbell\'s Real Stock or Massel. Check label for gluten content. Alternative: dissolve a beef stock cube in equivalent water.'
  },
  cinnamon_stick: {
    id: 'cinnamon_stick',
    display_name: 'Cinnamon stick',
    category: 'pantry_grains',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 6,
    notes: 'Whole bark stick, used to infuse flavour during long cooking. Remove before serving. Distinct from ground cinnamon. Sold in 6-stick jars in the spice section.'
  },
  fish_sauce: {
    id: 'fish_sauce',
    display_name: 'Fish sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 300,
    notes: 'Squid brand is the standard at Coles/Woolworths Asian aisle. Megachef is premium. Salty and pungent, but adds umami depth — not \'fishy\' flavour in the finished dish.'
  },
  massaman_curry_paste: {
    id: 'massaman_curry_paste',
    display_name: 'Massaman curry paste',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free'],
    allergens: ['Fish', 'Shellfish', 'Nuts'],
    typical_pack_size: 114,
    notes: 'Maesri (114g cans) or Valcom/Ayam (185g jars), sold at Coles or Woolworths Asian aisle. Most brands contain shrimp paste (declared as Shellfish) and may contain peanuts (declared as Nuts) — always check the specific brand\'s label. Gluten status varies by brand.'
  },
  peanuts_roasted_unsalted: {
    id: 'peanuts_roasted_unsalted',
    display_name: 'Roasted peanuts (unsalted)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
    allergens: ['Nuts'],
    typical_pack_size: 375,
    notes: 'Coles or Woolworths house-brand, or Mayver\'s dry roasted. Crush or chop for use as a garnish. Salted variety works fine if unsalted unavailable.'
  },
  potato_waxy: {
    id: 'potato_waxy',
    display_name: 'Waxy potato (Desiree or Dutch Cream)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Holds shape during slow cooking. Desiree or Dutch Cream are the standard Australian waxy varieties. Do not substitute with Sebago, brushed, or starchy baking potatoes — they disintegrate. Sold loose by the kilo or in 1.5kg bags.'
  },
  star_anise: {
    id: 'star_anise',
    display_name: 'Star anise',
    category: 'pantry_grains',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 30,
    typical_pack_unit: 'g',
    notes: 'Whole star-shaped pods, distinctive aniseed flavour. Used to infuse flavour during long cooking. Remove before serving. Sold in jars in the spice section.'
  },
  sugar_brown_palm_substitute: {
    id: 'sugar_brown_palm_substitute',
    display_name: 'Brown sugar (palm sugar substitute)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'CSR brown sugar substitutes 1:1 for palm sugar in Thai recipes when authentic palm sugar is unavailable. Palm sugar gives a slightly more caramel-like note but the difference is subtle. 1 tbsp is approximately 15g.'
  },
  tamarind_paste: {
    id: 'tamarind_paste',
    display_name: 'Tamarind paste',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Sour-fruity concentrate. Essential for authentic massaman and pad thai. Sold at Coles or Woolworths Asian aisle in jars, typically 200g.'
  },
  black_beans_canned: {
    id: 'black_beans_canned',
    display_name: 'Canned black beans',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 420,
    notes: 'Coles or Old El Paso brand. Drain and rinse before using. Sold in 400g-420g tins; drained weight is approximately 250g per tin.'
  },
  capsicum_red: {
    id: 'capsicum_red',
    display_name: 'Red capsicum',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'One large capsicum is approximately 150g. Green works as a substitute but red is sweeter. Sold loose by the kilo or individually.'
  },
  cayenne_pepper: {
    id: 'cayenne_pepper',
    display_name: 'Cayenne pepper',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: 'Masterfoods or supermarket brand. Hot — start with less and adjust to taste. Distinct from chilli powder.'
  },
  corn_chips: {
    id: 'corn_chips',
    display_name: 'Corn chips',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: [],
    typical_pack_size: 240,
    notes: 'Old El Paso, Doritos, or supermarket brand. Plain salted varieties are typically gluten-free, dairy-free, and vegan; flavoured varieties may not be — check label. Sold in 240g-500g packs.'
  },
  cottage_cheese: {
    id: 'cottage_cheese',
    display_name: 'Cottage cheese (full-fat)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 500,
    notes: 'Full-fat (4%) cottage cheese for richer texture and calories. ~98 kcal and ~11g protein per 100g. Blend until smooth if you dislike the curd texture.'
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
    notes: 'Full-fat (Philadelphia-style). ~342 kcal per 100g. Soften before spreading.'
  },
  jalapenos_pickled: {
    id: 'jalapenos_pickled',
    display_name: 'Pickled jalapeños (sliced)',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 220,
    notes: 'Old El Paso or supermarket house brand. Sold sliced in jars. Drained weight is approximately 140g per 220g jar.'
  },
  kidney_beans_canned: {
    id: 'kidney_beans_canned',
    display_name: 'Canned red kidney beans',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 420,
    notes: 'SPC, Edgell, or Coles brand. Drain and rinse before using. Sold in 400g-420g tins; drained weight is approximately 250g per tin.'
  },
  paprika_smoked: {
    id: 'paprika_smoked',
    display_name: 'Smoked paprika',
    category: 'pantry_grains',
    canonical_unit: 'tsp',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    typical_pack_unit: 'g',
    notes: 'Masterfoods or Herbie\'s. Adds smoky depth to chilli con carne, paprikash, and BBQ rubs. Distinct from sweet paprika (which is already in the database) — smoked paprika comes from a different processing method and has a noticeably smoky flavour.'
  },
  water: {
    id: 'water',
    display_name: 'Water',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Tap water. Included as an ingredient because the user needs to know required quantities for cooking, even though water contributes no macros. Always scales with the recipe.'
  },
  chicken_stock_liquid: {
    id: 'chicken_stock_liquid',
    display_name: 'Chicken stock (liquid, low sodium)',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Pre-made liquid stock. Campbell\'s Real Stock or Massel. Lower sodium versions give more control over final seasoning. Check label for gluten content if relevant. Distinct from chicken stock cubes — this is the ready-to-pour carton variety.'
  },
  lamb_shank: {
    id: 'lamb_shank',
    display_name: 'Lamb shank (bone-in)',
    category: 'meat_seafood',
    canonical_unit: 'count',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 4,
    notes: 'Standard shank is approximately 400g raw (60% meat-to-bone ratio, so ~240g edible meat per shank). Ask the butcher for French-trimmed if you want the bone exposed nicely. Some butchers offer larger 450-500g shanks. Sold individually at Coles or Woolworths butcher counter, or in 4-packs.'
  },
  parsley_flat_leaf: {
    id: 'parsley_flat_leaf',
    display_name: 'Fresh flat-leaf parsley',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Italian/continental parsley, not curly. Sold by the bunch (~30g per bunch) in produce. Used as a fresh herb garnish — substitute curly parsley if needed, but flat-leaf has better flavour.'
  },
  thyme_fresh: {
    id: 'thyme_fresh',
    display_name: 'Fresh thyme',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    notes: 'Sold by the small bunch in the produce section, or growable in a pot at home. Quantity measured in sprigs. Substitute with 2 tsp dried thyme if unavailable (already in database).'
  },

  mushroom_brown: {
    id: 'mushroom_brown',
    display_name: 'Brown/Swiss mushrooms',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'Brown or Swiss mushrooms have more depth of flavour than white button mushrooms — they hold up better in long braises. White button works as a substitute if needed. Sold in 200g-500g punnets at Coles or Woolworths produce.'
  },

  potato_baby_chat: {
    id: 'potato_baby_chat',
    display_name: 'Baby chat potatoes',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Small whole waxy potatoes (Coles baby chats or Dutch creams). Keep skins on — they hold shape better in stew and add fibre. Halved for cooking. Distinct from baking potatoes (Sebago/russet, starchy) and from larger waxy potatoes (Desiree, cubed) — baby chats are the small whole-potato format. Sold in 750g-1kg bags.'
  },

  sourdough_crusty: {
    id: 'sourdough_crusty',
    display_name: 'Crusty sourdough or baguette',
    category: 'bakery',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Coles bakery sourdough or Bakers Delight Vienna/baguette. Most plain crusty breads are vegan and dairy-free; check label for butter-enriched varieties. Sold as full loaves, typically 450g-700g.'
  },

  instant_pudding_mix: {
    id: 'instant_pudding_mix',
    display_name: 'Instant pudding mix',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: [],
    typical_pack_size: 100,
    notes: 'Instant vanilla pudding mix. The thickener that stops protein ice cream turning icy without a machine. About 1 tablespoon = 12g.'
  },

  vanilla_extract: {
    id: 'vanilla_extract',
    display_name: 'Vanilla extract',
    category: 'condiments_supplements',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free'],
    allergens: [],
    typical_pack_size: 100,
    notes: 'Pure vanilla extract for baking and desserts.'
  },

  chocolate_chips: {
    id: 'chocolate_chips',
    display_name: 'Chocolate chips',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 250,
    typical_pack_unit: 'g',
    notes: 'Dark or milk chocolate chips. ~5 kcal per gram. Dark chips are dairy-free; milk chips contain dairy.'
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
    notes: 'Finely ground oats — make your own by blending rolled oats. ~380 kcal per 100g. Gluten-free if certified.'
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
    notes: 'Dried beef jerky. ~280-410 kcal and ~33g protein per 100g depending on brand. Choose lower-sodium where possible. Marinades often contain soy/gluten — check the label.'
  },

  edamame: {
    id: 'edamame',
    display_name: 'Edamame (in pods)',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Soy'],
    typical_pack_size: 500,
    typical_pack_unit: 'g',
    notes: 'Frozen young soybeans in the pod. ~120 kcal and ~11g protein per 100g of pods (edible beans only). Steam or microwave from frozen.'
  },

  protein_bar: {
    id: 'protein_bar',
    display_name: 'Protein bar (store-bought)',
    category: 'condiments_supplements',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian'],
    allergens: ['Dairy'],
    typical_pack_size: 1,
    notes: 'A store-bought protein bar. Roughly 200-250 kcal and 15-20g protein each; varies a lot by brand. Most contain dairy and may contain nuts/soy — check the label.'
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
    notes: 'Block cheddar/tasty, string cheese, or individual portions like Babybel. ~400 kcal and ~25g protein per 100g.'
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
    notes: 'Canned or pouch tuna in springwater. ~110 kcal and ~25g protein per 95g drained pouch. Flavoured pouches (e.g. lemon pepper) are ready to eat straight away.'
  },

  chickpeas: {
    id: 'chickpeas',
    display_name: 'Chickpeas (canned)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    typical_pack_unit: 'g',
    notes: 'Canned chickpeas, drained. ~140 kcal and ~8g protein per 100g drained. Dry well before roasting for crunch.'
  },

  mixed_nuts: {
    id: 'mixed_nuts',
    display_name: 'Mixed nuts',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free'],
    allergens: ['Nuts'],
    typical_pack_size: 400,
    typical_pack_unit: 'g',
    notes: 'A mix of almonds, cashews, walnuts and similar (roasted, unsalted or lightly salted). ~600 kcal and ~20g protein per 100g. Calorie-dense — a small handful is a serving.'
  },

  dried_fruit: {
    id: 'dried_fruit',
    display_name: 'Dried fruit mix',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    typical_pack_unit: 'g',
    notes: 'Mixed dried fruit like raisins, cranberries, apricots. ~300 kcal per 100g. Naturally sweet and chewy for trail mix or snacking.'
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
    notes: '70%+ dark chocolate. ~550 kcal per 100g. A couple of squares (~30g) is a serving. May contain traces of milk/soy — check the label; very dark varieties can be dairy-free.'
  },

  chicken_breast: {
    id: 'chicken_breast',
    display_name: 'Chicken breast',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Skinless chicken breast. ~165 kcal and ~31g protein per 100g cooked.'
  },

  jasmine_rice: {
    id: 'jasmine_rice',
    display_name: 'Jasmine rice (uncooked)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Long-grain jasmine rice. ~360 kcal per 100g uncooked. 2 cups uncooked ≈ 370g.'
  },

  soy_sauce: {
    id: 'soy_sauce',
    display_name: 'Soy sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: ['Soy', 'Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Light/all-purpose soy sauce. Contains soy and (usually) wheat — use tamari for gluten-free.'
  },

  rice_vinegar: {
    id: 'rice_vinegar',
    display_name: 'Rice vinegar',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Mild rice wine vinegar.'
  },

  cornstarch: {
    id: 'cornstarch',
    display_name: 'Cornstarch',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    notes: 'Cornflour/cornstarch, for thickening the glaze. 1 tbsp ≈ 8g.'
  },

  sesame_oil: {
    id: 'sesame_oil',
    display_name: 'Sesame oil (toasted)',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free'],
    allergens: ['Sesame'],
    typical_pack_size: 250,
    notes: 'Toasted sesame oil, used as a finishing/flavour oil.'
  },

  broccoli: {
    id: 'broccoli',
    display_name: 'Broccoli florets',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: '~34 kcal per 100g. Fresh or frozen florets.'
  },

  sesame_seeds: {
    id: 'sesame_seeds',
    display_name: 'Sesame seeds',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free'],
    allergens: ['Sesame'],
    typical_pack_size: 100,
    notes: 'White sesame seeds, for garnish. 1 tbsp ≈ 9g.'
  },

  oyster_sauce: {
    id: 'oyster_sauce',
    display_name: 'Oyster sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: [],
    allergens: ['Shellfish', 'Soy', 'Gluten/Wheat'],
    typical_pack_size: 250,
    notes: 'Thick savoury Chinese sauce. Contains shellfish, soy, and usually wheat.'
  },

  chinese_cooking_wine: {
    id: 'chinese_cooking_wine',
    display_name: 'Chinese cooking wine (Shaoxing)',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 640,
    notes: 'Shaoxing rice wine. Dry sherry or mirin work as substitutes.'
  },

  chicken_mince: {
    id: 'chicken_mince',
    display_name: 'Chicken mince (ground chicken)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Ground chicken. ~143 kcal and ~17g protein per 100g raw. Finely chopped chicken thigh or breast works too.'
  },

  basil_fresh: {
    id: 'basil_fresh',
    display_name: 'Fresh basil',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 30,
    notes: 'Plain fresh basil. Holy basil (bai krapow) or Thai sweet basil is authentic but not reliably available to Western shoppers — regular basil works well. 1 cup loosely packed leaves ≈ 25g.'
  },

  red_chilli: {
    id: 'red_chilli',
    display_name: 'Red chilli (fresh)',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    notes: 'Bird\'s eye chilli if available (hot); red jalapeno or a pinch of dried chilli flakes otherwise. Amount adjustable for heat.'
  },

  pear: {
    id: 'pear',
    display_name: 'Pear (or apple)',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1,
    notes: 'Optional marinade tenderiser, grated. Korean/Asian pear is traditional but not reliably available to Western shoppers — a regular pear or apple works, or omit entirely for thinly sliced beef.'
  },

  spaghetti: {
    id: 'spaghetti',
    display_name: 'Spaghetti',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Dry spaghetti. ~360 kcal per 100g uncooked. ~125g per person for a generous bulking portion.'
  },

  parmesan: {
    id: 'parmesan',
    display_name: 'Parmesan cheese (grated)',
    category: 'dairy_refrigerated',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'gluten_free', 'nut_free'],
    allergens: ['Dairy'],
    typical_pack_size: 200,
    notes: 'Grated parmesan/parmigiano. Pecorino Romano is the authentic choice (note as upgrade). ~430 kcal and ~38g protein per 100g.'
  },

  salmon_fillet: {
    id: 'salmon_fillet',
    display_name: 'Salmon fillet',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: ['Fish'],
    typical_pack_size: 500,
    notes: 'Skin-on or skinless salmon fillet. ~200 kcal and ~20g protein per 100g raw; naturally fatty (calorie-dense). NOTE: smoked_salmon already exists for breakfast — this is fresh raw fillet, a distinct ingredient.'
  },

  lemon: {
    id: 'lemon',
    display_name: 'Lemon',
    category: 'produce',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1,
    notes: 'Juice for the butter sauce + wedges to finish. 1 lemon ≈ 3 tbsp juice.'
  },

  parsley: {
    id: 'parsley',
    display_name: 'Parsley (fresh)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 30,
    notes: 'Fresh flat-leaf parsley, chopped; dried works (use ~1/3 the amount). Dill is a common alternative.'
  },

  black_beans: {
    id: 'black_beans',
    display_name: 'Black beans (canned)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Canned black beans, drained. ~130 kcal and ~8g protein per 100g drained.'
  },

  chilli_powder: {
    id: 'chilli_powder',
    display_name: 'Chilli powder',
    category: 'condiments_supplements',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    notes: 'Mild chili powder blend (or pure chilli to taste). Part of the fajita spice mix. Use your existing dry-spice category.'
  },

  coriander_fresh: {
    id: 'coriander_fresh',
    display_name: 'Coriander / cilantro (fresh)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 30,
    notes: 'Fresh coriander/cilantro, chopped; for the lime rice and sauce.'
  },

  chipotle_in_adobo: {
    id: 'chipotle_in_adobo',
    display_name: 'Chipotle in adobo (optional upgrade)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 200,
    notes: 'The AUTHENTIC smoky-heat source, chopped into both the marinade and the yoghurt sauce. NOT reliably available in all AU/UK supermarkets, so it is the OPTIONAL UPGRADE — the accessible default heat comes from smoked paprika + chilli powder + cayenne. Include as an ingredient line with scaling that allows 0.'
  },

  chicken_thigh: {
    id: 'chicken_thigh',
    display_name: 'Chicken thigh (skinless)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Skinless boneless chicken thigh. ~177 kcal and ~18.6g protein per 100g raw; juicier and more authentic for shawarma than breast. Breast is the leaner swap (~120 kcal, 22.5g protein, 2.6g fat /100g).'
  },

  coconut_milk: {
    id: 'coconut_milk',
    display_name: 'Coconut milk (canned, full-fat)',
    category: 'pantry_grains',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Full-fat canned coconut milk. ~197 kcal and ~21g fat per 100ml — fat-dense, count carefully.'
  },

  curry_powder: {
    id: 'curry_powder',
    display_name: 'Curry powder',
    category: 'condiments_supplements',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50,
    notes: 'KEY ingredient — this is what makes it taste like Aussie-Chinese-restaurant satay rather than Thai-skewer satay. Do not omit.'
  },

  macaroni: {
    id: 'macaroni',
    display_name: 'Macaroni / short pasta (dry)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Elbow macaroni or any short pasta. ~371 kcal per 100g dry. High-protein pasta is an optional swap.'
  },

  turkey_mince: {
    id: 'turkey_mince',
    display_name: 'Turkey mince',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Lean ground turkey, typically 93/7 lean. Higher protein, lower fat than beef mince. Can substitute chicken mince if unavailable.'
  },

  breadcrumbs: {
    id: 'breadcrumbs',
    display_name: 'Breadcrumbs (panko or fine)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 150,
    notes: 'Used for binding meatballs and coating. Panko (Japanese) creates lighter texture than fine breadcrumbs.'
  },

  dried_oregano: {
    id: 'dried_oregano',
    display_name: 'Oregano, dried',
    category: 'condiments_supplements',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 15,
    notes: 'Essential for Italian flavoring. Mediterranean oregano preferred over Mexican oregano for this application.'
  },

  dried_basil: {
    id: 'dried_basil',
    display_name: 'Basil, dried',
    category: 'condiments_supplements',
    canonical_unit: 'tsp',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 15,
    notes: 'Complements oregano in Italian cooking. Fresh basil can substitute at 3:1 ratio but add at the end to preserve flavor.'
  },

  peas: {
    id: 'peas',
    display_name: 'Peas (frozen)',
    category: 'frozen',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'Frozen peas. ~81 kcal per 100g.'
  },

  sweetcorn: {
    id: 'sweetcorn',
    display_name: 'Sweetcorn (canned or frozen)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 400,
    notes: 'Canned (drained) or frozen sweetcorn. ~86 kcal per 100g.'
  },

  lamb_mince: {
    id: 'lamb_mince',
    display_name: 'Lamb mince (lean; or regular)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 500,
    notes: 'DEFAULT lean lamb mince (~85/15) ~200 kcal, 19.5g protein, 13.5g fat /100g raw. Regular lamb mince (~80/20, ~282 kcal, 23g fat /100g) is juicier but much fattier. A bit of fat keeps koftas juicy; beef or a lamb-beef mix is a milder/cheaper swap.'
  },

  sausage: {
    id: 'sausage',
    display_name: 'Sausages (chicken/turkey default; or pork)',
    category: 'meat_seafood',
    canonical_unit: 'g',
    dietary_flags: ['dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'DEFAULT leaner chicken/turkey sausage (~172 kcal, 17g protein, 10g fat /100g cooked) for a better protein-per-cal bulking tray. Pork sausage (~300 kcal, 13g protein, 26g fat /100g) is the richer/fattier option — pushes fat much higher. Most sausages contain wheat rusk (gluten) — check the label; gluten-free sausages exist.'
  },

  noodles: {
    id: 'noodles',
    display_name: 'Noodles (egg / soba / udon / rice)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 400,
    notes: 'Generic dried noodles — egg, soba, udon, or rice noodles all work (~350 kcal per 100g dry). Rice noodles are the gluten-free option (drop the Gluten/Wheat allergen if rice noodles are used). 70g dry per serve.'
  },

  orange_juice: {
    id: 'orange_juice',
    display_name: 'Orange juice',
    category: 'produce',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1000,
    notes: 'Part of the citrus marinade base (with lime). ~45 kcal per 100ml.'
  },

  bread_roll: {
    id: 'bread_roll',
    display_name: 'Bread roll / bun',
    category: 'bakery',
    canonical_unit: 'count',
    dietary_flags: ['vegetarian', 'dairy_free', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 6,
    notes: 'Soft bread roll/bun for the schnitzel roll. ~270 kcal per 100g; a roll ~70g.'
  },

  sweet_chilli_sauce: {
    id: 'sweet_chilli_sauce',
    display_name: 'Sweet chilli sauce',
    category: 'condiments_supplements',
    canonical_unit: 'ml',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    notes: 'For the schnitzel roll. ~230 kcal per 100g (sugar-forward).'
  },

  lettuce: {
    id: 'lettuce',
    display_name: 'Lettuce',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'vegan', 'dairy_free', 'gluten_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 1,
    notes: 'Fresh lettuce leaves. ~15 kcal per 100g.'
  },

  gnocchi: {
    id: 'gnocchi',
    display_name: 'Gnocchi (store-bought)',
    category: 'pantry_grains',
    canonical_unit: 'g',
    dietary_flags: ['vegetarian', 'nut_free'],
    allergens: ['Gluten/Wheat'],
    typical_pack_size: 500,
    notes: 'Store-bought vacuum-packed potato gnocchi; cook to packet (boil till they float, ~2-3 min). ~160 kcal per 100g. Homemade works if you have time.'
  },
  
  thai_basil_fresh: {
    id: 'thai_basil_fresh',
    display_name: 'Thai basil (fresh)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 30,
    notes: 'Holy/Thai basil — the signature note. Regular basil is a fallback.'
  },
  
  red_chilli_fresh: {
    id: 'red_chilli_fresh',
    display_name: 'Red chilli (fresh)',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 50
  },
  
  green_beans: {
    id: 'green_beans',
    display_name: 'Green beans',
    category: 'produce',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 250,
    notes: 'Fresh green beans for stir-fries. ~35 kcal per 100g.'
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
    notes: 'IMPORTANT for cevapi: gives the signature springy-tender texture. Small amount; do not skip for authentic texture.'
  },
  ajvar: {
    id: 'ajvar',
    display_name: 'Ajvar (red pepper relish)',
    category: 'condiments_supplements',
    canonical_unit: 'g',
    dietary_flags: ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free'],
    allergens: [],
    typical_pack_size: 300,
    notes: 'Shop-bought ajvar, or substitute a roasted-red-pepper relish/paste. ~90 kcal/100g.'
  }
};