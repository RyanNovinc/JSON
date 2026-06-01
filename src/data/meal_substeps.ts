// src/data/meal_substeps.ts

/**
 * Per-step atomic substep overrides for Cook Mode.
 *
 * Structure: MEAL_SUBSTEPS[mealSlug][methodId or plateId][stepIndex] = [substep, substep, ...]
 *
 * Method steps go under the method's id (e.g. 'slow_cooker', 'stovetop_scratch').
 * Plate steps go under the plate's id (e.g. 'sandwich', 'bowl').
 * stepIndex is 0-based.
 *
 * Substeps are either plain strings, or objects with timer data:
 *   string                                                   // no timer
 *   { text: string; timer_seconds: number; timer_label: string }  // timed
 *
 * If a stepIndex has no entry, Cook Mode falls back to showing the summary as-is.
 * Partial authoring is fine — you can author method steps but skip plate steps,
 * or author only the first few steps and let the rest fall back.
 */
export type Substep =
  | string
  | { text: string; timer_seconds: number; timer_label: string };

export const MEAL_SUBSTEPS: Record<
  string,                              // mealSlug
  Record<
    string,                            // methodId or plateId
    Record<
      number,                          // stepIndex
      Substep[]                        // substep array
    >
  >
> = {
  butter_chicken: {
    stovetop_scratch: {
      0: [
        'Cut 200g chicken thigh into 3cm cubes',
        'Combine the chicken with 60g plain Greek yoghurt, 1 tsp garam masala, 1/2 tsp ground cumin, and 1/4 tsp ground turmeric',
        { text: 'Marinate for 20 minutes', timer_seconds: 1200, timer_label: 'Marinate' },
      ],
      1: [
        'Heat 15g ghee in a large frying pan over medium-high heat',
        'Add the marinated chicken to the pan',
        { text: 'Sear for 4-5 minutes until golden on all sides', timer_seconds: 300, timer_label: 'Sear' },
        'Remove from pan and set aside',
      ],
      2: [
        'Add 75g diced brown onion to the same pan',
        { text: 'Cook for 3 minutes until softened', timer_seconds: 180, timer_label: 'Soften onion' },
        'Add 2 cloves garlic and 1 tsp fresh ginger to the pan',
        'Cook for another 30 seconds',
      ],
      3: [
        'Add 1 tsp garam masala, 1/2 tsp ground cumin, 1 tsp ground coriander, 1/4 tsp ground turmeric, and 1 tsp Kashmiri chilli powder to the pan',
        'Stir for 30 seconds until fragrant',
      ],
      4: [
        'Pour in 200ml tomato passata',
        'Add 1/2 tsp salt',
        { text: 'Bring to a simmer and cook for 5 minutes, stirring occasionally', timer_seconds: 300, timer_label: 'Simmer' },
      ],
      5: [
        'Return the chicken to the pan',
        'Stir through 60ml thickened cream',
        { text: 'Simmer for 5 more minutes until the chicken is cooked through and the sauce has thickened', timer_seconds: 300, timer_label: 'Simmer' },
      ],
      6: [
        'Serve over 180g cooked basmati rice',
        'Garnish with 1 tbsp fresh coriander leaves',
      ],
    },
    stovetop_shortcut: {
      0: [
        'Cut 200g chicken thigh into 3cm cubes',
      ],
      1: [
        'Heat 10g olive oil in a frying pan over medium-high heat',
        'Add the chicken to the pan',
        { text: 'Pan-fry for 6-7 minutes until cooked through and lightly golden', timer_seconds: 420, timer_label: 'Pan-fry' },
      ],
      2: [
        'Pour in 200g butter chicken jar sauce and 30ml thickened cream',
        'Stir to coat the chicken',
        { text: 'Simmer for 3-4 minutes until the sauce is heated through', timer_seconds: 240, timer_label: 'Simmer' },
      ],
      3: [
        'Serve over 180g cooked basmati rice',
        'Garnish with 1 tbsp fresh coriander leaves',
      ],
    },
    slow_cooker: {
      0: [
        'Cut 200g chicken thigh into 3cm cubes',
        'Place the chicken in the slow cooker with 200g butter chicken jar sauce',
        'Stir to coat',
      ],
      1: [
        { text: 'Cook on high for 4 hours or low for 6-8 hours', timer_seconds: 14400, timer_label: 'Slow cook' },
      ],
      2: [
        { text: 'Stir through 30ml thickened cream during the last 10 minutes of cooking', timer_seconds: 600, timer_label: 'Finish' },
      ],
      3: [
        'Serve over 180g cooked basmati rice',
        'Garnish with 1 tbsp fresh coriander leaves',
      ],
    },
  },
  bolognese: {
    slow_cooker: {
      0: [
        'Heat 15g olive oil in a large skillet over medium-high heat',
        'Add 300g diced brown onion, 120g diced carrot, and 100g diced celery to the skillet',
        { text: 'Cook for 7 minutes until soft and the onion is translucent', timer_seconds: 420, timer_label: 'Soften veg' },
        'Add 4 cloves minced garlic and 100g diced pancetta',
        { text: 'Cook 2 more minutes', timer_seconds: 120, timer_label: 'Cook' },
        'Transfer everything to the slow cooker',
      ],
      1: [
        'Add the remaining 15g olive oil to the same skillet over high heat',
        'Add 1000g beef mince to the skillet',
        'Brown in two batches if needed to avoid overcrowding the pan',
        'Break up the mince with a wooden spoon as it cooks',
        'Transfer to the slow cooker',
      ],
      2: [
        'Return the skillet to medium heat',
        'Pour in 250ml red wine',
        'Scrape all the browned bits from the bottom of the pan',
        { text: 'Simmer for 2 minutes', timer_seconds: 120, timer_label: 'Reduce wine' },
        'Pour into the slow cooker',
      ],
      3: [
        'Add 1600g crushed tomatoes, 60g tomato paste, 3 beef stock cubes (30g total), 20ml Worcestershire sauce, 8g white sugar, 2 tsp dried oregano, 2 tsp dried thyme, 3 bay leaves, 1 tsp salt, and 1/2 tsp ground black pepper to the slow cooker',
        'Stir well',
      ],
      4: [
        { text: 'Cook on LOW for 6 hours (or HIGH for 4 hours)', timer_seconds: 21600, timer_label: 'Slow cook' },
      ],
      5: [
        'After cooking, taste and adjust salt',
        'Remove the bay leaves',
        { text: 'If the sauce looks too liquid, prop the lid open with a wooden spoon and cook on HIGH for 30 more minutes', timer_seconds: 1800, timer_label: 'Reduce' },
      ],
    },
    stovetop: {
      0: [
        'Heat 15g olive oil in a large heavy-based pot or Dutch oven over medium heat',
        'Add 300g diced brown onion, 120g diced carrot, and 100g diced celery to the pot',
        { text: 'Cook for 7 minutes until softened', timer_seconds: 420, timer_label: 'Soften veg' },
        'Add 4 cloves minced garlic and 100g diced pancetta',
        { text: 'Cook 2 more minutes', timer_seconds: 120, timer_label: 'Cook' },
      ],
      1: [
        'Turn the heat to high',
        'Push the vegetables to one side of the pot',
        'Add the remaining 15g olive oil and 1000g beef mince to the pot',
        { text: 'Brown the mince well, breaking it up with a wooden spoon, about 5 minutes', timer_seconds: 300, timer_label: 'Brown mince' },
      ],
      2: [
        'Pour in 250ml red wine',
        { text: 'Simmer rapidly for 2 minutes until reduced by half', timer_seconds: 120, timer_label: 'Reduce wine' },
      ],
      3: [
        'Add 1200g crushed tomatoes, 60g tomato paste, 3 beef stock cubes (30g total), 20ml Worcestershire sauce, 8g white sugar, 2 tsp dried oregano, 2 tsp dried thyme, 3 bay leaves, 1 tsp salt, and 1/2 tsp ground black pepper',
        'Stir well and bring to a simmer',
      ],
      4: [
        'Reduce the heat to low',
        'Cover loosely with the lid slightly ajar',
        { text: 'Simmer gently for 1.5-2 hours, stirring every 20 minutes', timer_seconds: 5400, timer_label: 'Simmer' },
      ],
      5: [
        'After 1.5 hours, taste',
        'Adjust salt and add more sugar if too sharp',
        'Remove the bay leaves',
        { text: 'If too watery, simmer uncovered for the last 20 minutes', timer_seconds: 1200, timer_label: 'Reduce' },
      ],
    },
    spaghetti: {
      0: [
        'Bring a large pot of water to the boil with 1 tsp salt',
        'Cook 100g dry spaghetti for 1 minute less than the packet directions',
      ],
      1: [
        'While the pasta cooks, reheat 1 serving of bolognese in a large pan over medium heat',
        'Reserve 1/2 cup of pasta cooking water before draining',
      ],
      2: [
        'Drain the spaghetti and add it directly to the sauce pan',
        'Add a splash (~50ml) of the pasta water',
        { text: 'Toss vigorously over medium heat for 1 minute', timer_seconds: 60, timer_label: 'Toss' },
      ],
      3: [
        'Plate the pasta',
        'Top with 20g grated parmesan',
        'Drizzle 5g olive oil over the top',
      ],
    },
    baked_potato: {
      0: [
        'Preheat the oven to 200°C',
        'Prick a 350g baking potato all over with a fork',
        'Rub the potato with 5g olive oil and 1/4 tsp salt',
      ],
      1: [
        { text: 'Bake directly on the oven rack for 60 minutes, until the skin is crisp and the inside gives easily when squeezed', timer_seconds: 3600, timer_label: 'Bake' },
      ],
      2: [
        'Reheat 1 serving of bolognese while the potato finishes',
      ],
      3: [
        'Split the potato open lengthways',
        'Fluff the flesh with a fork',
      ],
      4: [
        'Pile the bolognese into the potato',
        'Scatter 30g grated tasty cheese over the bolognese',
        'Dollop 30g sour cream on top',
      ],
    },
    garlic_bread: {
      0: [
        { text: 'Bake 120g frozen garlic bread per packet instructions, usually 180°C for 12-15 minutes', timer_seconds: 900, timer_label: 'Bake' },
      ],
      1: [
        'Reheat 1 serving of bolognese in a pan or microwave',
        'Spoon the bolognese into a wide bowl',
      ],
      2: [
        'Top the bolognese with 15g grated parmesan',
      ],
      3: [
        'Serve the garlic bread alongside for dipping',
      ],
    },
    lasagne: {
      0: [
        'Note: this plate makes a 6-portion bake using 6 servings of bolognese in one go',
        'Plan to eat across the week or freeze portions',
      ],
      1: [
        'Melt 30g salted butter in a small saucepan over medium heat',
        'Whisk in 30g plain flour and cook 30 seconds',
        'Gradually whisk in 400ml full-cream milk until smooth',
        { text: 'Simmer 2-3 minutes, whisking, until thickened', timer_seconds: 180, timer_label: 'Thicken' },
        'Season the béchamel with a pinch of ground nutmeg, salt, and pepper',
        'Set the béchamel aside',
      ],
      2: [
        'Combine 500g ricotta, 1 whole egg, 30g grated parmesan (half the total), salt, and pepper in a bowl',
        'Stir until smooth',
      ],
      3: [
        'Preheat the oven to 180°C',
        'Lightly grease a deep baking dish (roughly 30 × 20 cm)',
      ],
      4: [
        'Spread a thin smear of bolognese on the base of the dish',
        'Cover with lasagne sheets (360g total across the bake), breaking to fit if needed',
        'Spread 1/3 of the remaining bolognese over the sheets',
        'Dollop and spread 1/3 of the ricotta mix on top',
        'Spread 1/3 of the béchamel over that',
        'Repeat the bolognese, ricotta, béchamel layers two more times',
        'Top with 300g shredded mozzarella and the remaining 30g grated parmesan',
      ],
      5: [
        'Cover with foil',
        { text: 'Bake 25 minutes', timer_seconds: 1500, timer_label: 'Bake covered' },
        { text: 'Remove the foil and bake 10 more minutes until the cheese is golden and bubbling', timer_seconds: 600, timer_label: 'Bake uncovered' },
      ],
      6: [
        { text: 'Rest 15 minutes before cutting', timer_seconds: 900, timer_label: 'Rest' },
        'Cut into 6 portions',
      ],
    },
  },
  massaman: {
    slow_cooker: {
      0: [
        'Heat 15g olive oil in a large skillet over medium-high heat',
        'Brown 1600g cubed beef chuck in 2-3 batches, about 2 minutes per side to get a hard sear',
        'Transfer to the slow cooker as you go',
      ],
      1: [
        'In the same skillet (do not wipe out), drop the heat to medium',
        'Add 200g sliced brown onion',
        { text: 'Cook 3 minutes until starting to soften', timer_seconds: 180, timer_label: 'Soften onion' },
        'Add 4 cloves minced garlic, 1 tsp grated fresh ginger, and 200g massaman curry paste',
        { text: 'Cook 2 minutes, stirring constantly, until the paste is fragrant and the oil starts to split out', timer_seconds: 120, timer_label: 'Bloom paste' },
      ],
      2: [
        'Pour 1 cup of the coconut cream into the skillet',
        'Stir to combine with the paste, scraping all the brown bits off the bottom of the pan',
        { text: 'Bring to a simmer for 1 minute', timer_seconds: 60, timer_label: 'Simmer' },
        'Transfer everything to the slow cooker',
      ],
      3: [
        'Add the remaining coconut cream (about 560ml), 500ml beef stock, 800g waxy potato chunks, 45ml fish sauce, 30g brown sugar, 30g tamarind paste, 1 cinnamon stick, 2 star anise, and 3 bay leaves to the slow cooker',
        'Stir to combine',
      ],
      4: [
        { text: 'Cook on LOW for 8 hours or HIGH for 5 hours, until the beef is fork-tender and falls apart with light pressure', timer_seconds: 28800, timer_label: 'Slow cook' },
      ],
      5: [
        { text: 'Optional: if the sauce looks too thin, transfer to a saucepan and simmer uncovered for 10 minutes to reduce', timer_seconds: 600, timer_label: 'Reduce' },
        'Or mash 2-3 potato chunks gently into the sauce to thicken naturally',
      ],
      6: [
        'Remove the cinnamon stick, star anise, and bay leaves before serving',
      ],
    },
    stovetop: {
      0: [
        'Heat 15g olive oil in a large heavy-based pot or Dutch oven over medium-high heat',
        'Brown 1600g cubed beef chuck in batches, about 2 minutes per side',
        'Transfer to a plate',
      ],
      1: [
        'Drop the heat to medium',
        'Add the remaining 15g olive oil and 200g sliced brown onion to the pot',
        { text: 'Cook 5 minutes until soft', timer_seconds: 300, timer_label: 'Soften onion' },
        'Add 4 cloves minced garlic and 1 tsp grated fresh ginger',
        { text: 'Cook 1 minute', timer_seconds: 60, timer_label: 'Cook' },
      ],
      2: [
        'Add 200g massaman curry paste to the pot',
        { text: 'Cook for 3 minutes, stirring constantly, until the paste darkens and the oil splits out', timer_seconds: 180, timer_label: 'Bloom paste' },
      ],
      3: [
        'Pour in 800ml coconut cream',
        'Stir to combine with the paste',
        'Bring to a simmer',
        'Add the beef back in with any juices, plus 750ml beef stock, 45ml fish sauce, 30g brown sugar, 30g tamarind paste, 1 cinnamon stick, 2 star anise, and 3 bay leaves',
      ],
      4: [
        'Bring to a simmer',
        'Cover loosely with the lid slightly ajar',
        { text: 'Simmer gently for 1 hour 15 minutes, stirring every 20 minutes', timer_seconds: 4500, timer_label: 'Simmer' },
      ],
      5: [
        'Add 800g waxy potato chunks',
        { text: 'Continue simmering uncovered for 30-40 minutes, until the potatoes are tender and the beef shreds easily with a fork', timer_seconds: 2400, timer_label: 'Simmer' },
      ],
      6: [
        'Remove the cinnamon stick, star anise, and bay leaves',
        'Taste and adjust — more fish sauce for salt, more sugar for sweetness, more tamarind for sour',
      ],
    },
    rice: {
      0: [
        'Cook 100g dry basmati rice per packet directions, or use a rice cooker',
        { text: 'For stovetop: 100g dry basmati + 200ml water on a low simmer, covered, for 12 minutes', timer_seconds: 720, timer_label: 'Rice' },
        { text: 'Rest off heat 5 minutes', timer_seconds: 300, timer_label: 'Rest rice' },
      ],
      1: [
        'Reheat 1 serving of massaman curry in a small saucepan or microwave',
        'Warm gently, do not boil hard',
      ],
      2: [
        'Pile 300g cooked basmati rice into a bowl on one side',
        'Ladle the curry over the other side (or on top of the rice)',
      ],
      3: [
        'Scatter 20g roughly crushed roasted peanuts over the curry',
        'Top with 1 tbsp fresh coriander leaves',
      ],
      4: [
        'Squeeze a lime wedge over everything just before eating',
      ],
    },
  },
  chilli_con_carne: {
    slow_cooker: {
      0: [
        'Heat 15g olive oil in a large skillet over medium-high heat',
        'Add 300g diced brown onion, 5 cloves minced garlic, and 300g diced red capsicum to the skillet',
        { text: 'Cook 4-5 minutes until softening and slightly caramelised', timer_seconds: 300, timer_label: 'Soften veg' },
        'Transfer to the slow cooker',
      ],
      1: [
        'Add the remaining 15g olive oil to the same skillet over high heat',
        'Add 1000g beef mince',
        'Brown in two batches if needed, breaking it up with a wooden spoon as it cooks',
        'Transfer to the slow cooker',
      ],
      2: [
        'Add to the slow cooker: 1600g crushed tomatoes, 90g tomato paste, 400g drained kidney beans, 400g drained black beans, 3 crumbled beef stock cubes (30g total), 12g white sugar, 8 tsp sweet paprika, 10 tsp ground cumin, 4 tsp garlic powder, 4 tsp onion powder, 4 tsp dried oregano, 2 1/2 tsp cayenne pepper, 1 1/2 tsp salt, and 250ml water',
        'Stir well',
      ],
      3: [
        { text: 'Cook on LOW for 6 hours or HIGH for 4 hours', timer_seconds: 21600, timer_label: 'Slow cook' },
      ],
      4: [
        'Taste and adjust — more cayenne for heat, more salt if needed, more sugar if too acidic',
        { text: 'If the sauce is too liquid, prop the lid open on HIGH for 20 minutes to reduce', timer_seconds: 1200, timer_label: 'Reduce' },
      ],
    },
    stovetop: {
      0: [
        'Heat 15g olive oil in a large heavy-based pot over medium-high heat',
        'Add 300g diced brown onion, 5 cloves minced garlic, and 300g diced red capsicum',
        { text: 'Cook 5 minutes until soft and lightly browned', timer_seconds: 300, timer_label: 'Soften veg' },
      ],
      1: [
        'Push the vegetables to one side of the pot',
        'Add the remaining 15g olive oil and 1000g beef mince',
        { text: 'Brown the mince well, breaking it up, about 5-6 minutes', timer_seconds: 360, timer_label: 'Brown mince' },
      ],
      2: [
        'Add 8 tsp sweet paprika, 10 tsp ground cumin, 4 tsp garlic powder, 4 tsp onion powder, 4 tsp dried oregano, and 2 1/2 tsp cayenne pepper to the pot',
        'Stir for 30 seconds to toast the spices',
      ],
      3: [
        'Add 1600g crushed tomatoes, 90g tomato paste, 400g drained kidney beans, 400g drained black beans, 3 crumbled beef stock cubes (30g total), 12g white sugar, 1 1/2 tsp salt, and 375ml water',
        'Stir well',
      ],
      4: [
        'Bring to a simmer',
        'Reduce the heat to low',
        'Cover loosely with the lid slightly ajar',
        { text: 'Simmer gently for 1.5 hours minimum, up to 2.5 hours, stirring every 20 minutes', timer_seconds: 5400, timer_label: 'Simmer' },
      ],
      5: [
        'Taste and adjust',
        { text: 'If too thin, simmer uncovered for the last 15-20 minutes', timer_seconds: 1200, timer_label: 'Reduce' },
      ],
    },
    bowl: {
      0: [
        'Cook 85g dry basmati rice per packet directions, or use a rice cooker',
        { text: 'For stovetop: 85g dry basmati + 170ml water on a low simmer, covered, for 12 minutes', timer_seconds: 720, timer_label: 'Rice' },
        { text: 'Rest off heat 5 minutes', timer_seconds: 300, timer_label: 'Rest rice' },
      ],
      1: [
        'Reheat 1 serving of chilli in a saucepan or microwave',
      ],
      2: [
        'Pile 250g cooked basmati rice into a bowl',
        'Ladle the chilli over the rice generously',
      ],
      3: [
        'Top with 30g grated tasty cheese',
        'Add a dollop of 30g sour cream',
        'Add 80g sliced or smashed avocado',
        'Scatter 1 tbsp fresh coriander leaves over the top',
      ],
      4: [
        'Squeeze a lime wedge over everything just before eating',
      ],
    },
    nachos: {
      0: [
        'Preheat the oven to 200°C',
      ],
      1: [
        'Reheat 1 serving of chilli in a small saucepan or microwave until hot',
      ],
      2: [
        'Spread 80g corn chips across an oven-safe dish or baking tray in a single thick layer',
      ],
      3: [
        'Spoon the hot chilli evenly over the chips, right to the edges',
      ],
      4: [
        'Scatter 40g grated tasty cheese over the top in an even layer',
      ],
      5: [
        { text: 'Bake for 8-10 minutes, until the cheese is fully melted and bubbling at the edges', timer_seconds: 600, timer_label: 'Bake' },
      ],
      6: [
        'Remove from the oven',
        'Dollop 30g sour cream on top',
        'Add 60g sliced or smashed avocado',
        'Scatter 20g drained pickled jalapeños',
        'Scatter 1 finely sliced spring onion',
        'Scatter 1 tbsp fresh coriander leaves',
      ],
      7: [
        'Squeeze a lime wedge over everything',
        'Eat straight from the dish',
      ],
    },
  },
  lamb_shanks: {
    slow_cooker: {
      0: [
        'Pat 4 lamb shanks dry with paper towel',
        'Season generously with 1 tsp salt and 1/2 tsp ground black pepper',
      ],
      1: [
        'Heat 30g olive oil in a large heavy skillet over high heat',
        { text: 'Sear the shanks in two batches until well-browned all over, about 5 minutes per batch', timer_seconds: 300, timer_label: 'Sear' },
        'Transfer browned shanks to the slow cooker',
      ],
      2: [
        'Drain any excess fat from the skillet',
        'Drop the heat to medium-low',
        'Add the remaining 15g olive oil',
      ],
      3: [
        'Add 150g diced brown onion and 3 cloves minced garlic to the skillet',
        { text: 'Cook 2 minutes', timer_seconds: 120, timer_label: 'Soften onion' },
        'Add 130g diced carrot and 100g diced celery',
        { text: 'Cook 5 minutes until the onion is translucent', timer_seconds: 300, timer_label: 'Soften veg' },
      ],
      4: [
        'Pour in 625ml red wine',
        'Bring to a simmer, scraping all the brown bits off the bottom of the pan',
        { text: 'Simmer 2-3 minutes to cook off some of the alcohol', timer_seconds: 180, timer_label: 'Reduce wine' },
      ],
      5: [
        'Add 800g crushed tomatoes, 30g tomato paste, 500ml chicken stock, 5 sprigs fresh thyme (tied together), and 2 bay leaves',
        'Stir well and bring to a simmer',
      ],
      6: [
        'Pour the entire braising liquid into the slow cooker over the shanks',
        'The shanks should be mostly submerged; squeeze them in to fit if needed',
      ],
      7: [
        { text: 'Cook on LOW for 8 hours until the meat is fall-off-the-bone tender', timer_seconds: 28800, timer_label: 'Slow cook' },
      ],
      8: [
        'Carefully remove the shanks using two spoons',
        'Strain the sauce into a saucepan',
        { text: 'Simmer on the stovetop for 10-15 minutes to reduce to a thick, glossy gravy', timer_seconds: 900, timer_label: 'Reduce sauce' },
      ],
      9: [
        'Return the shanks to the reduced sauce to warm through before serving',
      ],
    },
    oven_braise: {
      0: [
        'Preheat the oven to 180°C',
      ],
      1: [
        'Pat 4 lamb shanks dry',
        'Season with 1 tsp salt and 1/2 tsp ground black pepper',
      ],
      2: [
        'Heat 30g olive oil in a large Dutch oven over high heat',
        { text: 'Sear the shanks in two batches until browned all over, 5 minutes per batch', timer_seconds: 300, timer_label: 'Sear' },
        'Set aside on a plate',
      ],
      3: [
        'Drain the fat',
        'Drop the heat to medium-low',
        'Add the remaining 15g olive oil',
      ],
      4: [
        'Add 150g diced brown onion and 3 cloves minced garlic',
        { text: 'Cook 2 minutes', timer_seconds: 120, timer_label: 'Soften onion' },
        'Add 130g diced carrot and 100g diced celery',
        { text: 'Cook 5 minutes', timer_seconds: 300, timer_label: 'Soften veg' },
      ],
      5: [
        'Pour in 625ml red wine',
        'Bring to a simmer, scraping the fond',
        { text: 'Simmer 2-3 minutes', timer_seconds: 180, timer_label: 'Reduce wine' },
      ],
      6: [
        'Add 800g crushed tomatoes, 30g tomato paste, 500ml chicken stock, 5 sprigs fresh thyme, and 2 bay leaves',
        'Stir',
        'Return the shanks to the pot, squeezing them in so they are mostly submerged',
      ],
      7: [
        'Bring the liquid to a simmer',
        'Cover with the lid',
        { text: 'Transfer to the oven for 2 hours covered', timer_seconds: 7200, timer_label: 'Braise' },
      ],
      8: [
        'Remove the lid',
        { text: 'Return to the oven for another 30 minutes uncovered', timer_seconds: 1800, timer_label: 'Reduce' },
      ],
      9: [
        'Remove from the oven',
        'Carefully transfer the shanks to a plate',
        { text: 'If the sauce needs more reduction, simmer on the stovetop for 5-10 minutes', timer_seconds: 600, timer_label: 'Reduce sauce' },
      ],
    },
    mash: {
      0: [
        'Peel 300g baking potato and cut into 3cm chunks',
        'Place in a large saucepan, cover with cold water, and add a generous pinch of salt',
        { text: 'Bring to a boil and cook 15-18 minutes until a knife slides in with no resistance', timer_seconds: 1080, timer_label: 'Boil potato' },
      ],
      1: [
        'Drain the potatoes thoroughly',
        'Return them to the empty hot saucepan and leave for 30 seconds to steam off excess moisture',
      ],
      2: [
        'Add 25g salted butter, 50ml thickened cream, and 30ml full-cream milk to the saucepan',
        'Mash until smooth',
        'Season with 1/4 tsp salt and 1/8 tsp ground black pepper',
        'Taste and adjust',
      ],
      3: [
        'Pile the hot mash into a wide shallow bowl',
        'Make a slight well in the middle',
      ],
      4: [
        'Place the lamb shank on top of the mash',
        'Spoon a generous amount of the reduced red wine sauce over the shank and onto the mash',
      ],
      5: [
        'Scatter 3g finely chopped flat-leaf parsley over the top',
        'Serve immediately',
      ],
    },
  },
  beef_stew: {
    slow_cooker: {
      0: [
        'Pat 1200g cubed beef chuck dry with paper towel',
        'Season with 1 tsp salt and 1/2 tsp ground black pepper',
        'Place the beef and 50g plain flour in a large zip-top bag or bowl',
        'Toss to coat evenly',
        'Shake off the excess flour',
      ],
      1: [
        'Heat 30g olive oil in a large heavy skillet over high heat',
        { text: 'Brown the beef aggressively in 2-3 batches, about 1.5 minutes per side', timer_seconds: 90, timer_label: 'Brown' },
        'Transfer browned beef to the slow cooker',
      ],
      2: [
        'Drain the excess fat from the skillet',
        'Drop the heat to medium-low',
        'Add the remaining 15g olive oil',
      ],
      3: [
        'Add 250g sliced brown onion and 4 cloves minced garlic',
        { text: 'Cook 3 minutes', timer_seconds: 180, timer_label: 'Soften onion' },
        'Add 300g carrot chunks and 150g celery chunks',
        { text: 'Cook 4 minutes until softening at the edges', timer_seconds: 240, timer_label: 'Soften veg' },
        'Transfer to the slow cooker',
      ],
      4: [
        'Pour 500ml red wine into the still-hot skillet',
        'Bring to a vigorous simmer, scraping all the brown bits off the bottom of the pan',
        { text: 'Simmer 2 minutes to cook off some alcohol and reduce slightly', timer_seconds: 120, timer_label: 'Reduce wine' },
      ],
      5: [
        'Pour the wine into the slow cooker',
        'Add 750ml beef stock, 30g tomato paste, 10ml Worcestershire sauce, 4 sprigs fresh thyme (tied together), and 2 bay leaves',
        'Stir',
      ],
      6: [
        'Add 250g halved brown mushrooms and 400g halved baby chat potatoes on top',
        'Push down so everything is mostly submerged in liquid',
      ],
      7: [
        { text: 'Cook on LOW for 8 hours or HIGH for 5 hours until the beef is fork-tender and falling apart', timer_seconds: 28800, timer_label: 'Slow cook' },
      ],
      8: [
        { text: 'Optional: if the sauce is too thin, ladle the liquid into a saucepan and simmer 10-15 minutes to reduce', timer_seconds: 900, timer_label: 'Reduce sauce' },
        'Or remove the lid for the last 30 minutes on HIGH',
      ],
      9: [
        'Discard the bay leaves and thyme sprigs before serving',
      ],
    },
    oven_braise: {
      0: [
        'Preheat the oven to 160°C',
      ],
      1: [
        'Pat 1200g cubed beef chuck dry',
        'Season with 1 tsp salt and 1/2 tsp ground black pepper',
        'Toss with 50g plain flour to coat',
        'Shake off the excess',
      ],
      2: [
        'Heat 30g olive oil in a large Dutch oven over high heat',
        { text: 'Brown the beef in 2-3 batches, 1.5 minutes per side', timer_seconds: 90, timer_label: 'Brown' },
        'Transfer to a plate',
      ],
      3: [
        'Drain the excess fat',
        'Drop the heat to medium-low',
        'Add the remaining 15g olive oil',
        { text: 'Sauté 250g sliced brown onion and 4 cloves minced garlic for 3 minutes', timer_seconds: 180, timer_label: 'Soften onion' },
        'Add 300g carrot chunks and 150g celery chunks',
        { text: 'Cook another 4 minutes', timer_seconds: 240, timer_label: 'Soften veg' },
      ],
      4: [
        'Pour in 500ml red wine',
        { text: 'Simmer 2 minutes, scraping the fond', timer_seconds: 120, timer_label: 'Reduce wine' },
      ],
      5: [
        'Add 750ml beef stock, 30g tomato paste, 10ml Worcestershire sauce, 4 sprigs fresh thyme, and 2 bay leaves',
        'Stir',
      ],
      6: [
        'Return the beef to the pot with any juices',
        'Add 250g halved brown mushrooms and 400g halved baby chat potatoes',
      ],
      7: [
        'Bring to a simmer on the stovetop',
        { text: 'Cover and transfer to the oven for 1.5 hours', timer_seconds: 5400, timer_label: 'Braise' },
      ],
      8: [
        { text: 'Uncover and return to the oven for another 30 minutes to reduce and thicken the sauce', timer_seconds: 1800, timer_label: 'Reduce' },
      ],
      9: [
        'Check the beef is fork-tender',
        { text: 'If not quite there, return covered for another 20 minutes', timer_seconds: 1200, timer_label: 'Braise more' },
      ],
      10: [
        'Discard the bay leaves and thyme sprigs before serving',
      ],
    },
    mash: {
      0: [
        'Peel 300g baking potato and cut into 3cm chunks',
        'Place in a saucepan, cover with cold water, and salt generously',
        { text: 'Boil 15-18 minutes until knife-tender', timer_seconds: 1080, timer_label: 'Boil potato' },
      ],
      1: [
        'Drain thoroughly',
        'Return to the hot empty saucepan and leave for 30 seconds to steam off moisture',
      ],
      2: [
        'Add 25g salted butter, 50ml thickened cream, and 30ml full-cream milk',
        'Mash until smooth',
        'Season with 1/4 tsp salt and 1/8 tsp ground black pepper',
      ],
      3: [
        'Pile the mash into a wide shallow bowl',
        'Make a small well in the centre',
      ],
      4: [
        'Ladle a generous portion of stew over and around the mash',
      ],
      5: [
        'Scatter 3g finely chopped flat-leaf parsley over the top',
      ],
    },
    bread: {
      0: [
        'Reheat 1 serving of stew in a saucepan or microwave until piping hot',
      ],
      1: [
        'Slice 80g sourdough into 2 thick slices',
        { text: 'Optionally warm in a 180°C oven for 3-4 minutes, or briefly under the grill', timer_seconds: 240, timer_label: 'Warm bread' },
      ],
      2: [
        'Ladle stew into a wide bowl',
        'Scatter 3g finely chopped flat-leaf parsley over the top',
      ],
      3: [
        'Spread 10g salted butter on the bread',
        'Serve alongside',
      ],
      4: [
        'Eat by dipping the bread into the gravy as you go',
      ],
    },
  },
  pulled_pork: {
    slow_cooker: {
      0: [
        'Mix the rub in a small bowl: 24g brown sugar, 2 tsp sweet paprika, 1 tsp onion powder, 1 tsp garlic powder, 1/2 tsp ground cumin, 3/4 tsp mustard powder, 1 tsp salt, and 1/2 tsp ground black pepper',
        'Rub generously all over the 2200g pork shoulder, including the fat cap',
        'If time permits, marinate in the fridge for an hour; otherwise straight to step 2',
      ],
      1: [
        'Place the pork in the slow cooker, fat cap facing up',
        'Pour 180ml cloudy apple juice around the pork, not over the rub',
      ],
      2: [
        { text: 'Cook on low for 8 hours, or high for 4-5 hours, until the pork shreds easily under light fork pressure', timer_seconds: 28800, timer_label: 'Slow cook' },
      ],
      3: [
        'Lift the pork carefully into a roasting pan or large bowl',
        'Pour the cooking liquid into a measuring jug',
        'Skim and reserve 1 cup (240ml) of the juices for the BBQ sauce',
        'Discard or freeze the rest for stock',
      ],
      4: [
        'Optional crisp step: preheat the oven to 180°C',
        { text: 'Roast the lifted pork for 20 minutes for surface caramelisation', timer_seconds: 1200, timer_label: 'Crisp' },
      ],
      5: [
        'Combine 625g tomato ketchup, 24g brown sugar, 17ml Worcestershire sauce, 120ml apple cider vinegar, the reserved 240ml pork juices, 15ml lemon juice, 1 1/2 tsp ground black pepper, 1 1/2 tsp onion powder, and 1 1/2 tsp mustard powder in a saucepan',
        'Bring to a simmer over medium heat',
        { text: 'Simmer gently for 1 hour, stirring occasionally, until thickened to coating consistency', timer_seconds: 3600, timer_label: 'Simmer sauce' },
      ],
      6: [
        'Shred the pork with two forks, discarding any large gristle pieces',
        'If you are planning the Pulled Pork Tacos plate, reserve approximately 151g of plain shredded pork per planned tacos serve in a separate container before continuing',
      ],
      7: [
        'Pour the BBQ sauce over the remaining shredded pork',
        'Toss to coat generously',
        'Bottle any extra sauce for serving',
      ],
    },
    oven: {
      0: [
        'Preheat the oven to 140°C (fan-forced 120°C)',
      ],
      1: [
        'Mix the rub in a small bowl: 24g brown sugar, 2 tsp sweet paprika, 1 tsp onion powder, 1 tsp garlic powder, 1/2 tsp ground cumin, 3/4 tsp mustard powder, 1 tsp salt, and 1/2 tsp ground black pepper',
        'Rub generously all over the 2200g pork shoulder, including the fat cap',
        'If time permits, marinate in the fridge for an hour; otherwise straight to step 3',
      ],
      2: [
        'Place the pork in a deep roasting pan or Dutch oven, fat cap facing up',
        'Pour 180ml cloudy apple juice around the pork, not over the rub',
      ],
      3: [
        'Cover tightly with two layers of foil (or the Dutch oven lid) to trap moisture',
      ],
      4: [
        { text: 'Cook for 5 hours', timer_seconds: 18000, timer_label: 'Oven cook' },
        'Check at 4 hours: the pork should be starting to give way when pressed; if not, cover and continue',
      ],
      5: [
        'Remove from the oven',
        'Carefully lift the pork into a roasting pan or large bowl',
        'Pour the cooking liquid into a measuring jug',
        'Skim and reserve 1 cup (240ml) of the juices for the BBQ sauce',
        'Discard or freeze the rest for stock',
      ],
      6: [
        'Optional crisp step (recommended): turn the oven up to 200°C',
        { text: 'Return the pork uncovered for 20 minutes for surface caramelisation', timer_seconds: 1200, timer_label: 'Crisp' },
      ],
      7: [
        'Combine 625g tomato ketchup, 24g brown sugar, 17ml Worcestershire sauce, 120ml apple cider vinegar, the reserved 240ml pork juices, 15ml lemon juice, 1 1/2 tsp ground black pepper, 1 1/2 tsp onion powder, and 1 1/2 tsp mustard powder in a saucepan',
        'Bring to a simmer over medium heat',
        { text: 'Simmer gently for 1 hour, stirring occasionally, until thickened to coating consistency', timer_seconds: 3600, timer_label: 'Simmer sauce' },
      ],
      8: [
        'Shred the pork with two forks, discarding any large gristle pieces',
        'If you are planning the Pulled Pork Tacos plate, reserve approximately 151g of plain shredded pork per planned tacos serve in a separate container before continuing',
      ],
      9: [
        'Pour the BBQ sauce over the remaining shredded pork',
        'Toss to coat generously',
        'Bottle any extra sauce for serving',
      ],
    },
    sandwich: {
      0: [
        'Split 1 brioche bun',
        { text: 'Lightly toast the bun cut side down in a dry pan for 1 minute', timer_seconds: 60, timer_label: 'Toast bun' },
      ],
      1: [
        'Pile 1 serving of BBQ pulled pork onto the bottom bun',
      ],
      2: [
        'Scatter 30g grated tasty cheese over the hot pork',
      ],
      3: [
        'Top with 100g coleslaw',
        'Put the lid on',
        'Eat immediately',
      ],
    },
    bowl: {
      0: [
        'Cook 280g basmati rice if not already prepared (10 minutes in a rice cooker or boiling)',
      ],
      1: [
        'Spread the rice across the bottom of a bowl',
      ],
      2: [
        'Pile 1 serving of BBQ pulled pork on one side of the rice',
        'Add 100g coleslaw on the other side',
      ],
      3: [
        'Scatter 30g grated tasty cheese over the pork',
        'Drizzle 15g tomato ketchup or extra BBQ sauce over the top',
      ],
    },
    baked_potato: {
      0: [
        'Preheat the oven to 200°C',
        'Prick a 350g baking potato all over with a fork',
        'Rub with 5g olive oil and 1/4 tsp salt',
      ],
      1: [
        { text: 'Bake directly on the oven rack for 60 minutes, until the skin is crisp and the inside gives easily when squeezed', timer_seconds: 3600, timer_label: 'Bake' },
      ],
      2: [
        'Split the potato open lengthways',
        'Fluff the flesh with a fork',
      ],
      3: [
        'Pile in 1 serving of BBQ pulled pork',
        'Scatter 30g grated tasty cheese over the pork',
        'Dollop 30g sour cream on top',
        'Scatter 1 finely sliced spring onion over',
      ],
    },
    tacos: {
      0: [
        { text: 'Warm the reserved 151g plain shredded pork in a pan with a splash of water, about 2 minutes', timer_seconds: 120, timer_label: 'Warm pork' },
      ],
      1: [
        'Warm 3 small flour tortillas, 30 sec per side in a dry pan, or 15 sec in the microwave under a damp cloth',
      ],
      2: [
        'Mash 100g avocado roughly with a fork',
        'Squeeze in juice from half a lime',
        'Add a pinch of salt',
      ],
      3: [
        'Divide the pork between the three tortillas (~50g each)',
        'Top each with the smashed avocado, 30g grated tasty cheese, 1 1/2 tbsp fresh coriander leaves, and 20g pickled red onion',
        'Squeeze the remaining lime over the top',
      ],
    },
    mac_cheese: {
      0: [
        { text: 'Cook 75g macaroni in salted boiling water until al dente, about 7 minutes', timer_seconds: 420, timer_label: 'Boil pasta' },
        'Reserve 1/2 cup of pasta water',
        'Drain the macaroni',
      ],
      1: [
        'In the same pot, melt 20g salted butter over medium heat',
        'Whisk in 20g plain flour and cook 30 seconds',
        'Gradually whisk in 250ml full-cream milk until smooth',
      ],
      2: [
        { text: 'Simmer 2-3 minutes, whisking, until thickened', timer_seconds: 180, timer_label: 'Thicken' },
        'Stir in 60g grated tasty cheese off the heat until melted',
        'Season with 1/4 tsp salt and 1/4 tsp ground black pepper',
      ],
      3: [
        'Stir the drained macaroni through the cheese sauce',
        'Loosen with a splash of the reserved pasta water if needed',
      ],
      4: [
        'Scoop the mac and cheese into a bowl',
        'Top with 1.5 servings worth of BBQ pulled pork',
      ],
    },
  },
  brekkie_grow: {
    blender: {
      0: [
        'Add to a high-powered blender: 350ml full-cream milk, 120g frozen banana, 45g rolled oats, 200g vanilla Greek yoghurt, 32g natural peanut butter, 21g honey, 20ml maple syrup, 30g vanilla whey protein, and 1 tsp ground cinnamon',
      ],
      1: [
        'Start at low speed for 5 seconds to break up the frozen banana',
        'Increase to high speed',
      ],
      2: [
        'Blend on high for 45-60 seconds until completely smooth and no oat or banana chunks remain',
      ],
      3: [
        'Pour into a large glass',
        'If thicker than you prefer, add a splash of extra milk and pulse to combine',
      ],
    },
  },
  mango_mass: {
    blender: {
      0: [
        'Add to a high-powered blender: 300ml full-cream milk, 165g frozen mango, 120g frozen banana, 150ml mango nectar, 200g vanilla Greek yoghurt, 30g vanilla whey protein, 32g macadamia nut butter, and 21g honey',
      ],
      1: [
        'Start at low speed for 5 seconds to break up the frozen mango and banana',
        'Increase to high speed',
      ],
      2: [
        'Blend on high for 45-60 seconds until completely smooth',
      ],
      3: [
        'Pour into a large glass',
        'If too thick, add a splash of extra milk and pulse to combine',
      ],
    },
  },
  king_kong_chocolate: {
    blender: {
      0: [
        'Add 300ml full-cream milk, 100ml thickened cream, and 200g vanilla Greek yoghurt to the blender first',
      ],
      1: [
        'Add 120g frozen banana, 60g chocolate whey protein, 10g cocoa powder, 32g natural peanut butter, 21g honey, and 1/4 tsp salt',
      ],
      2: [
        'Start at low speed for 5 seconds to break up the frozen banana',
        'Increase to high speed',
      ],
      3: [
        'Blend on high for 60 seconds until completely smooth and silky',
      ],
      4: [
        'Pour into a large glass',
      ],
    },
  },
  strawberry_stack: {
    blender: {
      0: [
        'Add to a high-powered blender: 250ml full-cream milk, 100ml coconut cream, 150g frozen strawberries, 120g frozen banana, 200g vanilla Greek yoghurt, 30g vanilla whey protein, 32g almond butter, and 21g honey',
      ],
      1: [
        'Start at low speed for 5 seconds to break up the frozen strawberries and banana',
        'Increase to high speed',
      ],
      2: [
        'Blend on high for 45-60 seconds until completely smooth',
      ],
      3: [
        'Pour into a large glass',
        'If too thick, add a splash of extra milk and pulse to combine',
      ],
    },
  },
  choc_muscle_maxx: {
    blender: {
      0: [
        'Add 300ml full-cream milk to the blender first',
      ],
      1: [
        'Add 120g frozen banana, 60g vanilla ice cream, 60g chocolate whey protein, 32g natural peanut butter, 5g cocoa powder, 21g honey, and 50g rolled oats',
      ],
      2: [
        'Start at low speed for 5 seconds to break up the frozen banana',
        'Increase to high speed',
      ],
      3: [
        'Blend on high for 45-60 seconds until completely smooth and no oat texture remains',
      ],
      4: [
        'Pour into a large glass',
      ],
    },
  },
  cookies_gains: {
    blender: {
      0: [
        'Add 300ml full-cream milk and 200g vanilla Greek yoghurt to the blender first',
      ],
      1: [
        'Add 120g frozen banana, 30g chocolate whey protein, 3 Oreo cookies (reserve 1 for the top), 16g natural peanut butter, 21g honey, and 50g vanilla ice cream',
      ],
      2: [
        'Blend on high for 45-60 seconds until smooth',
      ],
      3: [
        'Pour into a tall glass',
        'Crush the reserved Oreo cookie and sprinkle over the top',
      ],
    },
  },
  raspberry_rip: {
    blender: {
      0: [
        'Add to a high-powered blender: 300ml full-cream milk, 100ml coconut cream, 125g frozen raspberries, 120g frozen banana, 200g vanilla Greek yoghurt, 30g chocolate whey protein, 10g cocoa powder, 6g desiccated coconut, and 21g honey',
      ],
      1: [
        'Blend on high for 45-60 seconds until smooth',
      ],
      2: [
        'Pour into a tall glass',
      ],
    },
  },
  energy_lift_heavy: {
    blender: {
      0: [
        'Brew 30ml espresso first and let it cool while you measure the other ingredients',
      ],
      1: [
        'Add to a high-powered blender: 300ml full-cream milk, 120g frozen banana, 165g frozen mango, 200g vanilla Greek yoghurt, 30g vanilla whey protein, 30ml coconut cream, 21g honey, the cooled espresso, and 12g chia seeds',
      ],
      2: [
        'Blend on high for 45-60 seconds until smooth',
        'Drink within 5 minutes before the chia seeds thicken the smoothie',
      ],
      3: [
        'Best consumed 30-45 minutes before training',
      ],
    },
  },
  mornin_muscle: {
    blender: {
      0: [
        'Brew 60ml espresso first and let it cool while you measure the other ingredients',
      ],
      1: [
        'Add 300ml full-cream milk, 100ml thickened cream, and 200g vanilla Greek yoghurt to the blender first',
      ],
      2: [
        'Add 120g frozen banana, 30g chocolate whey protein, 10g cocoa powder, the cooled espresso, 16g natural peanut butter, and 20ml maple syrup',
      ],
      3: [
        'Blend on high for 45-60 seconds until completely smooth',
      ],
      4: [
        'Pour into a tall glass',
      ],
    },
  },
  dirty_eden: {
    blender: {
      0: [
        'Add 300ml coconut water, 200ml full-cream milk, and 20ml lemon juice to the blender first',
      ],
      1: [
        'Add 60g baby spinach and 6 fresh mint leaves',
        'Pulse briefly to break them down',
      ],
      2: [
        'Add 120g frozen banana, 165g frozen pineapple, 100g avocado, 200g plain Greek yoghurt, 30g vanilla whey protein, 32g almond butter, and 21g honey',
      ],
      3: [
        'Blend on high for 60-90 seconds until completely smooth',
      ],
      4: [
        'Pour into a tall glass',
      ],
    },
  },
  strawbrekkie_beast: {
    blender: {
      0: [
        'Add 300ml full-cream milk and 100ml cloudy apple juice to the blender first',
      ],
      1: [
        'Add 150g frozen strawberries, 75g frozen blueberries, 120g frozen banana, 45g rolled oats, 200g vanilla Greek yoghurt, 30g vanilla whey protein, 32g almond butter, and 21g honey',
      ],
      2: [
        'Blend on high for 60 seconds until smooth and no oat texture remains',
      ],
      3: [
        'Pour into a tall glass',
      ],
    },
  },
  banana_bulk: {
    blender: {
      0: [
        'Pit 48g Medjool dates if needed',
        'Roughly chop the dates',
      ],
      1: [
        'Add 350ml full-cream milk and 200g vanilla Greek yoghurt to the blender first',
      ],
      2: [
        'Add 240g frozen banana, the chopped dates, 30g vanilla whey protein, 48g natural peanut butter, 21g honey, and 1 tsp ground cinnamon',
      ],
      3: [
        'Blend on high for 60 seconds until completely smooth',
      ],
      4: [
        'Pour into a tall glass',
      ],
    },
  },
  muscle_oats: {
    stovetop: {
      0: [
        'Add 80g rolled oats and 250ml full-cream milk to a small saucepan over medium heat',
        { text: 'Simmer for 4-5 minutes, stirring often, until thick and creamy', timer_seconds: 300, timer_label: 'Simmer' },
      ],
      1: [
        'Take the saucepan off the heat',
        { text: 'Let it sit for 1 minute to cool slightly', timer_seconds: 60, timer_label: 'Cool' },
        'Stir 30g vanilla whey protein through until smooth — off the heat keeps it from going grainy',
      ],
      2: [
        'Stir in 21g honey and 1 tsp ground cinnamon',
        'Tip into a bowl',
      ],
      3: [
        'Slice 120g banana over the top',
        'Add 32g natural peanut butter (warm it 15 seconds to drizzle, if you like)',
      ],
    },
    microwave: {
      0: [
        'Add 80g rolled oats and 250ml full-cream milk to a large microwave-safe bowl (bigger than you think — it bubbles up)',
      ],
      1: [
        { text: 'Microwave on high for 1 minute, then stir', timer_seconds: 60, timer_label: 'Microwave' },
        { text: 'Microwave on high for another 1-1.5 minutes until thick', timer_seconds: 90, timer_label: 'Microwave' },
      ],
      2: [
        { text: 'Let it sit for 1 minute to cool slightly', timer_seconds: 60, timer_label: 'Cool' },
        'Stir 30g vanilla whey protein, 21g honey, and 1 tsp ground cinnamon through until smooth',
      ],
      3: [
        'Slice 120g banana over the top',
        'Add 32g natural peanut butter',
      ],
    },
  },
  maple_muscle_toast: {
    stovetop: {
      0: [
        'Crack 2 eggs into a wide shallow bowl',
        'Add 100ml full-cream milk and 1/2 tsp ground cinnamon',
        'Whisk in 30g vanilla whey protein last, beating well until completely smooth and no lumps remain',
      ],
      1: [
        { text: 'Soak each slice of the 120g brioche (3 slices) in the custard for 20-30 seconds per side', timer_seconds: 60, timer_label: 'Soak' },
        'Soak enough to soak through but not so long the bread falls apart',
      ],
      2: [
        'Melt 10g salted butter in a non-stick pan over medium heat',
        { text: 'Cook the soaked slices for 2-3 minutes per side until golden and set', timer_seconds: 300, timer_label: 'Cook' },
      ],
      3: [
        'Stack the French toast on a plate',
        'Dollop 100g vanilla Greek yoghurt over the top',
        'Fan 120g sliced banana on top',
        'Drizzle with 20ml maple syrup',
      ],
    },
  },
  scramble_stack: {
    stovetop: {
      0: [
        'Crack 4 eggs into a bowl',
        'Season with 1/4 tsp salt and 1/4 tsp ground black pepper',
        'Whisk until just combined',
      ],
      1: [
        'Toast 100g sourdough (2 thick slices)',
        'Spread 6g of the salted butter over the toast',
        'Smash 80g avocado on top and season with a pinch of salt and pepper',
      ],
      2: [
        'Melt the remaining 6g salted butter in a non-stick pan over medium-low heat',
        'Add the eggs and stir gently, pulling them in from the edges',
        { text: 'Cook for 2-3 minutes until softly set', timer_seconds: 150, timer_label: 'Scramble' },
        'Stir 40g grated tasty cheese through in the last 30 seconds so it just melts',
      ],
      3: [
        'Pile the cheesy scramble onto the avocado toast',
        'Crack over more black pepper',
        'Eat immediately',
      ],
    },
  },
  overnight_oats: {
    no_cook: {
      0: [
        'Add 50g rolled oats, 10g chia seeds, and 30g vanilla whey protein to a jar or container',
        'Pour in 200ml full-cream milk, 120g vanilla Greek yoghurt, and 21g honey',
        'Stir well until no dry pockets or whey clumps remain (pre-mix the whey with a splash of the milk first if it clumps)',
      ],
      1: [
        { text: 'Seal and refrigerate for at least 4 hours, ideally overnight', timer_seconds: 14400, timer_label: 'Chill' },
      ],
      2: [
        'In the morning, give it a stir',
        'Loosen with a splash of milk if it has thickened too much',
      ],
    },
    standard: {
      0: [
        'Slice 120g banana over the top',
      ],
    },
    loaded: {
      0: [
        'Slice 120g banana over the top',
        'Drizzle over 32g natural peanut butter (warm it 15 seconds to make it runny)',
        'Scatter 40g granola over for crunch',
      ],
    },
  },
  greek_yoghurt_bowl: {
    no_cook: {
      0: [
        'Spoon 280g vanilla Greek yoghurt into a bowl',
        'Add 30g vanilla whey protein and 21g honey',
        'Stir until smooth and creamy (loosen with a splash of milk if it gets too thick)',
      ],
    },
    standard: {
      0: [
        'Top with 100g mixed berries',
        'Sprinkle over 10g chia seeds',
        'Scatter 40g granola for crunch',
      ],
    },
    loaded: {
      0: [
        'Top with 100g mixed berries and 120g sliced banana',
        'Sprinkle over 10g chia seeds',
        'Scatter 50g granola',
        'Drizzle over 32g natural peanut butter (warm it 15 seconds to make it runny)',
      ],
    },
  },

  cottage_cheese_bowl: {
    no_cook: {
      0: [
        'Wash and halve the cherry tomatoes',
        'Wash, peel if desired, and dice the cucumber into small cubes',
      ],
      1: [
        'Spoon the cottage cheese into a serving bowl',
        'Top with halved cherry tomatoes and diced cucumber',
        'Drizzle with olive oil',
        'Season with salt, pepper, and everything bagel seasoning',
        'Mix gently if desired, or serve with distinct layers for visual appeal',
      ],
    },
  },

  pb_banana_toast: {
    no_cook: {
      0: [
        'Toast 120g sourdough (2-3 slices)',
      ],
      1: [
        'Mash 120g banana in a bowl with a fork',
        'Sprinkle in 25g vanilla whey protein and mash again until smooth and combined',
      ],
      2: [
        'Spread 40g natural peanut butter over the toast',
        'Spread the banana-whey mash on top',
      ],
      3: [
        'Drizzle over 14g honey',
        'Sprinkle with 8g chia seeds',
      ],
    },
  },

  protein_pancakes: {
    stovetop: {
      0: [
        'Add 60g rolled oats, 30g vanilla whey, 2 eggs, 80g vanilla Greek yoghurt, 60ml full-cream milk, and 1 tsp baking powder to a blender',
        'Blend until smooth',
        { text: 'Let the batter rest for 5 minutes to thicken', timer_seconds: 300, timer_label: 'Rest' },
      ],
      1: [
        'Melt 8g salted butter in a non-stick pan over medium heat',
        'Pour in about 1/4 cup of batter per pancake',
        { text: 'Cook for ~2 minutes until bubbles form on the surface', timer_seconds: 120, timer_label: 'Cook' },
      ],
      2: [
        { text: 'Flip and cook another 1-2 minutes until golden and set', timer_seconds: 90, timer_label: 'Cook' },
        'Repeat with the remaining batter',
      ],
    },
    standard: {
      0: [
        'Stack the pancakes on a plate',
        'Scatter over 80g mixed berries',
        'Drizzle with 20ml maple syrup',
      ],
    },
    loaded: {
      0: [
        'Stack the pancakes on a plate',
        'Top with 120g sliced banana and drizzle over 32g natural peanut butter',
        'Finish with 20ml maple syrup',
      ],
    },
  },

  steak_and_eggs: {
    stovetop: {
      0: [
        'Pat 200g sirloin steak dry and season both sides with salt and pepper',
        'Leave it to come up to room temperature while you start the potatoes',
      ],
      1: [
        'Dice 200g waxy potato into small cubes',
        'Heat 8ml olive oil in a pan over medium-high heat and add the potatoes',
        { text: 'Fry for 12-15 minutes, turning, until golden and tender', timer_seconds: 840, timer_label: 'Potatoes' },
        'Season with a pinch of salt and pepper, then set aside',
      ],
      2: [
        'Melt 12g salted butter in a hot pan over high heat with 2 crushed garlic cloves',
        { text: 'Sear the steak 2-3 minutes per side for medium', timer_seconds: 300, timer_label: 'Sear' },
        { text: 'Rest the steak for 5 minutes so it stays juicy', timer_seconds: 300, timer_label: 'Rest' },
      ],
      3: [
        'Crack 3 eggs into the same pan and fry to your liking',
        'Slice the rested steak',
        'Plate the steak, eggs, and potatoes together',
      ],
    },
  },

  shakshuka: {
    stovetop: {
      0: [
        'Dice 80g brown onion and 100g red capsicum; crush 2 garlic cloves',
        'Heat 10ml olive oil in a pan over medium heat',
        { text: 'Saute the onion, capsicum, and garlic for 5-7 minutes until soft', timer_seconds: 360, timer_label: 'Soften' },
      ],
      1: [
        'Add 250g crushed tomatoes, 1 tsp ground cumin, 1 tsp sweet paprika, and a pinch of salt and pepper',
        { text: 'Simmer for 8-10 minutes until thickened', timer_seconds: 540, timer_label: 'Simmer' },
      ],
      2: [
        'Make 4 wells in the sauce and crack 1 egg into each',
        'Cover the pan',
        { text: 'Cook 5-7 minutes until the whites are set but the yolks are still runny', timer_seconds: 360, timer_label: 'Poach eggs' },
      ],
      3: [
        'Crumble 40g feta over the top',
        'Serve straight from the pan with 100g sourdough for scooping',
      ],
    },
  },

  freezer_breakfast_burrito: {
    stovetop: {
      0: [
        'Dice 250g waxy potato',
        'Heat 12ml olive oil in a large pan over medium-high heat and add the potato',
        { text: 'Fry 10-12 minutes until tender', timer_seconds: 660, timer_label: 'Potato' },
        'Add 120g diced brown onion and 120g diced red capsicum and cook 4-5 minutes until soft, then set aside',
      ],
      1: [
        'Add 350g breakfast sausage to the pan, breaking it up with a spoon',
        { text: 'Brown for 6-8 minutes until cooked through', timer_seconds: 420, timer_label: 'Sausage' },
      ],
      2: [
        'Whisk 10 eggs with a pinch of salt and pepper',
        'Scramble softly in the pan for 2-3 minutes',
      ],
      3: [
        'Lay out 5 large tortillas',
        'Divide the sausage, eggs, potato-veg mix, and 150g grated cheese between them',
        'Fold in the sides and roll up tightly',
      ],
      4: [
        'Eat one now; wrap the rest individually in foil and freeze',
        { text: 'To reheat from frozen: microwave 1-2 minutes, then crisp in a dry pan', timer_seconds: 90, timer_label: 'Reheat' },
      ],
    },
  },

  baked_oats: {
    oven: {
      0: [
        'Preheat the oven to 180C (350F)',
        'Mash 60g banana in a bowl',
      ],
      1: [
        'Add 80g rolled oats, 30g vanilla whey, 1 egg, 120ml full-cream milk, 21g honey, 1 tsp baking powder, and 1/2 tsp ground cinnamon',
        'Mix to a smooth batter',
      ],
      2: [
        'Pour into a greased oven dish or large ramekin',
        { text: 'Bake 20-22 minutes until set and golden on top', timer_seconds: 1320, timer_label: 'Bake' },
      ],
    },
    standard: {
      0: [
        'Top the warm baked oats with 80g vanilla Greek yoghurt',
        'Scatter over 60g mixed berries',
      ],
    },
    loaded: {
      0: [
        'Top the warm baked oats with 80g vanilla Greek yoghurt',
        'Slice 60g banana over the top',
        'Drizzle over 32g natural peanut butter (warm it 15 seconds to make it runny)',
      ],
    },
  },

  smoked_salmon_bagel: {
    stovetop: {
      0: [
        'Slice and toast 1 bagel',
        'Fry 2 eggs in 5ml olive oil to your liking, keeping the yolks soft',
      ],
      1: [
        'Spread 40g cream cheese over both toasted bagel halves',
        'Season with salt and pepper (a squeeze of lemon and some dill is great if you have them)',
      ],
      2: [
        'Layer 40g sliced cucumber, 100g smoked salmon, 20g sliced red onion, and 60g sliced avocado on the base',
        'Add the fried eggs',
      ],
      3: [
        'Top with the other bagel half',
        'Press gently and slice',
      ],
    },
  },

  big_breakfast_plate: {
    stovetop: {
      0: [
        'Heat a large pan over medium heat',
        { text: 'Fry 60g bacon and 120g breakfast sausage for 6-8 minutes until cooked', timer_seconds: 420, timer_label: 'Bacon & sausage' },
        'Set aside and keep warm',
      ],
      1: [
        'In the same pan, add 80g sliced brown mushrooms and 100g halved cherry tomatoes',
        { text: 'Fry 4-5 minutes until soft and browned', timer_seconds: 270, timer_label: 'Veg' },
      ],
      2: [
        'Warm 130g baked beans in a small pot or the microwave',
        'Toast 100g sourdough and butter it',
      ],
      3: [
        'Fry 3 eggs in the pan to your liking',
        'Plate the eggs, bacon, sausage, mushrooms, tomatoes, beans, and toast together',
      ],
    },
  },

  egg_muffins: {
    oven: {
      0: [
        'Preheat the oven to 180C (350F) and grease a 12-cup muffin tin',
        'If your sausage is raw, brown 200g breakfast sausage and crumble it',
        'Chop 60g spinach and 60g onion',
      ],
      1: [
        'Blend 8 eggs, 250g cottage cheese, and a pinch of salt and pepper until smooth',
      ],
      2: [
        'Divide the sausage, spinach, onion, and half of 80g grated cheese between the 12 cups',
        'Pour the egg mixture over to fill each cup 3/4 full',
        'Top with the remaining cheese',
      ],
      3: [
        { text: 'Bake 18-22 minutes until set and puffy', timer_seconds: 1200, timer_label: 'Bake' },
        'Cool 5 minutes, then loosen the edges and remove',
      ],
    },
    standard: {
      0: [
        'Toast 100g sourdough (2 slices) and smash 80g avocado on top',
        'Serve with 3 egg muffins',
        'Refrigerate the rest up to 5 days, or freeze',
      ],
    },
  },

  protein_ice_cream: {
    freezer: {
      0: [
        'Add 360ml milk, 35g protein powder, 12g instant pudding mix, and 1 tsp vanilla to a blender',
        { text: 'Blend until completely smooth, about 30-45 seconds', timer_seconds: 45, timer_label: 'Blend' },
      ],
      1: [
        'Pour into a shallow freezer-safe container and smooth the top',
        'Freeze for at least 4-6 hours until firm',
      ],
      2: [
        { text: 'Let sit at room temperature for 5-10 minutes to soften', timer_seconds: 300, timer_label: 'Soften' },
        'Scoop and serve — fold in mix-ins like chocolate chips or peanut butter if you want a bigger hit',
        'Optional upgrade: if you own a Ninja Creami, freeze in a Creami pint for 24h and spin instead, for a softer texture',
      ],
    },
  },

  cottage_cheese_ice_cream: {
    freezer: {
      0: [
        'Add 300g cottage cheese, 120g mixed berries, 25g honey, 1 tsp vanilla, and a pinch of salt to a blender',
        { text: 'Blend until completely smooth and creamy, about 60 seconds', timer_seconds: 60, timer_label: 'Blend' },
        'Taste and adjust sweetness with more honey if needed',
      ],
      1: [
        'Pour into a shallow freezer-safe container and smooth the top',
        'Cover tightly and freeze for at least 5 hours until firm but scoopable',
      ],
      2: [
        { text: 'Let sit at room temperature for 5 minutes to soften slightly', timer_seconds: 300, timer_label: 'Soften' },
        'Scoop and serve immediately — the cottage cheese texture creates a naturally creamy consistency',
        'Pro tip: freeze in individual portions for easy single servings',
      ],
    },
  },

  chocolate_protein_mug_cake: {
    microwave: {
      0: [
        'In a microwave-safe mug, whisk together 30g protein powder, 1 tbsp cocoa, 1/2 tsp baking powder, and a pinch of salt',
      ],
      1: [
        'Add 1 egg, 60ml milk, and 1 tsp maple syrup',
        'Stir to a smooth batter with no dry pockets of powder',
        'Stir in half the chocolate chips and scatter the rest on top',
      ],
      2: [
        { text: 'Microwave on high for 60-90 seconds until risen and just set in the middle', timer_seconds: 75, timer_label: 'Microwave' },
        'Check at 60s — stop as soon as the top springs back; overcooking makes it rubbery',
        { text: 'Let cool for 1 minute before eating', timer_seconds: 60, timer_label: 'Cool' },
      ],
    },
  },

  fudgy_protein_brownies: {
    oven: {
      0: [
        'Preheat oven to 175°C (350°F)',
        'Line an 8x8 inch (20cm) baking pan with baking paper',
      ],
      1: [
        'In a large bowl, mix 128g peanut butter, 2 eggs, 80ml maple syrup, 30ml milk, and 1 tsp vanilla until smooth',
      ],
      2: [
        'Stir in 60g protein powder, 30g cocoa, 1/2 tsp baking powder, and 1/4 tsp salt until no clumps remain',
        'Fold in most of the chocolate chips, saving some for the top',
      ],
      3: [
        'Spread the batter into the pan and scatter the remaining chocolate chips on top',
        { text: 'Bake 20-25 minutes until the edges are set and a skewer comes out with a few moist crumbs', timer_seconds: 1350, timer_label: 'Bake' },
      ],
      4: [
        'Cool completely in the pan — they firm up as they cool',
        'Cut into 8 brownies',
      ],
    },
  },

  protein_chocolate_chip_cookies: {
    oven: {
      0: [
        'Preheat oven to 175°C (350°F)',
        'Line a baking tray with baking paper',
      ],
      1: [
        'In a bowl, mix 200g peanut butter, 2 eggs, 60g honey, and 1 tsp vanilla into a smooth paste',
      ],
      2: [
        'Stir in 50g protein powder, 1/2 tsp baking powder, and 1/4 tsp salt to form a soft dough',
        'Fold in most of the chocolate chips',
      ],
      3: [
        'Scoop 10 mounds onto the tray and flatten each slightly',
        'Press the remaining chocolate chips into the tops',
      ],
      4: [
        { text: 'Bake 8-10 minutes until the edges are golden — the centres will still look soft', timer_seconds: 540, timer_label: 'Bake' },
        'Let cool on the tray; they firm up as they cool',
      ],
    },
  },

  protein_banana_bread: {
    oven: {
      0: [
        'Preheat oven to 175°C (350°F)',
        'Line a loaf tin with baking paper',
      ],
      1: [
        'Mash 3 ripe bananas in a large bowl',
        'Whisk in 150g Greek yoghurt, 2 eggs, 60ml maple syrup, and 1 tsp vanilla',
      ],
      2: [
        'Stir in 60g protein powder, 150g oat flour, 1.5 tsp baking powder, 1 tsp cinnamon, and 1/2 tsp salt until just combined',
        'Fold in most of the chocolate chips',
      ],
      3: [
        'Pour into the tin and scatter the remaining chocolate chips on top',
        { text: 'Bake 40-50 minutes until a skewer comes out clean; tent with foil if the top browns too fast', timer_seconds: 2700, timer_label: 'Bake' },
      ],
      4: [
        'Cool in the tin before slicing — it sets as it cools',
        'Slice into 10',
      ],
    },
  },

  edible_protein_cookie_dough: {
    no_cook: {
      0: [
        'In a bowl, stir 60g peanut butter, 30ml maple syrup, 40ml milk, and 1 tsp vanilla until smooth',
      ],
      1: [
        'Add 40g protein powder, 60g oat flour, and a pinch of salt',
        'Mix to a soft, scoopable dough — add a splash more milk if it feels dry',
      ],
      2: [
        'Fold in 30g chocolate chips',
        'Eat straight away, or chill 15-30 minutes for a firmer dough',
      ],
    },
  },

  no_bake_protein_cheesecake: {
    no_cook: {
      0: [
        'Mix 80g oat flour, 40g peanut butter, and 20ml honey into a crumbly dough',
        'Press firmly into the base of a small dish or 4 ramekins and chill while you make the filling',
      ],
      1: [
        'Blend 200g cream cheese, 150g cottage cheese, 100g Greek yoghurt, 30g protein powder, 40ml maple syrup, and 1 tsp vanilla until completely smooth and thick',
      ],
      2: [
        'Spread the filling over the base and smooth the top',
        { text: 'Chill at least 4 hours (or freeze 1 hour) until set', timer_seconds: 14400, timer_label: 'Chill' },
      ],
      3: [
        'Top with 100g mixed berries',
        'Slice or serve from the ramekins',
      ],
    },
  },

  chocolate_protein_mousse: {
    no_cook: {
      0: [
        'Add 200g cottage cheese, 15g chocolate protein powder, 2 tbsp cocoa, 1 tbsp maple syrup, 20ml milk, 1 tsp vanilla, and a pinch of salt to a blender',
        { text: 'Blend 60 seconds until completely smooth and mousse-like, scraping down once', timer_seconds: 60, timer_label: 'Blend' },
      ],
      1: [
        'Spoon into a serving dish',
        { text: 'Chill 30 minutes to thicken', timer_seconds: 1800, timer_label: 'Chill' },
      ],
      2: [
        'Top with 10g chocolate chips and serve',
      ],
    },
  },

  frozen_date_snickers_bark: {
    freezer: {
      0: [
        'Line a baking tray with baking paper',
        'Remove pits from 250g Medjool dates if needed',
        'Press the dates into one solid overlapping layer on the lined tray',
      ],
      1: [
        'Warm 80g natural peanut butter slightly to make it spreadable',
        'Stir 20g vanilla protein powder into the warmed peanut butter until smooth',
        'Spread the peanut butter mixture evenly over the date layer',
        'Roughly chop 40g roasted peanuts and press them into the peanut butter layer',
      ],
      2: [
        'Melt 80g chocolate chips in microwave or double boiler',
        'Spread the melted chocolate evenly over the top',
        'Sprinkle with a pinch of flaky salt',
      ],
      3: [
        { text: 'Freeze for 25 minutes until completely set', timer_seconds: 1500, timer_label: 'Freeze' },
        'Remove from freezer and break into about 10 pieces',
        'Store in freezer between servings',
      ],
    },
  },

  greek_yogurt_snack: {
    no_cook: {
      0: [
        'Spoon 200g Greek yogurt into a bowl or eat straight from the pot',
        'Optional: add a drizzle of honey or a handful of berries',
      ],
    },
  },

  beef_jerky: {
    no_cook: {
      0: [
        'Grab a ~40g serving of beef jerky and eat',
        'Choose a lower-sodium variety if you can',
      ],
    },
  },

  edamame: {
    microwave: {
      0: [
        'Put 150g frozen edamame pods in a bowl with a splash of water',
        { text: 'Microwave 2-3 minutes until hot', timer_seconds: 150, timer_label: 'Heat' },
        'Drain',
      ],
      1: [
        'Sprinkle with flaky salt',
        'Squeeze the beans out of the pods to eat — discard the pods',
      ],
    },
  },

  protein_shake: {
    no_cook: {
      0: [
        'Add 35g protein powder and 350ml milk to a shaker bottle',
        { text: 'Shake 20-30 seconds until smooth with no clumps', timer_seconds: 30, timer_label: 'Shake' },
        'Drink — use water instead of milk for a leaner version',
      ],
    },
  },

  protein_bar: {
    no_cook: {
      0: [
        'Grab a protein bar from your bag, desk, or pantry',
        'Aim for one with at least 15g protein and a reasonable sugar level',
      ],
    },
  },

  cheese_snack: {
    no_cook: {
      0: [
        'Grab a ~30g portion of cheese — a slice of block cheddar, a string cheese, or an individual round',
        'Eat as-is',
      ],
    },
  },

  hard_boiled_eggs: {
    stovetop: {
      0: [
        'Bring a small pot of water to the boil',
        'Lower in 2 eggs with a spoon',
        { text: 'Boil 9-10 minutes for fully set yolks', timer_seconds: 570, timer_label: 'Boil' },
        'Transfer to cold water to cool, then peel',
      ],
      1: [
        'Season with a pinch of salt and eat',
        'Tip: boil 6-12 at once and keep them in the fridge for the week',
      ],
    },
  },

  tuna_pouch: {
    no_cook: {
      0: [
        'Tear open a ~95g tuna pouch',
        'Eat straight from the pouch with a fork — flavoured varieties (lemon pepper, sweet chilli) need nothing added',
      ],
    },
  },

  roasted_chickpeas: {
    oven: {
      0: [
        { text: 'Preheat oven to 200°C', timer_seconds: 600, timer_label: 'Preheat' },
        'Drain and rinse 400g canned chickpeas',
        'Pat them completely dry with paper towels — moisture is the enemy of crispiness',
      ],
      1: [
        'Toss the dried chickpeas with 15g olive oil and 0.5 tsp salt in a bowl',
        'Spread in a single layer on a baking tray',
        { text: 'Roast 25-30 minutes, shaking the tray halfway through', timer_seconds: 1650, timer_label: 'Roast' },
      ],
      2: [
        'Let cool for 2 minutes — they crisp up as they cool',
        'Store leftovers in an airtight container for up to 3 days',
        'Tip: buy ready-roasted chickpeas from the health food section if you want instant gratification',
      ],
    },
  },

  no_bake_protein_balls: {
    no_cook: {
      0: [
        'In a bowl, mix 130g peanut butter, 60g honey, and 1 tsp vanilla until smooth',
      ],
      1: [
        'Stir in 120g rolled oats, 60g protein powder, and 40g chocolate chips',
        'Mix to a stiff but rollable dough — add a splash of milk if too dry, more oats if too wet',
      ],
      2: [
        'Roll into about 12 balls',
        { text: 'Chill 30 minutes to firm up', timer_seconds: 1800, timer_label: 'Chill' },
        'Store in the fridge up to a week',
      ],
    },
  },

  mixed_nuts: {
    no_cook: {
      0: [
        'Grab a ~40g handful of mixed nuts',
        'Unsalted or lightly salted; calorie-dense, so a small handful goes a long way for surplus',
      ],
    },
  },

  trail_mix: {
    no_cook: {
      0: [
        'Grab a ~60g handful of trail mix',
        'Or mix your own: 30g mixed nuts + 20g dried fruit + 10g dark chocolate chips',
        'Calorie-dense — a small scoop is a serving',
      ],
    },
  },

  banana_snack: {
    no_cook: {
      0: [
        'Peel and eat a banana',
        'Ideal pre- or post-workout for quick carbs and potassium',
      ],
    },
  },

  dried_fruit: {
    no_cook: {
      0: [
        'Grab a ~40g handful of dried fruit (raisins, apricots, dates, cranberries)',
        'Concentrated fast carbs — a small handful is a serving',
      ],
    },
  },

  dark_chocolate: {
    no_cook: {
      0: [
        'Break off ~30g (2-3 squares) of 70%+ dark chocolate',
        'Enjoy slowly — calorie-dense, so a couple of squares is a serving',
      ],
    },
  },
};