# MANIFEST — JSON.fit meal / nutrition data layer

Bundle: bundle-01.md, bundle-02.md, bundle-03.md, bundle-04.md, bundle-05.md (5 parts)

## Included files

| # | Path | Lines | Bundle | Why it matters |
|---|---|---:|---|---|
| 1 | `src/types/curated_meals.ts` | 388 | bundle-01.md | The meal schema itself: CuratedMeal, plate_macros, produces_servings, base_serving_multiplier, eligible_slots, scaling union, flex_ingredient_id, min/max_scale. Start here. |
| 2 | `src/types/ingredients.ts` | 245 | bundle-01.md | IngredientId union (195 ids) + the Ingredient interface. Note what it does NOT contain: no macros, no gram-per-unit. |
| 3 | `src/types/nutrition.ts` | 507 | bundle-01.md | Macro/calorie target types, meal-plan and day-plan shapes consumed by the planner. |
| 4 | `src/utils/goalsProfile.ts` | 173 | bundle-01.md | Defines the GoalsProfile interface + derivePhase / computeTargetLeanMass. The calorie & macro target source. |
| 5 | `src/data/ingredients.ts` | 2018 | bundle-01.md | THE ingredient registry: 195 rows. display_name, category, canonical_unit, dietary_flags, allergens, typical_pack_size, notes. NO macros, NO unit->gram conversion. |
| 6 | `src/data/curated_meals.ts` | 9397 | bundle-02.md | CURATED_MEALS. The entire recipe corpus. Statically imported => bundled into the app binary, not fetched. |
| 7 | `src/utils/ingredientScaling.ts` | 219 | bundle-03.md | The display-scaling engine. Header documents that it DELIBERATELY IGNORES the per-row `scaling` field; scaling is uniform across the plate. |
| 8 | `src/utils/curated_meals_validation.ts` | 301 | bundle-03.md | Boot-time validator. The ONLY reader of flex_ingredient_id; the only place ingredient_id is checked against INGREDIENTS. |
| 9 | `src/utils/mealFeasibility.ts` | 579 | bundle-03.md | Reads min_scale/max_scale to decide whether a meal can hit a macro target. Core scaling math. |
| 10 | `src/utils/buildPrepSession.ts` | 513 | bundle-03.md | Batch/meal-prep aggregation across meals; resolves ingredient_id for the prep session. |
| 11 | `src/utils/curatedShelves.ts` | 189 | bundle-03.md | Shelf/category grouping of CURATED_MEALS for the library UI. |
| 12 | `src/utils/nutritionMacros.ts` | 280 | bundle-03.md | Calorie/macro target computation from the GoalsProfile. |
| 13 | `src/utils/goalsProfileStorage.ts` | 51 | bundle-03.md | AsyncStorage persistence for GoalsProfile. |
| 14 | `src/utils/recipeFavorites.ts` | 161 | bundle-03.md | Favorite-recipe persistence. |
| 15 | `src/utils/curatedFavoritesStorage.ts` | 257 | bundle-03.md | Curated-meal favorites persistence (slug-based). |
| 16 | `src/utils/mealPlanPromptV2.ts` | 990 | bundle-03.md | V2 prompt assembly. Reads min_scale/max_scale and plate_macros into the LLM prompt text. |
| 17 | `src/data/mealPlanPromptBuilder.ts` | 1013 | bundle-03.md | Meal-plan prompt assembly; serialises plate_macros/eligible_slots into prompt text. |
| 18 | `src/data/mealPlanningPrompt.ts` | 1402 | bundle-03.md | The large meal-planning prompt template. |
| 19 | `src/assets/mealImages.ts` | 205 | bundle-03.md | Slug -> hero image resolution for meals. |
| 20 | `src/screens/RecipeDetailScreen.tsx` | 860 | bundle-04.md | THE recipe detail screen. Resolves ingredient_id -> display_name via INGREDIENTS; renders scaled ingredient list + macros. |
| 21 | `src/screens/CookModeScreen.tsx` | 1399 | bundle-04.md | THE cook mode. Step-by-step cooking with scaled quantities. |
| 22 | `src/screens/MealPlanDayScreen.tsx` | 2150 | bundle-04.md | THE meal planner day view. Largest planner surface; reads plate_macros/eligible_slots. |
| 23 | `src/screens/MealPlanPreviewScreen.tsx` | 885 | bundle-04.md | Meal-plan preview before commit. |
| 24 | `src/screens/MealPrepSessionScreen.tsx` | 988 | bundle-04.md | Meal-prep/batch-cook session UI. |
| 25 | `src/screens/MealsLibraryScreen.tsx` | 609 | bundle-04.md | Meal library browse/filter. |
| 26 | `src/screens/nutrition/MealDetailScreen.tsx` | 582 | bundle-04.md | Second meal-detail surface (nutrition tab). Also resolves ingredient_id via INGREDIENTS. |
| 27 | `src/screens/NutritionHomeScreen.tsx` | 2953 | bundle-05.md | Nutrition tab home; macro rings + day summary. |
| 28 | `src/screens/SmoothiesLibraryScreen.tsx` | 348 | bundle-05.md | Smoothie shelf UI. |
| 29 | `src/screens/nutrition/CuratedFavoritesScreen.tsx` | 1947 | bundle-05.md | Curated favorites picker feeding the planner. |
| 30 | `src/screens/LibraryScreen.tsx` | 825 | bundle-05.md | Top-level library shelf; reads plate_macros for cards. |
| 31 | `src/components/GoalsProfileSummaryCard.tsx` | 176 | bundle-05.md | Renders the GoalsProfile summary (targets). |

