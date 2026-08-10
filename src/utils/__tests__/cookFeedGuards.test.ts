/**
 * cookFeedGuards.test.ts — CI guards for the two hand-maintained slug tables in
 * CookScreen, plus a static guard for the render crash fixed alongside them.
 *
 * WHY THIS FILE IS SHAPED LIKE THIS (read before extending it):
 *
 * Everything it guards is module-private in src/screens/CookScreen.tsx —
 * MEAL_VIDEOS, ADJUSTER_SLUGS and the intent predicates are all consts and
 * functions the screen never exports. So these assertions read the screen's
 * SOURCE TEXT rather than importing it. That is a deliberate trade, not an
 * oversight:
 *
 *   - It catches the exact failure these tables have (a slug that doesn't
 *     exist), at CI time, with zero production-code change.
 *   - It cannot catch a BEHAVIOURAL regression. See the note above the
 *     "no unguarded equipment_required" test for the one export that would
 *     upgrade that guard from static to real.
 *
 * The slug tables are literal lists, which is what makes text extraction
 * sound here. Every extractor below asserts it actually FOUND its block and
 * that the block is non-empty — a renamed const must fail this suite loudly,
 * never pass vacuously by matching nothing. That is the trap this style of
 * test exists to walk into.
 *
 * Style follows utils/__tests__/curatedShelves.check.ts: assert against the
 * REAL catalogue, and derive counts rather than hardcoding them (that file
 * carries a comment about a hardcoded chip count that drifted twice).
 */

/* CookScreen imports expo-av at module scope, and expo-av's ExponentAV native
 * module does not exist under jest ("Cannot find native module 'ExponentAV'" —
 * the same import failure that takes down awaitingImportCleanup.test.ts). This
 * mock is what makes the screen importable at all.
 *
 * FEED_AUDIO_MODE is built at module scope from InterruptionModeIOS.DuckOthers
 * and InterruptionModeAndroid.DuckOthers, so those enums must be real values
 * here or the import throws on a property of undefined. Nothing in this suite
 * touches playback or audio mode — those are device checks. */
jest.mock('expo-av', () => ({
  Audio: { setAudioModeAsync: jest.fn().mockResolvedValue(undefined) },
  InterruptionModeIOS: { MixWithOthers: 0, DoNotMix: 1, DuckOthers: 2 },
  InterruptionModeAndroid: { DoNotMix: 1, DuckOthers: 2 },
  ResizeMode: { CONTAIN: 'contain', COVER: 'cover', STRETCH: 'stretch' },
  Video: 'Video',
}));

/* assets/mealImages runs a __DEV__ registry self-check at module load using a
 * dynamic import(). Under jest that rejects immediately with
 * ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG (no --experimental-vm-modules),
 * and the module console.errors the rejection — 20 lines of stack on every
 * run of this suite, for a check that validated nothing. Mocked out rather
 * than tolerated: this suite never resolves an image. Nothing is lost, because
 * that self-check cannot execute in this environment either way. */
jest.mock('../../assets/mealImages', () => ({
  getMealImage: jest.fn(() => undefined),
  MEAL_IMAGES: {},
}));

import * as fs from 'fs';
import * as path from 'path';
import { CURATED_MEALS } from '../../data/curated_meals';
import { isNoCook } from '../../screens/CookScreen';

const COOK_SCREEN_PATH = path.join(__dirname, '../../screens/CookScreen.tsx');
const SOURCE = fs.readFileSync(COOK_SCREEN_PATH, 'utf8');

const CATALOGUE_SLUGS = new Set(Object.keys(CURATED_MEALS));

/** The rows the crash fed on: a default method that omits the optional
 *  equipment_required. Derived, so it tracks the data rather than a count
 *  frozen at the time this was written. */
const MEALS_OMITTING_EQUIPMENT = Object.values(CURATED_MEALS).filter(
  (m: any) => m.methods?.[0] && !Array.isArray(m.methods[0].equipment_required),
);

/** Strip block and line comments so commented-out table entries (MEAL_VIDEOS
 *  carries two "ready to upload" lines) are never mistaken for live ones. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Text between `startMarker` and the first `endMarker` after it. Throws
 *  rather than returning empty, so a rename fails loudly. */
function blockBetween(
  src: string,
  startMarker: string,
  endMarker: string,
  label: string,
): string {
  const start = src.indexOf(startMarker);
  if (start === -1) {
    throw new Error(
      `${label}: could not find '${startMarker}' in CookScreen.tsx. ` +
        `It was probably renamed or moved — update this test, do not delete it.`,
    );
  }
  const from = start + startMarker.length;
  const end = src.indexOf(endMarker, from);
  if (end === -1) {
    throw new Error(
      `${label}: found '${startMarker}' but no closing '${endMarker}'.`,
    );
  }
  return src.slice(from, end);
}

