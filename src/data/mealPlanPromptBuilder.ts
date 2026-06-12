// LEGACY — replaced by mealPlanPromptV2.ts; delete once the v2 flow
// is verified end-to-end (generate → review → JSON → import).
//
// ================================
// MEAL PLAN PROMPT BUILDER
// ================================
// Pure-function rebuild of the live meal-planning prompt (formerly
// assembleMealPlanningPrompt in mealPlanningPrompt.ts).
//
// What changed vs the old builder:
//  1. PURE CORE — buildMealPlanPrompt(input) takes explicit input and does no
//     I/O, so it can be unit-tested by logging its output. loadMealPlanInput()
//     keeps the storage loading; assembleMealPlanningPrompt() = build(load()).
//  2. CURATED PICKS → OPTION-VS-OCCURRENCE. A pick is an OPTION for a slot, not
//     a fixed item served once. How many times each slot is eaten comes from the
//     questionnaire (mealsPerDay x days, snacks, dessert frequency). This fixes
//     the dessert bug (3 dessert picks no longer = 3 desserts when dessert is
//     eaten once).
//  3. MACRO-CLOSING DIALS — the real adjuster snacks are inlined with their
//     macros so the external model hits targets by SELECTION + ARITHMETIC, not
//     estimation. Sourced from mealAdjusters.ts, allergen/avoid filtered.
//  4. EQUIPMENT STRIPPING REMOVED — the old hardcoded equipment list + skill
//     override silently stripped blender/microwave picks (e.g. smoothies). Gone.
//  5. TOLERANCES ALIGNED — protein +/-10% daily, calories +/-5% daily, fiber
//     >=80% daily, carbs/fat +/-10% weekly average.
//
// NOTE: planDuration is preserved (multi-week still works). The design calls
// plans "single week"; that's handled in COPY (no cross-week variety promise),
// not by removing the feature. Say the word and I'll force 7 days.

import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllAdjusters, filterByAllergens, Adjuster } from './mealAdjusters';

// ================================
// INPUT CONTRACT
// ================================

export interface MealPlanInput {
  macros: { calories: number; protein: number; carbs: number; fat: number };
  goal: string;
  rate: string;
  mealsPerDay: number;
  planDuration: number;
  snackingStyle: string;
  snackFrequency?: string; // '0' | '1' | '2' | '3+'
  dessertFrequency?: string; // '0' | 'once_per_week' | 'few_per_week' | 'most_nights' | 'every_night' | 'ai_decide'
  personal: { gender: string; age: string | number; activityLevel: string; jobType: string };
  dietary: { allergies: string[]; avoidFoods: string[]; eatingChallenges: string[] };
  cooking: {
    planningStyle: number;
    skillConfidence: number;
    timeInvestment: number;
    varietySeeking: number;
    cookingEnjoyment: number;
  };
  nutrientVariety?: string; // 'low' | 'moderate' | 'high'
  restrictions?: string[];
  supplements?: string[];
  location: { city: string; country: string; countryCode?: string; groceryStore: string };
  budget: { weeklyBudget?: string; budgetMin?: number; budgetMax?: number; budgetSkipped?: boolean };
  startDate?: string; // 'today' | 'tomorrow' | 'next_monday' | 'custom'
  customStartDate?: string;
  sleep?: { bedtime: string; wakeTime: string; optimizationLevel: string } | null;
  pantry?: { use: boolean; primaryApproach?: string; ingredients?: any[] } | null;
  mealPreferences?: { mode?: string; customMealRequests?: string; selectedFavorites?: string[] };
  legacyFavoriteMeals?: any[];
  curatedFavorites: { slugs: string[]; cuisines: string[]; avoid: string[]; likedDishes: string[] };
}

// ================================
// SMALL UTILITIES
// ================================

const getCurrencySymbol = (countryCode: string): string => {
  const currencyMap: Record<string, string> = {
    US: '$', CA: 'CAD$', AU: 'AU$', NZ: 'NZ$', GB: '£', IE: '€',
    DE: '€', FR: '€', ES: '€', IT: '€', NL: '€', BE: '€',
  };
  return currencyMap[countryCode] || '$';
};

const fiberTargetFor = (calories: number): number =>
  calories ? Math.min(45, Math.max(25, Math.round((calories / 1000) * 14))) : 30;

