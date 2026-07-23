// Native grocery engine: computes the shopping list directly from the imported
// plan + the meal database + the user's per-meal MAKE IT choices — so the list
// always matches what will actually be cooked. Methods (stovetop vs slow
// cooker) never change ingredients (catalogue is method-invariant by test), so
// only the easy↔scratch choice moves the list.
import { CURATED_MEALS } from '../data/curated_meals';
import { INGREDIENTS } from '../data/ingredients';
import { resolveBaseIngredients } from './resolveMealIngredients';
import { SimplifiedMealPlan, GroceryItem, FoodCategory } from '../types/nutrition';
import { VariantChoices } from './variantChoices';

const MEALS = CURATED_MEALS as any;
const INGS = INGREDIENTS as any;

// Ingredient-DB categories -> shopping categories.
const CATEGORY_MAP: Record<string, FoodCategory> = {
  meat_seafood: 'protein',
  dairy_refrigerated: 'dairy',
  pantry_grains: 'grains',
  produce: 'vegetables',
  bakery: 'grains',
  condiments_supplements: 'pantry',
  frozen: 'frozen',
  other: 'other',
};

export interface CuratedPlanMeal {
  slug: string;
  name: string;
  serves: number;
  totalScale: number;   // sum of scheduled scale factors
  batches: number;      // whole batches to cook (1 for single-serve meals)
  hasAlt: boolean;
  defaultId: string;
  defaultLabel: string;
  altId: string | null;
  altLabel: string | null;
  altExtraTime: string | null; // "2h 5m" etc, '' when none
  chosenVariantId: string;     // resolves stored choice, falls back to default
}

export interface NativeGroceryBuild {
  items: GroceryItem[];
  curatedMeals: CuratedPlanMeal[];
}

const fmtTime = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

const roundAmount = (amount: number, unit: string): number => {
  const u = String(unit || '').toLowerCase();
  if (u === 'g' || u === 'ml') return Math.round(amount);
  return Math.round(amount * 100) / 100;
};

export function buildNativeGroceryList(
  plan: SimplifiedMealPlan | null | undefined,
  choices: VariantChoices
): NativeGroceryBuild {
  const meals = Object.values(plan?.dailyMeals ?? {}).flatMap((d: any) => d?.meals ?? []);

  // ── Collect curated occurrences by slug ──
  const bySlug: Record<string, { scales: number[]; plates: { plate_id: string; scale: number }[] }> = {};
  const invented: any[] = [];
  for (const m of meals) {
    const slug = (m as any).curated_meal_slug;
    if (slug && MEALS[slug]) {
      const scale = Number((m as any).scale_factor) > 0 ? Number((m as any).scale_factor) : 1;
      bySlug[slug] = bySlug[slug] || { scales: [], plates: [] };
      bySlug[slug].scales.push(scale);
      bySlug[slug].plates.push({ plate_id: (m as any).plate_id, scale });
    } else if (Array.isArray((m as any).ingredients) && (m as any).ingredients.length) {
      invented.push(m);
    }
  }

  const merged: Record<string, GroceryItem> = {};
  const add = (key: string, name: string, amount: number, unit: string, category: FoodCategory) => {
    const existing = merged[key];
    if (existing && existing.unit === unit) {
      existing.amount += amount;
    } else if (existing) {
      // unit clash on the same key — keep separate under a suffixed key
      const alt = `${key}__${unit}`;
      if (merged[alt]) merged[alt].amount += amount;
      else merged[alt] = { id: alt, name, category, amount, unit, estimatedCost: 0, isPurchased: false, isFromInventory: false };
      return;
    } else {
      merged[key] = { id: key, name, category, amount, unit, estimatedCost: 0, isPurchased: false, isFromInventory: false };
    }
  };

  const curatedMeals: CuratedPlanMeal[] = [];

  for (const slug of Object.keys(bySlug)) {
    const meal = MEALS[slug];
    const occ = bySlug[slug];
    const variants = meal.sauce_variants ?? [];
    const defaultVariant = variants.find((v: any) => v.is_default) ?? variants[0] ?? null;
    const altVariant = variants.find((v: any) => !v.is_default) ?? null;
    const stored = choices[slug];
    const chosen =
      stored && variants.some((v: any) => v.id === stored) ? stored : defaultVariant ? defaultVariant.id : '';

    const totalScale = occ.scales.reduce((s, x) => s + x, 0);
    const serves = meal.produces_servings || 1;
    const batches = serves > 1 ? Math.max(1, Math.ceil(totalScale / serves - 1e-9)) : totalScale;

    // Base recipe of the CHOSEN variant, whole-batch amounts × batches.
    const lines = resolveBaseIngredients(meal, {
      methodId: meal.methods[0].id,
      variantId: chosen || undefined,
    });
    for (const l of lines) {
      const row = INGS[l.ingredient_id];
      add(
        `ing_${l.ingredient_id}`,
        row?.display_name ?? l.ingredient_id,
        l.base_amount * batches,
        l.unit,
        CATEGORY_MAP[row?.category ?? 'other'] ?? 'other'
      );
    }

    // Per-plate extras are per serving: × that occurrence's scale.
    for (const p of occ.plates) {
      const plate = (meal.plates ?? []).find((x: any) => x.id === p.plate_id);
      for (const l of plate?.additional_ingredients ?? []) {
        const row = INGS[l.ingredient_id];
        add(
          `ing_${l.ingredient_id}`,
          row?.display_name ?? l.ingredient_id,
          l.base_amount * p.scale,
          l.unit,
          CATEGORY_MAP[row?.category ?? 'other'] ?? 'other'
        );
      }
    }

    const extra = altVariant ? (altVariant.extra_total_minutes ?? 0) || (altVariant.extra_active_minutes ?? 0) : 0;
    curatedMeals.push({
      slug,
      name: meal.display_name,
      serves,
      totalScale: Math.round(totalScale * 100) / 100,
      batches: serves > 1 ? batches : 1,
      hasAlt: !!(defaultVariant && altVariant),
      defaultId: defaultVariant ? defaultVariant.id : '',
      defaultLabel: defaultVariant ? defaultVariant.display_name : 'Default',
      altId: altVariant ? altVariant.id : null,
      altLabel: altVariant ? altVariant.display_name : null,
      altExtraTime: altVariant ? (extra ? fmtTime(extra) : '') : null,
      chosenVariantId: chosen,
    });
  }

  // ── Invented / manually-added meals: pass their inline ingredients through ──
  for (const m of invented) {
    for (const ing of (m as any).ingredients) {
      const name = ing.name || ing.item || 'Ingredient';
      const unit = ing.unit || '';
      const category: FoodCategory = (ing.category as FoodCategory) || 'other';
      add(`inv_${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name, Number(ing.amount) || 0, unit, category);
    }
  }

  const items = Object.values(merged)
    .map(i => ({ ...i, amount: roundAmount(i.amount, i.unit) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  curatedMeals.sort((a, b) => a.name.localeCompare(b.name));
  return { items, curatedMeals };
}