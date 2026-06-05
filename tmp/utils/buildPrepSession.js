"use strict";
/**
 * buildPrepSession — projects a generated weekly meal plan into a deterministic
 * "Meal-Prep Session". Pure function, no AI, no I/O: it groups the plan's meals
 * by curated slug + plate, classifies each group by its `meal_prep` metadata
 * (plate-level overriding meal-level), and sorts the cook-ahead / prep-ahead
 * work longest-first.
 *
 * Meals with no curated linkage (invented / manual / legacy) can't be classified
 * from metadata, so they fall to the quiet "Make fresh" list by name. A plan with
 * ZERO curated linkage is flagged `isLegacyPlan` so the screen can show a
 * "regenerate to use prep" line instead of an empty cook-ahead.
 *
 * Servings note: `cookServings` (what we deep-link into the cook flow) is the
 * rounded SUM of per-eating scale factors across the group, NOT the occurrence
 * count — this is a bulking app, scale factors run >1, so occurrences would
 * undershoot. The builder stays UI-agnostic and does NOT clamp to the cook
 * flow's portion range; that clamp belongs at the deep-link boundary (the
 * RecipeDetail `servings` route param), because the bound is a UI constant, not
 * a property of the recipe. (min_scale/max_scale are NOT the right bound — they
 * cap a single serving's scale, a different unit from a portion count.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrepSession = buildPrepSession;
const curated_meals_1 = require("../data/curated_meals");
// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function sanitizeScale(n) {
    return typeof n === 'number' && isFinite(n) && n > 0 ? n : 1;
}
function numOr(n, fallback) {
    return typeof n === 'number' && isFinite(n) ? n : fallback;
}
/** Mirror RecipeDetailScreen: select by plate_id, else fall back to the first plate. */
function resolvePlate(meal, plateId) {
    if (typeof plateId === 'string') {
        const found = meal.plates.find((p) => p.id === plateId);
        if (found)
            return found;
    }
    return meal.plates[0];
}
function unionEquipment(groups) {
    const set = new Set();
    for (const g of groups) {
        const eq = g.method.equipment_required;
        if (Array.isArray(eq))
            for (const e of eq)
                set.add(e);
    }
    return Array.from(set).sort();
}
function toPrepGroup(key, acc) {
    const { meal, plate, method, strategy, mp, occurrences, scaleSum } = acc;
    const baseSteps = Array.isArray(method.instructions) ? method.instructions : [];
    const plateSteps = Array.isArray(plate.additional_instructions) ? plate.additional_instructions : [];
    let prepAheadSteps;
    let dayOfSteps;
    if (strategy === 'full') {
        // Cook everything ahead; nothing left for the day of.
        prepAheadSteps = [...baseSteps, ...plateSteps];
        dayOfSteps = [];
    }
    else {
        // 'partial' default boundary: base cooked ahead, plate assembled fresh.
        // (The *_step_ids overrides are inert until RecipeStep gains an id.)
        prepAheadSteps = baseSteps;
        dayOfSteps = plateSteps;
    }
    return {
        key,
        slug: meal.slug,
        plateId: plate.id,
        meal,
        plate,
        method,
        displayName: plate.display_name || meal.display_name,
        occurrences,
        cookServings: Math.max(1, Math.round(scaleSum)),
        strategy,
        prepNote: mp?.prep_note,
        reason: mp?.reason,
        storage: mp?.storage,
        sortMinutes: numOr(method.time_total_minutes, 0),
        activeMinutes: numOr(method.time_active_minutes, 0),
        prepAheadSteps,
        dayOfSteps,
    };
}
// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function buildPrepSession(plan, curated = curated_meals_1.CURATED_MEALS) {
    const empty = {
        cookAhead: [],
        prepAhead: [],
        makeFresh: [],
        totals: {
            mealCount: 0,
            dayCount: 0,
            activeMinutes: 0,
            curatedCount: 0,
            isLegacyPlan: true,
            equipment: [],
        },
    };
    const dailyMeals = plan?.dailyMeals;
    if (!dailyMeals || typeof dailyMeals !== 'object')
        return empty;
    const dayKeys = Object.keys(dailyMeals);
    const dayCount = dayKeys.length;
    const groups = new Map();
    const freshCurated = new Map(); // curated meals classified 'none'
    const freshUnlinked = new Map(); // no curated linkage, keyed by name
    let curatedCount = 0;
    for (const dateKey of dayKeys) {
        const dayMeals = dailyMeals[dateKey]?.meals;
        if (!Array.isArray(dayMeals))
            continue;
        for (const meal of dayMeals) {
            const slug = typeof meal?.curated_meal_slug === 'string' ? meal.curated_meal_slug : undefined;
            const curatedMeal = slug ? curated[slug] : undefined;
            const linked = !!slug &&
                !!curatedMeal &&
                Array.isArray(curatedMeal.plates) &&
                curatedMeal.plates.length > 0 &&
                Array.isArray(curatedMeal.methods) &&
                curatedMeal.methods.length > 0;
            if (!linked) {
                // Unlinked: invented / manual / legacy. Surface by name in Make Fresh.
                const name = (meal?.name || 'Untitled meal').trim() || 'Untitled meal';
                const k = `unlinked::${name.toLowerCase()}`;
                const existing = freshUnlinked.get(k);
                if (existing)
                    existing.occurrences += 1;
                else
                    freshUnlinked.set(k, { key: k, displayName: name, occurrences: 1, linked: false });
                continue;
            }
            // From here on curatedMeal is a valid, fully-populated CuratedMeal.
            const cm = curatedMeal;
            curatedCount += 1;
            const plate = resolvePlate(cm, meal.plate_id);
            const method = cm.methods[0];
            const mp = plate.meal_prep ?? cm.meal_prep; // plate overrides meal
            const strategy = mp?.strategy ?? 'none';
            const k = `${cm.slug}::${plate.id}`;
            if (strategy === 'none') {
                const existing = freshCurated.get(k);
                if (existing)
                    existing.occurrences += 1;
                else
                    freshCurated.set(k, {
                        key: k,
                        displayName: plate.display_name || cm.display_name,
                        occurrences: 1,
                        linked: true,
                        slug: cm.slug,
                        plateId: plate.id,
                        reason: mp?.reason,
                    });
                continue;
            }
            const acc = groups.get(k);
            if (acc) {
                acc.occurrences += 1;
                acc.scaleSum += sanitizeScale(meal.scale_factor);
            }
            else {
                groups.set(k, {
                    meal: cm,
                    plate,
                    method,
                    strategy,
                    mp,
                    occurrences: 1,
                    scaleSum: sanitizeScale(meal.scale_factor),
                });
            }
        }
    }
    const cookAhead = [];
    const prepAhead = [];
    for (const [key, acc] of groups) {
        const grp = toPrepGroup(key, acc);
        if (acc.strategy === 'full')
            cookAhead.push(grp);
        else
            prepAhead.push(grp); // 'partial'
    }
    const byLongestFirst = (a, b) => b.sortMinutes - a.sortMinutes || a.displayName.localeCompare(b.displayName);
    cookAhead.sort(byLongestFirst);
    prepAhead.sort(byLongestFirst);
    const makeFresh = [...freshCurated.values(), ...freshUnlinked.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
    const prepGroups = [...cookAhead, ...prepAhead];
    const mealCount = prepGroups.reduce((s, g) => s + g.occurrences, 0);
    const activeMinutes = prepGroups.reduce((s, g) => s + g.activeMinutes, 0);
    return {
        cookAhead,
        prepAhead,
        makeFresh,
        totals: {
            mealCount,
            dayCount,
            activeMinutes,
            curatedCount,
            isLegacyPlan: curatedCount === 0,
            equipment: unionEquipment(prepGroups),
        },
    };
}
