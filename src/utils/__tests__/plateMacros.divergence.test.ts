import * as fs from 'fs';
import * as path from 'path';
import { CURATED_MEALS } from '../../data/curated_meals';
import { computePlateMacros } from '../computeMacros';
import { isTemplateMeal, resolveMealIngredients } from '../resolveMealIngredients';
import { BaseMacros } from '../../types/curated_meals';

// Phase 2 deliverable: compute every plate's TRUE macros from ingredients and
// compare to its hand-authored plate_macros literal. This test DOES NOT assert
// closeness — divergence is the finding. It asserts the maths is well-formed and
// emits the divergence table to fable-handoff/phase2_divergence.md.

type Row = {
  slug: string;
  plate: string;
  method: string;
  a: BaseMacros;      // authored
  c: BaseMacros;      // computed
};

const KEYS: (keyof BaseMacros)[] = ['kcal', 'protein_g', 'carbs_g', 'fat_g'];

function buildRows(): Row[] {
  const rows: Row[] = [];
  for (const slug of Object.keys(CURATED_MEALS)) {
    const meal = CURATED_MEALS[slug];
    for (const plate of meal.plates) {
      for (const method of meal.methods) {
        rows.push({
          slug,
          plate: plate.id,
          method: method.id,
          a: plate.plate_macros,
          c: computePlateMacros(meal, plate, method),
        });
      }
    }
  }
  return rows;
}

const pct = (a: number, c: number): string =>
  a === 0 ? (c === 0 ? '0%' : 'n/a') : `${(((c - a) / a) * 100 >= 0 ? '+' : '')}${(((c - a) / a) * 100).toFixed(0)}%`;
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

