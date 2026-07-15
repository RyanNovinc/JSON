import * as fs from 'fs';
import * as path from 'path';
import { CURATED_MEALS } from '../../data/curated_meals';
import { computePlateMacros } from '../computeMacros';
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
  // ingredient LISTS or AMOUNTS. Four meals do: butter_chicken + beef_ragu_gnocchi
  // (different id-sets: jar-sauce/mince vs scratch) and bolognese + massaman (same
  // ids, different amounts). This guardrail pins that set so new drift is caught.
  it('method is macro-invariant except for the four meals with method-specific ingredients', () => {
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
    expect(divergent).toEqual(['beef_ragu_gnocchi', 'bolognese', 'butter_chicken', 'massaman']);
  });

  it('emits the divergence report', () => {
    writeReport(rows);
    expect(fs.existsSync(path.join(process.cwd(), 'fable-handoff', 'phase2_divergence.md'))).toBe(true);
  });
});
