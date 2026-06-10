// ================================
// MEAL ADJUSTERS
// ================================
// The "dials" the feasibility engine and the meal-planning prompt use to close
// macro gaps that the user's curated picks can't cover on their own.
//
// Design contract (from the meal-feasibility design):
//  - An adjuster is a real curated snack, referenced by slug + plate. It is NOT
//    an invented food. The importer resolves the slug to the real meal (recipe,
//    photo, prep classification) with ZERO schema change — these emit as a
//    SimplifiedMeal { curated_meal_slug, plate_id, scale_factor }.
//  - Adjusters carry meal type 'snack' and are EXCLUDED from the questionnaire's
//    occurrence counts (mealsPerDay / snacksPerDay / dessert frequency). They are
//    extra closing items, not part of the planned structure.
//  - Hitting macros must be SELECTION + ARITHMETIC: pick a macro-labelled dial,
//    scale it within its bounds, add the numbers. No estimation.
//
// Macros below are sourced from src/data/curated_meals.ts (the 'standard' plate
// of each snack). They are duplicated here so the feasibility arithmetic and the
// prompt text are self-contained. KEEP IN SYNC with curated_meals.ts if those
// entries change — or swap the data block for a live read if curated_meals.ts
// exports a slug-keyed record.
//
// Note on fiber: none of these 9 snacks is a strong fiber dial (best is
// protein_bar at 5g, then banana/nuts at 3g). The engine should treat fiber as
// the weakest lever here and disclose honestly rather than promise to close a
// large fiber gap with adjusters alone.

export type MacroLever = 'protein' | 'carbs' | 'fat' | 'calories' | 'fiber';

export interface AdjusterMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Adjuster {
  /** curated_meal_slug — resolves to the real meal on import */
  slug: string;
  /** plate id within the curated meal; these snacks each have one: 'standard' */
  plateId: string;
  displayName: string;
  /** macros at scale_factor = 1.0 */
  perServing: AdjusterMacros;
  minScale: number;
  maxScale: number;
  /** contains_allergens from the curated entry */
  allergens: string[];
  /** which gaps this dial is suitable for closing (semantic intent) */
  levers: MacroLever[];
}

/** Adjusters always emit as snacks and never count toward planned occurrences. */
export const ADJUSTER_MEAL_TYPE = 'snack' as const;

export const ADJUSTERS: Adjuster[] = [
  {
    slug: 'protein_shake',
    plateId: 'standard',
    displayName: 'Protein Shake',
    perServing: { kcal: 250, protein_g: 35, carbs_g: 16, fat_g: 5, fiber_g: 0 },
    minScale: 0.5,
    maxScale: 2.0,
    allergens: ['Dairy'],
    levers: ['protein', 'calories', 'carbs'],
  },
  {
    slug: 'tuna_pouch',
    plateId: 'standard',
    displayName: 'Tuna Pouch',
    perServing: { kcal: 110, protein_g: 25, carbs_g: 0, fat_g: 1, fiber_g: 0 },
    minScale: 1.0,
    maxScale: 2.0,
    allergens: ['Fish'],
    levers: ['protein'],
  },
  {
    slug: 'greek_yogurt_snack',
    plateId: 'standard',
    displayName: 'Greek Yogurt',
    perServing: { kcal: 170, protein_g: 17, carbs_g: 9, fat_g: 6, fiber_g: 0 },
    minScale: 0.5,
    maxScale: 2.0,
    allergens: ['Dairy'],
    levers: ['protein'],
  },
  {
    slug: 'beef_jerky',
    plateId: 'standard',
    displayName: 'Beef Jerky',
    perServing: { kcal: 115, protein_g: 14, carbs_g: 5, fat_g: 3, fiber_g: 0 },
    minScale: 0.5,
    maxScale: 2.0,
    allergens: [],
    levers: ['protein'],
  },
  {
    slug: 'hard_boiled_eggs',
    plateId: 'standard',
    displayName: 'Hard-Boiled Eggs',
    perServing: { kcal: 140, protein_g: 12, carbs_g: 1, fat_g: 10, fiber_g: 0 },
    minScale: 0.5,
    maxScale: 2.0,
    allergens: ['Eggs'],
    levers: ['protein', 'fat'],
  },
  {
    slug: 'protein_bar',
    plateId: 'standard',
    displayName: 'Protein Bar',
    perServing: { kcal: 220, protein_g: 20, carbs_g: 22, fat_g: 7, fiber_g: 5 },
    minScale: 1.0,
    maxScale: 2.0,
    allergens: ['Dairy'],
    levers: ['protein', 'carbs', 'fiber', 'calories'],
  },
  {
    slug: 'cheese_snack',
    plateId: 'standard',
    displayName: 'Cheese',
    perServing: { kcal: 115, protein_g: 7, carbs_g: 1, fat_g: 9, fiber_g: 0 },
    minScale: 0.5,
    maxScale: 2.0,
    allergens: ['Dairy'],
    levers: ['fat', 'protein', 'calories'],
  },
  {
    slug: 'mixed_nuts',
    plateId: 'standard',
    displayName: 'Mixed Nuts',
    perServing: { kcal: 250, protein_g: 9, carbs_g: 9, fat_g: 22, fiber_g: 3 },
    minScale: 0.5,
    maxScale: 2.0,
    allergens: ['Nuts'],
    levers: ['calories', 'fat', 'fiber'],
  },
  {
    slug: 'banana_snack',
    plateId: 'standard',
    displayName: 'Banana',
    perServing: { kcal: 105, protein_g: 1, carbs_g: 27, fat_g: 0, fiber_g: 3 },
    minScale: 1.0,
    maxScale: 3.0,
    allergens: [],
    levers: ['carbs', 'fiber'],
  },
];

