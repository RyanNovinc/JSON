# Ingredient usage report — `src/data/curated_meals.ts`

Generated read-only from branch `feature/file-import`. Source of truth: the 85 meals in
`src/data/curated_meals.ts`, parsed by evaluating the exported object (not regex-scraped), covering
both `methods[].ingredients[]` and `plates[].additional_ingredients[]`.

- **85** meals
- **988** total ingredient references (861 in methods, 127 in plate `additional_ingredients`)
- **183** distinct `ingredient_id`s referenced
- **183** rows exist in `src/data/ingredients.ts`

Sorted by usage count, descending.

---

## salt

_53 references across 41 meals_

- **Amounts:**
  - `tsp`: 0.06 (chocolate_protein_mousse, chocolate_protein_mug_cake, edible_protein_cookie_dough); 0.12 (frozen_date_snickers_bark, hard_boiled_eggs); 0.25 (beef_stew, big_breakfast_plate, bolognese, cottage_cheese_bowl, edamame, fudgy_protein_brownies, king_kong_chocolate, lamb_shanks, palacinke, protein_chocolate_chip_cookies, pulled_pork, scramble_stack, smoked_salmon_bagel); 0.5 (butter_chicken, cottage_cheese_ice_cream, egg_muffins, freezer_breakfast_burrito, protein_banana_bread, roasted_chickpeas, shakshuka, steak_and_eggs); 1 (beef_stew, bolognese, carne_asada_bowl, chicken_fajita_bowl, chicken_mac_and_cheese, chicken_schnitzel, chicken_shawarma, lamb_kofta, lamb_shanks, pulled_pork, sheet_pan_salmon_potatoes, sheet_pan_sausage_veg, spaghetti_carbonara, spicy_chipotle_chicken_burrito, tuna_pasta_bake); 1.5 (beef_ragu_gnocchi, cevapi, chilli_con_carne, turkey_meatballs_spaghetti)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Balances the sweetness."  _(palacinke)_
  - "Flaky, sprinkled on top."  _(frozen_date_snickers_bark)_
  - "Flaky, to finish."  _(edamame)_
  - "For seasoning the mash."  _(beef_stew, lamb_shanks)_
  - "For the pasta water."  _(bolognese, spaghetti_carbonara)_
  - "For the potato skin."  _(bolognese, pulled_pork)_
  - "For the rub. Approximately 6 g."  _(pulled_pork)_
  - "Pinch to taste."  _(cottage_cheese_bowl)_
  - "Pinch — enhances the chocolate flavour."  _(king_kong_chocolate)_
  - "Plus any spices you like — paprika, cumin."  _(roasted_chickpeas)_
  - "Tiny pinch to enhance sweetness."  _(cottage_cheese_ice_cream)_
  - "To season when eating."  _(hard_boiled_eggs)_
- **flex_ingredient_id in:** _none_

## olive_oil

_41 references across 32 meals_

- **Amounts:**
  - `g`: 5 (bolognese, egg_muffins, pulled_pork, smoked_salmon_bagel); 7 (steak_and_eggs); 9 (shakshuka); 10 (butter_chicken); 11 (freezer_breakfast_burrito); 14 (beef_bulgogi_bowl, carne_asada_bowl, cottage_cheese_bowl, honey_soy_salmon_noodles, lamb_kofta, satay_chicken, spicy_chipotle_chicken_burrito, thai_basil_chicken, tuna_pasta_bake); 15 (roasted_chickpeas); 18 (beef_ragu_gnocchi); 28 (beef_broccoli_stir_fry, chicken_shawarma, honey_chicken, sheet_pan_salmon_potatoes, teriyaki_chicken_rice_bowl, thai_basil_chicken, turkey_meatballs_spaghetti); 30 (bolognese, chilli_con_carne, massaman); 32 (sheet_pan_sausage_veg); 42 (chicken_fajita_bowl); 45 (beef_stew, lamb_shanks); 55 (chicken_schnitzel)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "1 tbsp for softening aromatics."  _(tuna_pasta_bake)_
  - "About 1 tbsp."  _(roasted_chickpeas)_
  - "Extra virgin olive oil, approximately 1 tbsp."  _(cottage_cheese_bowl)_
  - "For browning and sauce."  _(turkey_meatballs_spaghetti)_
  - "For browning the chicken."  _(teriyaki_chicken_rice_bowl)_
  - "For browning."  _(massaman)_
  - "For cooking."  _(chicken_fajita_bowl)_
  - "For frying the eggs."  _(smoked_salmon_bagel)_
  - "For greasing the tin."  _(egg_muffins)_
  - "For roasting/searing. ~1 tbsp."  _(honey_soy_salmon_noodles)_
  - "For searing."  _(beef_broccoli_stir_fry, beef_bulgogi_bowl, lamb_kofta, satay_chicken)_
  - "For the finishing drizzle."  _(bolognese)_
  - "For the potato skin."  _(bolognese, pulled_pork)_
  - "For the potatoes."  _(sheet_pan_salmon_potatoes, steak_and_eggs)_
  - "Shallow-fry; most drains off (only ~20g retained in macros)."  _(honey_chicken)_
  - "Shallow-fry; ~12g absorbed/serve (most drains). Oven-bake w/ spray for ~10g less fat/serve."  _(chicken_schnitzel)_
  - "Split: 15g for browning the beef, 15g for sautéing the aromatics."  _(massaman)_
  - "Split: 15g for sautéing aromatics, 15g for browning the mince."  _(chilli_con_carne)_
  - "Split: 15g for sautéing the soffritto, 15g for browning the mince."  _(bolognese)_
  - "Split: 30g for browning, 15g for sautéing the vegetables."  _(beef_stew)_
  - "Split: 30g for searing the shanks, 15g for sautéing the vegetables."  _(lamb_shanks)_
  - "Split: 30g for searing, 15g for sautéing the vegetables."  _(lamb_shanks)_
  - "To fry the eggs."  _(thai_basil_chicken)_
  - "~1 tbsp."  _(carne_asada_bowl)_
  - "~2.5 tbsp across the tray."  _(sheet_pan_sausage_veg)_
- **flex_ingredient_id in:** _none_

## black_pepper_ground

_37 references across 27 meals_

- **Amounts:**
  - `tsp`: 0.125 (beef_stew, lamb_shanks); 0.25 (big_breakfast_plate, cottage_cheese_bowl, pulled_pork, scramble_stack, shakshuka, smoked_salmon_bagel); 0.5 (beef_bulgogi_bowl, beef_ragu_gnocchi, beef_stew, bolognese, carne_asada_bowl, cevapi, chicken_fajita_bowl, chicken_mac_and_cheese, chicken_schnitzel, chicken_shawarma, egg_muffins, freezer_breakfast_burrito, lamb_kofta, lamb_shanks, pulled_pork, sheet_pan_salmon_potatoes, sheet_pan_sausage_veg, spicy_chipotle_chicken_burrito, steak_and_eggs, tuna_pasta_bake, turkey_meatballs_spaghetti); 0.75 (spaghetti_carbonara); 1.5 (pulled_pork)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For seasoning the mash."  _(beef_stew, lamb_shanks)_
  - "For the BBQ sauce."  _(pulled_pork)_
  - "For the rub."  _(pulled_pork)_
  - "Freshly ground, generous."  _(spaghetti_carbonara)_
  - "Freshly ground, to taste."  _(cottage_cheese_bowl)_
  - "Marinade."  _(beef_bulgogi_bowl)_
- **flex_ingredient_id in:** _none_

## full_cream_milk

_32 references across 31 meals_

- **Amounts:**
  - `ml`: 20 (chocolate_protein_mousse); 30 (beef_stew, fudgy_protein_brownies, lamb_shanks); 40 (edible_protein_cookie_dough); 60 (chocolate_protein_mug_cake, protein_pancakes, turkey_meatballs_spaghetti); 67 (bolognese); 100 (maple_muscle_toast); 120 (baked_oats); 200 (dirty_eden, overnight_oats); 250 (muscle_oats, pulled_pork, strawberry_stack, tuna_pasta_bake); 300 (chicken_mac_and_cheese, choc_muscle_maxx, cookies_gains, energy_lift_heavy, king_kong_chocolate, mango_mass, mornin_muscle, raspberry_rip, strawbrekkie_beast); 350 (banana_bulk, brekkie_grow, protein_shake); 360 (protein_ice_cream); 400 (palacinke)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Creates the signature thin texture."  _(palacinke)_
  - "For the béchamel. Full bake uses 400ml."  _(bolognese)_
  - "Full-cream for richness, or protein/skim."  _(chicken_mac_and_cheese)_
  - "Lite/skim for leaner macros, or high-protein milk for more protein."  _(protein_ice_cream)_
  - "Loosen the batter if thick."  _(fudgy_protein_brownies)_
  - "Milk for more calories; water for a leaner shake."  _(protein_shake)_
  - "Soaks breadcrumbs for tender meatballs."  _(turkey_meatballs_spaghetti)_
  - "To loosen if needed."  _(chocolate_protein_mousse)_
  - "To loosen to a dough; add a splash more if dry."  _(edible_protein_cookie_dough)_
  - "To thin the batter."  _(protein_pancakes)_
- **flex_ingredient_id in:** _none_

## garlic_clove

_30 references across 24 meals_

- **Amounts:**
  - `cloves`: 2 (butter_chicken, shakshuka, steak_and_eggs, tuna_pasta_bake); 3 (carne_asada_bowl, honey_chicken, honey_soy_salmon_noodles, lamb_shanks, satay_chicken); 4 (beef_broccoli_stir_fry, beef_bulgogi_bowl, beef_ragu_gnocchi, beef_stew, bolognese, chicken_fajita_bowl, massaman, sheet_pan_salmon_potatoes, teriyaki_chicken_rice_bowl, turkey_meatballs_spaghetti); 5 (chicken_shawarma, chilli_con_carne, lamb_kofta); 6 (cevapi, thai_basil_chicken)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Crushed, for the steak butter."  _(steak_and_eggs)_
  - "Crushed."  _(shakshuka)_
  - "Fresh garlic preferred."  _(turkey_meatballs_spaghetti)_
  - "Glaze, minced."  _(honey_soy_salmon_noodles)_
  - "Heavy hand — the signature."  _(cevapi)_
  - "Marinade."  _(carne_asada_bowl)_
  - "Mince + sauce."  _(lamb_kofta)_
  - "Minced, into marinade."  _(beef_bulgogi_bowl)_
  - "Minced."  _(beef_broccoli_stir_fry, beef_stew, bolognese, chicken_fajita_bowl, chilli_con_carne, honey_chicken, lamb_shanks, massaman, satay_chicken, teriyaki_chicken_rice_bowl)_
  - "Minced; some with potatoes, most in the butter."  _(sheet_pan_salmon_potatoes)_
  - "Optional if using fresh."  _(tuna_pasta_bake)_
- **flex_ingredient_id in:** _none_

## brown_onion

_28 references across 22 meals_

