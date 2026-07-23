import * as fs from 'fs';
import * as path from 'path';
import { CURATED_MEALS } from '../../data/curated_meals';
import { computePlateMacros } from '../computeMacros';
import { isTemplateMeal, resolveMealIngredients } from '../resolveMealIngredients';
import { BaseMacros, CuratedMeal } from '../../types/curated_meals';

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
  // ingredient LISTS or AMOUNTS. As of Batch 2, NO meal does (and Batches 3-4 add twelve more template meals) — the whole
  // catalogue is method-invariant. butter_chicken (Task 1); bolognese, massaman,
  // chilli_con_carne, pulled_pork (Batch 1); turkey_meatballs_spaghetti,
  // beef_stew, lamb_shanks, beef_ragu_gnocchi (Batch 2) all moved onto the
  // sauce-axis template: methods carry ingredients: [], the recipe lives on
  // base_ingredients + sauce_variants, and the variant toggle is what moves
  // macros. beef_ragu_gnocchi's two legacy "methods" were really two recipes;
  // it is now a single-method meal whose variants are mince + jar (default) and
  // the original chuck slow-braise. This guardrail pins the EMPTY set so any
  // new drift is caught.
  it('method is macro-invariant for every meal in the catalogue', () => {
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
    expect(divergent).toEqual([]);
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

// Batch 1: bolognese, massaman, chilli_con_carne and pulled_pork joined the
// sauce axis. Each meal's plate_macros are FROZEN to its computed shortcut
// default (jar / paste / sachet / bottled) — computed == authored on BOTH
// methods, and the variant toggle is what moves macros. The literal maps below
// pin the frozen contract; regenerate them only when a deliberate recipe change
// lands, never to silence a drift.
describe('sauce-axis template routing (batch 1)', () => {
  const MEALS = CURATED_MEALS as Record<string, CuratedMeal>;
  const at = (m: BaseMacros) => ({
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    fiber_g: Math.round(m.fiber_g * 10) / 10,
  });

  // Frozen shortcut-default contract, per (meal, plate).
  const FROZEN: Record<string, Record<string, BaseMacros>> = {
    bolognese: {
      bolognese: { kcal: 378, protein_g: 23.4, carbs_g: 11.9, fat_g: 25.6, fiber_g: 1.5 },
      spaghetti_dry: { kcal: 879, protein_g: 44.1, carbs_g: 87.4, fat_g: 37.8, fiber_g: 4.7 },
      baked_potato: { kcal: 872, protein_g: 38.6, carbs_g: 74.9, fat_g: 46.7, fiber_g: 9.2 },
      garlic_bread: { kcal: 862, protein_g: 38.2, carbs_g: 60.5, fat_g: 50.9, fiber_g: 4.5 },
      lasagne: { kcal: 1041, protein_g: 59.0, carbs_g: 67.7, fat_g: 58.2, fiber_g: 3.6 },
    },
    massaman: {
      massaman: { kcal: 836, protein_g: 43.7, carbs_g: 31.8, fat_g: 60.0, fiber_g: 3.4 },
      rice: { kcal: 1322, protein_g: 55.7, carbs_g: 117.0, fat_g: 70.7, fiber_g: 6.6 },
    },
    chilli_con_carne: {
      chilli_con_carne: { kcal: 505, protein_g: 31.3, carbs_g: 38.1, fat_g: 26.4, fiber_g: 10.0 },
      bowl: { kcal: 1127, protein_g: 47.3, carbs_g: 115.6, fat_g: 54.5, fiber_g: 16.7 },
      nachos: { kcal: 1231, protein_g: 49.3, carbs_g: 100.2, fat_g: 73.2, fiber_g: 18.7 },
    },
    pulled_pork: {
      pulled_pork: { kcal: 772, protein_g: 47.9, carbs_g: 29.5, fat_g: 50.0, fiber_g: 0.5 },
      sandwich: { kcal: 1307, protein_g: 63.7, carbs_g: 73.9, fat_g: 82.4, fiber_g: 3.6 },
      bowl: { kcal: 1405, protein_g: 63.8, carbs_g: 118.0, fat_g: 73.1, fiber_g: 3.3 },
      baked_potato: { kcal: 1269, protein_g: 63.3, carbs_g: 93.3, fat_g: 71.1, fiber_g: 8.5 },
      tacos: { kcal: 1343, protein_g: 65.2, carbs_g: 86.7, fat_g: 81.4, fiber_g: 11.2 },
      mac_cheese: { kcal: 2054, protein_g: 107.1, carbs_g: 128.5, fat_g: 120.9, fiber_g: 3.8 },
    },
  };

  // The non-default variant, asserted on each meal's base plate.
  const ALT: Record<string, { variant: string; plate: string; macros: BaseMacros }> = {
    bolognese: { variant: 'scratch', plate: 'bolognese', macros: { kcal: 533, protein_g: 28.1, carbs_g: 25.2, fat_g: 34.2, fiber_g: 5.4 } },
    massaman: { variant: 'aromatic', plate: 'massaman', macros: { kcal: 879, protein_g: 43.9, carbs_g: 34.1, fat_g: 63.8, fiber_g: 3.6 } },
    chilli_con_carne: { variant: 'scratch', plate: 'chilli_con_carne', macros: { kcal: 548, protein_g: 32.0, carbs_g: 40.1, fat_g: 30.2, fiber_g: 10.5 } },
    pulled_pork: { variant: 'scratch', plate: 'pulled_pork', macros: { kcal: 767, protein_g: 48.1, carbs_g: 30.7, fat_g: 49.9, fiber_g: 0.3 } },
  };

  const SLUGS = Object.keys(FROZEN);

  it.each(SLUGS)('%s is a template meal with empty method ingredient/instruction lists', slug => {
    const meal = MEALS[slug];
    expect(isTemplateMeal(meal)).toBe(true);
    for (const m of meal.methods) {
      expect(m.ingredients).toEqual([]);
      expect(m.instructions).toEqual([]);
    }
  });

  it.each(SLUGS)('%s: authored plate_macros == FROZEN == at(computed) on every plate and method', slug => {
    const meal = MEALS[slug];
    expect(meal.plates.map(p => p.id).sort()).toEqual(Object.keys(FROZEN[slug]).sort());
    for (const plate of meal.plates) {
      expect(plate.plate_macros).toEqual(FROZEN[slug][plate.id]);
      for (const method of meal.methods) {
        expect(at(computePlateMacros(meal, plate, method))).toEqual(FROZEN[slug][plate.id]);
      }
    }
  });

  it.each(SLUGS)('%s: the variant toggle moves macros away from the default', slug => {
    const meal = MEALS[slug];
    const { variant, plate: plateId, macros } = ALT[slug];
    const plate = meal.plates.find(p => p.id === plateId)!;
    const alt = at(computePlateMacros(meal, plate, meal.methods[0], variant));
    expect(alt).toEqual(macros);
    expect(alt).not.toEqual(FROZEN[slug][plateId]);
  });
});

// Batch 2: beef_ragu_gnocchi, turkey_meatballs_spaghetti, beef_stew and
// lamb_shanks joined the sauce axis. beef_ragu_gnocchi collapsed its two legacy
// recipe-methods into ONE stovetop method whose variants carry the axis (mince +
// jar default, chuck slow-braise scratch). plate_macros are FROZEN to each
// computed shortcut default; the maps below pin the contract — regenerate only
// for a deliberate recipe change, never to silence a drift.
describe('sauce-axis template routing (batch 2)', () => {
  const MEALS = CURATED_MEALS as Record<string, CuratedMeal>;
  const at = (m: BaseMacros) => ({
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    fiber_g: Math.round(m.fiber_g * 10) / 10,
  });

  const FROZEN2: Record<string, Record<string, BaseMacros>> = {
    beef_ragu_gnocchi: {
      standard: { kcal: 1006, protein_g: 50.4, carbs_g: 93.6, fat_g: 45.5, fiber_g: 7.6 },
    },
    turkey_meatballs_spaghetti: {
      standard: { kcal: 732, protein_g: 48.9, carbs_g: 87.8, fat_g: 19.8, fiber_g: 5.4 },
    },
    beef_stew: {
      beef_stew: { kcal: 630, protein_g: 42.0, carbs_g: 36.2, fat_g: 35.9, fiber_g: 5.1 },
      mash: { kcal: 1233, protein_g: 50.3, carbs_g: 91.8, fat_g: 75.5, fiber_g: 11.8 },
      bread: { kcal: 920, protein_g: 50.7, carbs_g: 77.9, fat_g: 45.5, fiber_g: 7.0 },
    },
    lamb_shanks: {
      lamb_shanks: { kcal: 580, protein_g: 49.0, carbs_g: 25.0, fat_g: 33.2, fiber_g: 5.7 },
      mash: { kcal: 1183, protein_g: 57.4, carbs_g: 80.7, fat_g: 72.8, fiber_g: 12.4 },
    },
  };

  const ALT2: Record<string, { variant: string; plate: string; macros: BaseMacros }> = {
    beef_ragu_gnocchi: { variant: 'braise', plate: 'standard', macros: { kcal: 1002, protein_g: 54.0, carbs_g: 91.1, fat_g: 44.9, fiber_g: 9.8 } },
    turkey_meatballs_spaghetti: { variant: 'scratch', plate: 'standard', macros: { kcal: 793, protein_g: 50.2, carbs_g: 90.5, fat_g: 26.6, fiber_g: 7.9 } },
    beef_stew: { variant: 'scratch', plate: 'beef_stew', macros: { kcal: 756, protein_g: 43.7, carbs_g: 34.8, fat_g: 43.4, fiber_g: 4.8 } },
    lamb_shanks: { variant: 'scratch', plate: 'lamb_shanks', macros: { kcal: 816, protein_g: 50.4, carbs_g: 29.4, fat_g: 44.6, fiber_g: 6.3 } },
  };

  const SLUGS2 = Object.keys(FROZEN2);

  it.each(SLUGS2)('%s is a template meal with empty method ingredient/instruction lists', slug => {
    const meal = MEALS[slug];
    expect(isTemplateMeal(meal)).toBe(true);
    for (const m of meal.methods) {
      expect(m.ingredients).toEqual([]);
      expect(m.instructions).toEqual([]);
    }
  });

  it.each(SLUGS2)('%s: authored plate_macros == FROZEN == at(computed) on every plate and method', slug => {
    const meal = MEALS[slug];
    expect(meal.plates.map(p => p.id).sort()).toEqual(Object.keys(FROZEN2[slug]).sort());
    for (const plate of meal.plates) {
      expect(plate.plate_macros).toEqual(FROZEN2[slug][plate.id]);
      for (const method of meal.methods) {
        expect(at(computePlateMacros(meal, plate, method))).toEqual(FROZEN2[slug][plate.id]);
      }
    }
  });

  it.each(SLUGS2)('%s: the variant toggle moves macros away from the default', slug => {
    const meal = MEALS[slug];
    const { variant, plate: plateId, macros } = ALT2[slug];
    const plate = meal.plates.find(p => p.id === plateId)!;
    const alt = at(computePlateMacros(meal, plate, meal.methods[0], variant));
    expect(alt).toEqual(macros);
    expect(alt).not.toEqual(FROZEN2[slug][plateId]);
  });

  it('beef_ragu_gnocchi is single-method: the axis lives on the variant, not the method', () => {
    expect(MEALS['beef_ragu_gnocchi'].methods).toHaveLength(1);
    expect(MEALS['beef_ragu_gnocchi'].methods[0].id).toBe('stovetop');
  });
});

// Batch 3: the seven bottled-Asian-sauce meals joined the axis. All were
// already single-method; the whisked scratch sauce collapsed into a bottled
// default (teriyaki, oyster-style stir-fry sauce x2, satay jar, bulgogi
// marinade, honey-soy-garlic marinade x2). plate_macros FROZEN to computed
// shortcut defaults; regenerate only for a deliberate recipe change.
describe('sauce-axis template routing (batch 3)', () => {
  const MEALS = CURATED_MEALS as Record<string, CuratedMeal>;
  const at = (m: BaseMacros) => ({
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    fiber_g: Math.round(m.fiber_g * 10) / 10,
  });

  const FROZEN3: Record<string, Record<string, BaseMacros>> = {
    teriyaki_chicken_rice_bowl: {
      standard: { kcal: 792, protein_g: 58.9, carbs_g: 100.3, fat_g: 15.8, fiber_g: 5.4 },
    },
    beef_broccoli_stir_fry: {
      standard: { kcal: 777, protein_g: 55.7, carbs_g: 96.3, fat_g: 18.6, fiber_g: 4.7 },
    },
    satay_chicken: {
      standard: { kcal: 879, protein_g: 51.3, carbs_g: 86.8, fat_g: 35.5, fiber_g: 4.3 },
    },
    beef_bulgogi_bowl: {
      standard: { kcal: 743, protein_g: 52.7, carbs_g: 95.9, fat_g: 15.7, fiber_g: 1.9 },
    },
    honey_chicken: {
      standard: { kcal: 765, protein_g: 52.2, carbs_g: 101.5, fat_g: 14.0, fiber_g: 1.8 },
    },
    thai_basil_chicken: {
      standard: { kcal: 752, protein_g: 43.7, carbs_g: 88.2, fat_g: 24.2, fiber_g: 3.0 },
      fried_egg: { kcal: 854, protein_g: 50.0, carbs_g: 88.5, fat_g: 32.5, fiber_g: 3.0 },
    },
    honey_soy_salmon_noodles: {
      standard: { kcal: 800, protein_g: 51.8, carbs_g: 73.0, fat_g: 32.9, fiber_g: 5.1 },
    },
  };

  const ALT3: Record<string, { variant: string; plate: string; macros: BaseMacros }> = {
    teriyaki_chicken_rice_bowl: { variant: 'scratch', plate: 'standard', macros: { kcal: 855, protein_g: 59.2, carbs_g: 115.8, fat_g: 17.0, fiber_g: 5.7 } },
    beef_broccoli_stir_fry: { variant: 'scratch', plate: 'standard', macros: { kcal: 782, protein_g: 56.7, carbs_g: 92.9, fat_g: 19.7, fiber_g: 4.8 } },
    satay_chicken: { variant: 'scratch', plate: 'standard', macros: { kcal: 834, protein_g: 50.2, carbs_g: 76.9, fat_g: 37.9, fiber_g: 3.0 } },
    beef_bulgogi_bowl: { variant: 'scratch', plate: 'standard', macros: { kcal: 740, protein_g: 53.4, carbs_g: 87.6, fat_g: 19.1, fiber_g: 2.8 } },
    honey_chicken: { variant: 'scratch', plate: 'standard', macros: { kcal: 792, protein_g: 53.4, carbs_g: 104.0, fat_g: 16.4, fiber_g: 1.9 } },
    thai_basil_chicken: { variant: 'scratch', plate: 'standard', macros: { kcal: 732, protein_g: 44.3, carbs_g: 83.5, fat_g: 24.2, fiber_g: 3.0 } },
    honey_soy_salmon_noodles: { variant: 'scratch', plate: 'standard', macros: { kcal: 832, protein_g: 53.3, carbs_g: 76.1, fat_g: 35.3, fiber_g: 5.3 } },
  };

  const SLUGS3 = Object.keys(FROZEN3);

  it.each(SLUGS3)('%s is a template meal with empty method ingredient/instruction lists', slug => {
    const meal = MEALS[slug];
    expect(isTemplateMeal(meal)).toBe(true);
    for (const m of meal.methods) {
      expect(m.ingredients).toEqual([]);
      expect(m.instructions).toEqual([]);
    }
  });

  it.each(SLUGS3)('%s: authored plate_macros == FROZEN == at(computed) on every plate and method', slug => {
    const meal = MEALS[slug];
    expect(meal.plates.map(p => p.id).sort()).toEqual(Object.keys(FROZEN3[slug]).sort());
    for (const plate of meal.plates) {
      expect(plate.plate_macros).toEqual(FROZEN3[slug][plate.id]);
      for (const method of meal.methods) {
        expect(at(computePlateMacros(meal, plate, method))).toEqual(FROZEN3[slug][plate.id]);
      }
    }
  });

  it.each(SLUGS3)('%s: the variant toggle moves macros away from the default', slug => {
    const meal = MEALS[slug];
    const { variant, plate: plateId, macros } = ALT3[slug];
    const plate = meal.plates.find(p => p.id === plateId)!;
    const alt = at(computePlateMacros(meal, plate, meal.methods[0], variant));
    expect(alt).toEqual(macros);
    expect(alt).not.toEqual(FROZEN3[slug][plateId]);
  });
});

// Batch 4: the five seasoning-sachet meals close the sauce-axis campaign. The
// axis here is the SPICE CLUSTER — measured spice lines (salt included)
// collapse into a generic seasoning sachet/blend (taco/fajita mix for the
// Mexican bowls; a shawarma-style blend shared by shawarma and kofta). Fresh
// aromatics that define a dish stay in base. plate_macros FROZEN to computed
// sachet defaults; regenerate only for a deliberate recipe change.
describe('sauce-axis template routing (batch 4)', () => {
  const MEALS = CURATED_MEALS as Record<string, CuratedMeal>;
  const at = (m: BaseMacros) => ({
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    fiber_g: Math.round(m.fiber_g * 10) / 10,
  });

  const FROZEN4: Record<string, Record<string, BaseMacros>> = {
    chicken_fajita_bowl: {
      standard: { kcal: 807, protein_g: 59.0, carbs_g: 99.7, fat_g: 17.5, fiber_g: 11.4 },
    },
    spicy_chipotle_chicken_burrito: {
      standard: { kcal: 985, protein_g: 60.4, carbs_g: 112.8, fat_g: 32.3, fiber_g: 11.5 },
      extra_hot: { kcal: 998, protein_g: 60.7, carbs_g: 115.1, fat_g: 32.7, fiber_g: 12.4 },
      burrito_bowl: { kcal: 786, protein_g: 55.1, carbs_g: 80.7, fat_g: 27.4, fiber_g: 9.3 },
    },
    carne_asada_bowl: {
      standard: { kcal: 829, protein_g: 63.0, carbs_g: 95.2, fat_g: 22.1, fiber_g: 10.0 },
    },
    chicken_shawarma: {
      wrap: { kcal: 739, protein_g: 53.4, carbs_g: 62.3, fat_g: 31.3, fiber_g: 6.8 },
      rice_bowl: { kcal: 806, protein_g: 52.5, carbs_g: 94.1, fat_g: 24.7, fiber_g: 4.7 },
    },
    lamb_kofta: {
      rice_bowl: { kcal: 869, protein_g: 53.8, carbs_g: 89.1, fat_g: 32.7, fiber_g: 4.9 },
      wrap: { kcal: 857, protein_g: 55.8, carbs_g: 69.3, fat_g: 39.4, fiber_g: 7.1 },
    },
  };

  const ALT4: Record<string, { variant: string; plate: string; macros: BaseMacros }> = {
    chicken_fajita_bowl: { variant: 'scratch', plate: 'standard', macros: { kcal: 770, protein_g: 58.1, carbs_g: 92.9, fat_g: 16.9, fiber_g: 9.8 } },
    spicy_chipotle_chicken_burrito: { variant: 'scratch', plate: 'standard', macros: { kcal: 943, protein_g: 59.4, carbs_g: 105.0, fat_g: 31.7, fiber_g: 9.9 } },
    carne_asada_bowl: { variant: 'scratch', plate: 'standard', macros: { kcal: 825, protein_g: 62.8, carbs_g: 95.4, fat_g: 21.9, fiber_g: 9.3 } },
    chicken_shawarma: { variant: 'scratch', plate: 'wrap', macros: { kcal: 718, protein_g: 52.7, carbs_g: 59.5, fat_g: 30.6, fiber_g: 5.2 } },
    lamb_kofta: { variant: 'scratch', plate: 'rice_bowl', macros: { kcal: 852, protein_g: 53.2, carbs_g: 86.8, fat_g: 32.1, fiber_g: 3.6 } },
  };

  const SLUGS4 = Object.keys(FROZEN4);

  it.each(SLUGS4)('%s is a template meal with empty method ingredient/instruction lists', slug => {
    const meal = MEALS[slug];
    expect(isTemplateMeal(meal)).toBe(true);
    for (const m of meal.methods) {
      expect(m.ingredients).toEqual([]);
      expect(m.instructions).toEqual([]);
    }
  });

  it.each(SLUGS4)('%s: authored plate_macros == FROZEN == at(computed) on every plate and method', slug => {
    const meal = MEALS[slug];
    expect(meal.plates.map(p => p.id).sort()).toEqual(Object.keys(FROZEN4[slug]).sort());
    for (const plate of meal.plates) {
      expect(plate.plate_macros).toEqual(FROZEN4[slug][plate.id]);
      for (const method of meal.methods) {
        expect(at(computePlateMacros(meal, plate, method))).toEqual(FROZEN4[slug][plate.id]);
      }
    }
  });

  it.each(SLUGS4)('%s: the variant toggle moves macros away from the default', slug => {
    const meal = MEALS[slug];
    const { variant, plate: plateId, macros } = ALT4[slug];
    const plate = meal.plates.find(p => p.id === plateId)!;
    const alt = at(computePlateMacros(meal, plate, meal.methods[0], variant));
    expect(alt).toEqual(macros);
    expect(alt).not.toEqual(FROZEN4[slug][plateId]);
  });
});

// Batch 5: catalogue-wide macro sync. Every remaining legacy meal's authored
// plate_macros was frozen to its computed value (28 plates had drifted by
// 25-160 kcal — palacinke was the worst). This guard pins the WHOLE catalogue:
// authored == at(computed) on every plate of every meal, so no authored number
// can ever drift from the ingredient maths again. Regenerate literals only for
// a deliberate recipe change, never to silence a failure here.
describe('catalogue-wide macro integrity (batch 5)', () => {
  const MEALS = CURATED_MEALS as Record<string, CuratedMeal>;
  const at = (m: BaseMacros) => ({
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g * 10) / 10,
    carbs_g: Math.round(m.carbs_g * 10) / 10,
    fat_g: Math.round(m.fat_g * 10) / 10,
    fiber_g: Math.round(m.fiber_g * 10) / 10,
  });

  it('every plate of every meal: authored plate_macros == at(computed)', () => {
    const mismatches: string[] = [];
    for (const slug of Object.keys(MEALS)) {
      const meal = MEALS[slug];
      for (const plate of meal.plates) {
        const computed = at(computePlateMacros(meal, plate, meal.methods[0]));
        if (JSON.stringify(computed) !== JSON.stringify(plate.plate_macros)) {
          mismatches.push(slug + '/' + plate.id + ': authored ' + JSON.stringify(plate.plate_macros) + ' != computed ' + JSON.stringify(computed));
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});