// ================================
// LOOKUPS & ARITHMETIC
// ================================

const MACRO_KEY: Record<Exclude<MacroLever, 'calories'>, keyof AdjusterMacros> = {
  protein: 'protein_g',
  carbs: 'carbs_g',
  fat: 'fat_g',
  fiber: 'fiber_g',
};

export function getAllAdjusters(): Adjuster[] {
  return [...ADJUSTERS];
}

export function getAdjuster(slug: string): Adjuster | undefined {
  return ADJUSTERS.find((a) => a.slug === slug);
}

/** Clamp a requested scale factor to the adjuster's allowed range. */
export function clampScale(adj: Adjuster, scaleFactor: number): number {
  return Math.max(adj.minScale, Math.min(adj.maxScale, scaleFactor));
}

/** Protein grams per kcal — used to rank "lean" protein dials. */
export function proteinPerKcal(adj: Adjuster): number {
  return adj.perServing.kcal > 0 ? adj.perServing.protein_g / adj.perServing.kcal : 0;
}

/**
 * Macros for an adjuster at a given scale factor. Scale is clamped to bounds.
 * kcal rounded to nearest 5, grams to nearest 1 — clean numbers the external
 * model can copy without re-deriving.
 */
export function scaleMacros(adj: Adjuster, scaleFactor: number): AdjusterMacros {
  const f = clampScale(adj, scaleFactor);
  return {
    kcal: Math.round((adj.perServing.kcal * f) / 5) * 5,
    protein_g: Math.round(adj.perServing.protein_g * f),
    carbs_g: Math.round(adj.perServing.carbs_g * f),
    fat_g: Math.round(adj.perServing.fat_g * f),
    fiber_g: Math.round(adj.perServing.fiber_g * f),
  };
}

// ================================
// LEVER QUERIES
// ================================

/** Drop any adjuster whose allergens intersect the user's exclusion list. */
export function filterByAllergens(list: Adjuster[], excludeAllergens: string[] = []): Adjuster[] {
  if (!excludeAllergens.length) return list;
  const ex = excludeAllergens.map((a) => a.toLowerCase().trim());
  return list.filter((a) => !a.allergens.some((al) => ex.includes(al.toLowerCase().trim())));
}

/**
 * Adjusters suitable for closing a given macro gap, allergen-filtered and sorted
 * most-effective-first (by grams of that macro per serving; by kcal for the
 * 'calories' lever). Use this when you just need to add a macro.
 */
export function adjustersForLever(
  lever: MacroLever,
  opts: { excludeAllergens?: string[] } = {},
): Adjuster[] {
  const candidates = filterByAllergens(
    ADJUSTERS.filter((a) => a.levers.includes(lever)),
    opts.excludeAllergens,
  );
  const score = (a: Adjuster) =>
    lever === 'calories' ? a.perServing.kcal : a.perServing[MACRO_KEY[lever]];
  return [...candidates].sort((x, y) => score(y) - score(x));
}

/**
 * Protein dials sorted by protein-per-kcal (leanest first: tuna, beef jerky,
 * greek yogurt…). Use this when protein is short but the calorie budget is tight
 * — adjustersForLever('protein') instead favours absolute protein and is the
 * right call when there's calorie headroom to fill (e.g. a bulk).
 */
export function leanProteinAdjusters(opts: { excludeAllergens?: string[] } = {}): Adjuster[] {
  const candidates = filterByAllergens(
    ADJUSTERS.filter((a) => a.levers.includes('protein')),
    opts.excludeAllergens,
  );
  return [...candidates].sort((x, y) => proteinPerKcal(y) - proteinPerKcal(x));
}

// ================================
// PLAN EMISSION
// ================================

export interface CuratedMealRef {
  curated_meal_slug: string;
  plate_id: string;
  scale_factor: number;
}

/**
 * Emit an adjuster as a curated reference for the meal plan / JSON output.
 * Pairs with ADJUSTER_MEAL_TYPE for the meal's `type`. Scale is clamped and
 * rounded to 2 dp (the importer accepts continuous scale_factor in 0.05 steps).
 */
export function adjusterToCuratedRef(slug: string, scaleFactor: number): CuratedMealRef | null {
  const a = getAdjuster(slug);
  if (!a) return null;
  return {
    curated_meal_slug: a.slug,
    plate_id: a.plateId,
    scale_factor: Number(clampScale(a, scaleFactor).toFixed(2)),
  };
}