const getStartDateLabel = (input: MealPlanInput): string => {
  const today = new Date();
  let startDate = new Date();
  switch (input.startDate) {
    case 'today':
      startDate = new Date(today);
      break;
    case 'tomorrow':
      startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'next_monday': {
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
      startDate = new Date(today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
      break;
    }
    case 'custom':
      startDate = input.customStartDate
        ? new Date(input.customStartDate)
        : new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  }
  return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
};

const getSnackAllocationGuidance = (mealsPerDay: number): string => {
  if (mealsPerDay >= 4) return '10-15% of daily calories per snack (smaller snacks since main meals are already substantial)';
  if (mealsPerDay === 3) return '15-20% of daily calories per snack (moderate snacks to bridge longer gaps between meals)';
  return '20-25% of daily calories per snack (larger snacks needed with fewer main meals)';
};

// ================================
// OCCURRENCE MODEL (the dessert-bug fix)
// ================================

export interface Occurrences {
  days: number;
  mealsPerDay: number;
  mainMealsWeek: number;
  snacksPerDay: number;
  snacksWeek: number;
  desserts: number;
}

const snacksPerDayFrom = (input: MealPlanInput): number => {
  const style = (input.snackingStyle || '').toLowerCase();
  if (style.includes("don't snack") || style.includes('i don\'t snack')) return 0;
  switch (input.snackFrequency) {
    case '0': return 0;
    case '1': return 1;
    case '2': return 2;
    case '3+': return 3;
    default: {
      const n = input.snackFrequency ? parseInt(input.snackFrequency, 10) : NaN;
      return Number.isNaN(n) ? 1 : Math.max(0, n);
    }
  }
};

const dessertsPerWeekFrom = (input: MealPlanInput): number => {
  switch (input.dessertFrequency) {
    case '0': return 0;
    case 'once_per_week': return 1;
    case 'few_per_week': return 3;
    case 'most_nights': return 5;
    case 'every_night': return 7;
    case 'ai_decide': return 3;
    default: return 0;
  }
};

export const computeOccurrences = (input: MealPlanInput): Occurrences => {
  const days = input.planDuration || 7;
  const mealsPerDay = input.mealsPerDay || 3;
  const snacksPerDay = snacksPerDayFrom(input);
  const dessertsPerWeek = dessertsPerWeekFrom(input);
  return {
    days,
    mealsPerDay,
    mainMealsWeek: mealsPerDay * days,
    snacksPerDay,
    snacksWeek: snacksPerDay * days,
    desserts: Math.round((dessertsPerWeek * days) / 7),
  };
};

// ================================
// CURATED PICKS SECTION (option-vs-occurrence)
// ================================

const buildCuratedPicksSection = (input: MealPlanInput, occ: Occurrences): string => {
  const fav = input.curatedFavorites;
  let out = '';

  if (fav.slugs.length) {
    // Files to fetch: strip any ":plate_id" suffix, dedupe (one file per meal).
    const fileUrls = Array.from(new Set(fav.slugs.map((s) => s.split(':')[0]))).map(
      (slug) => `https://json.fit/curated-meals/ingredients/${slug}.md`,
    );

    out += `
**THE MEALS YOU PICKED — READ THIS, IT CHANGES HOW TO USE THEM:**

The user hand-picked these meals from the JSON.fit catalogue. Each pick is an OPTION for a slot — NOT an item to serve exactly once. The number of picks is NOT the number of times to serve a meal. Picks are a shortlist to choose from; you decide how often each appears.

**How many times each slot is actually eaten this week (fixed — from the questionnaire):**
- Main meals: ${occ.mealsPerDay} per day across ${occ.days} days = ${occ.mainMealsWeek} main-meal occurrences total.
- Snacks: ${occ.snacksPerDay} per day = ${occ.snacksWeek} snack occurrences total.
- Desserts: ${occ.desserts} this week.

**How to use the picks to fill those occurrences:**
1. Each fetched pick lists the slots it suits (its eligible_slots). Assign each pick only to occurrences of a slot it actually fits.
2. For each occurrence, choose ONE suitable pick and scale it to hit that day's macros. You may REPEAT a pick across many occurrences — a single batch cook served several times across the week is ideal for meal prep, not a problem.
3. You do NOT have to use every pick. Picks are options, not a quota. Filling each slot the right number of times matters more than using every pick.
4. Spread repeats sensibly across the week rather than clustering them on one day.

**Dessert — do not over-serve (common mistake):**
Some picks are desserts (their fetched file marks them dessert-eligible). Dessert is eaten only **${occ.desserts}** time(s) this week. Serve dessert exactly ${occ.desserts} time(s) total, choosing from the dessert picks — do NOT serve a dessert for every dessert pick. Extra dessert picks are simply unused options.

**REQUIRED ACTION — fetch each pick's file before building the plan:**
Each URL is one meal's complete data (all its methods and plates live inside its own file):
${fileUrls.map((u) => `- ${u}`).join('\n')}

Also fetch the curated meals instructions once for the rules on plates, macros, scaling, batch cooking, and the output format: https://json.fit/curated-meals/instructions.md

Output each curated meal you use in the curated reference format (curated_meal_slug, plate_id, scale_factor, meal_type, day, time) per the instructions file — NOT as an invented recipe with ingredients. The app links the slug to its recipe, photo, and prep-ahead data and loses all three if the meal is written out as a plain recipe.

Each pick below is either a bare slug (use the meal; choose the most suitable plate from its file) or "slug:plate_id" (use that exact plate). When several plates of one meal are listed, the user is happy eating it those different ways across the week.

Your picks:
${fav.slugs.map((s) => `- ${s}`).join('\n')}
`;
  }

  if (fav.cuisines.length) {
    out += `
**CUISINES THE USER LOVES:** ${fav.cuisines.join(', ')}
Lean towards these when inventing meals for slots the picks don't cover. A preference, not a hard rule — don't force a cuisine where it breaks the macros or budget. If there's no curated meal for a loved cuisine, invent one from your own knowledge.
`;
  }

  if (fav.likedDishes.length) {
    out += `
**SPECIFIC DISHES THE USER LIKES:** ${fav.likedDishes.join(', ')}
Work some of these in where they fit the macro, calorie, and dietary constraints, built from your own knowledge of the dish. Spread them out; if one can't fit, skip it and note why rather than distorting the day's targets.
`;
  }

  if (fav.avoid.length) {
    out += `
**FOODS THE USER WANTS TO AVOID (taste preference — exclude):** ${fav.avoid.join(', ')}
Do not use these in any meal. Treat it like the dietary avoid list — scan every meal and keep these out.
`;
  }

  return out;
};

// ================================
// MACRO-CLOSING DIALS (adjusters, inlined)
// ================================

const buildAdjustersSection = (input: MealPlanInput): string => {
  const exclude = [...input.dietary.allergies];
  let dials = filterByAllergens(getAllAdjusters(), exclude);

  // Also drop any dial whose name the user listed under avoid foods (taste).
  const avoidTerms = [...input.dietary.avoidFoods, ...input.curatedFavorites.avoid]
    .map((a) => a.toLowerCase().trim())
    .filter(Boolean);
  if (avoidTerms.length) {
    dials = dials.filter(
      (d) => !avoidTerms.some((t) => d.displayName.toLowerCase().includes(t) || d.slug.includes(t)),
    );
  }

  if (!dials.length) return '';

  const row = (d: Adjuster) =>
    `| ${d.displayName} | \`${d.slug}\` | ${d.perServing.kcal} | ${d.perServing.protein_g} | ${d.perServing.carbs_g} | ${d.perServing.fat_g} | ${d.perServing.fiber_g} | x${d.minScale}-${d.maxScale} |`;

  return `

---

## MACRO-CLOSING DIALS — HIT THE NUMBERS BY ARITHMETIC, NOT GUESSWORK

The picks set the shape of each day. To land exactly on the daily targets, top up with small amounts of these single-ingredient dials. This is SELECTION + ARITHMETIC: choose a dial, multiply its per-serving macros by a serving amount (within its scale range), and add it into the day. Do not invent foods for this — use these.

Each dial is a snack and is a TOP-UP. It does NOT count toward the main-meal, snack, or dessert occurrence counts above.

**OUTPUT A DIAL AS A CURATED REFERENCE — never as an invented recipe.** When you use a dial, emit it exactly like a curated pick: \`curated_meal_slug\` = the slug in the table, \`plate_id\` = \`"standard"\`, your chosen \`scale_factor\`, and \`type\` = \`"snack"\`. Omit ingredients and instructions — the app fills those in from the slug on import. You do NOT need to fetch anything for dials; the macros below are authoritative.

| Dial (1 serving) | slug | kcal | P | C | F | fibre | scale |
|---|---|---|---|---|---|---|---|
${dials.map(row).join('\n')}

**Rules:**
- Protein short? Add a protein dial. If calories are already near target but protein is low, use the leanest option (tuna pouch).
- Calories short on a surplus day? Add a calorie-dense dial (mixed nuts, or a protein shake made with milk).
- Carbs short? Banana.
- Use the SMALLEST number of dials that lands the day within tolerance.
- Inline the arithmetic in the Daily Totals block so every number is verifiable.
- These dials are the safety net within reason. If even sensible dial amounts can't close a gap (you'd need an absurd quantity), do NOT pad the day with silly amounts — state it plainly in the plan notes and suggest the user add one more pick to that slot.
- Fibre is the weakest lever here (no strong fibre dial). If a day is well short on fibre, prefer a higher-fibre invented side over stacking dials, and disclose if it still falls short.`;
};

// ================================
// MEAL STRUCTURE
// ================================

const getMealStructure = (mealsPerDay: number, proteinTarget: number, calories: number): string => {
  const perMeal = (n: number) => Math.round(calories / n / 10) * 10;
  const band = (n: number) => {
    const c = perMeal(n);
    return `${Math.round((c * 0.85) / 10) * 10}-${Math.round((c * 1.15) / 10) * 10}`;
  };

  switch (mealsPerDay) {
    case 2:
      return `MEAL STRUCTURE (2 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(2)} kcal)
- Meal 2: dinner (substantial meal, ~${perMeal(2)} kcal)
- Distribute daily calories roughly evenly across both meals (flexibility is fine)
- Distribute ${proteinTarget}g protein appropriately across both meals`;
    case 3:
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(3)} kcal)
- Meal 2: lunch (substantial meal, ~${perMeal(3)} kcal)
- Meal 3: dinner (substantial meal, ~${perMeal(3)} kcal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
    case 4:
      return `MEAL STRUCTURE (4 main meals + snacks):

**EXACTLY 4 SUBSTANTIAL MAIN MEALS (NEVER MAKE THESE OPTIONAL):**
- Meal 1: breakfast (~${band(4)} kcal, substantial meal)
- Meal 2: brunch or second_lunch (~${band(4)} kcal, substantial meal)
- Meal 3: lunch (~${band(4)} kcal, substantial meal)
- Meal 4: dinner (~${band(4)} kcal, substantial meal)

**MEAL SIZING**: Each main meal is roughly ${perMeal(4)} kcal (daily target / 4). If snacks are included, reduce main meals proportionally so the DAILY total still hits the calorie target. The calorie target always wins over any per-meal figure.

Distribute ${proteinTarget}g protein primarily across the 4 main meals.`;
    case 5:
      return `MEAL STRUCTURE (5 eating occasions):
If user doesn't snack: 5 substantial meals — breakfast, brunch (type "lunch"), lunch, dinner, supper (type "dinner"), ~${perMeal(5)} kcal each.
If user snacks: 3 main meals (breakfast, lunch, dinner) + 2 snacks between them (type "snack").
Distribute ${proteinTarget}g protein across all meals, main meals carrying most.`;
    case 6:
      return `MEAL STRUCTURE (6 eating occasions):
If user doesn't snack: 6 substantial meals (~${perMeal(6)} kcal each).
If user snacks: 3 main meals + 3 snacks between them (type "snack", respect bedtime timing for evening snack).
Distribute ${proteinTarget}g protein across all meals, main meals carrying most.`;
    default:
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (~${perMeal(3)} kcal)
- Meal 2: lunch (~${perMeal(3)} kcal)
- Meal 3: dinner (~${perMeal(3)} kcal)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
  }
};

