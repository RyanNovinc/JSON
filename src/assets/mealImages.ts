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
  'Butter Chicken with Basmati Rice.png': require('./meals/butter_chicken.png'),
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