- **Amounts:**
  - `g`: 20 (smoked_salmon_bagel); 60 (egg_muffins); 75 (beef_bulgogi_bowl, butter_chicken); 80 (shakshuka); 120 (freezer_breakfast_burrito); 150 (beef_ragu_gnocchi, carne_asada_bowl, cevapi, chicken_shawarma, lamb_kofta, lamb_shanks, satay_chicken, spicy_chipotle_chicken_burrito, tuna_pasta_bake, turkey_meatballs_spaghetti); 200 (massaman); 250 (beef_stew); 300 (bolognese, chicken_fajita_bowl, chilli_con_carne, sheet_pan_sausage_veg)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 large onion, sliced."  _(massaman)_
  - "Approximately 1 large, halved and sliced 1cm thick."  _(beef_stew)_
  - "Approximately 1 medium, finely diced."  _(lamb_shanks)_
  - "Approximately 2 medium onions, diced."  _(chilli_con_carne)_
  - "Approximately 2 medium onions, finely diced."  _(bolognese)_
  - "Chunked; red onion fine. ~2 medium onions."  _(sheet_pan_sausage_veg)_
  - "Diced for sauce. 1 medium onion."  _(turkey_meatballs_spaghetti)_
  - "Diced."  _(egg_muffins, freezer_breakfast_burrito, shakshuka)_
  - "Grated into the marinade."  _(beef_bulgogi_bowl)_
  - "Grated into the mince for moisture (red onion for the salad)."  _(lamb_kofta)_
  - "Grated into the mix — key for moisture (raw red onion to serve)."  _(cevapi)_
  - "Optional; soften first. ~1 medium onion."  _(tuna_pasta_bake)_
  - "Red onion for salsa."  _(spicy_chipotle_chicken_burrito)_
  - "Red onion for the pico. ~1 medium onion."  _(carne_asada_bowl)_
  - "Red onion, thinly sliced."  _(smoked_salmon_bagel)_
  - "Sliced, charred into the sauce."  _(satay_chicken)_
  - "Sliced."  _(chicken_fajita_bowl)_
- **flex_ingredient_id in:** _none_

## banana

_24 references across 21 meals_

- **Amounts:**
  - `g`: 60 (baked_oats); 120 (banana_snack, brekkie_grow, choc_muscle_maxx, cookies_gains, dirty_eden, energy_lift_heavy, greek_yoghurt_bowl, king_kong_chocolate, mango_mass, maple_muscle_toast, mornin_muscle, muscle_oats, overnight_oats, pb_banana_toast, protein_pancakes, raspberry_rip, strawberry_stack, strawbrekkie_beast); 240 (banana_bulk); 360 (protein_banana_bread)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "1 medium, sliced over the top."  _(overnight_oats)_
  - "1 medium, sliced, for topping."  _(maple_muscle_toast, muscle_oats)_
  - "1 medium, sliced."  _(greek_yoghurt_bowl, protein_pancakes)_
  - "1 medium."  _(pb_banana_toast)_
  - "2 frozen bananas, peeled."  _(banana_bulk)_
  - "Frozen, peeled. Roughly 1 medium banana."  _(brekkie_grow, choc_muscle_maxx, cookies_gains, king_kong_chocolate, mango_mass, strawberry_stack)_
  - "Frozen, peeled."  _(dirty_eden, energy_lift_heavy, mornin_muscle, raspberry_rip, strawbrekkie_beast)_
  - "Mashed into the batter."  _(baked_oats)_
  - "Sliced over."  _(baked_oats)_
  - "Very ripe — the riper the sweeter. About 3 medium bananas."  _(protein_banana_bread)_
- **flex_ingredient_id in:** banana_snack

## honey

_24 references across 23 meals_

