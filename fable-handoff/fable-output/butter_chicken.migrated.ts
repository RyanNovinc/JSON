// Task 1 Phase B+D — REPLACE the `butter_chicken` entry in
// src/data/curated_meals.ts with this object.
//
// Shape: base (chicken + coriander garnish only) + additive sauce axis
// (jar = default, scratch = optional toggle) + rice moved onto the rice plate
// + methods as steps-metadata only (zero ingredients, zero macro effect).
//
// plate_macros are FROZEN TO COMPUTED JAR DEFAULT (grams-first per CLAUDE.md;
// pantry-negligible rows excluded from totals, still rendered in steps).
// Itemised computation in butter_chicken_macro_report.md alongside this file.

butter_chicken: {
  slug: 'butter_chicken',
  display_name: 'Butter Chicken with Basmati Rice',
  cuisine: 'indian',
  primary_protein: 'chicken',
  produces_servings: 1,
  eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
  min_scale: 0.7,
  max_scale: 1.5,
  flex_ingredient_id: 'basmati_rice_dry',
  contains_allergens: ['Dairy'],
  image_filename: 'butter_chicken_with_rice.png',
  meal_prep: {
    strategy: 'full',
    prep_note:
      'Cook the curry ahead; it reheats well and improves overnight. Rice is grab-and-go / done day-of on the rice plate. Note: this recipe is written as a single serve (produces_servings: 1) rather than a batch — scale it up to prep multiple portions.',
    storage: { fridge_days: 4, freeze_months: 3 },
  },

  // Common to every variant and both methods. NO sauce, NO rice.
  base_ingredients: [
    {
      ingredient_id: 'chicken_thigh_skinless',
      base_amount: 200,
      unit: 'g',
      scaling: 'scales',
    },
    {
      ingredient_id: 'coriander_fresh',
      base_amount: 4,
      unit: 'g',
      scaling: 'fixed',
      notes: 'for garnish',
    },
  ],

  sauce_variants: [
    {
      id: 'jar',
      display_name: 'Jar Sauce',
      shortcut_level: 'shortcut',
      is_default: true,
      extra_active_minutes: 0,
      skill_min: 1,
      notes:
        'The weeknight default. Any butter chicken simmer sauce — the jar row carries a representative macro profile and is user_overridable.',
      ingredients: [
        {
          ingredient_id: 'butter_chicken_jar_sauce',
          base_amount: 200,
          unit: 'g',
          scaling: 'scales',
          notes: 'or equivalent jar sauce',
        },
        {
          ingredient_id: 'thickened_cream',
          base_amount: 30,
          unit: 'ml',
          scaling: 'scales',
        },
      ],
      instructions: {
        stovetop: [
          {
            summary: 'Cut chicken thigh into 3 cm cubes.',
            substeps: ['Cut chicken thigh into 3 cm cubes.'],
          },
          {
            summary:
              'Brown the chicken in a non-stick frying pan over medium-high heat for 6-7 minutes until cooked through and lightly golden. Thigh renders its own fat — add a splash of oil only if it sticks.',
            substeps: [
              'Brown the chicken in a non-stick frying pan over medium-high heat for 6-7 minutes until cooked through and lightly golden. Thigh renders its own fat — add a splash of oil only if it sticks.',
            ],
          },
          {
            summary:
              'Pour in the jar sauce and thickened cream. Stir to coat the chicken and simmer for 3-4 minutes until the sauce is heated through.',
            substeps: [
              'Pour in the jar sauce and thickened cream. Stir to coat the chicken and simmer for 3-4 minutes until the sauce is heated through.',
            ],
          },
          {
            summary: 'Garnish with fresh coriander leaves.',
            substeps: ['Garnish with fresh coriander leaves.'],
          },
        ],
        slow_cooker: [
          {
            summary:
              'Cut chicken thigh into 3 cm cubes. Place in slow cooker with the jar sauce. Stir to coat.',
            substeps: [
              'Cut chicken thigh into 3 cm cubes. Place in slow cooker with the jar sauce. Stir to coat.',
            ],
          },
          {
            summary: 'Cook on high for 4 hours or low for 6-8 hours.',
            substeps: ['Cook on high for 4 hours or low for 6-8 hours.'],
          },
          {
            summary:
              'Stir through the thickened cream during the last 10 minutes of cooking.',
            substeps: [
              'Stir through the thickened cream during the last 10 minutes of cooking.',
            ],
          },
          {
            summary: 'Garnish with fresh coriander leaves.',
            substeps: ['Garnish with fresh coriander leaves.'],
          },
        ],
      },
    },
    {
      id: 'scratch',
      display_name: 'From Scratch',
      shortcut_level: 'scratch',
      extra_active_minutes: 15,
      extra_total_minutes: 30,
      skill_min: 3,
      notes: 'Optional weekend build: yoghurt marinade, whole spice bloom, passata base.',
      ingredients: [
        {
          ingredient_id: 'greek_yoghurt_plain',
          base_amount: 60,
          unit: 'g',
          scaling: 'scales',
          notes: 'for marinade',
        },
        { ingredient_id: 'garam_masala', base_amount: 2, unit: 'tsp', scaling: 'fixed' },
        { ingredient_id: 'ground_cumin', base_amount: 1, unit: 'tsp', scaling: 'fixed' },
        { ingredient_id: 'ground_coriander', base_amount: 1, unit: 'tsp', scaling: 'fixed' },
        { ingredient_id: 'ground_turmeric', base_amount: 0.5, unit: 'tsp', scaling: 'fixed' },
        { ingredient_id: 'kashmiri_chilli_powder', base_amount: 1, unit: 'tsp', scaling: 'fixed' },
        { ingredient_id: 'garlic_clove', base_amount: 2, unit: 'cloves', scaling: 'fixed' },
        { ingredient_id: 'ginger_fresh', base_amount: 1, unit: 'tsp', scaling: 'fixed' },
        { ingredient_id: 'ghee', base_amount: 15, unit: 'g', scaling: 'scales' },
        { ingredient_id: 'brown_onion', base_amount: 75, unit: 'g', scaling: 'scales' },
        { ingredient_id: 'tomato_passata', base_amount: 200, unit: 'ml', scaling: 'scales' },
        { ingredient_id: 'thickened_cream', base_amount: 60, unit: 'ml', scaling: 'scales' },
        { ingredient_id: 'salt', base_amount: 0.5, unit: 'tsp', scaling: 'fixed' },
      ],
      instructions: {
        stovetop: [
          {
            summary:
              'Cut chicken thigh into 3 cm cubes. Combine with yoghurt, half the garam masala, half the cumin, and half the turmeric. Marinate for 20 minutes.',
            substeps: [
              'Cut chicken thigh into 3 cm cubes. Combine with yoghurt, half the garam masala, half the cumin, and half the turmeric. Marinate for 20 minutes.',
            ],
          },
          {
            summary:
              'Heat ghee in a large frying pan over medium-high heat. Add the marinated chicken and sear for 4-5 minutes until golden on all sides. Remove and set aside.',
            substeps: [
              'Heat ghee in a large frying pan over medium-high heat. Add the marinated chicken and sear for 4-5 minutes until golden on all sides. Remove and set aside.',
            ],
          },
          {
            summary:
              'In the same pan, add the diced onion and cook for 3 minutes until softened. Add garlic and ginger and cook for another 30 seconds.',
            substeps: [
              'In the same pan, add the diced onion and cook for 3 minutes until softened. Add garlic and ginger and cook for another 30 seconds.',
            ],
          },
          {
            summary:
              'Add the remaining garam masala, cumin, coriander, turmeric, and Kashmiri chilli powder. Stir for 30 seconds until fragrant.',
            substeps: [
              'Add the remaining garam masala, cumin, coriander, turmeric, and Kashmiri chilli powder. Stir for 30 seconds until fragrant.',
            ],
          },
          {
            summary:
              'Pour in the tomato passata and add salt. Bring to a simmer and cook for 5 minutes, stirring occasionally.',
            substeps: [
              'Pour in the tomato passata and add salt. Bring to a simmer and cook for 5 minutes, stirring occasionally.',
            ],
          },
          {
            summary:
              'Return the chicken to the pan and stir through the thickened cream. Simmer for 5 more minutes until the chicken is cooked through and the sauce has thickened.',
            substeps: [
              'Return the chicken to the pan and stir through the thickened cream. Simmer for 5 more minutes until the chicken is cooked through and the sauce has thickened.',
            ],
          },
          {
            summary: 'Garnish with fresh coriander leaves.',
            substeps: ['Garnish with fresh coriander leaves.'],
          },
        ],
        slow_cooker: [
          {
            summary:
              'Cut chicken thigh into 3 cm cubes. Combine with yoghurt, half the garam masala, half the cumin, and half the turmeric. Marinate for 20 minutes.',
            substeps: [
              'Cut chicken thigh into 3 cm cubes. Combine with yoghurt, half the garam masala, half the cumin, and half the turmeric. Marinate for 20 minutes.',
            ],
          },
          {
            summary:
              'Heat ghee in a frying pan over medium-high heat. Sear the marinated chicken for 3-4 minutes, then add the diced onion, garlic, ginger, and the remaining spices. Cook for 2 minutes until fragrant.',
            substeps: [
              'Heat ghee in a frying pan over medium-high heat. Sear the marinated chicken for 3-4 minutes, then add the diced onion, garlic, ginger, and the remaining spices. Cook for 2 minutes until fragrant.',
            ],
          },
          {
            summary:
              'Transfer everything to the slow cooker with the tomato passata and salt. Cook on high for 4 hours or low for 6-8 hours.',
            substeps: [
              'Transfer everything to the slow cooker with the tomato passata and salt. Cook on high for 4 hours or low for 6-8 hours.',
            ],
          },
          {
            summary:
              'Stir through the thickened cream during the last 10 minutes of cooking.',
            substeps: [
              'Stir through the thickened cream during the last 10 minutes of cooking.',
            ],
          },
          {
            summary: 'Garnish with fresh coriander leaves.',
            substeps: ['Garnish with fresh coriander leaves.'],
          },
        ],
      },
    },
  ],

  // Steps and timing only. Zero ingredients, zero macro effect.
  // Timing/skill advertise the DEFAULT (jar) experience; the scratch variant
  // adds extra_active_minutes / extra_total_minutes / skill_min on top.
  methods: [
    {
      id: 'stovetop',
      display_name: 'Stovetop',
      equipment_required: ['stovetop'],
      time_active_minutes: 12,
      time_total_minutes: 15,
      skill_min: 2,
      shortcut_level: 'shortcut',
      ingredients: [],
      instructions: [],
    },
    {
      id: 'slow_cooker',
      display_name: 'Slow Cooker',
      equipment_required: ['slow_cooker'],
      time_active_minutes: 5,
      time_total_minutes: 245,
      skill_min: 2,
      shortcut_level: 'shortcut',
      ingredients: [],
      instructions: [],
    },
  ],

  plates: [
    {
      id: 'butter_chicken',
      display_name: 'Butter Chicken',
      description: 'Chicken thigh in a rich tomato-cream butter chicken sauce — no rice.',
      image_filename: undefined,
      // FROZEN to computed jar default (curry only, no rice):
      // chicken 288.0 + coriander 0.9 + jar sauce 240.0 + cream 103.6
      plate_macros: { kcal: 633, protein_g: 42.7, carbs_g: 19.1, fat_g: 43.6, fiber_g: 2.1 },
      assembly_time_minutes: 0,
      additional_instructions: [],
      additional_ingredients: [],
      base_serving_multiplier: 1.0,
    },
    {
      id: 'standard',
      display_name: 'Butter Chicken with Basmati Rice',
      description: 'Chicken thigh in butter chicken sauce, served over basmati rice',
      image_filename: 'butter_chicken_with_rice.png',
      base_serving_multiplier: 1.0,
      additional_ingredients: [
        {
          ingredient_id: 'basmati_rice_dry',
          base_amount: 60,
          unit: 'g',
          scaling: 'flex',
        },
      ],
      additional_instructions: [
        {
          summary:
            'Cook the basmati rice: 60g dry with 120ml water on a low simmer, covered, for 12 minutes, then rest off heat 5 minutes. Rice cooker or a microwave pouch works too.',
          substeps: [
            'Cook the basmati rice: 60g dry with 120ml water on a low simmer, covered, for 12 minutes, then rest off heat 5 minutes. Rice cooker or a microwave pouch works too.',
          ],
        },
        {
          summary: 'Serve the curry over the rice.',
          substeps: ['Serve the curry over the rice.'],
        },
      ],
      assembly_time_minutes: 15,
      // FROZEN to computed jar default (curry + 60g dry basmati):
      plate_macros: { kcal: 852, protein_g: 47.0, carbs_g: 67.1, fat_g: 44.0, fiber_g: 2.9 },
    },
  ],
},
