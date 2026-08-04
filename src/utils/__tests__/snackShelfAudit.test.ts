// src/utils/__tests__/snackShelfAudit.test.ts
//
// Diagnostic, not a gate. Lists every curated meal that declares a snack slot
// in its own eligible_slots, which is what puts it on the Snacks shelf and —
// more importantly — makes it schedulable as a snack by the plan generator.
//
// SHELF_SLOTS in curatedShelves.ts is correct (snacks maps to snack slots only,
// dessert is its own shelf), so anything odd on that shelf is odd in the meal
// data rather than in the mapping.
//
// Run:  npx jest src/utils/__tests__/snackShelfAudit.test.ts

import { CURATED_MEALS } from '../../data/curated_meals';
import { SHELF_SLOTS } from '../curatedShelves';

const MEALS = CURATED_MEALS as any;
const SNACK_SLOTS = new Set(SHELF_SLOTS.snacks as string[]);
const DESSERT_SLOTS = new Set(SHELF_SLOTS.dessert as string[]);

describe('snacks shelf audit', () => {
  it('lists everything eligible for a snack slot', () => {
    const rows: string[] = [];
    const alsoDessert: string[] = [];
    const bigOnes: string[] = [];

    Object.keys(MEALS).forEach((slug) => {
      const meal = MEALS[slug];
      const slots: string[] = meal?.eligible_slots ?? [];
      if (!slots.some((s) => SNACK_SLOTS.has(s))) return;

      // Cheapest plate, as a rough size signal — a "snack" that can't go below
      // a few hundred kcal is doing a main meal's job.
      const kcals = (meal.plates ?? []).map((p: any) => p?.macros?.kcal ?? 0).filter(Boolean);
      const minKcal = kcals.length ? Math.min(...kcals) : 0;

      const isDessertToo = slots.some((s) => DESSERT_SLOTS.has(s));
      const line = `${meal.display_name} [${slug}] — ${minKcal} kcal — slots: ${slots.join(', ')}`;
      rows.push(line);
      if (isDessertToo) alsoDessert.push(line);
      if (minKcal >= 300) bigOnes.push(line);
    });

    rows.sort();
    console.log(`\n=== ON THE SNACKS SHELF (${rows.length}) ===\n` + rows.join('\n'));

    console.log(
      `\n=== ALSO ELIGIBLE FOR DESSERT (${alsoDessert.length}) ===\n` +
        (alsoDessert.length
          ? alsoDessert.join('\n') +
            '\n\nThese appear on BOTH tabs and can be scheduled into either slot.'
          : 'none')
    );

    console.log(
      `\n=== 300+ kcal AT THEIR SMALLEST (${bigOnes.length}) ===\n` +
        (bigOnes.length
          ? bigOnes.join('\n') +
            '\n\nA snack is capped at 25% of the day by the review prompt, so these' +
            '\nonly fit on high-calorie days and will crowd out real meals.'
          : 'none')
    );

    expect(true).toBe(true);
  });
});