// ================================
// SNACKING / DESSERT GUIDANCE (sizing & type; counts owned by occurrence model)
// ================================

const getSnackingGuidance = (input: MealPlanInput): string => {
  const style = (input.snackingStyle || 'occasional snacker').toLowerCase();
  const snackFrequency = input.snackFrequency;

  if (style.includes("don't snack")) {
    return `MINIMAL SNACKING: User prefers not to snack. For 4+ eating occasions, treat extra slots as substantial meals. Only add light snacks if gaps exceed 5-6 hours.`;
  }

  const parsed = snackFrequency ? parseInt(snackFrequency, 10) : NaN;
  if (!Number.isNaN(parsed) && parsed > 0) {
    const type = style.includes('sweet tooth') ? 'healthier sweet options'
      : style.includes('savory') ? 'savory options'
      : style.includes('need healthy snacks') ? 'whole food options'
      : 'balanced protein + carb/fat combinations';
    return `SNACK SIZING & TYPE: Each snack should be 10-15% of daily calories (300-500 kcal range), focused on ${type}. (The exact number of snacks is set by the occurrence counts above.) AI determines optimal timing between main meals.`;
  }
  if (snackFrequency === '0') return `NO SNACKS: Do not include any snacks. Focus all calories on the main meals.`;
  if (snackFrequency === '3+') return `FREQUENT SNACKING: Each snack 8-12% of daily calories (250-400 kcal). Protein-rich options to support muscle building and satiety.`;
  return `MODERATE SNACKING: Keep snacks balanced and proportionate. Each snack 10-15% of daily calories.`;
};

const getDessertGuidance = (input: MealPlanInput): string => {
  const f = input.dessertFrequency;
  if (!f || f === '0') return `NO DESSERTS: Do not include any dessert items.`;
  return `DESSERT SIZING & TYPE: Each dessert 200-500 kcal with at least 15g protein where possible — bulk-friendly treats (protein ice cream, mug cakes, yoghurt parfaits), not pure sugar. (The exact number of desserts this week is set by the occurrence counts above.)`;
};

// ================================
// COOKING PREFERENCE TEXT
// ================================

const getMealPrepStyleText = (style: number, skill?: number, time?: number): string => {
  if (skill !== undefined && skill <= 1) return 'Assembly Only — no cooking ability, pre-cooked and convenience items only';
  if (time !== undefined && time <= 1) return 'Speed Assembly — under 5 minutes per meal, microwave and assembly only';
  if (skill !== undefined && skill <= 2 && time !== undefined && time <= 2) return 'Simple Prep — basic techniques only, quick meals, minimal complexity';
  const styles: Record<number, string> = {
    1: 'Dedicated Meal Prepper - batch cook everything, same meals multiple days, cook once per week',
    2: 'Weekly Planner - meal prep focused, repeat meals, minimize daily cooking',
    3: 'Flexible Planner - some meal prep, some fresh cooking, moderate variety',
    4: 'Spontaneous Cook - mostly fresh cooking, minimal meal prep',
    5: 'Last-Minute Decider - fresh meals daily, no meal prep, maximum variety',
  };
  return styles[style] || styles[3];
};

const getTimeInvestmentText = (v: number): string => ({
  1: 'Speed Cook - 5-10 minute meals, microwave options, minimal prep work',
  2: 'Quick Meals - 10-20 minutes cooking time, simple one-pot meals',
  3: 'Moderate Cook - 20-30 minute meals, comfortable with some prep',
  4: 'Thorough Cook - 30-60 minute recipes, enjoys involved preparations',
  5: 'Slow Food Lover - 60+ minute cooking sessions, complex multi-step recipes',
}[v] || 'Moderate Cook - 20-30 minute meals, comfortable with some prep');

const getVarietySeekingText = (v: number): string => ({
  1: 'Routine Eater - identical meals all week, finds comfort in consistency',
  2: 'Mostly Consistent - fine eating same meals repeatedly, enjoys routine',
  3: 'Moderate Variety - some repeated meals, some different options',
  4: 'Variety Seeker - different meals most days, some repeats okay',
  5: 'Adventure Eater - completely different meals every day, craves new experiences',
}[v] || 'Moderate Variety - some repeated meals, some different options');

