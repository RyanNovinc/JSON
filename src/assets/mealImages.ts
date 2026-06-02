/**
 * Static image registry for curated meal photography.
 *
 * Maps every image_filename string used in src/data/curated_meals.ts to its
 * require() statement. Required because React Native bundles images at build
 * time and cannot dynamically require from a variable string.
 *
 * IMPORTANT — original filenames contained spaces, ampersands, apostrophes,
 * parentheses, and emojis. These broke Metro bundler's asset URL resolver
 * (it URL-encoded the special chars then failed to find the files). All
 * files have been renamed to safe slug-based names (lowercase + underscore).
 *
 * The original image_filename strings from curated_meals.ts are kept as
 * lookup keys so the data file doesn't need to change.
 */

const MEAL_IMAGES: Record<string, any> = {
  // ===== Base meal images (19) =====
  'Butter Chicken.png': require('./meals/butter_chicken_curry.png'),
  'Butter Chicken with Basmati Rice.png': require('./meals/butter_chicken_with_rice.png'),
  'Brekkie to GROW-Grow.png': require('./meals/brekkie_grow.png'),
  'Mango Mass.png': require('./meals/mango_mass.png'),
  'King Kong Chocolate.png': require('./meals/king_kong_chocolate.png'),
  'Strawberry Stack.png': require('./meals/strawberry_stack.png'),
  'Choc Muscle MAXX.png': require('./meals/choc_muscle_maxx.png'),
  'Cookies & Gains.png': require('./meals/cookies_gains.png'),
  'Raspberry Rip.png': require('./meals/raspberry_rip.png'),
  'Energy Lift Heavy.png': require('./meals/energy_lift_heavy.png'),
  "Mornin' Muscle.png": require('./meals/mornin_muscle.png'),
  'Dirty Eden.png': require('./meals/dirty_eden.png'),
  'Strawbrekkie BEAST.png': require('./meals/strawbrekkie_beast.png'),
  'Banana Bulk.png': require('./meals/banana_bulk.png'),
  'Slow-Cooked Pulled Pork.png': require('./meals/pulled_pork.png'),
  'Bolognese Sauce.png': require('./meals/bolognese.png'),
  'Massaman Beef Curry.png': require('./meals/massaman.png'),
  'Chilli Con Carne.png': require('./meals/chilli_con_carne.png'),
  'Red Wine Braised Lamb Shanks.png': require('./meals/lamb_shanks.png'),
  'Slow-Cooked Beef Stew.png': require('./meals/beef_stew.png'),

  // ===== Plate-specific images (15) — used on RecipeDetailScreen =====
  // Pulled Pork plates
  'BBQ Pulled Pork Burger (sandwich).png': require('./meals/pulled_pork_sandwich.png'),
  'Pulled Pork Rice Bowl (bowl).png': require('./meals/pulled_pork_bowl.png'),
  'Loaded Pulled Pork Baked Potato (baked_potato).png': require('./meals/pulled_pork_baked_potato.png'),
  'Pulled Pork Tacos (tacos).png': require('./meals/pulled_pork_tacos.png'),
  'Pulled Pork Mac & Cheese Stack ⚡ STUNT PLATE (mac_cheese).png': require('./meals/pulled_pork_mac_cheese.png'),

  // Bolognese plates
  'Spaghetti Bolognese (spaghetti).png': require('./meals/bolognese_spaghetti.png'),
  'Loaded Bolognese Baked Potato (baked_potato).png': require('./meals/bolognese_baked_potato.png'),
  'Bolognese with Garlic Bread (garlic_bread).png': require('./meals/bolognese_garlic_bread.png'),
  'Bolognese Lasagne ⚡ STUNT PLATE (lasagne).png': require('./meals/bolognese_lasagne.png'),

  // Massaman plates
  'Massaman Beef Curry with Rice.png': require('./meals/massaman_rice.png'),

  // Chilli Con Carne plates
  'Bulking Chilli Bowl.png': require('./meals/chilli_con_carne_bowl.png'),
  'Loaded Chilli Nachos ⚡ STUNT.png': require('./meals/chilli_con_carne_nachos.png'),

  // Lamb Shanks plates
  'Lamb Shank on Creamy Mash.png': require('./meals/lamb_shanks_mash.png'),

  // Beef Stew plates
  'Beef Stew on Creamy Mash.png': require('./meals/beef_stew_mash.png'),
  'Beef Stew with Crusty Bread.png': require('./meals/beef_stew_bread.png'),

  // ===== ALL MISSING IMAGES ADDED BELOW =====
  
  // Additional base meal images (using exact filenames from curated_meals.ts)
  'baked_oats.png': require('./meals/baked_oats.png'),
  'banana_bulk.png': require('./meals/banana_bulk.png'),
  'banana_snack.png': require('./meals/banana_snack.png'),
  'beef_broccoli_stir_fry.png': require('./meals/beef_broccoli_stir_fry.png'),
  'beef_bulgogi_bowl.png': require('./meals/beef_bulgogi_bowl.png'),
  'beef_jerky.png': require('./meals/beef_jerky.png'),
  'beef_ragu_gnocchi.png': require('./meals/beef_ragu_gnocchi.png'),
  'beef_stew.png': require('./meals/beef_stew.png'),
  'big_breakfast_plate.png': require('./meals/big_breakfast_plate.png'),
  'bolognese.png': require('./meals/bolognese.png'),
  'brekkie_grow.png': require('./meals/brekkie_grow.png'),
  'butter_chicken_with_rice.png': require('./meals/butter_chicken_with_rice.png'),
  'carne_asada_bowl.png': require('./meals/carne_asada_bowl.png'),
  'cheese_snack.png': require('./meals/cheese_snack.png'),
  'chicken_fajita_bowl.png': require('./meals/chicken_fajita_bowl.png'),
  'chicken_mac_and_cheese.png': require('./meals/chicken_mac_and_cheese.png'),
  'chicken_shawarma.png': require('./meals/chicken_shawarma.png'),
  'chilli_con_carne.png': require('./meals/chilli_con_carne.png'),
  'choc_muscle_maxx.png': require('./meals/choc_muscle_maxx.png'),
  'chocolate_protein_mousse.png': require('./meals/chocolate_protein_mousse.png'),
  'chocolate_protein_mug_cake.png': require('./meals/chocolate_protein_mug_cake.png'),
  'cookies_gains.png': require('./meals/cookies_gains.png'),
  'cottage_cheese_bowl.png': require('./meals/cottage_cheese_bowl.png'),
  'cottage_cheese_ice_cream.png': require('./meals/cottage_cheese_ice_cream.png'),
  'dark_chocolate.png': require('./meals/dark_chocolate.png'),
  'dirty_eden.png': require('./meals/dirty_eden.png'),
  'dried_fruit.png': require('./meals/dried_fruit.png'),
  'edamame.png': require('./meals/edamame.png'),
  'edible_protein_cookie_dough.png': require('./meals/edible_protein_cookie_dough.png'),
  'egg_muffins.png': require('./meals/egg_muffins.png'),
  'energy_lift_heavy.png': require('./meals/energy_lift_heavy.png'),
  'freezer_breakfast_burrito.png': require('./meals/freezer_breakfast_burrito.png'),
  'frozen_date_snickers_bark.png': require('./meals/frozen_date_snickers_bark.png'),
  'fudgy_protein_brownies.png': require('./meals/fudgy_protein_brownies.png'),
  'greek_yoghurt_bowl.png': require('./meals/greek_yoghurt_bowl.png'),
  'greek_yogurt_snack.png': require('./meals/greek_yogurt_snack.png'),
  'hard_boiled_eggs.png': require('./meals/hard_boiled_eggs.png'),
  'honey_chicken.png': require('./meals/honey_chicken.png'),
  'honey_soy_salmon_noodles.png': require('./meals/honey_soy_salmon_noodles.png'),
  'king_kong_chocolate.png': require('./meals/king_kong_chocolate.png'),
  'lamb_kofta.png': require('./meals/lamb_kofta.png'),
  'lamb_shanks.png': require('./meals/lamb_shanks.png'),
  'mango_mass.png': require('./meals/mango_mass.png'),
  'maple_muscle_toast.png': require('./meals/maple_muscle_toast.png'),
  'massaman.png': require('./meals/massaman.png'),
  'mixed_nuts.png': require('./meals/mixed_nuts.png'),
  'mornin_muscle.png': require('./meals/mornin_muscle.png'),
  'muscle_oats.png': require('./meals/muscle_oats.png'),
  'no_bake_protein_balls.png': require('./meals/no_bake_protein_balls.png'),
  'no_bake_protein_cheesecake.png': require('./meals/no_bake_protein_cheesecake.png'),
  'overnight_oats.png': require('./meals/overnight_oats.png'),
  'palacinke.png': require('./meals/palacinke.png'),
  'pb_banana_toast.png': require('./meals/pb_banana_toast.png'),
  'protein_banana_bread.png': require('./meals/protein_banana_bread.png'),
  'protein_bar.png': require('./meals/protein_bar.png'),
  'protein_chocolate_chip_cookies.png': require('./meals/protein_chocolate_chip_cookies.png'),
  'protein_ice_cream.png': require('./meals/protein_ice_cream.png'),
  'protein_pancakes.png': require('./meals/protein_pancakes.png'),
  'protein_shake.png': require('./meals/protein_shake.png'),
  'pulled_pork.png': require('./meals/pulled_pork.png'),
  'raspberry_rip.png': require('./meals/raspberry_rip.png'),
  'roasted_chickpeas.png': require('./meals/roasted_chickpeas.png'),
  'satay_chicken.png': require('./meals/satay_chicken.png'),
  'scramble_stack.png': require('./meals/scramble_stack.png'),
  'shakshuka.png': require('./meals/shakshuka.png'),
  'sheet_pan_salmon_potatoes.png': require('./meals/sheet_pan_salmon_potatoes.png'),
  'sheet_pan_sausage_veg.png': require('./meals/sheet_pan_sausage_veg.png'),
  'smoked_salmon_bagel.png': require('./meals/smoked_salmon_bagel.png'),
  'spaghetti_carbonara.png': require('./meals/spaghetti_carbonara.png'),
  'spicy_chipotle_chicken_burrito.png': require('./meals/spicy_chipotle_chicken_burrito.png'),
  'steak_and_eggs.png': require('./meals/steak_and_eggs.png'),
  'strawberry_stack.png': require('./meals/strawberry_stack.png'),
  'strawbrekkie_beast.png': require('./meals/strawbrekkie_beast.png'),
  'teriyaki_chicken_rice_bowl.png': require('./meals/teriyaki_chicken_rice_bowl.png'),
  'thai_basil_chicken.png': require('./meals/thai_basil_chicken.png'),
  'trail_mix.png': require('./meals/trail_mix.png'),
  'tuna_pasta_bake.png': require('./meals/tuna_pasta_bake.png'),
  'tuna_pouch.png': require('./meals/tuna_pouch.png'),
  'turkey_meatballs_spaghetti.png': require('./meals/turkey_meatballs_spaghetti.png'),

  // Additional plates with special characters in filenames
  'Chicken Parma (parma).png': require('./meals/Chicken Parma (parma).png'),
  'Chicken Schnitzel.png': require('./meals/Chicken Schnitzel.png'),
  'Chicken Shawarma Rice Bowl (rice_bowl).png': require('./meals/Chicken Shawarma Rice Bowl (rice_bowl).png'),
  'Chicken Shawarma Wrap (wrap).png': require('./meals/Chicken Shawarma Wrap (wrap).png'),
  'Lamb Kofta Rice Bowl (rice_bowl).png': require('./meals/lamb_kofta_rice_bowl.png'),
  'Lamb Kofta Wrap (wrap).png': require('./meals/Lamb Kofta Wrap (wrap).png'),
  'Schnitzel Plate (plate).png': require('./meals/Schnitzel Plate (plate).png'),
  'Schnitzel Roll (roll).png': require('./meals/Schnitzel Roll (roll).png'),
  'Spicy Chipotle Chicken Burrito.png': require('./meals/spicy_chipotle_chicken_burrito.png'),
  'Spicy Chipotle Chicken Burrito (standard).png': require('./meals/Spicy Chipotle Chicken Burrito (standard).png'),
  'Spicy Chipotle Chicken Burrito Bowl (burrito_bowl).png': require('./meals/Spicy Chipotle Chicken Burrito Bowl (burrito_bowl).png'),
  'Thai Basil Chicken over Rice (standard).png': require('./meals/Thai Basil Chicken over Rice (standard).png'),
  'Thai Basil Chicken with Fried Egg (fried_egg).png': require('./meals/Thai Basil Chicken with Fried Egg (fried_egg).png'),
  'Ćevapi Rice Plate (rice_plate).png': require('./meals/cevapi_rice_plate.png'),
  'Ćevapi with Flatbread (flatbread).png': require('./meals/cevapi_flatbread.png'),
};

/**
 * Returns the require()'d image source for a given image_filename, or undefined
 * if the filename is not registered. Callers should handle the undefined case
 * with a fallback (placeholder view, etc.) to avoid crashes when meals are
 * added to the database but the image isn't yet registered here.
 */
export function getMealImage(filename: string | undefined): any | undefined {
  if (!filename) return undefined;
  return MEAL_IMAGES[filename];
}