function writeReport(rows: Row[]): void {
  const sorted = [...rows].sort(
    (x, y) => Math.abs(y.c.kcal - y.a.kcal) - Math.abs(x.c.kcal - x.a.kcal),
  );
  const L: string[] = [];
  L.push('# Phase 2 — plate macro divergence (computed vs authored)');
  L.push('');
  L.push('Computed by `computePlateMacros()` (convert-to-grams-first, per-100g model,');
  L.push('`is_pantry_negligible` rows excluded from totals). **No `plate_macros` value was');
  L.push('changed** — this table is the deliverable, the divergence is the finding.');
  L.push('');
  L.push('- Formula: `base share (Σ method.ingredients × base_serving_multiplier / produces_servings) + Σ plate.additional_ingredients`');
  L.push('- One row per (meal, plate, method). Sorted by absolute kcal delta, descending.');
  L.push(`- ${rows.length} rows across ${new Set(rows.map(r => r.slug)).size} meals.`);
  L.push('');
  L.push('| # | meal | plate | method | kcal auth→comp (Δ%) | P auth→comp (Δ%) | C auth→comp (Δ%) | F auth→comp (Δ%) |');
  L.push('|---|---|---|---|---|---|---|---|');
  sorted.forEach((row, i) => {
    const cell = (k: keyof BaseMacros, rd: (n: number) => number) =>
      `${rd(row.a[k])}→${rd(row.c[k])} (${pct(row.a[k], row.c[k])})`;
    L.push(
      `| ${i + 1} | ${row.slug} | ${row.plate} | ${row.method} | ` +
        `${cell('kcal', r0)} | ${cell('protein_g', r1)} | ${cell('carbs_g', r1)} | ${cell('fat_g', r1)} |`,
    );
  });
  L.push('');
  const out = path.join(process.cwd(), 'fable-handoff', 'phase2_divergence.md');
  fs.mkdirSync(path.dirname(out), { recursive: true }); // dir is untracked; don't depend on it existing
  fs.writeFileSync(out, L.join('\n'), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[phase2] wrote ${sorted.length}-row divergence table -> ${out}`);
}

describe('Phase 2 — plate macro divergence', () => {
  const rows = buildRows();

  it('computes well-formed macros for every plate of every meal', () => {
    for (const r of rows) {
      for (const k of KEYS) {
        expect(Number.isFinite(r.c[k])).toBe(true);
        expect(r.c[k]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // FINDING: computePlateMacros models no cooking process, so a meal's computed
  // macros can only move by method if its methods were authored with different
  // ingredient LISTS or AMOUNTS. Three meals do: beef_ragu_gnocchi (different
  // id-sets: mince vs scratch) and bolognese + massaman (same ids, different
  // amounts). This guardrail pins that set so new drift is caught.
  //
  // butter_chicken USED to be in this set (its 3 legacy methods carried different
  // ingredient lists). It is now a SAUCE-AXIS TEMPLATE MEAL: its methods carry
  // ingredients: [], the recipe lives on base_ingredients + sauce_variants, and
  // computePlateMacros resolves the base via resolveBaseIngredients — so method
  // choice moves nothing (the jar↔scratch variant toggle is what moves macros).
  // It therefore drops out of the divergent set. See the template block below.
  it('method is macro-invariant except for the three meals with method-specific ingredients', () => {
    // Group computed kcal by (slug, plate) across methods; a meal is "method-divergent"
    // if any plate's computed kcal moves by method.
    const byMeal: Record<string, number[][]> = {};
    for (const slug of Object.keys(CURATED_MEALS)) {
      const meal = CURATED_MEALS[slug];
      byMeal[slug] = meal.plates.map(plate =>
        meal.methods.map(method => computePlateMacros(meal, plate, method).kcal),
      );
    }
    const divergent = Object.entries(byMeal)
      .filter(([, plateKcals]) =>
        plateKcals.some(ks => Math.max(...ks) - Math.min(...ks) > 0.5),
      )
      .map(([slug]) => slug)
      .sort();
    expect(divergent).toEqual(['beef_ragu_gnocchi', 'bolognese', 'massaman']);
  });

  it('emits the divergence report', () => {
    writeReport(rows);
    expect(fs.existsSync(path.join(process.cwd(), 'fable-handoff', 'phase2_divergence.md'))).toBe(true);
  });
});

// Template routing: butter_chicken is the first sauce-axis meal. Its plate_macros
// are FROZEN to the computed jar default, so computed==authored (aligned), and
// computePlateMacros must reach its ingredients via resolveBaseIngredients — NOT
// method.ingredients, which are now []. These assertions pin that behaviour.
describe('sauce-axis template routing (butter_chicken)', () => {
  const meal = CURATED_MEALS['butter_chicken'];
  const stovetop = meal.methods.find(m => m.id === 'stovetop')!;
  const slow = meal.methods.find(m => m.id === 'slow_cooker')!;
  const curry = meal.plates.find(p => p.id === 'butter_chicken')!;
  const standard = meal.plates.find(p => p.id === 'standard')!;
  const at = (m: BaseMacros) => ({
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    fiber_g: Math.round(m.fiber_g * 10) / 10,
  });

  it('is a template meal with empty method ingredient/instruction lists', () => {
    expect(isTemplateMeal(meal)).toBe(true);
    for (const m of meal.methods) {
      expect(m.ingredients).toEqual([]);
      expect(m.instructions).toEqual([]);
    }
  });

  it('computes the FROZEN jar plate_macros through the resolver (== authored)', () => {
    expect(at(computePlateMacros(meal, curry, stovetop))).toEqual(curry.plate_macros);
    expect(at(computePlateMacros(meal, standard, stovetop))).toEqual(standard.plate_macros);
    // and the authored literals are exactly the frozen contract:
    expect(curry.plate_macros).toEqual({ kcal: 633, protein_g: 42.7, carbs_g: 19.1, fat_g: 43.6, fiber_g: 2.1 });
    expect(standard.plate_macros).toEqual({ kcal: 852, protein_g: 47.0, carbs_g: 67.1, fat_g: 44.0, fiber_g: 2.9 });
  });

  it('is method-invariant (stovetop == slow_cooker) for the jar default', () => {
    expect(computePlateMacros(meal, curry, stovetop)).toEqual(computePlateMacros(meal, curry, slow));
    expect(computePlateMacros(meal, standard, stovetop)).toEqual(computePlateMacros(meal, standard, slow));
  });

  it('scratch toggle moves macros (different from jar)', () => {
    expect(at(computePlateMacros(meal, curry, stovetop, 'scratch'))).toEqual({ kcal: 769, protein_g: 49.6, carbs_g: 24.8, fat_g: 53.1, fiber_g: 4.4 });
    expect(at(computePlateMacros(meal, standard, stovetop, 'scratch'))).toEqual({ kcal: 988, protein_g: 53.9, carbs_g: 72.8, fat_g: 53.5, fiber_g: 5.2 });
  });

  it('curry plate resolves rice-free; the 60g rice comes from the standard plate', () => {
    const curryIds = resolveMealIngredients(meal, { plateId: 'butter_chicken' }).ingredients.map(i => i.ingredient_id);
    expect(curryIds).not.toContain('basmati_rice_dry');
    const stdRice = resolveMealIngredients(meal, { plateId: 'standard' }).ingredients.filter(i => i.ingredient_id === 'basmati_rice_dry');
    expect(stdRice).toHaveLength(1);
    expect(stdRice[0].base_amount).toBe(60);
  });
});