**31 files, 32,610 lines, 1274 KB of bundle.**

## Secrets

Every bundled file was scanned for API keys, tokens, and secrets.
**No secrets were found in any bundled file — nothing needed redacting.** (The repo's known hardcoded secrets — the analytics `sharedSecret` and Lambda URLs — live in `App.tsx` and `src/services/*`, which are not part of the meal/nutrition data layer and are not included here.)

## MISSING — asked for, does not exist in this repo

| Item | Status |
|---|---|
| **Ingredient database with macros** | **PARTIAL / EFFECTIVELY MISSING.** `src/data/ingredients.ts` exists with 195 rows, but each row carries only: `id`, `display_name`, `category`, `canonical_unit`, `dietary_flags`, `allergens`, `typical_pack_size?`, `typical_pack_unit?`, `notes?`. There are **no macros per 100 g, no grams-per-unit, and no raw/dry/cooked state**. Calorie/protein figures appear only as loose English prose inside `notes` on ~6 rows ("~140 kcal and ~21g protein per 100g"), unparseable and not on most rows. **You cannot resolve an `ingredient_id` to macros, and you cannot convert `tsp`/`cloves`/`count` to grams, anywhere in this codebase.** Per-meal `plate_macros` in `curated_meals.ts` are hand-authored and cannot be re-derived from ingredients. |
| **Cookbook PDF generator** | **DOES NOT EXIST.** No `expo-print`, `react-native-html-to-pdf`, `jspdf`, or `pdfkit` dependency; no `printToFileAsync` call; no cookbook module anywhere in the repo. Nothing to hand over. |
| `scaling` field consumer | **NO RUNTIME CONSUMER.** `'scales' \| 'fixed' \| 'flex'` is authored on every ingredient row in `curated_meals.ts` and typed in `src/types/curated_meals.ts`, but `ingredientScaling.ts` documents that it intentionally never reads it. The field is inert data. |
| `flex_ingredient_id` consumer | **VALIDATION ONLY.** Read only by `curated_meals_validation.ts` (existence check). No feature uses it to actually flex a portion. |

## Notes on things that look like files but aren't

- `meals.json` (repo root, 15,241 lines) is a **generated artifact** of `regenerate_meals_json.js`. No app code imports it. Not bundled.
- `tmp/data/curated_meals.js`, `tmp/utils/*` are stale compiled copies. Not bundled.