function mealVideoKeys(): string[] {
  const block = stripComments(
    blockBetween(SOURCE, 'const MEAL_VIDEOS', '\n};', 'MEAL_VIDEOS'),
  );
  // MEAL_VIDEOS entries became nested objects ({ video, poster }) with the
  // remote-manifest work, so a flat key regex also swallowed every entry's
  // FIELD names ('video', 'poster'). Entry keys are distinguished by INDENT:
  // they sit at the block's minimum indentation, fields sit deeper. Derived
  // from the block itself rather than hardcoding two spaces, so a reformat
  // moves the baseline instead of breaking the guard — and never by listing
  // field names to exclude, which would drift the first time one is added.
  const matches = [...block.matchAll(/^([ \t]*)([a-z0-9_]+)\s*:/gm)].map(
    (m) => ({ indent: m[1].length, key: m[2] }),
  );
  if (matches.length === 0) return [];
  const minIndent = Math.min(...matches.map((m) => m.indent));
  return matches.filter((m) => m.indent === minIndent).map((m) => m.key);
}

function adjusterSlugs(): string[] {
  const block = stripComments(
    blockBetween(SOURCE, 'const ADJUSTER_SLUGS', '\n]);', 'ADJUSTER_SLUGS'),
  );
  return [...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

describe('CookScreen slug tables', () => {
  it('the catalogue this suite checks against is the real one', () => {
    expect(CATALOGUE_SLUGS.size).toBeGreaterThan(50);
    expect(CATALOGUE_SLUGS.has('butter_chicken')).toBe(true);
  });

  describe('MEAL_VIDEOS', () => {
    it('is found in CookScreen.tsx and has at least one entry', () => {
      // Guards the extractor itself: if this ever reads zero keys, every
      // assertion below passes vacuously.
      expect(mealVideoKeys().length).toBeGreaterThan(0);
    });

    it('every key is a real CURATED_MEALS slug', () => {
      const unknown = mealVideoKeys().filter((k) => !CATALOGUE_SLUGS.has(k));
      // Named in the failure message so a typo points at itself.
      expect(unknown).toEqual([]);
    });

    it('has no duplicate keys', () => {
      const keys = mealVideoKeys();
      expect(keys.length).toBe(new Set(keys).size);
    });
  });

  describe('ADJUSTER_SLUGS', () => {
    it('is found in CookScreen.tsx and has at least one entry', () => {
      expect(adjusterSlugs().length).toBeGreaterThan(0);
    });

    it('every slug is a real CURATED_MEALS slug', () => {
      // A renamed slug here silently un-hides an adjuster card in the feed —
      // the MealSlug annotation on the Set cannot catch it, because MealSlug
      // ends in `| (string & {})` and so absorbs any string.
      const unknown = adjusterSlugs().filter((s) => !CATALOGUE_SLUGS.has(s));
      expect(unknown).toEqual([]);
    });

    it('still excludes the four meal-planning adjusters', () => {
      // These are macro dials from the ADJUSTERS table in utils/mealPlanPromptV2,
      // not browsable recipes. Deliberately spelled out: this is the ruling, and
      // dropping one should fail rather than silently shrink the exclusion.
      expect(adjusterSlugs().sort()).toEqual([
        'baked_potato',
        'berries',
        'steamed_mixed_veg',
        'steamed_rice',
      ]);
    });
  });
});

/**
 * STATIC guard for the crash fixed in isNoCook.
 *
 * The bug: `method.equipment_required.some(...)` threw
 * "Cannot read properties of undefined (reading 'some')" for the 17 catalogue
 * meals that omit the optional field, taking down every render whose category
 * contained one (All / Snacks / Dessert) — intentCounts runs the predicate over
 * the whole category on every render, not only when the No-cook chip is picked.
 * strictNullChecks is off, so the compiler never flagged it.
 *
 * This checks the SHAPE OF THE SOURCE, not the behaviour. It fails if anyone
 * reintroduces an unguarded dereference, which is the regression that actually
 * happened — but it would not catch a differently-shaped crash in the same
 * predicate.
 *
 * TO MAKE THIS A REAL BEHAVIOURAL GUARD, one line in CookScreen.tsx:
 *     export function isNoCook(meal: CuratedMeal): boolean {
 * (adding `export`, changing nothing else). This suite could then call the real
 * predicate over all 85 catalogue meals and assert it never throws. Same for
 * matchesCategory / activeMinutes / composedIngredientCount / fitsRemaining and
 * the MEALS array, which together would let it drive all 72 category × intent
 * combinations against the real code. Left un-exported here on instruction.
 */
describe('CookScreen optional-field dereferences', () => {
  /** Matches `.equipment_required.` and `.equipment_required[` — a member
   *  access or index straight off the optional field. `?.` and `?? []` do not
   *  match. */
  const UNGUARDED = /\.equipment_required\s*(\.|\[)/g;

  it('the pattern this guard relies on actually detects the original bug', () => {
    // Without this, a regex that silently stopped matching anything would make
    // the test below pass forever. Sample is the exact line that shipped.
    const shipped = 'return !method.equipment_required.some((e) => HEAT.includes(e));';
    const fixed = 'const equipment = method.equipment_required ?? [];';
    expect(shipped.match(new RegExp(UNGUARDED.source))).not.toBeNull();
    expect(fixed.match(new RegExp(UNGUARDED.source))).toBeNull();
  });

  it('equipment_required is never dereferenced unguarded', () => {
    const unguarded = [...stripComments(SOURCE).matchAll(UNGUARDED)].map(
      (m) => m[0],
    );
    expect(unguarded).toEqual([]);
  });

  /* Scoped to equipment_required on purpose. The same sweep over the other
   * optional fields (sauce_variants, base_ingredients, macros_override,
   * plate_finished_weight_g, meal_prep) false-positives: text matching cannot
   * see an `&&` guard, so it flags the legitimate
   *   {meal.sauce_variants && meal.sauce_variants.length > 1 ? … }
   * at CookScreen.tsx:1782. Those five were each checked by hand and are
   * guarded with `?.` or `&&`. A guard that cries wolf gets ignored, so this
   * one stays narrow — it exists for the field that actually crashed. */

  it('isNoCook normalises a missing equipment_required to an empty list', () => {
    const body = blockBetween(
      SOURCE,
      'function isNoCook',
      '\n}',
      'isNoCook',
    );
    expect(body).toContain('equipment_required ?? []');
  });

  it('the catalogue still contains meals that omit equipment_required', () => {
    // If this ever hits zero the data was backfilled, and the guard above is
    // protecting against a crash that can no longer happen. Not a failure —
    // a signal to re-read whether these guards still earn their keep.
    expect(MEALS_OMITTING_EQUIPMENT.length).toBeGreaterThan(0);
  });
});

/**
 * BEHAVIOURAL guard — calls the real exported predicate over the real
 * catalogue. This is the regression test for the render crash; isNoCook is
 * exported from CookScreen for this and nothing else.
 *
 * Runs over all 85 catalogue meals, a superset of the 81 the feed shows
 * (ADJUSTER_SLUGS removes four), so it stays honest if the exclusion changes.
 */
describe('isNoCook over the real catalogue', () => {
  const ALL_MEALS = Object.values(CURATED_MEALS);

  it('never throws, for any meal in the catalogue', () => {
    // The original crash. Every meal is named in the failure message so a
    // reintroduction points straight at the offending row rather than at the
    // first one that happens to blow up.
    const threw: string[] = [];
    for (const meal of ALL_MEALS as any[]) {
      try {
        isNoCook(meal);
      } catch (e: any) {
        threw.push(`${meal.slug}: ${e.message}`);
      }
    }
    expect(threw).toEqual([]);
  });

  it('returns a boolean for every meal', () => {
    // A predicate that returns undefined would satisfy "never throws" while
    // still breaking every caller that counts truthy results.
    const nonBoolean = (ALL_MEALS as any[])
      .filter((m) => typeof isNoCook(m) !== 'boolean')
      .map((m) => m.slug);
    expect(nonBoolean).toEqual([]);
  });

  it('the catalogue data would still crash the pre-fix implementation', () => {
    // Non-vacuity proof. If the data were ever backfilled, "never throws"
    // above would start passing for the wrong reason — it would no longer be
    // exercising the case that broke. This is the shipped pre-fix body.
    const preFix = (meal: any): boolean => {
      const method = meal.methods?.[0];
      if (!method) return true;
      return !method.equipment_required.some((e: string) =>
        ['stovetop', 'oven', 'slow_cooker', 'microwave'].includes(e),
      );
    };
    expect(() => (ALL_MEALS as any[]).forEach(preFix)).toThrow(
      /Cannot read propert/,
    );
  });

  it('treats a missing equipment_required as declaring no heat', () => {
    const misclassified = MEALS_OMITTING_EQUIPMENT.filter(
      (m: any) => isNoCook(m) !== true,
    ).map((m: any) => m.slug);
    expect(misclassified).toEqual([]);
  });

  it('still discriminates — some meals are no-cook and some are not', () => {
    // Guards against a degenerate implementation (`return true`) passing
    // everything above. Counts are derived, never hardcoded: curatedShelves'
    // check test carries a note about a hardcoded count that drifted twice.
    const noCook = (ALL_MEALS as any[]).filter(isNoCook);
    expect(noCook.length).toBeGreaterThan(0);
    expect(noCook.length).toBeLessThan(ALL_MEALS.length);
  });

  it('a meal whose default method needs a heat appliance is not no-cook', () => {
    const heated = (ALL_MEALS as any[]).find((m) =>
      (m.methods?.[0]?.equipment_required ?? []).some((e: string) =>
        ['stovetop', 'oven', 'slow_cooker', 'microwave'].includes(e),
      ),
    );
    expect(heated).toBeDefined();
    expect(isNoCook(heated)).toBe(false);
  });
});