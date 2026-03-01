# Review and Fix Meal Plan

First, read the meal plan you just created so you have the full content in context. Then review it as an experienced nutritionist and meal planning expert auditing a plan for a client. This is an independent quality gate — do not assume your self-check caught everything.

## CRITICAL INSTRUCTIONS

1. **Review the plan** using the checklist below, noting PASS or FAIL for each check.
2. **If ANY check fails, FIX IT IMMEDIATELY** — do not ask the user for permission to fix. Silently revise the plan to resolve all failures.
3. **After fixing, re-verify** — run the checklist again on the corrected plan to confirm all checks now pass.
4. **Present the CORRECTED plan** — output the complete, clean, final version of the meal plan with all fixes applied. Do not show the review process, do not show before/after comparisons, do not show your working. Present ONLY the clean corrected plan.
5. **At the end, provide a brief change log** — a short bullet list of what you changed and why (e.g., "Reduced rice from 100g to 80g dry to bring carbs within 10% of target").
6. **Remind the user about JSON conversion** — after presenting the corrected plan, tell the user: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."

## What "Fix" Means for Each Type of Failure

- **Nutrition targets off**: Adjust portion sizes, swap ingredients, or rebalance meals. Recalculate and verify.
- **Budget exceeded**: Swap premium ingredients for budget alternatives, reduce expensive protein frequency, adjust quantities.
- **Equipment violation**: Replace recipes requiring unavailable equipment with alternatives using only listed equipment.
- **Eating window wrong**: Shift meal times to fit the specified window. Recalculate gaps.
- **Grocery list errors**: Add missing items, correct quantities, fix prices.
- **Meal prep incomplete**: Add missing steps, equipment, or storage guidelines.
- **Draft/working shown**: Remove all iteration, working, and draft content. Present only the final clean version.
- **Internal contradictions**: Resolve all mismatches between overview tables, daily schedules, grocery lists, and recipes.

## Review Checklist

Work through each check. For each, state PASS or FAIL with a brief note. If FAIL, describe the fix you are applying.

### 1. Nutrition Target Verification
Compare actual nutrition against the user's targets:
- Daily calorie totals within 5-10% of target across all days
- Daily protein totals within 5-10% of target across all days
- Daily carb totals within 5-10% of target across all days
- Daily fat totals within 5-10% of target across all days
- Weekly averages hit nutrition targets even if individual days vary slightly
- **FAIL if** any macro is consistently off target by >10% or weekly averages miss targets
- **FIX**: Adjust portion sizes (reduce/increase carb sources, swap proteins, modify fat sources) until all days fall within 10%.

### 2. Budget Compliance
Check if the plan respects budget constraints:
- Grocery list total aligns with stated budget level (very tight, moderate, comfortable, etc.)
- Ingredient choices match budget category (budget-conscious vs premium items)
- Portion sizes are realistic for the stated budget
- No unnecessarily expensive ingredients for tight budgets
- **FAIL if** grocery costs significantly exceed stated budget or include inappropriate premium items for budget level
- **FIX**: Swap expensive ingredients, reduce premium protein frequency, or adjust the stated budget range to match reality (with explanation).

### 3. Meal Prep Style Alignment
Verify the plan matches the user's planning style preference:
- Weekly Planners (1-2): Should have 3-4 repeated meals max, batch cooking focus, detailed prep instructions
- Moderate Planners (3): Should have 5-6 different meals, some batch elements, balanced approach
- Daily Cookers (4-5): Should have mostly different meals, minimal batch cooking, fresh preparation focus
- Meal variety and prep instructions match stated preference level
- **FAIL if** meal variety/prep style doesn't align with user's stated planning preference
- **FIX**: Add or remove recipe variety, adjust batch cooking scope.

### 4. Dietary Restrictions & Preferences
Check compliance with dietary requirements:
- All listed allergies completely avoided in every meal
- All "avoid foods" list respected throughout the plan
- Eating challenges addressed appropriately
- Favorite meals incorporated if requested
- Custom meal requests fulfilled if specified
- **FAIL if** any restricted foods appear or preferences ignored
- **FIX**: Remove offending ingredients, replace with safe alternatives.

### 5. Cooking Feasibility
Assess if the plan is practical for the user:
- Cooking times align with user's time investment preference (5-min vs 2+ hours)
- Recipe complexity matches stated skill confidence level
- Only uses available cooking equipment (no oven recipes if no oven, etc.)
- Ingredient preparation difficulty appropriate for skill level
- Total daily cooking time realistic for lifestyle
- **FAIL if** recipes are too complex for skill level or equipment constraints violated
- **FIX**: Replace recipes requiring unavailable equipment. Simplify complex recipes. Ensure every recipe uses ONLY the listed equipment.