- **Amounts:**
  - `g`: 14 (pb_banana_toast); 21 (baked_oats, banana_bulk, brekkie_grow, choc_muscle_maxx, cookies_gains, dirty_eden, energy_lift_heavy, greek_yoghurt_bowl, king_kong_chocolate, mango_mass, muscle_oats, overnight_oats, raspberry_rip, strawberry_stack, strawbrekkie_beast); 25 (cottage_cheese_ice_cream); 28 (no_bake_protein_cheesecake); 60 (no_bake_protein_balls, protein_chocolate_chip_cookies); 80 (honey_soy_salmon_noodles); 90 (honey_chicken); 126 (teriyaki_chicken_rice_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "About 1 tablespoon for natural sweetness."  _(cottage_cheese_ice_cream)_
  - "Approximately 1 tbsp."  _(baked_oats, banana_bulk, brekkie_grow, choc_muscle_maxx, cookies_gains, dirty_eden, energy_lift_heavy, greek_yoghurt_bowl, king_kong_chocolate, mango_mass, muscle_oats, overnight_oats, raspberry_rip, strawberry_stack, strawbrekkie_beast)_
  - "Approximately 1/2 tbsp."  _(pb_banana_toast)_
  - "Base."  _(no_bake_protein_cheesecake)_
  - "Glaze base — the main carb/sugar contributor; defining feature."  _(honey_chicken)_
  - "Glaze; main carb driver."  _(honey_soy_salmon_noodles)_
  - "Or coconut sugar for a more classic cookie spread."  _(protein_chocolate_chip_cookies)_
  - "Or maple syrup."  _(no_bake_protein_balls)_
- **flex_ingredient_id in:** _none_

## whey_protein_vanilla

_24 references across 23 meals_

- **Amounts:**
  - `g`: 20 (frozen_date_snickers_bark); 25 (pb_banana_toast); 30 (baked_oats, banana_bulk, brekkie_grow, chocolate_protein_mug_cake, dirty_eden, energy_lift_heavy, greek_yoghurt_bowl, mango_mass, maple_muscle_toast, muscle_oats, no_bake_protein_cheesecake, overnight_oats, protein_pancakes, strawberry_stack, strawbrekkie_beast); 35 (protein_ice_cream, protein_shake); 40 (edible_protein_cookie_dough); 50 (protein_chocolate_chip_cookies); 60 (no_bake_protein_balls, protein_banana_bread)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "1 scoop, stirred into the yoghurt for a thick protein base."  _(greek_yoghurt_bowl)_
  - "1 scoop. Pre-mix with a splash of the milk to avoid clumps."  _(overnight_oats)_
  - "1 scoop. Stir in off the heat so it stays smooth."  _(muscle_oats)_
  - "1 scoop. Whisk in last so it does not clump."  _(maple_muscle_toast)_
  - "1 scoop."  _(baked_oats, banana_bulk, brekkie_grow, dirty_eden, energy_lift_heavy, mango_mass, protein_pancakes, strawberry_stack, strawbrekkie_beast)_
  - "About 1 to 1.5 scoops. Vanilla or chocolate."  _(protein_ice_cream)_
  - "About 1-1.5 scoops."  _(protein_shake)_
  - "Chocolate or vanilla. Acts as the "flour"."  _(chocolate_protein_mug_cake)_
  - "Mashed into the banana so it spreads smooth."  _(pb_banana_toast)_
  - "Stirred into the peanut butter for the higher-protein version."  _(frozen_date_snickers_bark)_
  - "Vanilla or chocolate. Whey blends/casein bake softer than isolate."  _(protein_chocolate_chip_cookies)_
  - "Vanilla or chocolate."  _(no_bake_protein_balls)_
  - "Vanilla. Casein/blend bakes softer than isolate."  _(protein_banana_bread)_
  - "Vanilla."  _(edible_protein_cookie_dough)_
  - "Vanilla; also helps it set firm."  _(no_bake_protein_cheesecake)_
- **flex_ingredient_id in:** chocolate_protein_mug_cake, edible_protein_cookie_dough, no_bake_protein_balls, no_bake_protein_cheesecake, protein_banana_bread, protein_chocolate_chip_cookies, protein_ice_cream, protein_shake

## egg_whole

_21 references across 21 meals_

- **Amounts:**
  - `count`: 0.17 (bolognese); 1 (baked_oats, chocolate_protein_mug_cake, turkey_meatballs_spaghetti); 2 (chicken_schnitzel, fudgy_protein_brownies, hard_boiled_eggs, maple_muscle_toast, palacinke, protein_banana_bread, protein_chocolate_chip_cookies, protein_pancakes, smoked_salmon_bagel, spaghetti_carbonara); 3 (big_breakfast_plate, steak_and_eggs); 4 (scramble_stack, shakshuka, thai_basil_chicken); 8 (egg_muffins); 10 (freezer_breakfast_burrito)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "1 whole egg + 1 extra yolk per serving for richness — treat as ~2 eggs in macros."  _(spaghetti_carbonara)_
  - "1/6 of one whole egg per portion. The bake uses 1 whole egg mixed into the ricotta layer."  _(bolognese)_
  - "Beaten."  _(chicken_schnitzel)_
  - "Binds the batter."  _(baked_oats)_
  - "Binds the meatballs."  _(turkey_meatballs_spaghetti)_
  - "For richness and structure."  _(palacinke)_
  - "Fried, yolks soft."  _(smoked_salmon_bagel)_
  - "Fried."  _(big_breakfast_plate)_
  - "One fried egg per serve."  _(thai_basil_chicken)_
  - "Whole egg for a moister, richer cake."  _(chocolate_protein_mug_cake)_
- **flex_ingredient_id in:** hard_boiled_eggs

## peanut_butter_natural

_20 references across 19 meals_

- **Amounts:**
  - `g`: 16 (cookies_gains, mornin_muscle); 32 (baked_oats, brekkie_grow, choc_muscle_maxx, greek_yoghurt_bowl, king_kong_chocolate, muscle_oats, overnight_oats, protein_pancakes); 40 (no_bake_protein_cheesecake, pb_banana_toast); 48 (banana_bulk); 60 (edible_protein_cookie_dough); 80 (frozen_date_snickers_bark, satay_chicken); 128 (fudgy_protein_brownies); 130 (no_bake_protein_balls); 200 (protein_chocolate_chip_cookies)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 1 tbsp."  _(cookies_gains, mornin_muscle)_
  - "Approximately 2 tbsp, drizzled."  _(baked_oats, greek_yoghurt_bowl, overnight_oats, protein_pancakes)_
  - "Approximately 2 tbsp, for topping."  _(muscle_oats)_
  - "Approximately 2 tbsp."  _(brekkie_grow, choc_muscle_maxx, king_kong_chocolate)_
  - "Approximately 2.5 tbsp."  _(pb_banana_toast)_
  - "Approximately 3 tbsp."  _(banana_bulk)_
  - "Base binder."  _(no_bake_protein_cheesecake)_
  - "Smooth natural; base of the sauce. Fat-dense — counts a lot."  _(satay_chicken)_
  - "Smooth, no-added-sugar. Almond butter works too (becomes tree nuts)."  _(fudgy_protein_brownies)_
  - "Smooth. Forms the flourless dough base."  _(protein_chocolate_chip_cookies)_
  - "Smooth."  _(edible_protein_cookie_dough)_
  - "Smooth; the binder."  _(no_bake_protein_balls)_
  - "Warmed to spread."  _(frozen_date_snickers_bark)_
- **flex_ingredient_id in:** banana_bulk, king_kong_chocolate

## cheese_tasty_grated

_18 references across 12 meals_

- **Amounts:**
  - `g`: 30 (bolognese, cheese_snack, chilli_con_carne, pulled_pork); 40 (chilli_con_carne, scramble_stack); 60 (pulled_pork); 80 (carne_asada_bowl, chicken_schnitzel, egg_muffins, spicy_chipotle_chicken_burrito); 120 (chicken_schnitzel); 130 (tuna_pasta_bake); 150 (freezer_breakfast_burrito); 200 (chicken_mac_and_cheese)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "About one slice, one string cheese, or one Babybel."  _(cheese_snack)_
  - "Grated cheddar/tasty (mix with mozzarella if you like); sauce + topping."  _(chicken_mac_and_cheese)_
  - "Grated cheddar/tasty; sauce + top."  _(tuna_pasta_bake)_
  - "Grated topping; optional."  _(carne_asada_bowl)_
  - "More than the bowl plate — needs to blanket the chips."  _(chilli_con_carne)_
  - "Stirred through the eggs at the end."  _(scramble_stack)_
- **flex_ingredient_id in:** cheese_snack

## greek_yoghurt_vanilla_full_fat

_16 references across 15 meals_

- **Amounts:**
  - `g`: 80 (baked_oats, protein_pancakes); 100 (maple_muscle_toast); 120 (overnight_oats); 200 (banana_bulk, brekkie_grow, cookies_gains, energy_lift_heavy, king_kong_chocolate, mango_mass, mornin_muscle, raspberry_rip, strawberry_stack, strawbrekkie_beast); 280 (greek_yoghurt_bowl)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Dolloped on top."  _(baked_oats)_
  - "For topping."  _(maple_muscle_toast)_
  - "Keeps the pancakes moist and fluffy."  _(protein_pancakes)_
- **flex_ingredient_id in:** greek_yoghurt_bowl

## butter_salted

_14 references across 13 meals_

- **Amounts:**
  - `g`: 5 (bolognese); 8 (protein_pancakes); 10 (beef_stew, maple_muscle_toast); 12 (big_breakfast_plate, scramble_stack, steak_and_eggs); 20 (chicken_mac_and_cheese, pulled_pork); 25 (beef_stew, lamb_shanks); 30 (palacinke); 40 (chicken_schnitzel, sheet_pan_salmon_potatoes)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For frying and the toast."  _(big_breakfast_plate)_
  - "For searing the steak."  _(steak_and_eggs)_
  - "For the bread."  _(beef_stew)_
  - "For the béchamel. Full bake uses 30g."  _(bolognese)_
  - "For the eggs and the toast."  _(scramble_stack)_
  - "For the lemon-garlic butter."  _(sheet_pan_salmon_potatoes)_
  - "For the pan."  _(maple_muscle_toast, protein_pancakes)_
  - "Melted, for the batter and pan."  _(palacinke)_
  - "Optional roux."  _(chicken_mac_and_cheese)_
- **flex_ingredient_id in:** _none_

## jasmine_rice

_13 references across 13 meals_

- **Amounts:**
  - `g`: 75 (steamed_rice); 260 (spicy_chipotle_chicken_burrito); 300 (carne_asada_bowl, satay_chicken); 320 (chicken_fajita_bowl); 340 (cevapi, lamb_kofta); 360 (thai_basil_chicken); 370 (beef_broccoli_stir_fry, beef_bulgogi_bowl, honey_chicken, teriyaki_chicken_rice_bowl); 400 (chicken_shawarma)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "2 cups uncooked."  _(beef_broccoli_stir_fry, beef_bulgogi_bowl, honey_chicken, teriyaki_chicken_rice_bowl)_
  - "65g dry/serve."  _(spicy_chipotle_chicken_burrito)_
  - "85g dry/serve."  _(cevapi)_
  - "85g dry/serve; basmati fine."  _(lamb_kofta)_
  - "90g dry/serve."  _(thai_basil_chicken)_
  - "About 75g dry per serve."  _(satay_chicken)_
  - "Cilantro-lime style; ~75g dry/serve."  _(carne_asada_bowl)_
  - "Dry weight; makes ~190g cooked."  _(steamed_rice)_
  - "Uncooked, about 1.5 cups."  _(chicken_fajita_bowl)_
- **flex_ingredient_id in:** steamed_rice

## paprika_sweet

_12 references across 10 meals_

- **Amounts:**
  - `tsp`: 1 (carne_asada_bowl, chicken_fajita_bowl, chicken_schnitzel, shakshuka, sheet_pan_sausage_veg); 2 (chicken_shawarma, lamb_kofta, pulled_pork); 4 (cevapi); 8 (chilli_con_carne)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For the rub."  _(pulled_pork)_
  - "In the crumb/flour."  _(chicken_schnitzel)_
  - "Sweet or smoked — the heart of the flavour."  _(cevapi)_
- **flex_ingredient_id in:** _none_

## tomato_paste

_12 references across 7 meals_

- **Amounts:**
  - `g`: 30 (beef_stew, lamb_shanks, turkey_meatballs_spaghetti); 50 (beef_ragu_gnocchi); 60 (bolognese); 90 (chilli_con_carne); 120 (chicken_schnitzel)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 2 tbsp."  _(beef_stew, lamb_shanks)_
  - "Approximately 4 tbsp."  _(bolognese)_
  - "Approximately 6 tbsp."  _(chilli_con_carne)_
  - "Browned for depth."  _(beef_ragu_gnocchi)_
  - "Concentrates tomato flavor. 2 tbsp."  _(turkey_meatballs_spaghetti)_
  - "Or pasta sauce."  _(chicken_schnitzel)_
- **flex_ingredient_id in:** _none_

## ground_cumin

_11 references across 9 meals_

- **Amounts:**
  - `tsp`: 0.5 (pulled_pork); 1 (butter_chicken, shakshuka); 2 (carne_asada_bowl, chicken_fajita_bowl, chicken_shawarma, lamb_kofta, spicy_chipotle_chicken_burrito); 10 (chilli_con_carne)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For the rub."  _(pulled_pork)_
  - "Marinade."  _(carne_asada_bowl)_
- **flex_ingredient_id in:** _none_

## maple_syrup

_11 references across 10 meals_

- **Amounts:**
  - `ml`: 7 (chocolate_protein_mug_cake); 15 (chocolate_protein_mousse); 20 (brekkie_grow, maple_muscle_toast, mornin_muscle, protein_pancakes); 30 (edible_protein_cookie_dough); 40 (no_bake_protein_cheesecake); 60 (protein_banana_bread); 80 (fudgy_protein_brownies)
- **`scaling` values:** `scales`
- **`notes`:**
  - "About 1/3 cup."  _(fudgy_protein_brownies)_
  - "Adjust to taste."  _(chocolate_protein_mousse)_
  - "Approximately 1 tbsp."  _(brekkie_grow, maple_muscle_toast, mornin_muscle, protein_pancakes)_
- **flex_ingredient_id in:** _none_

## brown_sugar

_10 references across 6 meals_

- **Amounts:**
  - `g`: 5 (carne_asada_bowl); 12 (beef_broccoli_stir_fry); 18 (satay_chicken); 24 (beef_bulgogi_bowl, pulled_pork); 30 (massaman)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 2 tbsp."  _(massaman)_
  - "Balances the sauce."  _(satay_chicken)_
  - "For the BBQ sauce. Approximately 2 tbsp."  _(pulled_pork)_
  - "For the rub. Approximately 2 tbsp."  _(pulled_pork)_
  - "Marinade; honey works too."  _(beef_bulgogi_bowl)_
  - "Optional pinch, helps the char. ~1 tsp."  _(carne_asada_bowl)_
- **flex_ingredient_id in:** _none_

## crushed_tomatoes_canned

_10 references across 6 meals_

- **Amounts:**
  - `g`: 250 (shakshuka); 700 (beef_ragu_gnocchi); 800 (lamb_shanks, turkey_meatballs_spaghetti); 1200 (bolognese); 1600 (bolognese, chilli_con_carne)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Base for sauce. 1 large can."  _(turkey_meatballs_spaghetti)_
  - "One 800g tin."  _(lamb_shanks)_
  - "Three 400g tins or 1.5 of the 800g tins. Less than the slow cooker version because stovetop reduces more during the long simmer."  _(bolognese)_
  - "Two 800g tins."  _(bolognese, chilli_con_carne)_
- **flex_ingredient_id in:** _none_

## bay_leaves_dried

_9 references across 5 meals_

- **Amounts:**
  - `count`: 2 (beef_ragu_gnocchi, beef_stew, lamb_shanks); 3 (bolognese, massaman)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## chocolate_chips

_9 references across 9 meals_

- **Amounts:**
  - `g`: 10 (chocolate_protein_mousse, trail_mix); 15 (chocolate_protein_mug_cake); 30 (edible_protein_cookie_dough); 40 (no_bake_protein_balls); 60 (protein_banana_bread); 80 (frozen_date_snickers_bark, protein_chocolate_chip_cookies); 85 (fudgy_protein_brownies)
- **`scaling` values:** `scales`
- **`notes`:**
  - "1 tablespoon."  _(chocolate_protein_mug_cake)_
  - "About 1/2 cup; save some for the top."  _(fudgy_protein_brownies)_
  - "Dark chocolate chips or chopped dark chocolate."  _(trail_mix)_
  - "Melted for the top."  _(frozen_date_snickers_bark)_
  - "Save some to press on top."  _(protein_chocolate_chip_cookies)_
  - "Topping."  _(chocolate_protein_mousse)_
- **flex_ingredient_id in:** _none_

## coriander_fresh

_9 references across 6 meals_

- **Amounts:**
  - `g`: 4 (butter_chicken, chilli_con_carne, massaman); 6 (pulled_pork); 12 (spicy_chipotle_chicken_burrito); 15 (carne_asada_bowl)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Rice + pico."  _(carne_asada_bowl)_
  - "for garnish"  _(butter_chicken)_
- **flex_ingredient_id in:** _none_

## oregano_dried

_9 references across 6 meals_

- **Amounts:**
  - `tsp`: 1 (beef_ragu_gnocchi, tuna_pasta_bake); 2 (bolognese, sheet_pan_sausage_veg, turkey_meatballs_spaghetti); 4 (chilli_con_carne)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Essential Italian herb."  _(turkey_meatballs_spaghetti)_
  - "Italian/mixed dried herbs."  _(sheet_pan_sausage_veg)_
- **flex_ingredient_id in:** _none_

## rolled_oats_raw

_9 references across 8 meals_

- **Amounts:**
  - `g`: 45 (brekkie_grow, strawbrekkie_beast); 50 (choc_muscle_maxx, overnight_oats); 60 (protein_pancakes); 80 (baked_oats, muscle_oats); 120 (no_bake_protein_balls)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 1/2 cup."  _(overnight_oats)_
  - "Approximately 3/4 cup."  _(muscle_oats)_
  - "Approximately ½ cup."  _(brekkie_grow, strawbrekkie_beast)_
  - "Blended to a flour."  _(protein_pancakes)_
- **flex_ingredient_id in:** baked_oats, brekkie_grow, choc_muscle_maxx, muscle_oats, overnight_oats, protein_pancakes, strawbrekkie_beast

## vanilla_extract

_9 references across 9 meals_

- **Amounts:**
  - `tsp`: 1 (chocolate_protein_mousse, cottage_cheese_ice_cream, edible_protein_cookie_dough, fudgy_protein_brownies, no_bake_protein_balls, no_bake_protein_cheesecake, protein_banana_bread, protein_chocolate_chip_cookies, protein_ice_cream)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## carrot

_8 references across 4 meals_

- **Amounts:**
  - `g`: 120 (beef_ragu_gnocchi, bolognese); 130 (lamb_shanks); 300 (beef_stew)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 large, finely diced (about 1 cup)."  _(lamb_shanks)_
  - "Approximately 1 large, finely diced."  _(lamb_shanks)_
  - "Approximately 1 medium, finely diced."  _(bolognese)_
  - "Approximately 3 medium, cut into 2.5cm chunks on the diagonal."  _(beef_stew)_
  - "Approximately 3 medium, cut into 2.5cm chunks."  _(beef_stew)_
  - "Optional."  _(beef_ragu_gnocchi)_
  - "Soffritto; optional."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** _none_

## celery

_8 references across 4 meals_

- **Amounts:**
  - `g`: 100 (beef_ragu_gnocchi, bolognese, lamb_shanks); 150 (beef_stew)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 2 stalks, cut into 2.5cm chunks."  _(beef_stew)_
  - "Approximately 2 stalks, finely diced (about 1 cup)."  _(lamb_shanks)_
  - "Approximately 2 stalks, finely diced."  _(bolognese, lamb_shanks)_
  - "Optional."  _(beef_ragu_gnocchi)_
  - "Soffritto; optional."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** _none_

## cinnamon_ground

_8 references across 7 meals_

- **Amounts:**
  - `tsp`: 0.5 (baked_oats, lamb_kofta, maple_muscle_toast); 1 (banana_bulk, brekkie_grow, muscle_oats, protein_banana_bread)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "KEY warm note — do not omit."  _(lamb_kofta)_
- **flex_ingredient_id in:** _none_

## garlic_powder

_8 references across 6 meals_

- **Amounts:**
  - `tsp`: 1 (chicken_fajita_bowl, chicken_mac_and_cheese, chicken_schnitzel, pulled_pork, sheet_pan_sausage_veg); 4 (chilli_con_carne)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For the rub."  _(pulled_pork)_
  - "In the crumb/flour."  _(chicken_schnitzel)_
- **flex_ingredient_id in:** _none_

## lime

_8 references across 7 meals_

- **Amounts:**
  - `count`: 0.25 (chilli_con_carne, massaman); 0.5 (pulled_pork); 1 (satay_chicken, spicy_chipotle_chicken_burrito); 2 (carne_asada_bowl, chicken_fajita_bowl)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Juice and wedges."  _(chicken_fajita_bowl)_
  - "Juiced."  _(pulled_pork)_
  - "Marinade + cilantro-lime rice."  _(carne_asada_bowl)_
  - "One wedge, approximately 5ml juice."  _(chilli_con_carne, massaman)_
  - "One wedge."  _(chilli_con_carne)_
  - "To finish."  _(satay_chicken)_
- **flex_ingredient_id in:** _none_

## avocado

_7 references across 6 meals_

- **Amounts:**
  - `g`: 60 (chilli_con_carne, smoked_salmon_bagel); 80 (chilli_con_carne, egg_muffins, scramble_stack); 100 (dirty_eden, pulled_pork)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately half a medium avocado, flesh only."  _(dirty_eden, pulled_pork)_
  - "Approximately half a small avocado."  _(chilli_con_carne)_
  - "Flesh only, smashed onto the toast."  _(scramble_stack)_
  - "Less than the bowl plate — spreads across the surface."  _(chilli_con_carne)_
  - "Sliced."  _(smoked_salmon_bagel)_
  - "Smashed onto the toast."  _(egg_muffins)_
- **flex_ingredient_id in:** dirty_eden

## baking_potato

_7 references across 6 meals_

- **Amounts:**
  - `g`: 150 (baked_potato); 300 (beef_stew, lamb_shanks); 350 (bolognese, pulled_pork); 500 (chicken_schnitzel); 600 (chicken_schnitzel)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 1 large or 2 medium. Sebago or Coliban for fluffy mash — don't use Desiree, it's too waxy."  _(lamb_shanks)_
  - "Approximately 1 large or 2 medium. Sebago or Coliban for fluffy mash."  _(beef_stew)_
  - "Medium potato, scrubbed clean."  _(baked_potato)_
  - "One large potato."  _(bolognese, pulled_pork)_
  - "Or salad/rice base."  _(chicken_schnitzel)_
  - "Roast; or swap a fresh salad (no oven)."  _(chicken_schnitzel)_
- **flex_ingredient_id in:** baked_potato

## cherry_tomatoes

_7 references across 7 meals_

- **Amounts:**
  - `g`: 100 (big_breakfast_plate, cottage_cheese_bowl); 150 (cevapi, spicy_chipotle_chicken_burrito); 200 (carne_asada_bowl, chicken_shawarma, lamb_kofta)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Halved, approximately 6-8 cherry tomatoes."  _(cottage_cheese_bowl)_
  - "Halved."  _(big_breakfast_plate)_
  - "Pico; or any tomato."  _(carne_asada_bowl)_
  - "Salad (rice plate)."  _(cevapi)_
  - "Salad."  _(lamb_kofta)_
  - "Salsa."  _(spicy_chipotle_chicken_burrito)_
- **flex_ingredient_id in:** _none_

## cocoa_powder

_7 references across 7 meals_

- **Amounts:**
  - `g`: 5 (choc_muscle_maxx); 6 (chocolate_protein_mug_cake); 10 (king_kong_chocolate, mornin_muscle, raspberry_rip); 12 (chocolate_protein_mousse); 30 (fudgy_protein_brownies)
- **`scaling` values:** `scales`
- **`notes`:**
  - "1 tablespoon."  _(chocolate_protein_mug_cake)_
  - "2 tablespoons."  _(chocolate_protein_mousse)_
  - "Approximately 1 tbsp."  _(choc_muscle_maxx)_
  - "Approximately 2 tbsp."  _(king_kong_chocolate, mornin_muscle, raspberry_rip)_
- **flex_ingredient_id in:** _none_

## cottage_cheese

_7 references across 7 meals_

- **Amounts:**
  - `g`: 150 (no_bake_protein_cheesecake); 200 (chocolate_protein_mousse); 250 (cottage_cheese_bowl, egg_muffins); 300 (chicken_mac_and_cheese, cottage_cheese_ice_cream, tuna_pasta_bake)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Blended into the eggs."  _(egg_muffins)_
  - "Blended into the sauce — the high-protein trick."  _(chicken_mac_and_cheese)_
  - "Blended into the sauce — the protein-rich base."  _(tuna_pasta_bake)_
  - "Blended smooth."  _(no_bake_protein_cheesecake)_
  - "Full-fat cottage cheese for creamiest texture."  _(cottage_cheese_ice_cream)_
  - "Full-fat cottage cheese, approximately 1 cup."  _(cottage_cheese_bowl)_
  - "Full-fat or 2% blends silkiest. Blend until no curds remain."  _(chocolate_protein_mousse)_
- **flex_ingredient_id in:** cottage_cheese_bowl, cottage_cheese_ice_cream, egg_muffins

## flour_plain

_7 references across 6 meals_

- **Amounts:**
  - `g`: 5 (bolognese); 20 (chicken_mac_and_cheese, pulled_pork); 40 (chicken_schnitzel); 50 (beef_stew); 150 (palacinke)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "About 1 cup. The base for thin, delicate crêpes."  _(palacinke)_
  - "For dusting the beef. Approximately ⅓ cup."  _(beef_stew)_
  - "For the béchamel. Full bake uses 30g."  _(bolognese)_
  - "Optional roux (skip if using the blended-cottage-cheese method)."  _(chicken_mac_and_cheese)_
  - "Seasoned, for dredging."  _(chicken_schnitzel)_
- **flex_ingredient_id in:** palacinke

## ginger_fresh

_7 references across 6 meals_

- **Amounts:**
  - `tsp`: 1 (beef_bulgogi_bowl, butter_chicken, massaman); 3 (beef_broccoli_stir_fry, honey_soy_salmon_noodles, teriyaki_chicken_rice_bowl)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Glaze, grated. ~1 tbsp."  _(honey_soy_salmon_noodles)_
  - "Grated."  _(beef_broccoli_stir_fry, massaman, teriyaki_chicken_rice_bowl)_
  - "Optional, grated into marinade."  _(beef_bulgogi_bowl)_
- **flex_ingredient_id in:** _none_

## mixed_berries

_7 references across 6 meals_

- **Amounts:**
  - `g`: 60 (baked_oats); 80 (protein_pancakes); 100 (greek_yoghurt_bowl, no_bake_protein_cheesecake); 120 (cottage_cheese_ice_cream); 150 (berries)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Fresh or frozen berries — blueberries, strawberries, raspberries."  _(berries)_
  - "Fresh or frozen, scattered on top."  _(protein_pancakes)_
  - "Fresh or frozen."  _(baked_oats, greek_yoghurt_bowl)_
  - "Frozen or fresh — strawberries, blueberries, raspberries."  _(cottage_cheese_ice_cream)_
  - "Topping."  _(no_bake_protein_cheesecake)_
- **flex_ingredient_id in:** berries

## onion_powder

_7 references across 3 meals_

- **Amounts:**
  - `tsp`: 1 (chicken_mac_and_cheese, pulled_pork); 1.5 (pulled_pork); 4 (chilli_con_carne)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For the BBQ sauce."  _(pulled_pork)_
  - "For the rub."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## parmesan_grated

_7 references across 4 meals_

- **Amounts:**
  - `g`: 10 (bolognese); 15 (bolognese); 20 (bolognese); 40 (beef_ragu_gnocchi, spaghetti_carbonara, turkey_meatballs_spaghetti)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Finely grated. Pecorino Romano is the authentic upgrade. Some reserved for topping."  _(spaghetti_carbonara)_
  - "For topping the bolognese."  _(bolognese)_
  - "Full bake uses 60g — half mixed into ricotta, half on top."  _(bolognese)_
  - "In meatballs + for serving."  _(turkey_meatballs_spaghetti)_
  - "To finish."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** _none_

## red_wine_cooking

_7 references across 4 meals_

- **Amounts:**
  - `ml`: 125 (beef_ragu_gnocchi); 250 (bolognese); 500 (beef_stew); 625 (lamb_shanks)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Cabernet sauvignon or merlot. Any cleanskin works."  _(bolognese)_
  - "Full-bodied — cabernet sauvignon, merlot, or shiraz. Discount bottles are fine."  _(beef_stew)_
  - "Full-bodied — cabernet sauvignon, merlot, or shiraz. Don't use expensive wine; cleanskins are fine."  _(lamb_shanks)_
  - "Optional; deglaze. Keep accessible — not required."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** _none_

## soy_sauce

_7 references across 7 meals_

- **Amounts:**
  - `ml`: 40 (thai_basil_chicken); 45 (honey_chicken, satay_chicken); 60 (beef_bulgogi_bowl, honey_soy_salmon_noodles); 75 (beef_broccoli_stir_fry); 120 (teriyaki_chicken_rice_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "1/2 cup."  _(teriyaki_chicken_rice_bowl)_
  - "15ml (1 tbsp) for velveting the beef + 60ml for the sauce."  _(beef_broccoli_stir_fry)_
  - "Glaze."  _(honey_soy_salmon_noodles)_
  - "Marinade."  _(beef_bulgogi_bowl)_
  - "~1 tbsp to velvet + ~2 tbsp in the sauce."  _(satay_chicken)_
- **flex_ingredient_id in:** _none_

## thickened_cream

_7 references across 5 meals_

- **Amounts:**
  - `ml`: 30 (butter_chicken); 50 (beef_stew, lamb_shanks); 60 (butter_chicken); 100 (king_kong_chocolate, mornin_muscle)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:** _none_
- **flex_ingredient_id in:** mornin_muscle

## whey_protein_chocolate

_7 references across 7 meals_

- **Amounts:**
  - `g`: 15 (chocolate_protein_mousse); 30 (cookies_gains, mornin_muscle, raspberry_rip); 60 (choc_muscle_maxx, fudgy_protein_brownies, king_kong_chocolate)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "1 scoop."  _(cookies_gains, mornin_muscle, raspberry_rip)_
  - "2 scoops."  _(choc_muscle_maxx, king_kong_chocolate)_
  - "About 1/2 scoop chocolate; boosts protein and thickens."  _(chocolate_protein_mousse)_
  - "Chocolate for best flavour."  _(fudgy_protein_brownies)_
- **flex_ingredient_id in:** chocolate_protein_mousse, fudgy_protein_brownies

## baking_powder

_6 references across 6 meals_

- **Amounts:**
  - `tsp`: 0.5 (chocolate_protein_mug_cake, fudgy_protein_brownies, protein_chocolate_chip_cookies); 1 (baked_oats, protein_pancakes); 1.5 (protein_banana_bread)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Or 1/2 tsp baking soda."  _(protein_chocolate_chip_cookies)_
- **flex_ingredient_id in:** _none_

## basmati_rice_dry

_6 references across 4 meals_

- **Amounts:**
  - `g`: 60 (butter_chicken); 85 (chilli_con_carne); 95 (pulled_pork); 100 (massaman)
- **`scaling` values:** `fixed`, `flex`  ← **multiple**
- **`notes`:**
  - "Approximately 100g dry rice. Cook per packet directions or in a rice cooker."  _(massaman)_
  - "Approximately 85g dry rice. Cook per packet directions or in a rice cooker."  _(chilli_con_carne)_
- **flex_ingredient_id in:** butter_chicken

## beef_mince_regular

_6 references across 4 meals_

- **Amounts:**
  - `g`: 500 (cevapi); 800 (beef_ragu_gnocchi); 1000 (bolognese, chilli_con_carne)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Don't use lean — fat is doing real work here."  _(bolognese, chilli_con_carne)_
  - "Lean beef preferred; part of the blend. ~200g total mince/serve."  _(cevapi)_
  - "QUICK version. ~200g/serve."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** bolognese, cevapi, chilli_con_carne

## beef_stock_cube

_6 references across 3 meals_

- **Amounts:**
  - `g`: 5 (beef_ragu_gnocchi); 10 (beef_ragu_gnocchi); 30 (bolognese, chilli_con_carne)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Made up to ~150ml."  _(beef_ragu_gnocchi)_
  - "Made up to ~250ml braising liquid."  _(beef_ragu_gnocchi)_
  - "Three cubes, crumbled."  _(chilli_con_carne)_
  - "Three cubes."  _(bolognese)_
- **flex_ingredient_id in:** _none_

## broccoli

_6 references across 6 meals_

- **Amounts:**
  - `g`: 150 (steamed_mixed_veg); 400 (honey_soy_salmon_noodles, sheet_pan_salmon_potatoes, sheet_pan_sausage_veg); 500 (beef_broccoli_stir_fry, teriyaki_chicken_rice_bowl)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Florets."  _(beef_broccoli_stir_fry, teriyaki_chicken_rice_bowl)_
  - "Florets; green beans or asparagus swap in cleanly."  _(sheet_pan_salmon_potatoes)_
  - "Fresh or frozen mix of broccoli, carrots, cauliflower."  _(steamed_mixed_veg)_
  - "Or green beans; added partway through."  _(sheet_pan_sausage_veg)_
  - "Roasted alongside; snap peas/brussels swap in."  _(honey_soy_salmon_noodles)_
- **flex_ingredient_id in:** steamed_mixed_veg

## capsicum_red

_6 references across 5 meals_

- **Amounts:**
  - `g`: 100 (shakshuka); 120 (freezer_breakfast_burrito); 300 (chicken_fajita_bowl, chilli_con_carne); 400 (sheet_pan_sausage_veg)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 2 large, diced."  _(chilli_con_carne)_
  - "Bell peppers, chunked. ~2 large peppers."  _(sheet_pan_sausage_veg)_
  - "Diced."  _(freezer_breakfast_burrito, shakshuka)_
  - "Sliced into strips."  _(chicken_fajita_bowl)_
- **flex_ingredient_id in:** _none_

## chicken_thigh_skinless

_6 references across 4 meals_

- **Amounts:**
  - `g`: 200 (butter_chicken); 800 (chicken_shawarma, satay_chicken, spicy_chipotle_chicken_burrito)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "200g/serve; breast swaps in leaner."  _(spicy_chipotle_chicken_burrito)_
  - "Default cut (juicier). Swap chicken_breast for leaner/lower-fat. 200g per serving. Sliced."  _(satay_chicken)_
- **flex_ingredient_id in:** chicken_shawarma, satay_chicken, spicy_chipotle_chicken_burrito

## greek_yoghurt_plain

_6 references across 6 meals_

- **Amounts:**
  - `g`: 60 (butter_chicken); 100 (no_bake_protein_cheesecake); 150 (protein_banana_bread); 200 (chicken_shawarma, greek_yogurt_snack, lamb_kofta)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Full-fat for more calories; high-protein/skyr style for more protein."  _(greek_yogurt_snack)_
  - "Garlic-yoghurt sauce."  _(lamb_kofta)_
  - "Plain; keeps it moist and adds protein."  _(protein_banana_bread)_
  - "for marinade"  _(butter_chicken)_
- **flex_ingredient_id in:** greek_yogurt_snack

## sourdough_crusty

_6 references across 6 meals_

- **Amounts:**
  - `g`: 80 (beef_stew); 100 (big_breakfast_plate, egg_muffins, scramble_stack, shakshuka); 120 (pb_banana_toast)
- **`scaling` values:** `fixed`, `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "2 slices, to serve and scoop."  _(shakshuka)_
  - "2 slices, toasted, to serve."  _(egg_muffins)_
  - "2 slices, toasted."  _(big_breakfast_plate)_
  - "2 thick slices."  _(scramble_stack)_
  - "2-3 slices."  _(pb_banana_toast)_
  - "Approximately 2 thick slices."  _(beef_stew)_
- **flex_ingredient_id in:** pb_banana_toast, scramble_stack, shakshuka

## spring_onion

_6 references across 6 meals_

- **Amounts:**
  - `count`: 1 (chilli_con_carne, pulled_pork); 2 (beef_bulgogi_bowl, honey_chicken, honey_soy_salmon_noodles); 4 (teriyaki_chicken_rice_bowl)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Finely sliced."  _(chilli_con_carne, pulled_pork)_
  - "Garnish, sliced."  _(honey_soy_salmon_noodles)_
  - "Garnish."  _(honey_chicken)_
  - "Sliced, to finish."  _(teriyaki_chicken_rice_bowl)_
  - "Sliced, to garnish."  _(beef_bulgogi_bowl)_
- **flex_ingredient_id in:** _none_

## sugar_white

_6 references across 4 meals_

- **Amounts:**
  - `g`: 8 (bolognese); 12 (chilli_con_carne, thai_basil_chicken); 20 (palacinke)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 2 tsp. Balances tomato acidity."  _(bolognese)_
  - "Approximately 3 tsp. Balances tomato acidity."  _(chilli_con_carne)_
  - "Just enough for a hint of sweetness."  _(palacinke)_
- **flex_ingredient_id in:** _none_

## tortilla_large

_6 references across 5 meals_

- **Amounts:**
  - `count`: 4 (spicy_chipotle_chicken_burrito); 5 (freezer_breakfast_burrito); 6 (cevapi, chicken_shawarma, lamb_kofta)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Flatbread/pita; ~1.5 large per serve."  _(cevapi)_
  - "~1.5 large (or 2 pita) per serve."  _(lamb_kofta)_
- **flex_ingredient_id in:** _none_

## worcestershire_sauce

_6 references across 3 meals_

- **Amounts:**
  - `ml`: 10 (beef_stew); 17 (pulled_pork); 20 (bolognese)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 tbsp."  _(bolognese)_
  - "Approximately 2 tsp."  _(beef_stew)_
  - "For the BBQ sauce. Approximately 1 tbsp."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## beef_chuck

_5 references across 3 meals_

- **Amounts:**
  - `g`: 800 (beef_ragu_gnocchi); 1200 (beef_stew); 1600 (massaman)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Cut into 3.5cm cubes. Ask the butcher for it pre-cubed if you're rushed."  _(beef_stew)_
  - "Cut into 4cm cubes. Ask the butcher for chuck steak or gravy beef."  _(massaman)_
  - "Cut into 4cm cubes."  _(massaman)_
  - "Whole chuck/blade. ~200g/serve. Braising renders fat you can skim."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** beef_ragu_gnocchi, beef_stew, massaman

## black_beans_canned

_5 references across 4 meals_

- **Amounts:**
  - `g`: 250 (carne_asada_bowl, chicken_fajita_bowl, spicy_chipotle_chicken_burrito); 400 (chilli_con_carne)
- **`scaling` values:** `scales`
- **`notes`:**
  - "1 can, drained and rinsed."  _(chicken_fajita_bowl)_
  - "Drained weight. One 420g tin. Drain and rinse before adding."  _(chilli_con_carne)_
  - "One 420g tin, drained weight approximately 250g. Drain and rinse before adding."  _(chilli_con_carne)_
  - "One drained can."  _(carne_asada_bowl, spicy_chipotle_chicken_burrito)_
- **flex_ingredient_id in:** _none_

## chia_seeds

_5 references across 4 meals_

- **Amounts:**
  - `g`: 8 (pb_banana_toast); 10 (greek_yoghurt_bowl, overnight_oats); 12 (energy_lift_heavy)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 tbsp."  _(energy_lift_heavy)_
  - "Thickens the oats as they soak."  _(overnight_oats)_
- **flex_ingredient_id in:** _none_

## chicken_breast

_5 references across 5 meals_

- **Amounts:**
  - `g`: 800 (chicken_fajita_bowl, chicken_mac_and_cheese, chicken_schnitzel, honey_chicken, teriyaki_chicken_rice_bowl)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Breast (leaner, fits the lighter version) or thigh. Bite-size. 200g per serving."  _(honey_chicken)_
  - "Breast or thigh; rotisserie/pre-cooked shredded is a valid shortcut. 200g per serving."  _(chicken_mac_and_cheese)_
  - "Cut into bite-size pieces. 200g per serving."  _(teriyaki_chicken_rice_bowl)_
  - "Cut into strips. 200g per serving."  _(chicken_fajita_bowl)_
  - "Sliced thin/pounded to ~1/2cm. 200g/serve."  _(chicken_schnitzel)_
- **flex_ingredient_id in:** chicken_fajita_bowl, chicken_mac_and_cheese, chicken_schnitzel, honey_chicken, teriyaki_chicken_rice_bowl

## coconut_cream

_5 references across 4 meals_

- **Amounts:**
  - `ml`: 30 (energy_lift_heavy); 100 (raspberry_rip, strawberry_stack); 800 (massaman)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 2 tbsp."  _(energy_lift_heavy)_
  - "Two 400ml cans of Ayam or Trang."  _(massaman)_
- **flex_ingredient_id in:** raspberry_rip, strawberry_stack

## cucumber

_5 references across 5 meals_

- **Amounts:**
  - `g`: 40 (smoked_salmon_bagel); 80 (cottage_cheese_bowl); 150 (cevapi); 200 (chicken_shawarma, lamb_kofta)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Diced, approximately ½ medium cucumber."  _(cottage_cheese_bowl)_
  - "Salad (rice plate)."  _(cevapi)_
  - "Salad."  _(lamb_kofta)_
  - "Sliced."  _(smoked_salmon_bagel)_
- **flex_ingredient_id in:** _none_

## parsley_flat_leaf

_5 references across 4 meals_

- **Amounts:**
  - `g`: 3 (beef_stew, lamb_shanks); 10 (sheet_pan_salmon_potatoes); 20 (lamb_kofta)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Chopped, into the butter."  _(sheet_pan_salmon_potatoes)_
  - "Finely chopped, for garnish."  _(beef_stew, lamb_shanks)_
  - "Fresh parsley and/or mint, chopped into the mince."  _(lamb_kofta)_
- **flex_ingredient_id in:** _none_

## sesame_oil

_5 references across 5 meals_

- **Amounts:**
  - `ml`: 5 (beef_broccoli_stir_fry, teriyaki_chicken_rice_bowl); 10 (honey_chicken, honey_soy_salmon_noodles); 15 (beef_bulgogi_bowl)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Glaze + noodles. ~2 tsp."  _(honey_soy_salmon_noodles)_
  - "Marinade."  _(beef_bulgogi_bowl)_
- **flex_ingredient_id in:** _none_

## water

_5 references across 4 meals_

- **Amounts:**
  - `ml`: 30 (teriyaki_chicken_rice_bowl); 125 (beef_broccoli_stir_fry); 250 (chilli_con_carne); 375 (chilli_con_carne); 480 (chicken_fajita_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "For cooking rice."  _(chicken_fajita_bowl)_
  - "More than the slow cooker version because stovetop reduction is real."  _(chilli_con_carne)_
- **flex_ingredient_id in:** _none_

## beef_stock_liquid

_4 references across 2 meals_

- **Amounts:**
  - `ml`: 500 (massaman); 750 (beef_stew, massaman)
- **`scaling` values:** `scales`
- **`notes`:**
  - "More than the slow cooker version because stovetop reduction is real."  _(massaman)_
  - "Or 500ml water + 1 stock cube."  _(massaman)_
  - "Salt-reduced preferred. Campbell's Real Stock or Massel."  _(beef_stew)_
- **flex_ingredient_id in:** _none_

## breadcrumbs

_4 references across 4 meals_

- **Amounts:**
  - `g`: 40 (lamb_kofta, tuna_pasta_bake); 50 (turkey_meatballs_spaghetti); 100 (chicken_schnitzel)
- **`scaling` values:** `scales`
- **`notes`:**
  - "For binding meatballs. Panko preferred."  _(turkey_meatballs_spaghetti)_
  - "Optional binder."  _(lamb_kofta)_
  - "Optional crunchy top."  _(tuna_pasta_bake)_
  - "Panko = crispier."  _(chicken_schnitzel)_
- **flex_ingredient_id in:** _none_

## cornstarch

_4 references across 4 meals_

- **Amounts:**
  - `g`: 6 (satay_chicken); 12 (teriyaki_chicken_rice_bowl); 16 (beef_broccoli_stir_fry); 40 (honey_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "2 tsp for velveting + 1.5 tbsp for the sauce."  _(beef_broccoli_stir_fry)_
  - "For velveting the chicken."  _(satay_chicken)_
  - "Most to coat the chicken + a little for the glaze slurry."  _(honey_chicken)_
- **flex_ingredient_id in:** _none_

## lemon

_4 references across 4 meals_

- **Amounts:**
  - `count`: 1 (chicken_schnitzel, chicken_shawarma, lamb_kofta, sheet_pan_salmon_potatoes)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Into the sauce."  _(lamb_kofta)_
  - "Juice in the butter + wedges to finish."  _(sheet_pan_salmon_potatoes)_
- **flex_ingredient_id in:** _none_

## mustard_powder

_4 references across 1 meal_

- **Amounts:**
  - `tsp`: 0.75 (pulled_pork); 1.5 (pulled_pork)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "For the BBQ sauce."  _(pulled_pork)_
  - "For the rub."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## potato_baby_chat

_4 references across 3 meals_

- **Amounts:**
  - `g`: 400 (beef_stew); 800 (sheet_pan_salmon_potatoes); 1200 (sheet_pan_sausage_veg)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Baby/new potatoes halved, or any potato quartered."  _(sheet_pan_salmon_potatoes)_
  - "Baby/new potatoes halved; generous (300g/serve) for bulking carbs."  _(sheet_pan_sausage_veg)_
  - "Halved, skins on."  _(beef_stew)_
- **flex_ingredient_id in:** _none_

## potato_waxy

_4 references across 3 meals_

- **Amounts:**
  - `g`: 200 (steak_and_eggs); 250 (freezer_breakfast_burrito); 800 (massaman)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Diced small for hash."  _(freezer_breakfast_burrito)_
  - "Diced small."  _(steak_and_eggs)_
  - "Peeled and cut into 3cm chunks. Do not substitute with starchy baking potatoes — they fall apart."  _(massaman)_
  - "Peeled and cut into 3cm chunks."  _(massaman)_
- **flex_ingredient_id in:** _none_

## sesame_seeds

_4 references across 4 meals_

- **Amounts:**
  - `g`: 6 (honey_soy_salmon_noodles); 9 (beef_bulgogi_bowl, honey_chicken); 18 (teriyaki_chicken_rice_bowl)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Garnish."  _(honey_chicken, honey_soy_salmon_noodles)_
  - "Half in marinade, half to garnish."  _(beef_bulgogi_bowl)_
  - "To finish."  _(teriyaki_chicken_rice_bowl)_
- **flex_ingredient_id in:** _none_

## sirloin_steak

_4 references across 4 meals_

- **Amounts:**
  - `g`: 200 (steak_and_eggs); 800 (beef_broccoli_stir_fry, beef_bulgogi_bowl, carne_asada_bowl)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Lean sirloin (default/accessible) or flank/skirt (authentic, fattier). 200g per serving."  _(carne_asada_bowl)_
  - "Sliced thin against the grain. 200g per serving."  _(beef_broccoli_stir_fry)_
  - "Sliced thin against the grain; freeze ~1hr first for easier slicing. 200g per serving."  _(beef_bulgogi_bowl)_
- **flex_ingredient_id in:** beef_broccoli_stir_fry, beef_bulgogi_bowl, carne_asada_bowl, steak_and_eggs

## sour_cream

_4 references across 3 meals_

- **Amounts:**
  - `g`: 30 (bolognese, chilli_con_carne, pulled_pork)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## thyme_fresh

_4 references across 2 meals_

- **Amounts:**
  - `count`: 4 (beef_stew); 5 (lamb_shanks)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "4 sprigs, tied together for easy removal. Substitute 1 tsp dried thyme if unavailable."  _(beef_stew)_
  - "5 sprigs, tied together for easy removal. Substitute 2 tsp dried thyme if unavailable."  _(lamb_shanks)_
- **flex_ingredient_id in:** _none_

## almond_butter

_3 references across 3 meals_

- **Amounts:**
  - `g`: 32 (dirty_eden, strawberry_stack, strawbrekkie_beast)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 2 tbsp."  _(dirty_eden, strawberry_stack, strawbrekkie_beast)_
- **flex_ingredient_id in:** _none_

## apple_juice_cloudy

_3 references across 2 meals_

- **Amounts:**
  - `ml`: 100 (strawbrekkie_beast); 180 (pulled_pork)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Pour around the pork in the slow cooker, not over the rub."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## breakfast_sausage

_3 references across 3 meals_

- **Amounts:**
  - `g`: 120 (big_breakfast_plate); 200 (egg_muffins); 350 (freezer_breakfast_burrito)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "2 sausages or equivalent."  _(big_breakfast_plate)_
  - "Browned and crumbled."  _(egg_muffins, freezer_breakfast_burrito)_
- **flex_ingredient_id in:** big_breakfast_plate, freezer_breakfast_burrito

## cayenne_pepper

_3 references across 2 meals_

- **Amounts:**
  - `tsp`: 1 (spicy_chipotle_chicken_burrito); 2.5 (chilli_con_carne)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Adjust to spice tolerance — 2 tsp for mild, 3 tsp for hot."  _(chilli_con_carne)_
  - "Default heat."  _(spicy_chipotle_chicken_burrito)_
- **flex_ingredient_id in:** _none_

## chilli_powder

_3 references across 3 meals_

- **Amounts:**
  - `tsp`: 2 (carne_asada_bowl, chicken_fajita_bowl, spicy_chipotle_chicken_burrito)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Marinade."  _(carne_asada_bowl)_
- **flex_ingredient_id in:** _none_

## fish_sauce

_3 references across 2 meals_

- **Amounts:**
  - `ml`: 20 (thai_basil_chicken); 45 (massaman)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 3 tbsp. Squid brand."  _(massaman)_
- **flex_ingredient_id in:** _none_

## granola

_3 references across 2 meals_

- **Amounts:**
  - `g`: 40 (greek_yoghurt_bowl, overnight_oats); 50 (greek_yoghurt_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1/2 cup."  _(greek_yoghurt_bowl)_
  - "Approximately 1/3 cup, for crunch."  _(greek_yoghurt_bowl)_
  - "Approximately 1/3 cup, scattered for crunch."  _(overnight_oats)_
- **flex_ingredient_id in:** _none_

## ground_coriander

_3 references across 3 meals_

- **Amounts:**
  - `tsp`: 1 (butter_chicken); 2 (chicken_shawarma, lamb_kofta)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## ketchup_tomato

_3 references across 1 meal_

- **Amounts:**
  - `g`: 15 (pulled_pork); 625 (pulled_pork)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "For the BBQ sauce. Approximately 2½ cups."  _(pulled_pork)_
  - "Optional drizzle, or use leftover BBQ sauce from the base recipe."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## lemon_juice

_3 references across 2 meals_

- **Amounts:**
  - `ml`: 15 (pulled_pork); 20 (dirty_eden)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "For the BBQ sauce. Approximately 1 tbsp."  _(pulled_pork)_
  - "Juice of half a lemon."  _(dirty_eden)_
- **flex_ingredient_id in:** _none_

## macaroni_dry

_3 references across 3 meals_

- **Amounts:**
  - `g`: 75 (pulled_pork); 320 (tuna_pasta_bake); 340 (chicken_mac_and_cheese)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "80g dry per serve; penne/spiral/macaroni — any short shape."  _(tuna_pasta_bake)_
  - "85g dry per serve; high-protein pasta swaps in."  _(chicken_mac_and_cheese)_
- **flex_ingredient_id in:** _none_

## mushroom_brown

_3 references across 2 meals_

- **Amounts:**
  - `g`: 80 (big_breakfast_plate); 250 (beef_stew)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Halved. Optional but recommended for depth of flavour."  _(beef_stew)_
  - "Halved."  _(beef_stew)_
  - "Sliced."  _(big_breakfast_plate)_
- **flex_ingredient_id in:** _none_

## oat_flour

_3 references across 3 meals_

- **Amounts:**
  - `g`: 60 (edible_protein_cookie_dough); 80 (no_bake_protein_cheesecake); 150 (protein_banana_bread)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Base."  _(no_bake_protein_cheesecake)_
  - "Safe raw; gives the doughy texture."  _(edible_protein_cookie_dough)_
- **flex_ingredient_id in:** _none_

## rice_vinegar

_3 references across 3 meals_

- **Amounts:**
  - `ml`: 30 (honey_chicken, honey_soy_salmon_noodles); 45 (teriyaki_chicken_rice_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Splash in the glaze. ~2 tbsp."  _(honey_soy_salmon_noodles)_
- **flex_ingredient_id in:** _none_

## spaghetti_dry

_3 references across 3 meals_

- **Amounts:**
  - `g`: 100 (bolognese); 125 (spaghetti_carbonara); 320 (turkey_meatballs_spaghetti)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "80g dry per serve. Cook fresh for each meal."  _(turkey_meatballs_spaghetti)_
  - "Dry. Generous single portion."  _(spaghetti_carbonara)_
- **flex_ingredient_id in:** turkey_meatballs_spaghetti

## thyme_dried

_3 references across 2 meals_

- **Amounts:**
  - `tsp`: 1 (beef_ragu_gnocchi); 2 (bolognese)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## apple_cider_vinegar

_2 references across 1 meal_

- **Amounts:**
  - `ml`: 120 (pulled_pork)
- **`scaling` values:** `scales`
- **`notes`:**
  - "For the BBQ sauce. Approximately ½ cup."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## bacon

_2 references across 2 meals_

- **Amounts:**
  - `g`: 60 (big_breakfast_plate); 80 (spaghetti_carbonara)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "3 rashers."  _(big_breakfast_plate)_
  - "Streaky bacon or pancetta, cut into batons. Guanciale is the authentic upgrade."  _(spaghetti_carbonara)_
- **flex_ingredient_id in:** spaghetti_carbonara

## butter_chicken_jar_sauce

_2 references across 1 meal_

- **Amounts:**
  - `g`: 200 (butter_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "or equivalent jar sauce"  _(butter_chicken)_
- **flex_ingredient_id in:** _none_

## chicken_stock_liquid

_2 references across 1 meal_

- **Amounts:**
  - `ml`: 500 (lamb_shanks)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## cinnamon_stick

_2 references across 1 meal_

- **Amounts:**
  - `count`: 1 (massaman)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## coleslaw_mayo

_2 references across 1 meal_

- **Amounts:**
  - `g`: 100 (pulled_pork)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## cream_cheese

_2 references across 2 meals_

- **Amounts:**
  - `g`: 40 (smoked_salmon_bagel); 200 (no_bake_protein_cheesecake)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Full-fat block-style; soften at room temp."  _(no_bake_protein_cheesecake)_
- **flex_ingredient_id in:** _none_

## dried_fruit

_2 references across 2 meals_

- **Amounts:**
  - `g`: 20 (trail_mix); 40 (dried_fruit)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Raisins, apricots, dates, cranberries. Calorie-dense — a small handful is a serving."  _(dried_fruit)_
  - "Raisins, cranberries, chopped apricot."  _(trail_mix)_
- **flex_ingredient_id in:** dried_fruit

## espresso_shot

_2 references across 2 meals_

- **Amounts:**
  - `ml`: 30 (energy_lift_heavy); 60 (mornin_muscle)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "1 shot, cooled. Substitute: 1 tsp instant coffee dissolved in 30ml hot water then cooled."  _(energy_lift_heavy)_
  - "2 shots, cooled. Substitute: 2 tsp instant coffee dissolved in 60ml hot water then cooled."  _(mornin_muscle)_
- **flex_ingredient_id in:** _none_

## gnocchi

_2 references across 1 meal_

- **Amounts:**
  - `g`: 800 (beef_ragu_gnocchi)
- **`scaling` values:** `scales`
- **`notes`:**
  - "200g/serve; cook fresh to packet."  _(beef_ragu_gnocchi)_
- **flex_ingredient_id in:** _none_

## ground_turmeric

_2 references across 2 meals_

- **Amounts:**
  - `tsp`: 0.5 (butter_chicken); 1 (chicken_shawarma)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## ice_cream_vanilla

_2 references across 2 meals_

- **Amounts:**
  - `g`: 50 (cookies_gains); 60 (choc_muscle_maxx)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately ½ cup."  _(choc_muscle_maxx)_
- **flex_ingredient_id in:** _none_

## jalapenos_pickled

_2 references across 2 meals_

- **Amounts:**
  - `g`: 20 (chilli_con_carne); 40 (chicken_schnitzel)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Drained."  _(chilli_con_carne)_
- **flex_ingredient_id in:** _none_

## kidney_beans_canned

_2 references across 1 meal_

- **Amounts:**
  - `g`: 400 (chilli_con_carne)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Drained weight. One 420g tin. Drain and rinse before adding."  _(chilli_con_carne)_
  - "One 420g tin, drained weight approximately 250g — the recipe scales to 400g drained-equivalent. Drain and rinse before adding."  _(chilli_con_carne)_
- **flex_ingredient_id in:** _none_

## lamb_mince

_2 references across 2 meals_

- **Amounts:**
  - `g`: 300 (cevapi); 800 (lamb_kofta)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Lean default; regular for juicier/fattier. Not too lean — a bit of fat keeps them juicy. 200g/serve."  _(lamb_kofta)_
  - "The authentic blend is beef + lamb (+ pork). All-beef or beef-pork works everywhere; lamb/pork raise fat."  _(cevapi)_
- **flex_ingredient_id in:** lamb_kofta

## lamb_shank

_2 references across 1 meal_

- **Amounts:**
  - `count`: 4 (lamb_shanks)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 400g each. Ask for French-trimmed if you want the bone exposed nicely."  _(lamb_shanks)_
- **flex_ingredient_id in:** lamb_shanks

## mango_frozen

_2 references across 2 meals_

- **Amounts:**
  - `g`: 165 (energy_lift_heavy, mango_mass)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "Approximately 1 cup."  _(energy_lift_heavy, mango_mass)_
- **flex_ingredient_id in:** energy_lift_heavy

## massaman_curry_paste

_2 references across 1 meal_

- **Amounts:**
  - `g`: 200 (massaman)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Two 114g cans of Maesri, or one jar of Valcom or Ayam."  _(massaman)_
- **flex_ingredient_id in:** _none_

## medjool_dates

_2 references across 2 meals_

- **Amounts:**
  - `g`: 48 (banana_bulk); 250 (frozen_date_snickers_bark)
- **`scaling` values:** `flex`, `scales`  ← **multiple**
- **`notes`:**
  - "2 dates, pitted."  _(banana_bulk)_
  - "Pitted, soft. The chewy caramel-like base."  _(frozen_date_snickers_bark)_
- **flex_ingredient_id in:** frozen_date_snickers_bark

## mixed_nuts

_2 references across 2 meals_

- **Amounts:**
  - `g`: 30 (trail_mix); 40 (mixed_nuts)
- **`scaling` values:** `flex`
- **`notes`:**
  - "About a small handful. Calorie-dense — easy to overdo, easy to use for surplus."  _(mixed_nuts)_
- **flex_ingredient_id in:** mixed_nuts, trail_mix

## oyster_sauce

_2 references across 2 meals_

- **Amounts:**
  - `ml`: 45 (beef_broccoli_stir_fry); 60 (thai_basil_chicken)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## pancetta_diced

_2 references across 1 meal_

- **Amounts:**
  - `g`: 100 (bolognese)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## paprika_smoked

_2 references across 2 meals_

- **Amounts:**
  - `tsp`: 1 (chicken_mac_and_cheese); 2 (spicy_chipotle_chicken_burrito)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Smoked preferred."  _(chicken_mac_and_cheese, spicy_chipotle_chicken_burrito)_
- **flex_ingredient_id in:** _none_

## peanuts_roasted_unsalted

_2 references across 2 meals_

- **Amounts:**
  - `g`: 20 (massaman); 40 (frozen_date_snickers_bark)
- **`scaling` values:** `fixed`, `scales`  ← **multiple**
- **`notes`:**
  - "Roughly chopped, for crunch."  _(frozen_date_snickers_bark)_
  - "Roughly crushed."  _(massaman)_
- **flex_ingredient_id in:** _none_

## pork_shoulder_boneless

_2 references across 1 meal_

- **Amounts:**
  - `g`: 2200 (pulled_pork)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** pulled_pork

## salmon_fillet

_2 references across 2 meals_

- **Amounts:**
  - `g`: 800 (honey_soy_salmon_noodles, sheet_pan_salmon_potatoes)
- **`scaling` values:** `flex`
- **`notes`:**
  - "4 fillets, ~200g each."  _(sheet_pan_salmon_potatoes)_
  - "Skin off, cubed or whole. 200g per serving."  _(honey_soy_salmon_noodles)_
- **flex_ingredient_id in:** honey_soy_salmon_noodles, sheet_pan_salmon_potatoes

## spinach_baby

_2 references across 2 meals_

- **Amounts:**
  - `g`: 60 (dirty_eden, egg_muffins)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 2 large handfuls."  _(dirty_eden)_
  - "Chopped."  _(egg_muffins)_
- **flex_ingredient_id in:** _none_

## star_anise

_2 references across 1 meal_

- **Amounts:**
  - `count`: 2 (massaman)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## strawberries_frozen

_2 references across 2 meals_

- **Amounts:**
  - `g`: 150 (strawberry_stack, strawbrekkie_beast)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 cup."  _(strawberry_stack, strawbrekkie_beast)_
- **flex_ingredient_id in:** _none_

## sweetcorn

_2 references across 2 meals_

- **Amounts:**
  - `g`: 150 (tuna_pasta_bake); 200 (carne_asada_bowl)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## tamarind_paste

_2 references across 1 meal_

- **Amounts:**
  - `g`: 30 (massaman)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Approximately 2 tbsp."  _(massaman)_
- **flex_ingredient_id in:** _none_

## tuna

_2 references across 2 meals_

- **Amounts:**
  - `g`: 95 (tuna_pouch); 370 (tuna_pasta_bake)
- **`scaling` values:** `flex`
- **`notes`:**
  - "About 2 large cans, drained. ~90g drained per serving."  _(tuna_pasta_bake)_
  - "One pouch. Flavoured pouches need no extras."  _(tuna_pouch)_
- **flex_ingredient_id in:** tuna_pasta_bake, tuna_pouch

## ajvar

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 160 (cevapi)
- **`scaling` values:** `scales`
- **`notes`:**
  - "To serve."  _(cevapi)_
- **flex_ingredient_id in:** _none_

## bagel

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 1 (smoked_salmon_bagel)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## baked_beans

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 130 (big_breakfast_plate)
- **`scaling` values:** `scales`
- **`notes`:**
  - "About half a small can."  _(big_breakfast_plate)_
- **flex_ingredient_id in:** _none_

## beef_jerky

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 40 (beef_jerky)
- **`scaling` values:** `flex`
- **`notes`:**
  - "About one small bag. Lower-sodium where possible."  _(beef_jerky)_
- **flex_ingredient_id in:** beef_jerky

## bicarb_soda

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 0.5 (cevapi)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Springy-tender texture — do not skip."  _(cevapi)_
- **flex_ingredient_id in:** _none_

## blueberries_frozen

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 75 (strawbrekkie_beast)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately ½ cup."  _(strawbrekkie_beast)_
- **flex_ingredient_id in:** _none_

## bread_roll

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 4 (chicken_schnitzel)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## brioche_bun

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 1 (pulled_pork)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## brioche_loaf

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 120 (maple_muscle_toast)
- **`scaling` values:** `flex`
- **`notes`:**
  - "3 thick slices, approximately 40g each."  _(maple_muscle_toast)_
- **flex_ingredient_id in:** maple_muscle_toast

## chicken_mince

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 800 (thai_basil_chicken)
- **`scaling` values:** `flex`
- **`notes`:**
  - "200g/serve."  _(thai_basil_chicken)_
- **flex_ingredient_id in:** thai_basil_chicken

## chickpeas

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 250 (roasted_chickpeas)
- **`scaling` values:** `flex`
- **`notes`:**
  - "One drained can. Or skip cooking and buy a bag of ready-roasted chickpeas."  _(roasted_chickpeas)_
- **flex_ingredient_id in:** roasted_chickpeas

## chinese_cooking_wine

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 30 (beef_broccoli_stir_fry)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## chipotle_in_adobo

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 60 (spicy_chipotle_chicken_burrito)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Negligible macros; the heat upgrade."  _(spicy_chipotle_chicken_burrito)_
- **flex_ingredient_id in:** _none_

## coconut_milk

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 150 (satay_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Full-fat canned; about a third of a 400ml can. Fat-dense."  _(satay_chicken)_
- **flex_ingredient_id in:** _none_

## coconut_water

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 300 (dirty_eden)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## corn_chips

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 80 (chilli_con_carne)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Approximately ⅓ of a 240g pack."  _(chilli_con_carne)_
- **flex_ingredient_id in:** _none_

## curry_powder

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 3 (satay_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "KEY — the Chinese-restaurant satay flavour. Do not omit."  _(satay_chicken)_
- **flex_ingredient_id in:** _none_

## dark_chocolate

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 30 (dark_chocolate)
- **`scaling` values:** `flex`
- **`notes`:**
  - "About 2-3 squares of a 70%+ bar."  _(dark_chocolate)_
- **flex_ingredient_id in:** dark_chocolate

## desiccated_coconut

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 6 (raspberry_rip)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 tbsp."  _(raspberry_rip)_
- **flex_ingredient_id in:** _none_

## dried_basil

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 2 (turkey_meatballs_spaghetti)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Complements oregano."  _(turkey_meatballs_spaghetti)_
- **flex_ingredient_id in:** _none_

## edamame

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 150 (edamame)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Frozen pods."  _(edamame)_
- **flex_ingredient_id in:** edamame

## everything_bagel_seasoning

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 1 (cottage_cheese_bowl)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Approximately 1 tsp for topping."  _(cottage_cheese_bowl)_
- **flex_ingredient_id in:** _none_

## feta

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 40 (shakshuka)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Crumbled on top."  _(shakshuka)_
- **flex_ingredient_id in:** _none_

## flour_tortilla_small

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 3 (pulled_pork)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## garam_masala

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 2 (butter_chicken)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## garlic_bread_frozen

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 120 (bolognese)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Approximately 3 slices."  _(bolognese)_
- **flex_ingredient_id in:** _none_

## ghee

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 15 (butter_chicken)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## greek_yoghurt_plain_full_fat

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 200 (dirty_eden)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Plain, not vanilla — keeps the green flavour profile clean."  _(dirty_eden)_
- **flex_ingredient_id in:** _none_

## green_beans

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 200 (thai_basil_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Optional veg."  _(thai_basil_chicken)_
- **flex_ingredient_id in:** _none_

## instant_pudding_mix

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 12 (protein_ice_cream)
- **`scaling` values:** `scales`
- **`notes`:**
  - "1 tablespoon — the anti-icy thickener."  _(protein_ice_cream)_
- **flex_ingredient_id in:** _none_

## jam

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 100 (palacinke)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Traditional filling — mixed berry or apricot work best."  _(palacinke)_
- **flex_ingredient_id in:** _none_

## kashmiri_chilli_powder

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 1 (butter_chicken)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## lasagne_sheets_dry

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 60 (bolognese)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Approximately 2 sheets per portion. Full bake uses 360g (~12 sheets)."  _(bolognese)_
- **flex_ingredient_id in:** _none_

## lettuce

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 60 (chicken_schnitzel)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## macadamia_butter

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 32 (mango_mass)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 2 tbsp."  _(mango_mass)_
- **flex_ingredient_id in:** _none_

## mango_nectar

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 150 (mango_mass)
- **`scaling` values:** `flex`
- **`notes`:** _none_
- **flex_ingredient_id in:** mango_mass

## mint_leaves

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 6 (dirty_eden)
- **`scaling` values:** `fixed`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## mozzarella_shredded

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 50 (bolognese)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Full bake uses 300g."  _(bolognese)_
- **flex_ingredient_id in:** _none_

## noodles

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 280 (honey_soy_salmon_noodles)
- **`scaling` values:** `scales`
- **`notes`:**
  - "70g dry per serve; egg/soba/udon/rice — any noodle works."  _(honey_soy_salmon_noodles)_
- **flex_ingredient_id in:** _none_

## nutmeg_ground

_1 reference across 1 meal_

- **Amounts:**
  - `tsp`: 0.05 (bolognese)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "For the béchamel. Full bake uses a pinch (~0.3 tsp)."  _(bolognese)_
- **flex_ingredient_id in:** _none_

## orange_juice

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 80 (carne_asada_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Citrus marinade base."  _(carne_asada_bowl)_
- **flex_ingredient_id in:** _none_

## oreo_cookies

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 44 (cookies_gains)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Approximately 4 cookies. Reserve one for crushing over the top."  _(cookies_gains)_
- **flex_ingredient_id in:** cookies_gains

## pear

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 0.5 (beef_bulgogi_bowl)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Optional tenderiser, grated into marinade; or apple, or omit."  _(beef_bulgogi_bowl)_
- **flex_ingredient_id in:** _none_

## peas

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 150 (tuna_pasta_bake)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Frozen; broccoli swaps in."  _(tuna_pasta_bake)_
- **flex_ingredient_id in:** _none_

## pickled_red_onion

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 20 (pulled_pork)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Optional but recommended."  _(pulled_pork)_
- **flex_ingredient_id in:** _none_

## pineapple_frozen

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 165 (dirty_eden)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 cup."  _(dirty_eden)_
- **flex_ingredient_id in:** _none_

## protein_bar

_1 reference across 1 meal_

- **Amounts:**
  - `count`: 1 (protein_bar)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Any brand you like; aim for 15g+ protein and a sensible sugar level."  _(protein_bar)_
- **flex_ingredient_id in:** protein_bar

## raspberries_frozen

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 125 (raspberry_rip)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Approximately 1 cup."  _(raspberry_rip)_
- **flex_ingredient_id in:** _none_

## red_chilli_fresh

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 20 (thai_basil_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "To taste."  _(thai_basil_chicken)_
- **flex_ingredient_id in:** _none_

## ricotta_full_fat

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 80 (bolognese)
- **`scaling` values:** `fixed`
- **`notes`:**
  - "Full bake uses 500g."  _(bolognese)_
- **flex_ingredient_id in:** _none_

## sausage

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 800 (sheet_pan_sausage_veg)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Chicken/turkey (default, leaner) or pork (richer). ~200g per serving (~2-3 sausages)."  _(sheet_pan_sausage_veg)_
- **flex_ingredient_id in:** sheet_pan_sausage_veg

## smoked_salmon

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 100 (smoked_salmon_bagel)
- **`scaling` values:** `flex`
- **`notes`:** _none_
- **flex_ingredient_id in:** smoked_salmon_bagel

## sweet_chilli_sauce

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 60 (chicken_schnitzel)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## thai_basil_fresh

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 40 (thai_basil_chicken)
- **`scaling` values:** `scales`
- **`notes`:**
  - "Added at the end."  _(thai_basil_chicken)_
- **flex_ingredient_id in:** _none_

## tomato_passata

_1 reference across 1 meal_

- **Amounts:**
  - `ml`: 200 (butter_chicken)
- **`scaling` values:** `scales`
- **`notes`:** _none_
- **flex_ingredient_id in:** _none_

## turkey_mince

_1 reference across 1 meal_

- **Amounts:**
  - `g`: 600 (turkey_meatballs_spaghetti)
- **`scaling` values:** `flex`
- **`notes`:**
  - "Lean ground turkey (93/7). Can substitute chicken mince. 150g per serve."  _(turkey_meatballs_spaghetti)_
- **flex_ingredient_id in:** _none_

---

# Summary

## 1. Ingredients used with more than one unit

_None._

## 2. Ingredients whose notes imply conflicting states (raw / cooked / dry)

| ingredient_id | states implied | conflicting notes |
|---|---|---|
| `jasmine_rice` | raw vs cooked vs dry | "Dry weight; makes ~190g cooked."<br>"2 cups uncooked."<br>"90g dry/serve."<br>"Uncooked, about 1.5 cups."<br>"65g dry/serve."<br>"About 75g dry per serve."<br>"85g dry/serve; basmati fine."<br>"Cilantro-lime style; ~75g dry/serve."<br>"85g dry/serve." |

## 3. Referenced in curated_meals but ABSENT from src/data/ingredients.ts

_None. Every `ingredient_id` used by a meal has a matching row._

## 4. Rows in src/data/ingredients.ts referenced by NO meal

_None — every row is used._