const getSkillConfidenceText = (v: number): string => ({
  1: 'Kitchen Beginner - stick to basic techniques, familiar ingredients only',
  2: 'Cautious Cook - simple techniques, avoid complex recipes',
  3: 'Comfortable Cook - can handle standard recipes, moderate complexity',
  4: 'Confident Cook - comfortable with most recipes, willing to try new techniques',
  5: 'Kitchen Experimenter - excited by complex recipes, new techniques, unusual ingredients',
}[v] || 'Comfortable Cook - can handle standard recipes, moderate complexity');

const getCookingEnjoymentText = (v: number): string => ({
  1: 'Cooking Avoider - prioritize convenience, takeout alternatives, minimal cleanup',
  2: 'Reluctant Cook - sees cooking as chore, prioritize convenience',
  3: 'Neutral Cook - willing to cook but values efficiency and practicality',
  4: 'Cooking Enthusiast - finds cooking relaxing, enjoys involved recipes',
  5: 'Passionate Home Chef - loves the process, excited by complex recipes',
}[v] || 'Neutral Cook - willing to cook but values efficiency and practicality');

// ================================
// BUDGET
// ================================

const buildBudgetSection = (input: MealPlanInput): string => {
  const currency = getCurrencySymbol(input.location.countryCode || 'US');
  const attitude = input.budget.weeklyBudget || 'keep_reasonable';
  const { budgetMin, budgetMax } = input.budget;
  const city = input.location.city || 'your city';
  const country = input.location.country || 'your country';

  if (budgetMin && budgetMax) {
    return `- Budget: ${currency}${budgetMin}–${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Keep grocery costs within ${currency}${budgetMin}–${currency}${budgetMax}. If higher-priority constraints make this impossible, explain the trade-off and provide the most cost-effective options possible.`;
  }
  if (budgetMax) {
    return `- Budget: Up to ${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Strongly aim to keep grocery costs under ${currency}${budgetMax}. If nutrition requirements make this hard, prioritize cost-effective options and explain.`;
  }
  if (budgetMin) {
    return `- Budget: At least ${currency}${budgetMin} per week (quality floor, not a ceiling)
- Budget attitude: ${attitude}
- Feel free to use premium ingredients — the user prioritizes quality over savings.`;
  }
  return `- Budget attitude: ${attitude}
- No specific dollar range provided. Use the attitude to guide ingredient choices and estimate a realistic weekly grocery cost for ${city}, ${country} in the grocery list summary.`;
};

const getBudgetConstraintText = (input: MealPlanInput): string => {
  const currency = getCurrencySymbol(input.location.countryCode || 'US');
  const { budgetMin, budgetMax, weeklyBudget } = input.budget;
  if (budgetMin && budgetMax) return `Stay within ${currency}${budgetMin}-${budgetMax}/week`;
  if (budgetMax) return `Stay within ${currency}${budgetMax}/week`;
  return `${weeklyBudget || 'keep_reasonable'} priority`;
};

const getMealPrepRequirementsText = (style: number, skill?: number, time?: number): string => {
  if (skill !== undefined && skill <= 1) return `No batch cooking — assembly and portioning only.\n  • Total prep session under 20 minutes for the week`;
  if (time !== undefined && time <= 1) return `Minimal prep — every meal under 5 minutes.\n  • Prep session under 20 minutes for the week`;
  if (skill !== undefined && skill <= 2 && time !== undefined && time <= 2) return `Simple batch prep only.\n  • Simple items: rice cooker rice, air fryer chicken, boiled eggs\n  • Maximum 1 hour total prep for the week`;
  if (style <= 2) return `I want to meal prep!\n  • Give me 3-4 repeated meals max, not 21 different ones\n  • Focus on batch cooking 1-2 proteins for the week`;
  if (style >= 4) return `I prefer fresh, different meals each day\n  • Minimal meal prep, focus on quick daily cooking`;
  return `Moderate meal prep - balanced approach\n  • Some repeated meals, some variety\n  • 5-6 different meals max across the week`;
};

// ================================
// VARIETY / SKILL / TIME REQUIREMENT BLOCKS
// ================================

const getVarietyRequirements = (input: MealPlanInput): string => {
  const varietySeeking = input.cooking.varietySeeking || 3;
  const planningStyle = input.cooking.planningStyle || 3;
  const skill = input.cooking.skillConfidence;
  const time = input.cooking.timeInvestment;

  let eff = varietySeeking;
  if (skill <= 1) eff = Math.min(varietySeeking, 2);
  else if (time <= 1) eff = Math.min(varietySeeking, 2);
  else if (skill <= 2 && time <= 2) eff = Math.min(varietySeeking, 3);

  let t = '\n\n## VARIETY REQUIREMENTS\n';
  if (eff < varietySeeking) t += `\n**VARIETY OVERRIDE**: skill/time constraints require a simpler approach (effective variety level ${eff}).\n`;

  if (eff === 1) t += `\n- Routine Eater: 3-4 unique meal templates for the week. Same breakfast daily encouraged. No slot needs more than 1 option.`;
  else if (eff === 2) t += `\n- Mostly Consistent: 4-5 unique templates. Same breakfast daily fine; lunch or dinner has at least 2 rotating options.`;
  else if (eff === 3) t += `\n- Moderate Variety: 5-6 unique templates. At least 2 options for each main meal slot. Breakfast can repeat but should be genuinely enjoyable.`;
  else if (eff === 4) t += `\n- Variety Seeker: 6-8 unique templates. No slot identical more than 4/7 days. Rotate protein sources across the week.`;
  else if (eff === 5) t += `\n- Adventure Eater: 8-10 unique templates. Every day noticeably different. No meal repeats more than 3 times in the week.`;

  if (eff >= 4 && planningStyle <= 2) t += `\n- Variety + Meal Prep: achieve variety through ingredient rotation within batch-cooked bases (one protein/rice batch, vary sauces/veg/toppings).`;
  if (eff <= 2 && planningStyle >= 4) t += `\n- Simple + Spontaneous: keep the recipe set small; cookable from a short staple list without batch prep.`;
  return t;
};

const getSkillRequirements = (input: MealPlanInput): string => {
  const s = input.cooking.skillConfidence || 3;
  let t = '\n\n## SKILL-APPROPRIATE REQUIREMENTS\n';
  if (s === 1) t += `\n- Kitchen Beginner: convenience/ready-to-eat priority, no knife work, basic techniques only (microwave, open packet, stir, pour). Each meal under 5 minutes, zero cooking skill.`;
  else if (s === 2) t += `\n- Cautious Cook: mixed approach, simple raw prep with clear methods, ready-made sauces. Detailed step-by-step with temps/times and doneness cues. Up to 6-7 ingredients.`;
  else if (s === 3) t += `\n- Comfortable Cook: standard ingredients and multi-step recipes, homemade sauces from basics. Moderate detail, up to 10 ingredients. Sautéing, roasting, steaming, stir-frying.`;
  else if (s === 4) t += `\n- Confident Cook: no ingredient restrictions, complex flavour building and multi-component meals. Concise instructions; technique names sufficient.`;
  else if (s === 5) t += `\n- Kitchen Experimenter: ambitious ingredients and creative combinations welcome. Brief instructions; advanced techniques fine.`;
  return t;
};