### 6. Location & Ingredient Availability
Verify ingredients are accessible:
- All ingredients commonly available at the specified grocery store in the specified country
- Seasonal ingredient considerations appropriate for location
- No exotic ingredients that would be hard to find
- Ingredient names and units match local standards
- **FAIL if** ingredients would be difficult to source at specified location/store
- **FIX**: Replace hard-to-find ingredients with common alternatives from the specified store.

### 7. Sleep Optimization Compliance (if applicable)
If sleep optimization was requested, check meal timing:
- Meal times align with specified sleep schedule
- Eating window matches optimization level (12-hour, 8-10 hour, or 8-hour)
- Last meal timing respects bedtime constraints (2-4+ hours before bed)
- First meal timing aligns with wake time preferences
- **FAIL if** meal timing conflicts with sleep optimization requirements
- **FIX**: Shift meal times to fit the specified eating window. Recalculate all gaps and verify.

### 8. Practical Implementation
Assess overall plan practicality:
- Shopping list is well-organized and complete
- Meal prep instructions are clear and actionable
- Storage and reheating guidance provided where needed
- Recipe instructions are detailed enough (minimum 3-5 steps)
- Serving sizes and portions are realistic
- **FAIL if** plan lacks practical implementation details or has unclear instructions
- **FIX**: Add missing details, expand thin recipes to minimum 3-5 steps, add storage/reheating notes.

### 9. Nutritional Quality & Balance
Beyond macro targets, evaluate nutritional completeness:
- **Fiber**: Daily fiber meets the stated target (within 80%). FAIL if consistently under.
- **Protein diversity**: At least 3 different primary protein sources across the plan. FAIL if only 1-2.
- **Vegetable diversity**: At least 6 different vegetables across the plan. FAIL if fewer.
- **Vegetable volume**: At least 300g non-starchy vegetables per day. FAIL if consistently under.
- **Carb diversity**: At least 3 different carb sources across the plan. FAIL if only 1-2.
- **Micronutrient coverage**: Across the full week, check for at least one serving each of: dark leafy greens, cruciferous vegetables, a vitamin C source, an omega-3 source, legumes/beans, and whole grains. FAIL if 3+ categories are completely absent.
- **FAIL if** 2+ of the above sub-checks fail
- **FIX**: Swap ingredients to add diversity, increase vegetable portions, add missing food groups.

### 10. Grocery List Completeness & Accuracy
Verify the grocery list is complete and correct:
- **Every ingredient** from every recipe across all 7 days appears in the grocery list
- **Quantities are totalled correctly** — e.g., if 4 meals use 200g chicken each, the list shows 800g
- **Prices are realistic** for the specified store and location
- **Categories are logical** — items are in the right shopping section
- **No phantom items** — nothing in the grocery list that isn't used in any recipe
- **Notes are helpful** — storage tips, usage notes, substitution suggestions
- Cross-check: Pick 3 random ingredients from recipes and verify they appear in the grocery list with correct quantities
- **FAIL if** 3+ ingredients are missing from the grocery list or quantities are significantly wrong
- **FIX**: Add missing items, correct quantities, remove phantom items, fix prices.

### 11. Meal Prep Session Completeness
Verify the meal prep guide is functional:
- **All batch-cooked items** from the recipes are covered in the prep session
- **Step-by-step instructions** are clear and logically ordered
- **Equipment list** matches what's actually needed for the prep
- **Storage guidelines** are included with realistic fridge/freezer times
- **Time estimates** are realistic (prep time + cook time = total time)
- **Coverage statement** accurately describes what the prep covers
- **FAIL if** meal prep session is missing, incomplete, or doesn't match the actual recipes
- **FIX**: Add missing prep steps, correct equipment list, add storage guidelines, fix time estimates.

### 12. Overall Coherence
Final assessment of plan quality:
- All meals work together as a cohesive weekly plan
- No conflicting instructions or impossible logistics
- Plan feels realistic and sustainable for the described lifestyle
- Cost estimates seem reasonable and well-researched
- Plan addresses the user's primary nutrition goals effectively
- Grocery list, meal prep session, and daily meals all reference the same ingredients consistently
- **No draft working, iterations, or revision commentary** — only clean final content
- **FAIL if** plan has internal contradictions or feels unrealistic overall
- **FIX**: Remove all draft content, resolve contradictions, ensure all sections reference the same data.

## Output Format

**If all 12 checks PASS on first review:**
- State "All checks passed — plan is ready."
- Present the plan as-is (clean, no changes needed).
- End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."

**If any checks FAIL:**
1. Show a brief summary table of PASS/FAIL results (one line per check).
2. Show a brief change log (bullet list of what you fixed and why).
3. Present the COMPLETE CORRECTED PLAN — the full meal plan document with all fixes applied, formatted cleanly. This must be a complete standalone document, not a diff or partial update.
4. End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."