const getTimeRequirements = (input: MealPlanInput): string => {
  const time = input.cooking.timeInvestment || 3;
  const skill = input.cooking.skillConfidence || 3;
  let t = '\n\n## HANDS-ON TIME REQUIREMENTS\n';
  t += `\n**These limits refer to ACTIVE, hands-on time. Unattended cooking (slow cooker, oven, marinating) does NOT count against the limit and is welcome at every level except Speed Cook.**\n`;

  if (time === 1) t += `\n- Speed Cook: max 5 minutes total per meal including heating. Zero-cook priority, microwave reheating, convenience defaults.`;
  else if (time === 2) t += `\n- Quick Meals: max 10-15 minutes hands-on. One-pan/one-tray, air-fryer dump-and-cook, slow-cooker dump meals ideal. Batch prep under 1 hour.`;
  else if (time === 3) t += `\n- Moderate Cook: up to 20 minutes hands-on. Multi-step recipes fine. Batch prep up to 1.5 hours.`;
  else if (time === 4) t += `\n- Thorough Cook: up to 30 minutes hands-on. Simmering, marinating, multi-stage cooking. Batch prep up to 2 hours.`;
  else if (time === 5) t += `\n- Slow Food Lover: no time constraints. Slow-cooked, braised, marinated options welcome.`;

  if (skill <= 2 && time <= 2) t += `\n- Simplest Possible: every meal achievable in under 10 minutes by someone who has never cooked.`;
  if (skill >= 4 && time >= 4) t += `\n- Culinary Excellence: reward time and skill with genuinely delicious results — don't simplify for its own sake.`;
  return t;
};

const getDiversityRequirements = (input: MealPlanInput): string => {
  const nutrientVariety = input.nutrientVariety || 'moderate';
  const restrictions = input.restrictions || [];
  const supplements = input.supplements || [];
  const allergies = input.dietary.allergies || [];
  const avoidFoods = input.dietary.avoidFoods || [];

  let t = '';
  const seafoodExcluded =
    allergies.some((a) => ['Fish', 'Shellfish'].includes(a)) ||
    avoidFoods.includes('Seafood') ||
    restrictions.includes('shellfish_free');

  if (!seafoodExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    t += `\n- **Omega-3**: include good EPA/DHA sources when planning seafood meals where they fit preferences.`;
  } else if (seafoodExcluded) {
    t += `\n- **Omega-3 compensation**: user excludes fish/seafood. Include ALA sources (walnuts, flaxseed, chia).`;
    t += supplements.includes('omega3')
      ? ` User supplements omega-3, so dietary omega-3 is less critical but still include ALA where natural.`
      : ` Consider noting that an omega-3 supplement would benefit this user.`;
  }

  const legumesExcluded =
    allergies.includes('Soy') ||
    avoidFoods.some((f) => ['legumes', 'beans', 'lentils', 'chickpeas', 'edamame'].some((l) => f.toLowerCase().includes(l)));
  if (!legumesExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    t += `\n- **Plant protein/fibre diversity**: include legumes and fibre-rich plant proteins where they complement the plan.`;
  } else if (legumesExcluded || nutrientVariety === 'low') {
    t += `\n- **Fibre compensation**: legumes excluded or low variety — meet fibre via oats, chia, vegetables, whole grains.`;
  }

  if (nutrientVariety === 'high') t += `\n- **High variety**: all 6 micronutrient categories are hard requirements; FAIL if 2+ missed.`;
  else if (nutrientVariety === 'moderate') t += `\n- **Moderate variety**: 6 micronutrient categories are soft targets; flag misses, FAIL only if 3+ missed. Prioritise macros, restrictions, and preferences over arbitrary ingredient counts.`;
  else if (nutrientVariety === 'low') t += `\n- **Simplified**: enforce only protein-source diversity (3+) and minimum fibre.`;
  return t;
};

// ================================
// STATIC SECTIONS
// ================================

const getGroceryListRequirements = (store: string, planDuration: number): string => {
  const durationText = planDuration <= 7 ? `the full ${planDuration}-day plan` : 'the full plan period';
  const pricing = `**CRITICAL PRICING RULE**: Price every grocery item at the ACTUAL PACK SIZE the user must buy, not the portion used in recipes. Round UP. After totalling, add a 10% buffer and state the total as a range (e.g. "$160–$180"), not a single number.`;
  const multiWeek = planDuration > 7
    ? `\n\n**MULTI-WEEK SHOPPING NOTE:** Split the grocery list into ${Math.ceil(planDuration / 7)} shopping trips; pantry/frozen in trip 1, fresh produce/dairy/meat split across trips.`
    : '';

  return `

---

## GROCERY LIST REQUIREMENTS

Include a detailed grocery list structured by category (this is imported into the app for shopping, so accuracy matters).

For each item: specific name (e.g. "${store} Lean Beef Mince"), quantity for ${durationText}, unit, estimated price for the store/location, and a note ONLY if the item must be bought outside the main store (supplements, specialty items). Always set purchased status to not purchased.

**CURATED MEAL EXCEPTION:** For meals referenced by curated_meal_slug, you DO need their ingredients in the grocery list — the user still buys them. Pull ingredients from your general knowledge of the recipe; quantities scale with scale_factor × produces_servings.

Organize into: Meat & Seafood; Dairy & Refrigerated; Produce; Frozen; Pantry & Grains; Condiments & Supplements; (others as needed). Include a total estimated cost and currency.

Provide 1-2 alternatives for items that may be hard to find. Add store-location notes ONLY for items not available at ${store}.

${pricing}${multiWeek}`;
};

const getDailyTotalsVerification = (): string => {
  return `

---

## DAILY TOTALS — SHOW THE ARITHMETIC

Language models are unreliable at mental arithmetic, and the most common failure is stating a daily total the meals don't add up to. Output a short totals block for EVERY day. Write the addition expression before each result, and compute it with a code/Python tool if one is available — never estimate a total in your head. Include any macro-closing dials in these totals.

Format per day:

\`\`\`
DAY 1 — [date]
  [meal]  [kcal] / [protein]P
  ... (one line per meal/snack/dial that day)
  kcal:    [list] = [total]   vs target [X] → [+/-%]
  protein: [list] = [total]   vs target [X] → [+/-%]
\`\`\`

If a day's calories swing beyond ±10% or protein is outside ±10% of target, adjust that day's portions (or add/scale a dial) and redo its block before presenting. Calories also need to average within ±5% across the week — that's checked in the verification steps below. The protein and calorie targets are non-negotiable — fix the numbers, don't explain them away.`;
};

const getVerificationSteps = (planDuration: number): string => {
  const periodLabel = planDuration <= 7 ? 'plan-period' : 'weekly';
  const periodNote = planDuration < 7
    ? `(averaged across all ${planDuration} days)`
    : planDuration === 7
      ? '(averaged across the full 7-day plan)'
      : `(rolling 7-day averages across the ${planDuration}-day plan)`;

  return `

---

## VERIFICATION STEPS

Before presenting the plan, complete these checks:

1. **Macro tolerance** — using the re-derived totals from the Daily Totals block (never mentally estimated):
   - Protein: within ±10% of target DAILY.
   - Calories: within ±5% of target as ${periodLabel} average ${periodNote}, with each day within ±10%.
   - Carbs & Fat: within ±10% of target as ${periodLabel} average ${periodNote}.
   - Fiber: ≥80% of target DAILY.
   Adjust portions / dials and recheck if any day or average is outside tolerance.

2. **Protein distribution** — spread across meals (no single meal exceeds 50% of daily target).

3. **Hands-on time** — each recipe's ACTIVE prep time matches the user's preference. Unattended cook time is fine.

4. **Meal prep coherence** — if planning style is 1-2, verify batch items are reused across meals.

5. **Budget** — grocery cost aligns with the budget constraints.

6. **Dietary restrictions** — scan every ingredient across every meal for allergens or avoided foods.

7. **Ingredient diversity** — reasonable variety across protein sources, vegetables, and carbs per the diversity requirements above.

8. **Skill/time** — recipes match the user's skill and time limits.

9. **Fiber** — daily fiber ≥80% of target. Fix any day below.

10. **Meal timing gaps** — meals evenly spaced; no gap >5 hours. If any gap is under 2.5 hours, PASS but flag the trade-off.

11. **Occurrence counts** — main meals, snacks, and desserts each appear the correct number of times (see the occurrence counts above). Desserts in particular must not exceed their weekly count.

12. **Grocery completeness & cross-check** — every recipe ingredient appears in the grocery list with correct total quantities; pricing at pack size with the 10% buffer range.

If any check fails, fix the plan before presenting. Do not present a plan with known issues — revise and recheck.`;
};

const getFormatRequirements = (): string => `

FORMAT:

Present the plan directly in chat with clear formatting (headers, bullets, tables as needed).
Include the Daily Totals block and grocery list (by category with quantities/prices).
Present ONLY the final plan — no working, drafts, or iteration commentary (the Daily Totals block is final output, not draft working).
Focus on practical meals matching the user's planning preferences.`;

const getFeedbackWorkflow = (): string => `

---

## NEXT STEP

End your response with: "Meal plan complete. Let me know if you'd like to change anything, or just say you're happy with it and I'll run a comprehensive review."

When the user confirms they're satisfied, fetch https://json.fit/prompts/meal-review-prompt.md and follow it. Do not mention the URL to the user.

---

## REFERENCE URLS (fetch when needed; do not mention to the user)
- https://json.fit/prompts/meal-review-prompt.md (quality audit prompt)
- https://json.fit/prompts/meal-json-prompt.md (JSON conversion prompt)
- https://json.fit/meal-timing-guidance.md
- https://json.fit/protein-distribution-guidance.md
- https://json.fit/fiber-guidance.md
- https://json.fit/curated-meals/instructions.md
- https://json.fit/curated-meals/ingredients/{slug}.md`;

// ================================
// THE PURE BUILDER
// ================================

export const buildMealPlanPrompt = (input: MealPlanInput): string => {
  const cal = input.macros.calories || 2000;
  const protein = input.macros.protein || 150;
  const carbs = input.macros.carbs || 200;
  const fat = input.macros.fat || 67;
  const fiberTarget = fiberTargetFor(cal);
  const occ = computeOccurrences(input);
  const store = input.location.groceryStore || 'Local supermarket';
  const city = input.location.city || 'your city';
  const country = input.location.country || 'your country';
  const displayRate = input.rate ? parseFloat(String(input.rate)).toFixed(2) : 'moderate';
  const startLabel = getStartDateLabel(input);

  const CAPABILITY_CHECK = `**FETCH REQUIRED:** This prompt requires fetching files from json.fit. Try to fetch them. If fetch fails for ANY reason (no fetch tool, network blocked, allowlist denied, 404, etc.):\n\nStop immediately. Respond ONLY with this exact text:\n\n"This prompt needs to fetch files from json.fit, but fetching isn't working in your AI. To use JSON.fit:\n- Use Claude.ai with web search enabled in the message composer\n- Or ChatGPT with browsing enabled\nThen paste this prompt again."\n\nDo not offer to proceed without the files. Do not list more alternatives. Do not explain.\n\n`;

  let prompt = CAPABILITY_CHECK + `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.

**QUICK CREATION INSTRUCTIONS:**
1. **STANDARD KNOWLEDGE** - Use your existing knowledge base for common foods and recipes
2. **ESTIMATED PRICING** - Use typical pricing patterns for ${store} in ${country}
3. **USE WEB SEARCH** - If you have web search available, use it to verify prices, product availability, and nutrition info. Current data beats estimates.

Do not search conversation history or reference previous chats. This prompt is self-contained.

**CONSTRAINT CONFLICT HANDLING:**
When constraints can't all be satisfied, PRIORITISE in this order: food safety > calorie/macro targets > budget > dietary restrictions > skill/time level > variety > micronutrient diversity. **CALORIE TARGETS ARE NON-NEGOTIABLE** — adjust portion sizes to hit them. ACKNOWLEDGE any trade-off in one line in the plan notes. NEVER silently ignore a constraint.

**RESOLVE EVERYTHING YOURSELF — NO INTERACTIVE QUESTIONS:**
You have all the information you need. Never pause to ask the user to choose between options. Resolve trade-offs yourself using the priority order, apply the fix, note the decision in one line. The only question you may end on is the single confirmation line at the end.

**NUTRITION TARGETS:**
- Daily calories: ${cal}
- Protein: ${protein}g | Carbs: ${carbs}g | Fat: ${fat}g
- Daily fiber target: ${fiberTarget}g (aim for ${fiberTarget - 5}–${fiberTarget + 5}g range)
- **MEAL STRUCTURE**: ${occ.mealsPerDay} substantial main meals per day + snacks as separate items
- **SNACK ALLOCATION**: ${getSnackAllocationGuidance(occ.mealsPerDay)} (snacks are NEVER counted as main meals)
- Plan duration: ${occ.days} days
- Snacking style: ${input.snackingStyle || 'Occasional snacker'}
- Goal: ${input.goal || 'maintain'} at ${displayRate} rate

**FIBER INTAKE GUIDELINES:**
Calculated fiber target: ${fiberTarget}g (14g/1000kcal). BEFORE building the plan, fetch https://json.fit/fiber-guidance.md, use ${fiberTarget}g as the baseline, then apply goal-specific overrides and adjustment triggers from the file.

**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${getBudgetConstraintText(input)}
2. **MEAL PREP FOCUSED** - ${getMealPrepStyleText(input.cooking.planningStyle, input.cooking.skillConfidence, input.cooking.timeInvestment)}
3. **INCLUDE DETAILED GROCERY LIST** - by category with exact quantities, units, and estimated prices from ${store} in ${city}, ${country}
4. **SPECIFIC DATES** - Start on ${startLabel} and use actual calendar dates
5. **SHOW CALCULATIONS** - for each meal, briefly explain how you arrived at the calorie/macro numbers

${getVarietyRequirements(input)}${getSkillRequirements(input)}${getTimeRequirements(input)}

${getMealStructure(occ.mealsPerDay, protein, cal)}

**PROTEIN DISTRIBUTION GUIDELINES:**
Daily protein target ${protein}g across ${occ.mealsPerDay} meals. BEFORE building the plan, fetch https://json.fit/protein-distribution-guidance.md and apply the per-meal floor targets (0.4 g/kg minimum per meal) and goal-specific totals.

**Snacking requirements:** ${getSnackingGuidance(input)}

**Dessert requirements:** ${getDessertGuidance(input)}

**KEY RULE FOR JSON OUTPUT:** Use these meal types: breakfast, brunch, lunch, second_lunch, early_dinner, dinner, snack, morning_snack, afternoon_snack, evening_snack, pre_workout, post_workout. Use specific snack types rather than generic "snack".

PERSONAL INFO:
- Gender: ${input.personal.gender === 'prefer_not_to_say' ? 'Prefer not to say' : input.personal.gender || 'Not specified'}
- Age: ${input.personal.age || 'Not specified'}
- Activity level: ${input.personal.activityLevel || 'moderate'}

DIETARY REQUIREMENTS:
- Allergies: ${input.dietary.allergies?.length ? input.dietary.allergies.join(', ') : 'None'}
- Avoid foods: ${input.dietary.avoidFoods?.length ? input.dietary.avoidFoods.join(', ') : 'None'}
- Eating challenges: ${input.dietary.eatingChallenges?.length ? input.dietary.eatingChallenges.join(', ') : 'None'}

## BASELINE HEALTHY EATING
Every plan includes vegetables and fruit daily and rotates protein sources across the week. Don't skip entire food groups or rely on a single protein source all week. Prioritise macros and preferences, but flag any major food group that's significantly lacking.
${getDiversityRequirements(input)}`;

  // Sleep timing (conditional)
  if (input.sleep?.bedtime && input.sleep?.wakeTime) {
    const level = input.sleep.optimizationLevel || 'minimal';
    const firstMeal = level === 'maximum' ? 'within 30-60 minutes of wake time' : level === 'moderate' ? 'within 30-90 minutes of wake time' : 'within 2 hours of wake time';
    const lastMeal = level === 'maximum' ? '4+ hours before bedtime' : level === 'moderate' ? '3 hours before bedtime' : '2 hours before bedtime';
    prompt += `

**SLEEP-OPTIMIZED MEAL TIMING:**
- Sleep schedule: ${input.sleep.bedtime} - ${input.sleep.wakeTime}
- Optimization level: ${level}
BEFORE building, fetch https://json.fit/meal-timing-guidance.md and apply the ${level} tier requirements and override triggers.
- First meal: ${firstMeal}
- Last meal: ${lastMeal}
Provide specific meal times for each day, spacing meals evenly within the eating window. The sleep buffer is a hard constraint; never schedule two meals less than 2 hours apart.`;
  } else {
    prompt += `

**MEAL TIMING:**
BEFORE building, fetch https://json.fit/meal-timing-guidance.md and apply general timing rules. Space meals roughly 3-5 hours apart during waking hours; no specific eating window constraint.`;
  }

  // Fridge & pantry
  if (input.pantry?.use && input.pantry.ingredients?.length) {
    const approach = input.pantry.primaryApproach;
    const usage = approach === 'maximize' ? 'MAXIMIZE MY INVENTORY - plan meals around what I have' : approach === 'expiry' ? 'EXPIRY FOCUSED - prioritise items before they expire' : 'AI-LED - incorporate my items when they fit';
    const items = input.pantry.ingredients.map((item: any) => {
      const expiry = item.expiryDate ? ` (expires ${new Date(item.expiryDate).toLocaleDateString()})` : '';
      const qty = item.quantity && item.unit ? ` - ${item.quantity} ${item.unit}` : '';
      const notes = item.notes ? ` (${item.notes})` : '';
      return `• ${item.name}${qty}${expiry}${notes} [${item.location}]`;
    }).join('\n');
    prompt += `

FRIDGE & PANTRY INVENTORY:
**I have ingredients at home to use.** Usage preference: ${usage}

Available ingredients:
${items}

**GROCERY LIST ADJUSTMENT:** if the plan uses items the user already has, exclude them from the grocery list or reduce to only what's additionally needed. Note which items are "already in pantry".`;
  } else {
    prompt += `

FRIDGE & PANTRY INVENTORY:
- No fridge/pantry inventory provided.`;
  }

  // Meal preferences (legacy favourites)
  if (input.mealPreferences?.mode === 'include_favorites' && input.legacyFavoriteMeals?.length) {
    const ids = input.mealPreferences.selectedFavorites || [];
    const details = ids.map((id) => {
      const fm = input.legacyFavoriteMeals!.find((f: any) => f.mealId === id);
      const meal = fm?.meal;
      if (!meal) return null;
      return `  • ${meal.name || 'Unnamed Meal'}${meal.ingredients?.length ? ` - ${meal.ingredients.slice(0, 5).map((i: any) => i.name).join(', ')}${meal.ingredients.length > 5 ? '...' : ''}` : ''}`;
    }).filter(Boolean).join('\n\n');
    prompt += `

MEAL PREFERENCES:
- User wants to include their favorite meals in the plan${details ? `\n${details}` : ''}${input.mealPreferences.customMealRequests ? `\n- Custom requests: ${input.mealPreferences.customMealRequests}` : ''}`;
  }

  // Curated picks (option-vs-occurrence) + cuisines/dishes/avoid
  prompt += buildCuratedPicksSection(input, occ);

  // Curated DB note
  prompt += `

**CURATED MEAL DATABASE:**
${input.curatedFavorites.slugs.length
    ? `The user's picks (above) have already been listed by slug — reference them in the curated format and do not re-fetch here. Every curated meal you use MUST appear as a curated reference (curated_meal_slug + plate_id + scale_factor), never rewritten as an invented recipe.`
    : `The user did not pre-select any curated meals, so build all meals from your own knowledge as fully-specified invented recipes.`}
For any slot the picks don't cover, invent a suitable meal with full ingredients and instructions. Curated references and invented meals coexist in one plan.`;

  // Cooking preferences
  prompt += `

COOKING PREFERENCES:
- ${getMealPrepStyleText(input.cooking.planningStyle, input.cooking.skillConfidence, input.cooking.timeInvestment)}
- ${getTimeInvestmentText(input.cooking.timeInvestment)}
- ${getVarietySeekingText(input.cooking.varietySeeking)}
- ${getSkillConfidenceText(input.cooking.skillConfidence)}${(input.cooking.skillConfidence || 3) > 1 ? `\n- ${getCookingEnjoymentText(input.cooking.cookingEnjoyment)}` : ''}`;

  // Location & budget
  prompt += `

LOCATION & BUDGET:
- Location: ${city}, ${country}
- Shop at: ${store}
- Focus on ingredients commonly available at ${country} supermarkets
${buildBudgetSection(input)}

**MEAL PREP REQUIREMENTS** (based on planning style):
- ${getMealPrepRequirementsText(input.cooking.planningStyle, input.cooking.skillConfidence, input.cooking.timeInvestment)}

Please create a detailed ${occ.days}-day meal plan that:
1. **STARTS on ${startLabel}** and uses actual calendar dates
2. **MATCHES the meal prep personality** - don't give 21 meals to a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** for each meal
4. **INCLUDES ${input.sleep ? 'SPECIFIC' : 'GENERAL'} MEAL TIMES**
5. **INCLUDES DETAILED RECIPES** - ingredients with quantities/units, step-by-step instructions, prep/cook time, serving size. **WHOLE-PACK RULE**: use single-serve convenience products whole. **CURATED MEALS EXCEPTION**: for curated meals (by slug), show only name, slug, plate_id, scale_factor, calories, and macros — the app fills in the rest on import.
6. Uses ingredients available at ${store} in ${country}
7. Accounts for dietary restrictions and skill level
8. Hits macro targets using the tolerance rules below (protein daily, calories weekly average with a per-day band, carbs/fat weekly average, fiber daily)`;

  // Adjuster dials (inlined)
  prompt += buildAdjustersSection(input);

  // Static tail
  prompt += getGroceryListRequirements(store, occ.days);
  prompt += getDailyTotalsVerification();
  prompt += getVerificationSteps(occ.days);
  prompt += getFormatRequirements();
  prompt += getFeedbackWorkflow();

  return prompt;
};

// ================================
// STORAGE LOADER + DROP-IN WRAPPER
// ================================

export const loadMealPlanInput = async (): Promise<MealPlanInput> => {
  const nutritionResults = await WorkoutStorage.loadNutritionResults();
  const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
  const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
  const fridgePantryResults = await WorkoutStorage.loadFridgePantryResults();

  if (!nutritionResults || !budgetCookingResults) {
    throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
  }

  const macroResults = nutritionResults?.macroResults || ({} as any);
  const nutritionData = nutritionResults?.formData || ({} as any);
  const budgetData = budgetCookingResults?.formData || ({} as any);
  const sleepData = sleepResults?.formData;
  const fridge = fridgePantryResults?.formData;

  // Legacy favourite meals
  const favRaw = await AsyncStorage.getItem('@nutrition_favorites');
  const legacyFavoriteMeals = favRaw ? JSON.parse(favRaw) : [];

  // Curated favourites { slugs, cuisines, avoid, likedDishes } with legacy array fallback
  const curatedRaw = await AsyncStorage.getItem('@nutrition_curated_favorites');
  const curatedFavorites = (() => {
    const empty = { slugs: [] as string[], cuisines: [] as string[], avoid: [] as string[], likedDishes: [] as string[] };
    try {
      const parsed = curatedRaw ? JSON.parse(curatedRaw) : null;
      if (!parsed) return empty;
      const clean = (v: any): string[] => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim().length > 0) : []);
      if (Array.isArray(parsed)) return { ...empty, slugs: clean(parsed) };
      return { slugs: clean(parsed.slugs), cuisines: clean(parsed.cuisines), avoid: clean(parsed.avoid), likedDishes: clean(parsed.likedDishes) };
    } catch {
      return empty;
    }
  })();

  // Nutrient variety lives on the user profile
  const profileRaw = await AsyncStorage.getItem('@nutrition_user_profile');
  const userProfile = profileRaw ? JSON.parse(profileRaw) : null;

  return {
    macros: {
      calories: macroResults.calories || 2000,
      protein: macroResults.protein || 150,
      carbs: macroResults.carbs || 200,
      fat: macroResults.fat || 67,
    },
    goal: nutritionData.goal || 'maintain',
    rate: nutritionData.rate || 'moderate',
    mealsPerDay: budgetData.mealsPerDay || 3,
    planDuration: budgetData.planDuration || 7,
    snackingStyle: budgetData.snackingStyle || 'Occasional snacker',
    snackFrequency: budgetData.snackFrequency,
    dessertFrequency: budgetData.dessertFrequency,
    personal: {
      gender: nutritionData.gender || 'Not specified',
      age: nutritionData.age || 'Not specified',
      activityLevel: nutritionData.activityLevel || 'moderate',
      jobType: nutritionData.jobType || 'desk_job',
    },
    dietary: {
      allergies: budgetData.allergies || [],
      avoidFoods: budgetData.avoidFoods || [],
      eatingChallenges: budgetData.eatingChallenges || [],
    },
    cooking: {
      planningStyle: budgetData.planningStyle ?? 3,
      skillConfidence: budgetData.skillConfidence ?? 3,
      timeInvestment: budgetData.timeInvestment ?? 3,
      varietySeeking: budgetData.varietySeeking ?? 3,
      cookingEnjoyment: budgetData.cookingEnjoyment ?? 3,
    },
    nutrientVariety: userProfile?.nutrientVariety || nutritionData.nutrientVariety || 'moderate',
    restrictions: nutritionData.restrictions || [],
    supplements: nutritionData.supplements || [],
    location: {
      city: budgetData.city || 'Not specified',
      country: budgetData.country || 'Not specified',
      countryCode: budgetData.countryCode,
      groceryStore: budgetData.groceryStore || 'Local supermarket',
    },
    budget: {
      weeklyBudget: budgetData.weeklyBudget,
      budgetMin: budgetData.budgetMin,
      budgetMax: budgetData.budgetMax,
      budgetSkipped: budgetData.budgetSkipped,
    },
    startDate: budgetData.startDate,
    customStartDate: budgetData.customStartDate,
    sleep: sleepData?.bedtime && sleepData?.wakeTime
      ? { bedtime: sleepData.bedtime, wakeTime: sleepData.wakeTime, optimizationLevel: sleepData.optimizationLevel || 'minimal' }
      : null,
    pantry: fridge?.wantToUseExistingIngredients && fridge?.ingredients?.length
      ? { use: true, primaryApproach: fridge.preferences?.primaryApproach, ingredients: fridge.ingredients }
      : null,
    mealPreferences: {
      mode: budgetData.mealPreferences,
      customMealRequests: budgetData.customMealRequests,
      selectedFavorites: budgetData.selectedFavorites,
    },
    legacyFavoriteMeals,
    curatedFavorites,
  };
};

/** Drop-in replacement for the old assembleMealPlanningPrompt(). */
export const assembleMealPlanningPrompt = async (): Promise<string> => {
  const input = await loadMealPlanInput();
  return buildMealPlanPrompt(input);
};