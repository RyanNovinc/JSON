import { CuratedMeal, MealSlug } from '../types/curated_meals';

export const CURATED_MEALS: Record<MealSlug, CuratedMeal> = {
  butter_chicken: {
    slug: 'butter_chicken',
    display_name: 'Butter Chicken with Basmati Rice',
    cuisine: 'indian',
    primary_protein: 'chicken',
    produces_servings: 1,
    eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
    min_scale: 0.7,
    max_scale: 1.5,
    flex_ingredient_id: 'basmati_rice_cooked',
    contains_allergens: ['Dairy'],
    image_filename: 'Butter Chicken with Basmati Rice.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Butter Chicken with Basmati Rice',
        description: 'Slow-simmered chicken thigh in spiced tomato-cream sauce, served over basmati rice',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 720,
          protein_g: 52,
          carbs_g: 68,
          fat_g: 24,
          fiber_g: 6
        }
      }
    ],
    methods: [
      {
        id: 'stovetop_scratch',
        display_name: 'Stovetop (From Scratch)',
        equipment_required: ['stovetop'],
        time_active_minutes: 25,
        time_total_minutes: 45,
        skill_min: 3,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'chicken_thigh_skinless',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'greek_yoghurt_plain',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: 'for marinade'
          },
          {
            ingredient_id: 'garam_masala',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ground_cumin',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ground_coriander',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ground_turmeric',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'kashmiri_chilli_powder',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 2,
            unit: 'cloves',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ginger_fresh',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ghee',
            base_amount: 15,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 75,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'tomato_passata',
            base_amount: 200,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 60,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'basmati_rice_cooked',
            base_amount: 180,
            unit: 'g',
            scaling: 'flex'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1,
            unit: 'tbsp',
            scaling: 'fixed',
            notes: 'for garnish'
          }
        ],
        instructions: [
          'Cut chicken thigh into 3 cm cubes. Combine with yoghurt, half the garam masala, half the cumin, and half the turmeric. Marinate for 20 minutes.',
          'Heat ghee in a large frying pan over medium-high heat. Add the marinated chicken and sear for 4-5 minutes until golden on all sides. Remove and set aside.',
          'In the same pan, add the diced onion and cook for 3 minutes until softened. Add garlic and ginger and cook for another 30 seconds.',
          'Add the remaining garam masala, cumin, coriander, turmeric, and Kashmiri chilli powder. Stir for 30 seconds until fragrant.',
          'Pour in the tomato passata and add salt. Bring to a simmer and cook for 5 minutes, stirring occasionally.',
          'Return the chicken to the pan and stir through the thickened cream. Simmer for 5 more minutes until the chicken is cooked through and the sauce has thickened.',
          'Serve over cooked basmati rice, garnished with fresh coriander leaves.'
        ]
      },
      {
        id: 'stovetop_shortcut',
        display_name: 'Stovetop (Jar Sauce)',
        equipment_required: ['stovetop'],
        time_active_minutes: 12,
        time_total_minutes: 15,
        skill_min: 2,
        shortcut_level: 'shortcut',
        ingredients: [
          {
            ingredient_id: 'chicken_thigh_skinless',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 10,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'butter_chicken_jar_sauce',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'or equivalent jar sauce'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 30,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'basmati_rice_cooked',
            base_amount: 180,
            unit: 'g',
            scaling: 'flex'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1,
            unit: 'tbsp',
            scaling: 'fixed',
            notes: 'for garnish'
          }
        ],
        instructions: [
          'Cut chicken thigh into 3 cm cubes.',
          'Heat olive oil in a frying pan over medium-high heat. Add the chicken and pan-fry for 6-7 minutes until cooked through and lightly golden.',
          'Pour in the jar sauce and thickened cream. Stir to coat the chicken and simmer for 3-4 minutes until the sauce is heated through.',
          'Serve over cooked basmati rice, garnished with fresh coriander leaves.'
        ]
      },
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker'],
        time_active_minutes: 5,
        time_total_minutes: 245,
        skill_min: 2,
        shortcut_level: 'shortcut',
        ingredients: [
          {
            ingredient_id: 'chicken_thigh_skinless',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'butter_chicken_jar_sauce',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'or equivalent jar sauce'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 30,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'basmati_rice_cooked',
            base_amount: 180,
            unit: 'g',
            scaling: 'flex'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1,
            unit: 'tbsp',
            scaling: 'fixed',
            notes: 'for garnish'
          }
        ],
        instructions: [
          'Cut chicken thigh into 3 cm cubes. Place in slow cooker with the jar sauce. Stir to coat.',
          'Cook on high for 4 hours or low for 6-8 hours.',
          'Stir through the thickened cream during the last 10 minutes of cooking.',
          'Serve over cooked basmati rice, garnished with fresh coriander leaves.'
        ]
      }
    ]
  },
  brekkie_grow: {
    slug: 'brekkie_grow',
    display_name: 'Brekkie to GROW-Grow Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    flex_ingredient_id: 'rolled_oats_raw',
    contains_allergens: ['Dairy', 'Nuts'],
    image_filename: 'Brekkie to GROW-Grow.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Brekkie to GROW-Grow Bulking Smoothie',
        description: 'Banana, oats, peanut butter, and whey blended into a breakfast you drink',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1185,
          protein_g: 64,
          carbs_g: 129,
          fat_g: 46,
          fiber_g: 10
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 350,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled. Roughly 1 medium banana.'
          },
          {
            ingredient_id: 'rolled_oats_raw',
            base_amount: 45,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately ½ cup.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'peanut_butter_natural',
            base_amount: 32,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'maple_syrup',
            base_amount: 20,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'cinnamon_ground',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Add all ingredients to a high-powered blender.',
          'Start at low speed for 5 seconds to break up the frozen banana, then increase to high speed.',
          'Blend on high for 45-60 seconds until completely smooth and no oat or banana chunks remain.',
          'Pour into a large glass. If the smoothie is thicker than you prefer, add a splash of extra milk and pulse to combine.'
        ]
      }
    ]
  },
  mango_mass: {
    slug: 'mango_mass',
    display_name: 'Mango Mass Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    flex_ingredient_id: 'mango_nectar',
    contains_allergens: ['Dairy', 'Nuts'],
    image_filename: 'Mango Mass.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Mango Mass Bulking Smoothie',
        description: 'Tropical mango and nectar with macadamia butter — like drinking a liquid mango smoothie bowl',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1147,
          protein_g: 52,
          carbs_g: 126,
          fat_g: 50,
          fiber_g: 8
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'mango_frozen',
            base_amount: 165,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 cup.'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled. Roughly 1 medium banana.'
          },
          {
            ingredient_id: 'mango_nectar',
            base_amount: 150,
            unit: 'ml',
            scaling: 'flex'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'macadamia_butter',
            base_amount: 32,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          }
        ],
        instructions: [
          'Add all ingredients to a high-powered blender.',
          'Start at low speed for 5 seconds to break up the frozen mango and banana, then increase to high speed.',
          'Blend on high for 45-60 seconds until completely smooth.',
          'Pour into a large glass. If too thick, add a splash of extra milk and pulse to combine.'
        ]
      }
    ]
  },
  king_kong_chocolate: {
    slug: 'king_kong_chocolate',
    display_name: 'King Kong Chocolate Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    flex_ingredient_id: 'peanut_butter_natural',
    contains_allergens: ['Dairy', 'Nuts'],
    image_filename: 'King Kong Chocolate.png',
    plates: [
      {
        id: 'standard',
        display_name: 'King Kong Chocolate Bulking Smoothie',
        description: 'Chocolate, peanut butter, cream — the pinch of salt makes it taste like a thick shake, not a sad gym drink',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1418,
          protein_g: 85,
          carbs_g: 93,
          fat_g: 79,
          fiber_g: 8
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 100,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled. Roughly 1 medium banana.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_chocolate',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: '2 scoops.'
          },
          {
            ingredient_id: 'cocoa_powder',
            base_amount: 10,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'peanut_butter_natural',
            base_amount: 32,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'Pinch — enhances the chocolate flavour.'
          }
        ],
        instructions: [
          'Add the milk, cream, and yoghurt to the blender first to give the dry ingredients something to blend into.',
          'Add the frozen banana, whey, cocoa powder, peanut butter, honey, and salt.',
          'Start at low speed for 5 seconds to break up the frozen banana, then increase to high speed.',
          'Blend on high for 60 seconds until completely smooth and silky. The thickened cream should be fully incorporated.',
          'Pour into a large glass. The salt is essential — it transforms the flavour from "sad gym shake" to "Maccas thick shake."'
        ]
      }
    ]
  },
  strawberry_stack: {
    slug: 'strawberry_stack',
    display_name: 'Strawberry Stack Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    flex_ingredient_id: 'coconut_cream',
    contains_allergens: ['Dairy', 'Nuts'],
    image_filename: 'Strawberry Stack.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Strawberry Stack Bulking Smoothie',
        description: 'Strawberries and banana with coconut cream — tastes like liquid strawberries and cream',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1157,
          protein_g: 56,
          carbs_g: 100,
          fat_g: 62,
          fiber_g: 10
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 250,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'coconut_cream',
            base_amount: 100,
            unit: 'ml',
            scaling: 'flex'
          },
          {
            ingredient_id: 'strawberries_frozen',
            base_amount: 150,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 cup.'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled. Roughly 1 medium banana.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'almond_butter',
            base_amount: 32,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          }
        ],
        instructions: [
          'Add all ingredients to a high-powered blender.',
          'Start at low speed for 5 seconds to break up the frozen strawberries and banana, then increase to high speed.',
          'Blend on high for 45-60 seconds until completely smooth.',
          'Pour into a large glass. If too thick, add a splash of extra milk and pulse to combine. The coconut cream gives this a strawberries-and-cream finish — don\'t skip it.'
        ]
      }
    ]
  },

  choc_muscle_maxx: {
    slug: 'choc_muscle_maxx',
    display_name: 'Choc Muscle MAXX Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy', 'Nuts', 'Eggs'],
    flex_ingredient_id: 'rolled_oats_raw',
    image_filename: 'Choc Muscle MAXX.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Choc Muscle MAXX Bulking Smoothie',
        description: 'Post-workout powerhouse with chocolate whey, ice cream, and peanut butter — recovery in a glass',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1111,
          protein_g: 77,
          carbs_g: 109,
          fat_g: 40,
          fiber_g: 12
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled. Roughly 1 medium banana.'
          },
          {
            ingredient_id: 'ice_cream_vanilla',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately ½ cup.'
          },
          {
            ingredient_id: 'whey_protein_chocolate',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: '2 scoops.'
          },
          {
            ingredient_id: 'peanut_butter_natural',
            base_amount: 32,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'cocoa_powder',
            base_amount: 5,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'rolled_oats_raw',
            base_amount: 50,
            unit: 'g',
            scaling: 'flex'
          }
        ],
        instructions: [
          'Add the milk to the blender first so the dry ingredients have something to blend into.',
          'Add the frozen banana, ice cream, whey, peanut butter, cocoa, honey, and oats.',
          'Start at low speed for 5 seconds to break up the frozen banana, then increase to high speed.',
          'Blend on high for 45-60 seconds until completely smooth and no oat texture remains.',
          'Pour into a large glass. Best within 30 minutes of a workout — the carb-to-protein ratio is built for recovery.'
        ]
      }
    ]
  },

  cookies_gains: {
    slug: 'cookies_gains',
    display_name: 'Cookies & Gains Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy', 'Nuts', 'Gluten/Wheat', 'Soy', 'Eggs'],
    flex_ingredient_id: 'oreo_cookies',
    image_filename: 'Cookies & Gains.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Cookies & Gains Bulking Smoothie',
        description: 'Oreo cookies blended with vanilla and chocolate — like drinking a cookies and cream milkshake',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1148,
          protein_g: 56,
          carbs_g: 128,
          fat_g: 47,
          fiber_g: 6
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled. Roughly 1 medium banana.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_chocolate',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'oreo_cookies',
            base_amount: 44,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately 4 cookies. Reserve one for crushing over the top.'
          },
          {
            ingredient_id: 'peanut_butter_natural',
            base_amount: 16,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'ice_cream_vanilla',
            base_amount: 50,
            unit: 'g',
            scaling: 'scales'
          }
        ],
        instructions: [
          'Add the milk and yoghurt to the blender first.',
          'Add the banana, whey, 3 of the Oreos, peanut butter, honey, and ice cream.',
          'Blend on high for 45-60 seconds until smooth. Some small Oreo flecks are fine — they add texture.',
          'Pour into a tall glass. Crush the reserved Oreo and sprinkle over the top.'
        ]
      }
    ]
  },

  raspberry_rip: {
    slug: 'raspberry_rip',
    display_name: 'Raspberry Rip Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy'],
    flex_ingredient_id: 'coconut_cream',
    image_filename: 'Raspberry Rip.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Raspberry Rip Bulking Smoothie',
        description: 'Raspberry, chocolate, and coconut — tastes like a Cherry Ripe bar in liquid form',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1070,
          protein_g: 54,
          carbs_g: 103,
          fat_g: 52,
          fiber_g: 16
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'coconut_cream',
            base_amount: 100,
            unit: 'ml',
            scaling: 'flex'
          },
          {
            ingredient_id: 'raspberries_frozen',
            base_amount: 125,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 cup.'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_chocolate',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'cocoa_powder',
            base_amount: 10,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'desiccated_coconut',
            base_amount: 6,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          }
        ],
        instructions: [
          'Add all ingredients to a high-powered blender.',
          'Blend on high for 45-60 seconds until smooth. The raspberry seeds will leave a subtle texture — that\'s fine.',
          'Pour into a tall glass. The flavour is essentially a Cherry Ripe in liquid form — chocolate, coconut, raspberry.'
        ]
      }
    ]
  },

  energy_lift_heavy: {
    slug: 'energy_lift_heavy',
    display_name: 'Energy Lift Heavy Pre-Workout Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'morning_snack', 'pre_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy'],
    flex_ingredient_id: 'mango_frozen',
    image_filename: 'Energy Lift Heavy.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Energy Lift Heavy Pre-Workout Smoothie',
        description: 'Caffeinated pre-workout smoothie with mango and chia — energy and nutrition combined',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 961,
          protein_g: 52,
          carbs_g: 108,
          fat_g: 36,
          fiber_g: 10
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled.'
          },
          {
            ingredient_id: 'mango_frozen',
            base_amount: 165,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately 1 cup.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'coconut_cream',
            base_amount: 30,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'espresso_shot',
            base_amount: 30,
            unit: 'ml',
            scaling: 'fixed',
            notes: '1 shot, cooled. Substitute: 1 tsp instant coffee dissolved in 30ml hot water then cooled.'
          },
          {
            ingredient_id: 'chia_seeds',
            base_amount: 12,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          }
        ],
        instructions: [
          'Brew the espresso first and let it cool while you measure the other ingredients (or use leftover cold espresso).',
          'Add all ingredients to a high-powered blender.',
          'Blend on high for 45-60 seconds until smooth. The chia seeds will thicken the smoothie if it sits — drink within 5 minutes.',
          'Best consumed 30-45 minutes before training.'
        ]
      }
    ]
  },

  mornin_muscle: {
    slug: 'mornin_muscle',
    display_name: "Mornin' Muscle Coffee Bulking Smoothie",
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'pre_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy', 'Nuts'],
    flex_ingredient_id: 'thickened_cream',
    image_filename: "Mornin' Muscle.png",
    plates: [
      {
        id: 'standard',
        display_name: "Mornin' Muscle Coffee Bulking Smoothie",
        description: 'Double espresso chocolate smoothie — breakfast and coffee in one massive drink',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1192,
          protein_g: 57,
          carbs_g: 86,
          fat_g: 70,
          fiber_g: 7
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 100,
            unit: 'ml',
            scaling: 'flex'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_chocolate',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'cocoa_powder',
            base_amount: 10,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'espresso_shot',
            base_amount: 60,
            unit: 'ml',
            scaling: 'fixed',
            notes: '2 shots, cooled. Substitute: 2 tsp instant coffee dissolved in 60ml hot water then cooled.'
          },
          {
            ingredient_id: 'peanut_butter_natural',
            base_amount: 16,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'maple_syrup',
            base_amount: 20,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          }
        ],
        instructions: [
          'Brew the espresso first and let it cool while you measure the other ingredients.',
          'Add the milk, cream, and yoghurt to the blender first.',
          'Add the banana, whey, cocoa, cooled espresso, peanut butter, and maple syrup.',
          'Blend on high for 45-60 seconds until completely smooth.',
          'Pour into a tall glass. This is breakfast and lunch in one — 1200 kcal with caffeine and 57g protein.'
        ]
      }
    ]
  },

  dirty_eden: {
    slug: 'dirty_eden',
    display_name: 'Dirty Eden Green Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy', 'Nuts'],
    flex_ingredient_id: 'avocado',
    image_filename: 'Dirty Eden.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Dirty Eden Green Bulking Smoothie',
        description: 'Green smoothie that tastes tropical, not green — the pineapple and banana dominate',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1165,
          protein_g: 57,
          carbs_g: 105,
          fat_g: 60,
          fiber_g: 19
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'coconut_water',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 200,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled.'
          },
          {
            ingredient_id: 'pineapple_frozen',
            base_amount: 165,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 cup.'
          },
          {
            ingredient_id: 'spinach_baby',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 large handfuls.'
          },
          {
            ingredient_id: 'avocado',
            base_amount: 100,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately half a medium avocado, flesh only.'
          },
          {
            ingredient_id: 'greek_yoghurt_plain_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Plain, not vanilla — keeps the green flavour profile clean.'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'almond_butter',
            base_amount: 32,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'lemon_juice',
            base_amount: 20,
            unit: 'ml',
            scaling: 'fixed',
            notes: 'Juice of half a lemon.'
          },
          {
            ingredient_id: 'mint_leaves',
            base_amount: 6,
            unit: 'count',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Add the liquids (coconut water, milk, lemon juice) to the blender first.',
          'Add the spinach and mint and pulse briefly to break them down before adding the heavier ingredients.',
          'Add everything else — banana, pineapple, avocado, yoghurt, whey, almond butter, honey.',
          'Blend on high for 60-90 seconds until completely smooth. Green smoothies need a bit longer to fully break down the leaves.',
          'Pour into a tall glass. Tastes tropical, not green — the pineapple and banana dominate the flavour.'
        ]
      }
    ]
  },

  strawbrekkie_beast: {
    slug: 'strawbrekkie_beast',
    display_name: 'Strawbrekkie BEAST Bulking Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy', 'Nuts'],
    flex_ingredient_id: 'rolled_oats_raw',
    image_filename: 'Strawbrekkie BEAST.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Strawbrekkie BEAST Bulking Smoothie',
        description: 'Mixed berry breakfast smoothie with oats — carb-heavy for post-workout recovery',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1244,
          protein_g: 63,
          carbs_g: 150,
          fat_g: 47,
          fiber_g: 15
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 300,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'apple_juice_cloudy',
            base_amount: 100,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'strawberries_frozen',
            base_amount: 150,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 cup.'
          },
          {
            ingredient_id: 'blueberries_frozen',
            base_amount: 75,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately ½ cup.'
          },
          {
            ingredient_id: 'banana',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Frozen, peeled.'
          },
          {
            ingredient_id: 'rolled_oats_raw',
            base_amount: 45,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately ½ cup.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'almond_butter',
            base_amount: 32,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          }
        ],
        instructions: [
          'Add the milk and apple juice to the blender first.',
          'Add the frozen berries, banana, oats, yoghurt, whey, almond butter, and honey.',
          'Blend on high for 60 seconds until smooth and no oat texture remains.',
          'Pour into a tall glass. The carb-heavy profile (150g) makes this an ideal post-workout option.'
        ]
      }
    ]
  },

  banana_bulk: {
    slug: 'banana_bulk',
    display_name: 'Banana Bulk Smoothie',
    cuisine: 'smoothie',
    primary_protein: 'dairy',
    produces_servings: 1,
    eligible_slots: ['breakfast', 'brunch', 'morning_snack', 'afternoon_snack', 'pre_workout', 'post_workout'],
    min_scale: 0.6,
    max_scale: 1.3,
    contains_allergens: ['Dairy', 'Nuts'],
    flex_ingredient_id: 'peanut_butter_natural',
    image_filename: 'Banana Bulk.png',
    plates: [
      {
        id: 'standard',
        display_name: 'Banana Bulk Smoothie',
        description: 'Simple banana-date smoothie with cinnamon — the cheapest bulker in the database',
        base_serving_multiplier: 1.0,
        additional_ingredients: [],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: {
          kcal: 1302,
          protein_g: 64,
          carbs_g: 152,
          fat_g: 51,
          fiber_g: 12
        }
      }
    ],
    methods: [
      {
        id: 'blender',
        display_name: 'Blender',
        equipment_required: ['blender'],
        time_active_minutes: 4,
        time_total_minutes: 5,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 350,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'banana',
            base_amount: 240,
            unit: 'g',
            scaling: 'scales',
            notes: '2 frozen bananas, peeled.'
          },
          {
            ingredient_id: 'greek_yoghurt_vanilla_full_fat',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'whey_protein_vanilla',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: '1 scoop.'
          },
          {
            ingredient_id: 'peanut_butter_natural',
            base_amount: 48,
            unit: 'g',
            scaling: 'flex',
            notes: 'Approximately 3 tbsp.'
          },
          {
            ingredient_id: 'medjool_dates',
            base_amount: 48,
            unit: 'g',
            scaling: 'scales',
            notes: '2 dates, pitted.'
          },
          {
            ingredient_id: 'honey',
            base_amount: 21,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'cinnamon_ground',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Pit the dates if needed and roughly chop them — this helps them blend.',
          'Add the milk and yoghurt to the blender first.',
          'Add the frozen bananas, dates, whey, peanut butter, honey, and cinnamon.',
          'Blend on high for 60 seconds until completely smooth — the dates need extra time to fully break down.',
          'Pour into a tall glass. The cheapest smoothie in the database — total ingredient cost roughly $3 AUD.'
        ]
      }
    ]
  },

  pulled_pork: {
    slug: 'pulled_pork',
    display_name: 'Slow-Cooked BBQ Pulled Pork',
    cuisine: 'australian',
    primary_protein: 'pork',
    produces_servings: 8,
    eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
    min_scale: 0.7,
    max_scale: 1.5,
    flex_ingredient_id: 'pork_shoulder_boneless',
    contains_allergens: ['Dairy', 'Eggs', 'Gluten/Wheat', 'Soy', 'Fish'],
    image_filename: 'Slow-Cooked Pulled Pork.png',
    plates: [
      {
        id: 'sandwich',
        display_name: 'BBQ Pulled Pork Burger',
        description: 'Brioche bun, melty cheese, slaw on top — the American classic, bulker-sized.',
        base_serving_multiplier: 1.0,
        image_filename: 'BBQ Pulled Pork Burger (sandwich).png',
        additional_ingredients: [
          {
            ingredient_id: 'brioche_bun',
            base_amount: 1,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'coleslaw_mayo',
            base_amount: 100,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          }
        ],
        additional_instructions: [
          'Split and lightly toast the brioche bun (cut side down in a dry pan, 1 minute).',
          'Pile 1 serving of BBQ pulled pork onto the bottom bun.',
          'Scatter grated cheese over the hot pork — residual heat melts it.',
          'Top with coleslaw, lid on, eat immediately.'
        ],
        assembly_time_minutes: 3,
        plate_macros: {
          kcal: 1210,
          protein_g: 61,
          carbs_g: 76,
          fat_g: 72,
          fiber_g: 4
        }
      },
      {
        id: 'bowl',
        display_name: 'Pulled Pork Rice Bowl',
        description: 'Bed of basmati, BBQ pork, slaw on the side, cheese on top. Easiest weeknight plate.',
        base_serving_multiplier: 1.0,
        image_filename: 'Pulled Pork Rice Bowl (bowl).png',
        additional_ingredients: [
          {
            ingredient_id: 'basmati_rice_cooked',
            base_amount: 280,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'coleslaw_mayo',
            base_amount: 100,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ketchup_tomato',
            base_amount: 15,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Optional drizzle, or use leftover BBQ sauce from the base recipe.'
          }
        ],
        additional_instructions: [
          'Cook the basmati rice if not already prepared (10 minutes in a rice cooker or boiling).',
          'Spread rice across the bottom of a bowl.',
          'Pile 1 serving of BBQ pulled pork on one side of the rice; coleslaw on the other side.',
          'Scatter cheese over the pork; drizzle extra BBQ sauce.'
        ],
        assembly_time_minutes: 15,
        plate_macros: {
          kcal: 1330,
          protein_g: 61,
          carbs_g: 118,
          fat_g: 66,
          fiber_g: 4
        }
      },
      {
        id: 'baked_potato',
        display_name: 'Loaded Pulled Pork Baked Potato',
        description: 'Whole baked potato, split and stuffed with BBQ pork, cheese, sour cream, spring onion.',
        base_serving_multiplier: 1.0,
        image_filename: 'Loaded Pulled Pork Baked Potato (baked_potato).png',
        equipment_required: ['oven'],
        additional_ingredients: [
          {
            ingredient_id: 'baking_potato',
            base_amount: 350,
            unit: 'g',
            scaling: 'fixed',
            notes: 'One large potato.'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'sour_cream',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'spring_onion',
            base_amount: 1,
            unit: 'count',
            scaling: 'fixed',
            notes: 'Finely sliced.'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 5,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the potato skin.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the potato skin.'
          }
        ],
        additional_instructions: [
          'Preheat oven to 200°C. Prick the potato all over with a fork. Rub with olive oil and salt.',
          'Bake directly on the oven rack for 60 minutes, until skin is crisp and inside gives easily when squeezed.',
          'Split the potato open lengthways. Fluff the flesh with a fork.',
          'Pile in 1 serving of BBQ pulled pork. Scatter cheese (residual heat melts it), dollop sour cream, scatter spring onion.'
        ],
        assembly_time_minutes: 65,
        plate_macros: {
          kcal: 1177,
          protein_g: 60,
          carbs_g: 90,
          fat_g: 63,
          fiber_g: 8
        }
      },
      {
        id: 'tacos',
        display_name: 'Pulled Pork Tacos',
        description: 'Three soft tortillas, plain shredded pork, smashed avo, cheese, coriander, lime.',
        base_serving_multiplier: 1.0,
        image_filename: 'Pulled Pork Tacos (tacos).png',
        reserve_before_finishing_note: 'Reserve approximately 151g of plain shredded pork before tossing the rest with BBQ sauce. This plate uses unsauced pork — BBQ flavour conflicts with the Mexican plate.',
        additional_ingredients: [
          {
            ingredient_id: 'flour_tortilla_small',
            base_amount: 3,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'avocado',
            base_amount: 100,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately half a medium avocado, flesh only.'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1.5,
            unit: 'tbsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'lime',
            base_amount: 0.5,
            unit: 'count',
            scaling: 'fixed',
            notes: 'Juiced.'
          },
          {
            ingredient_id: 'pickled_red_onion',
            base_amount: 20,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Optional but recommended.'
          }
        ],
        additional_instructions: [
          'Warm the reserved plain shredded pork in a pan with a splash of water — about 2 minutes.',
          'Warm tortillas (30 sec per side in a dry pan, or 15 sec in microwave under a damp cloth).',
          'Mash avocado roughly with a fork; squeeze in half the lime, pinch of salt.',
          'Divide pork between the three tortillas (~50g each). Top each with smashed avocado, cheese, coriander, pickled red onion. Squeeze remaining lime over.'
        ],
        assembly_time_minutes: 8,
        plate_macros: {
          kcal: 1155,
          protein_g: 61,
          carbs_g: 55,
          fat_g: 74,
          fiber_g: 10
        }
      },
      {
        id: 'mac_cheese',
        display_name: 'Pulled Pork Mac & Cheese Stack',
        description: 'Stovetop mac and cheese topped with a chonky portion of BBQ pork. Treat night.',
        is_stunt_plate: true,
        base_serving_multiplier: 1.5,
        image_filename: 'Pulled Pork Mac & Cheese Stack ⚡ STUNT PLATE (mac_cheese).png',
        equipment_required: ['stovetop'],
        additional_ingredients: [
          {
            ingredient_id: 'macaroni_dry',
            base_amount: 75,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'butter_salted',
            base_amount: 20,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'flour_plain',
            base_amount: 20,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 250,
            unit: 'ml',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 60,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        additional_instructions: [
          'Cook macaroni in salted boiling water until al dente (about 7 minutes). Reserve ½ cup of pasta water, then drain.',
          'In the same pot, melt butter over medium heat. Whisk in flour, cook 30 seconds. Gradually whisk in milk until smooth.',
          'Simmer 2-3 minutes, whisking, until thickened. Stir in grated cheese off the heat until melted. Season.',
          'Stir drained macaroni through the cheese sauce. Loosen with a splash of pasta water if needed.',
          'Scoop mac and cheese into a bowl. Top with 1.5 servings\' worth of BBQ pulled pork.'
        ],
        assembly_time_minutes: 20,
        plate_macros: {
          kcal: 1907,
          protein_g: 102,
          carbs_g: 124,
          fat_g: 109,
          fiber_g: 3
        }
      }
    ],
    methods: [
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker'],
        time_active_minutes: 30,
        time_total_minutes: 510,
        skill_min: 1,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'pork_shoulder_boneless',
            base_amount: 2200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'apple_juice_cloudy',
            base_amount: 180,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Pour around the pork in the slow cooker, not over the rub.'
          },
          {
            ingredient_id: 'brown_sugar',
            base_amount: 24,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the rub. Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'paprika_sweet',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'onion_powder',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'garlic_powder',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'ground_cumin',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'mustard_powder',
            base_amount: 0.75,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub. Approximately 6 g.'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'ketchup_tomato',
            base_amount: 625,
            unit: 'g',
            scaling: 'scales',
            notes: 'For the BBQ sauce. Approximately 2½ cups.'
          },
          {
            ingredient_id: 'brown_sugar',
            base_amount: 24,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the BBQ sauce. Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'worcestershire_sauce',
            base_amount: 17,
            unit: 'ml',
            scaling: 'scales',
            notes: 'For the BBQ sauce. Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'apple_cider_vinegar',
            base_amount: 120,
            unit: 'ml',
            scaling: 'scales',
            notes: 'For the BBQ sauce. Approximately ½ cup.'
          },
          {
            ingredient_id: 'lemon_juice',
            base_amount: 15,
            unit: 'ml',
            scaling: 'fixed',
            notes: 'For the BBQ sauce. Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the BBQ sauce.'
          },
          {
            ingredient_id: 'onion_powder',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the BBQ sauce.'
          },
          {
            ingredient_id: 'mustard_powder',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the BBQ sauce.'
          }
        ],
        instructions: [
          'Mix the rub ingredients (24g brown sugar, paprika, onion powder, garlic powder, cumin, mustard powder, salt, black pepper) in a small bowl. Rub generously all over the pork shoulder, including the fat cap. If time permits, marinate in the fridge for an hour; otherwise straight to step 2.',
          'Place pork in the slow cooker, fat cap facing up. Pour the apple juice around the pork — not over the rub.',
          'Cook on low for 8 hours, or high for 4-5 hours. Pork is done when it shreds easily under light fork pressure.',
          'Lift the pork carefully into a roasting pan or large bowl. Pour the cooking liquid into a measuring jug. Skim and reserve 1 cup (240ml) of the juices for the BBQ sauce. The rest can be discarded or frozen for stock.',
          '(Optional crisp step.) Preheat oven to 180°C. Roast the lifted pork for 20 minutes for surface caramelisation. Worth it for texture; skip if rushed.',
          'Make the BBQ sauce (can be done during the slow cook): combine ketchup, the second 24g brown sugar, Worcestershire, apple cider vinegar, reserved pork juices (240ml), lemon juice, and the sauce spices (1.5 tsp each of black pepper, onion powder, mustard powder) in a saucepan. Bring to a simmer over medium heat. Simmer gently for 1 hour, stirring occasionally, until thickened to coating consistency.',
          'Shred the pork with two forks, discarding any large gristle pieces. If you\'re planning the Pulled Pork Tacos plate this week, reserve approximately 151g of plain shredded pork per planned tacos serve in a separate container before continuing.',
          'Pour BBQ sauce over the remaining shredded pork and toss to coat generously. You\'ll have extra sauce — bottle and use it for serving.'
        ]
      },
      {
        id: 'oven',
        display_name: 'Oven',
        equipment_required: ['oven', 'stovetop'],
        time_active_minutes: 30,
        time_total_minutes: 360,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'pork_shoulder_boneless',
            base_amount: 2200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'apple_juice_cloudy',
            base_amount: 180,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Pour around the pork in the slow cooker, not over the rub.'
          },
          {
            ingredient_id: 'brown_sugar',
            base_amount: 24,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the rub. Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'paprika_sweet',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'onion_powder',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'garlic_powder',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'ground_cumin',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'mustard_powder',
            base_amount: 0.75,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub. Approximately 6 g.'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the rub.'
          },
          {
            ingredient_id: 'ketchup_tomato',
            base_amount: 625,
            unit: 'g',
            scaling: 'scales',
            notes: 'For the BBQ sauce. Approximately 2½ cups.'
          },
          {
            ingredient_id: 'brown_sugar',
            base_amount: 24,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the BBQ sauce. Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'worcestershire_sauce',
            base_amount: 17,
            unit: 'ml',
            scaling: 'scales',
            notes: 'For the BBQ sauce. Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'apple_cider_vinegar',
            base_amount: 120,
            unit: 'ml',
            scaling: 'scales',
            notes: 'For the BBQ sauce. Approximately ½ cup.'
          },
          {
            ingredient_id: 'lemon_juice',
            base_amount: 15,
            unit: 'ml',
            scaling: 'fixed',
            notes: 'For the BBQ sauce. Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the BBQ sauce.'
          },
          {
            ingredient_id: 'onion_powder',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the BBQ sauce.'
          },
          {
            ingredient_id: 'mustard_powder',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the BBQ sauce.'
          }
        ],
        instructions: [
          'Preheat the oven to 140°C (fan-forced 120°C).',
          'Mix the rub ingredients (24g brown sugar, paprika, onion powder, garlic powder, cumin, mustard powder, salt, black pepper) in a small bowl. Rub generously all over the pork shoulder, including the fat cap. If time permits, marinate in the fridge for an hour; otherwise straight to step 3.',
          'Place pork in a deep roasting pan or Dutch oven, fat cap facing up. Pour the apple juice around the pork — not over the rub.',
          'Cover tightly with two layers of foil (or the Dutch oven lid) to trap moisture. The pork needs to braise, not roast.',
          'Cook for 5 hours. Check at 4 hours: the pork should be starting to give way when pressed; if not, cover and continue.',
          'Remove from the oven. Carefully lift the pork into a roasting pan or large bowl. Pour the cooking liquid into a measuring jug. Skim and reserve 1 cup (240ml) of the juices for the BBQ sauce. The rest can be discarded or frozen for stock.',
          'Optional crisp step (recommended): turn the oven up to 200°C. Return the pork uncovered for 20 minutes for surface caramelisation. Worth it for textural contrast.',
          'Make the BBQ sauce (can be done during the oven cook): combine ketchup, the second 24g brown sugar, Worcestershire, apple cider vinegar, reserved pork juices (240ml), lemon juice, and the sauce spices (1.5 tsp each of black pepper, onion powder, mustard powder) in a saucepan. Bring to a simmer over medium heat. Simmer gently for 1 hour, stirring occasionally, until thickened to coating consistency.',
          'Shred the pork with two forks, discarding any large gristle pieces. If you\'re planning the Pulled Pork Tacos plate this week, reserve approximately 151g of plain shredded pork per planned tacos serve in a separate container before continuing.',
          'Pour BBQ sauce over the remaining shredded pork and toss to coat generously. You\'ll have extra sauce — bottle and use it for serving.'
        ]
      }
    ]
  },
  bolognese: {
    slug: 'bolognese',
    display_name: 'Slow-Simmered Bolognese',
    cuisine: 'italian',
    primary_protein: 'beef',
    produces_servings: 8,
    eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
    min_scale: 0.7,
    max_scale: 1.5,
    flex_ingredient_id: 'beef_mince_regular',
    contains_allergens: ['Dairy', 'Eggs', 'Fish', 'Gluten/Wheat'],
    image_filename: 'Bolognese Sauce.png',
    plates: [
      {
        id: 'spaghetti',
        display_name: 'Spaghetti Bolognese',
        description: 'Classic spag bol — al dente pasta, sauce tossed through, parmesan blizzard, drizzle of good oil.',
        base_serving_multiplier: 1.0,
        image_filename: 'Spaghetti Bolognese (spaghetti).png',
        equipment_required: ['stovetop'],
        additional_ingredients: [
          {
            ingredient_id: 'spaghetti_dry',
            base_amount: 100,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'parmesan_grated',
            base_amount: 20,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 5,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the finishing drizzle.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the pasta water.'
          }
        ],
        additional_instructions: [
          'Bring a large pot of well-salted water to the boil. Cook the spaghetti for 1 minute less than the packet directions — you want it firm because it\'ll finish in the sauce.',
          'While the pasta cooks, reheat 1 serving of bolognese in a large pan over medium heat. Reserve ½ cup of pasta cooking water before draining.',
          'Drain the spaghetti and add it directly to the sauce pan. Add a splash (~50ml) of the pasta water. Toss vigorously over medium heat for 1 minute — the starch in the water emulsifies the sauce and makes it cling to the pasta.',
          'Plate. Top with grated parmesan and a drizzle of olive oil.'
        ],
        assembly_time_minutes: 12,
        plate_macros: {
          kcal: 996,
          protein_g: 48,
          carbs_g: 97,
          fat_g: 46,
          fiber_g: 8
        }
      },
      {
        id: 'baked_potato',
        display_name: 'Loaded Bolognese Baked Potato',
        description: 'Whole baked potato split open and piled with bolognese, cheese and sour cream. Pub classic.',
        base_serving_multiplier: 1.0,
        image_filename: 'Loaded Bolognese Baked Potato (baked_potato).png',
        equipment_required: ['oven'],
        additional_ingredients: [
          {
            ingredient_id: 'baking_potato',
            base_amount: 350,
            unit: 'g',
            scaling: 'fixed',
            notes: 'One large potato.'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'sour_cream',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 5,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the potato skin.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the potato skin.'
          }
        ],
        additional_instructions: [
          'Preheat the oven to 200°C. Prick the potato all over with a fork. Rub with olive oil and salt.',
          'Bake directly on the oven rack for 60 minutes, until the skin is crisp and the inside gives easily when squeezed.',
          'Reheat 1 serving of bolognese while the potato finishes.',
          'Split the potato open lengthways. Fluff the flesh with a fork.',
          'Pile in the bolognese. Scatter cheese (residual heat melts it), dollop sour cream.'
        ],
        assembly_time_minutes: 65,
        plate_macros: {
          kcal: 1007,
          protein_g: 44,
          carbs_g: 84,
          fat_g: 55,
          fiber_g: 12
        }
      },
      {
        id: 'garlic_bread',
        display_name: 'Bolognese with Garlic Bread',
        description: 'Bolognese served as a stew in a bowl, with cheesy garlic bread for dipping. No pasta, all comfort.',
        base_serving_multiplier: 1.0,
        image_filename: 'Bolognese with Garlic Bread (garlic_bread).png',
        equipment_required: ['oven'],
        additional_ingredients: [
          {
            ingredient_id: 'garlic_bread_frozen',
            base_amount: 120,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 3 slices.'
          },
          {
            ingredient_id: 'parmesan_grated',
            base_amount: 15,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For topping the bolognese.'
          }
        ],
        additional_instructions: [
          'Bake the garlic bread per packet instructions, usually 180°C for 12-15 minutes.',
          'Reheat 1 serving of bolognese in a pan or microwave. Spoon into a wide bowl.',
          'Top with grated parmesan.',
          'Serve the garlic bread alongside for dipping.'
        ],
        assembly_time_minutes: 18,
        plate_macros: {
          kcal: 968,
          protein_g: 42,
          carbs_g: 65,
          fat_g: 59,
          fiber_g: 7
        }
      },
      {
        id: 'lasagne',
        display_name: 'Bolognese Lasagne',
        description: 'Layered baked lasagne with ricotta, mozzarella and béchamel. A weekend project worth the effort.',
        is_stunt_plate: true,
        base_serving_multiplier: 1.0,
        image_filename: 'Bolognese Lasagne ⚡ STUNT PLATE (lasagne).png',
        equipment_required: ['oven', 'stovetop'],
        reserve_before_finishing_note: 'This plate uses 6 servings of base bolognese in one bake. Plan accordingly: a single lasagne bake feeds 6 portions and uses 6 servings worth of sauce, leaving 2 base servings free for other plates that week.',
        additional_ingredients: [
          {
            ingredient_id: 'lasagne_sheets_dry',
            base_amount: 60,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 2 sheets per portion. Full bake uses 360g (~12 sheets).'
          },
          {
            ingredient_id: 'ricotta_full_fat',
            base_amount: 80,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Full bake uses 500g.'
          },
          {
            ingredient_id: 'egg_whole',
            base_amount: 0.17,
            unit: 'count',
            scaling: 'fixed',
            notes: '1/6 of one whole egg per portion. The bake uses 1 whole egg mixed into the ricotta layer.'
          },
          {
            ingredient_id: 'mozzarella_shredded',
            base_amount: 50,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Full bake uses 300g.'
          },
          {
            ingredient_id: 'parmesan_grated',
            base_amount: 10,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Full bake uses 60g — half mixed into ricotta, half on top.'
          },
          {
            ingredient_id: 'butter_salted',
            base_amount: 5,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the béchamel. Full bake uses 30g.'
          },
          {
            ingredient_id: 'flour_plain',
            base_amount: 5,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the béchamel. Full bake uses 30g.'
          },
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 67,
            unit: 'ml',
            scaling: 'fixed',
            notes: 'For the béchamel. Full bake uses 400ml.'
          },
          {
            ingredient_id: 'nutmeg_ground',
            base_amount: 0.05,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For the béchamel. Full bake uses a pinch (~0.3 tsp).'
          }
        ],
        additional_instructions: [
          'Note: this plate makes a 6-portion bake. You\'ll commit 6 servings of bolognese in one go. Plan to eat across the week or freeze portions.',
          'Make the béchamel: melt the butter in a small saucepan over medium heat. Whisk in the flour, cook 30 seconds. Gradually whisk in the milk until smooth. Simmer 2-3 minutes, whisking, until thickened. Season with nutmeg, salt, pepper. Set aside.',
          'Make the ricotta mix: combine ricotta, egg, half the parmesan, salt and pepper in a bowl. Stir until smooth.',
          'Preheat the oven to 180°C. Lightly grease a deep baking dish (roughly 30 × 20 cm).',
          'Layer it up: a thin smear of bolognese on the base of the dish; lasagne sheets to cover (break to fit if needed); 1/3 of the remaining bolognese; 1/3 of the ricotta mix dolloped and spread; 1/3 of the béchamel; repeat these layers two more times. Top with mozzarella and the remaining parmesan.',
          'Cover with foil. Bake 25 minutes. Remove the foil and bake 10 more minutes until the cheese is golden and bubbling.',
          'Rest 15 minutes before cutting — this is non-negotiable; lasagne falls apart if you cut it hot. Cut into 6 portions.'
        ],
        assembly_time_minutes: 70,
        plate_macros: {
          kcal: 1130,
          protein_g: 62,
          carbs_g: 76,
          fat_g: 63,
          fiber_g: 7
        }
      }
    ],
    methods: [
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker', 'stovetop'],
        time_active_minutes: 20,
        time_total_minutes: 380,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'olive_oil',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Split: 15g for sautéing the soffritto, 15g for browning the mince.'
          },
          {
            ingredient_id: 'beef_mince_regular',
            base_amount: 1000,
            unit: 'g',
            scaling: 'scales',
            notes: 'Don\'t use lean — fat is doing real work here.'
          },
          {
            ingredient_id: 'pancetta_diced',
            base_amount: 100,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 medium onions, finely diced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 4,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'carrot',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 medium, finely diced.'
          },
          {
            ingredient_id: 'celery',
            base_amount: 100,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 stalks, finely diced.'
          },
          {
            ingredient_id: 'red_wine_cooking',
            base_amount: 250,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Cabernet sauvignon or merlot. Any cleanskin works.'
          },
          {
            ingredient_id: 'crushed_tomatoes_canned',
            base_amount: 1600,
            unit: 'g',
            scaling: 'scales',
            notes: 'Two 800g tins.'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 4 tbsp.'
          },
          {
            ingredient_id: 'beef_stock_cube',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Three cubes.'
          },
          {
            ingredient_id: 'worcestershire_sauce',
            base_amount: 20,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Approximately 1 tbsp.'
          },
          {
            ingredient_id: 'sugar_white',
            base_amount: 8,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 2 tsp. Balances tomato acidity.'
          },
          {
            ingredient_id: 'oregano_dried',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'thyme_dried',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 3,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Heat 15g of the olive oil in a large skillet over medium-high heat. Add the diced onion, carrot, and celery. Cook for 7 minutes until soft and the onion is translucent. Add the garlic and pancetta; cook 2 more minutes. Transfer everything to the slow cooker.',
          'Add the remaining 15g oil to the same skillet over high heat. Add the beef mince and brown in two batches if needed — don\'t overcrowd the pan. Break up the mince with a wooden spoon as it cooks. Transfer to the slow cooker.',
          'Return the skillet to medium heat. Pour in the red wine and scrape all the browned bits from the bottom of the pan — this fond is where the flavour lives. Simmer for 2 minutes, then pour into the slow cooker.',
          'Add the crushed tomatoes, tomato paste, stock cubes, Worcestershire sauce, sugar, oregano, thyme, bay leaves, salt, and pepper to the slow cooker. Stir well.',
          'Cook on LOW for 6 hours (or HIGH for 4 hours).',
          'After cooking, taste and adjust salt. Remove the bay leaves. If the sauce looks too liquid (common in slow cookers — they don\'t reduce much), prop the lid open with a wooden spoon and cook on HIGH for 30 more minutes.'
        ]
      },
      {
        id: 'stovetop',
        display_name: 'Stovetop',
        equipment_required: ['stovetop'],
        time_active_minutes: 20,
        time_total_minutes: 140,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'olive_oil',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Split: 15g for sautéing the soffritto, 15g for browning the mince.'
          },
          {
            ingredient_id: 'beef_mince_regular',
            base_amount: 1000,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'pancetta_diced',
            base_amount: 100,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 medium onions, finely diced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 4,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'carrot',
            base_amount: 120,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 medium, finely diced.'
          },
          {
            ingredient_id: 'celery',
            base_amount: 100,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 stalks, finely diced.'
          },
          {
            ingredient_id: 'red_wine_cooking',
            base_amount: 250,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'crushed_tomatoes_canned',
            base_amount: 1200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Three 400g tins or 1.5 of the 800g tins. Less than the slow cooker version because stovetop reduces more during the long simmer.'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 60,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 4 tbsp.'
          },
          {
            ingredient_id: 'beef_stock_cube',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Three cubes.'
          },
          {
            ingredient_id: 'worcestershire_sauce',
            base_amount: 20,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'sugar_white',
            base_amount: 8,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'oregano_dried',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'thyme_dried',
            base_amount: 2,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 3,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Heat 15g olive oil in a large heavy-based pot or Dutch oven over medium heat. Add the onion, carrot, and celery. Cook for 7 minutes until softened. Add the garlic and pancetta; cook 2 more minutes.',
          'Turn the heat to high. Push the vegetables to one side of the pot. Add the remaining 15g oil and the beef mince. Brown it well, breaking it up with a wooden spoon — about 5 minutes.',
          'Pour in the red wine. Simmer rapidly for 2 minutes until reduced by half.',
          'Add the crushed tomatoes, tomato paste, stock cubes, Worcestershire, sugar, herbs, bay leaves, salt, and pepper. Stir well and bring to a simmer.',
          'Reduce the heat to low. Cover loosely (lid slightly ajar). Simmer gently for 1.5-2 hours, stirring every 20 minutes. The sauce should be bubbling lazily, not vigorously.',
          'After 1.5 hours, taste. Adjust salt and acidity (more sugar if too sharp). Remove the bay leaves. The sauce should be thick and glossy — if too watery, simmer uncovered for the last 20 minutes.'
        ]
      }
    ]
  },
  massaman: {
    slug: 'massaman',
    display_name: 'Slow-Cooked Massaman Beef Curry',
    cuisine: 'thai',
    primary_protein: 'beef',
    produces_servings: 8,
    eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
    min_scale: 0.7,
    max_scale: 1.5,
    flex_ingredient_id: 'beef_chuck',
    contains_allergens: ['Fish', 'Shellfish', 'Nuts'],
    image_filename: 'Massaman Beef Curry.png',
    plates: [
      {
        id: 'rice',
        display_name: 'Massaman Beef Curry with Rice',
        description: 'Tender slow-cooked beef and potato in a rich, fragrant Thai coconut curry, served over jasmine rice with crushed peanuts and fresh coriander.',
        base_serving_multiplier: 1.0,
        equipment_required: ['stovetop'],
        image_filename: 'Massaman Beef Curry with Rice.png',
        additional_ingredients: [
          {
            ingredient_id: 'basmati_rice_cooked',
            base_amount: 300,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 100g dry rice. Cook per packet directions or in a rice cooker.'
          },
          {
            ingredient_id: 'peanuts_roasted_unsalted',
            base_amount: 20,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Roughly crushed.'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1,
            unit: 'tbsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'lime',
            base_amount: 0.25,
            unit: 'count',
            scaling: 'fixed',
            notes: 'One wedge, approximately 5ml juice.'
          }
        ],
        additional_instructions: [
          'Cook the rice according to packet directions, or use a rice cooker. 100g dry basmati + 200ml water on a low simmer, covered, for 12 minutes, then rest off heat 5 minutes.',
          'Reheat 1 serving of massaman curry in a small saucepan or microwave. Don\'t boil hard — gentle warming preserves the texture of the beef.',
          'Pile the rice into a bowl on one side, ladle the curry over the other side (or on top of the rice).',
          'Scatter crushed peanuts over the curry. Top with fresh coriander leaves.',
          'Squeeze the lime wedge over everything just before eating.'
        ],
        assembly_time_minutes: 15,
        plate_macros: {
          kcal: 1403,
          protein_g: 59,
          carbs_g: 133,
          fat_g: 68,
          fiber_g: 7
        }
      }
    ],
    methods: [
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker', 'stovetop'],
        time_active_minutes: 15,
        time_total_minutes: 495,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'beef_chuck',
            base_amount: 1600,
            unit: 'g',
            scaling: 'scales',
            notes: 'Cut into 4cm cubes. Ask the butcher for chuck steak or gravy beef.'
          },
          {
            ingredient_id: 'massaman_curry_paste',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Two 114g cans of Maesri, or one jar of Valcom or Ayam.'
          },
          {
            ingredient_id: 'coconut_cream',
            base_amount: 800,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Two 400ml cans of Ayam or Trang.'
          },
          {
            ingredient_id: 'beef_stock_liquid',
            base_amount: 500,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Or 500ml water + 1 stock cube.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 large onion, sliced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 4,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'ginger_fresh',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'scales',
            notes: 'Grated.'
          },
          {
            ingredient_id: 'potato_waxy',
            base_amount: 800,
            unit: 'g',
            scaling: 'scales',
            notes: 'Peeled and cut into 3cm chunks. Do not substitute with starchy baking potatoes — they fall apart.'
          },
          {
            ingredient_id: 'fish_sauce',
            base_amount: 45,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Approximately 3 tbsp. Squid brand.'
          },
          {
            ingredient_id: 'sugar_brown_palm_substitute',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'tamarind_paste',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For browning.'
          },
          {
            ingredient_id: 'cinnamon_stick',
            base_amount: 1,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'star_anise',
            base_amount: 2,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 3,
            unit: 'count',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Heat 15ml of the olive oil in a large skillet over medium-high heat. Brown the beef in 2-3 batches, about 2 minutes per side to get a hard sear — don\'t crowd the pan. Transfer to the slow cooker as you go. Browning is optional but adds real depth of flavour.',
          'In the same skillet (don\'t wipe out), drop the heat to medium. Add the sliced onion and cook 3 minutes until starting to soften. Add the garlic, ginger, and massaman curry paste. Cook 2 minutes, stirring constantly, until the paste is fragrant and the oil starts to split out — this "blooms" the paste and is the most important flavour step.',
          'Pour in 1 cup of the coconut cream and stir to combine with the paste, scraping all the brown bits off the bottom of the pan. Bring to a simmer for 1 minute, then transfer everything to the slow cooker.',
          'Add the remaining coconut cream, beef stock, potatoes, fish sauce, brown sugar, tamarind paste, cinnamon stick, star anise, and bay leaves to the slow cooker. Stir to combine.',
          'Cook on LOW for 8 hours or HIGH for 5 hours, until the beef is fork-tender and falls apart with light pressure.',
          'Optional finishing reduction: if the sauce looks too thin (slow cookers vary), transfer to a saucepan and simmer uncovered for 10 minutes to reduce. Or mash 2-3 potato chunks gently into the sauce to thicken naturally.',
          'Remove the cinnamon stick, star anise, and bay leaves before serving.'
        ]
      },
      {
        id: 'stovetop',
        display_name: 'Stovetop',
        equipment_required: ['stovetop'],
        time_active_minutes: 20,
        time_total_minutes: 140,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'beef_chuck',
            base_amount: 1600,
            unit: 'g',
            scaling: 'scales',
            notes: 'Cut into 4cm cubes.'
          },
          {
            ingredient_id: 'massaman_curry_paste',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Two 114g cans of Maesri, or one jar of Valcom or Ayam.'
          },
          {
            ingredient_id: 'coconut_cream',
            base_amount: 800,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'beef_stock_liquid',
            base_amount: 750,
            unit: 'ml',
            scaling: 'scales',
            notes: 'More than the slow cooker version because stovetop reduction is real.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 large onion, sliced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 4,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'ginger_fresh',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'scales',
            notes: 'Grated.'
          },
          {
            ingredient_id: 'potato_waxy',
            base_amount: 800,
            unit: 'g',
            scaling: 'scales',
            notes: 'Peeled and cut into 3cm chunks.'
          },
          {
            ingredient_id: 'fish_sauce',
            base_amount: 45,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'sugar_brown_palm_substitute',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'tamarind_paste',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 15g for browning the beef, 15g for sautéing the aromatics.'
          },
          {
            ingredient_id: 'cinnamon_stick',
            base_amount: 1,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'star_anise',
            base_amount: 2,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 3,
            unit: 'count',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Heat 15ml olive oil in a large heavy-based pot or Dutch oven over medium-high heat. Brown the beef in batches, about 2 minutes per side. Transfer to a plate.',
          'Drop the heat to medium. Add the remaining 15ml oil and the sliced onion. Cook 5 minutes until soft. Add the garlic and ginger, cook 1 minute.',
          'Add the massaman curry paste and cook for 3 minutes, stirring constantly. The paste should darken and the oil should split out — this is the bloom.',
          'Pour in the coconut cream and stir to combine with the paste. Bring to a simmer, then add the beef back in with any juices, plus the beef stock, fish sauce, brown sugar, tamarind paste, cinnamon stick, star anise, and bay leaves.',
          'Bring to a simmer. Cover loosely (lid slightly ajar) and simmer gently for 1 hour 15 minutes, stirring every 20 minutes.',
          'Add the potato chunks. Continue simmering uncovered for 30-40 minutes, until the potatoes are tender and the beef shreds easily with a fork. The sauce should have reduced and thickened.',
          'Remove the cinnamon stick, star anise, and bay leaves. Taste and adjust — more fish sauce for salt, more sugar for sweetness, more tamarind for sour.'
        ]
      }
    ]
  },
  chilli_con_carne: {
    slug: 'chilli_con_carne',
    display_name: 'Slow-Simmered Chilli Con Carne',
    cuisine: 'mexican',
    primary_protein: 'beef',
    produces_servings: 8,
    eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
    min_scale: 0.7,
    max_scale: 1.5,
    flex_ingredient_id: 'beef_mince_regular',
    contains_allergens: ['Dairy'],
    image_filename: 'Chilli Con Carne.png',
    plates: [
      {
        id: 'bowl',
        display_name: 'Bulking Chilli Bowl',
        description: 'Weeknight bowl of rice topped with chilli, grated cheese, sour cream, fresh avocado, and a squeeze of lime. The most reliable chilli plate.',
        base_serving_multiplier: 1.0,
        equipment_required: ['stovetop'],
        image_filename: 'Bulking Chilli Bowl.png',
        additional_ingredients: [
          {
            ingredient_id: 'basmati_rice_cooked',
            base_amount: 250,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 85g dry rice. Cook per packet directions or in a rice cooker.'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'sour_cream',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'avocado',
            base_amount: 80,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately half a small avocado.'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1,
            unit: 'tbsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'lime',
            base_amount: 0.25,
            unit: 'count',
            scaling: 'fixed',
            notes: 'One wedge, approximately 5ml juice.'
          }
        ],
        additional_instructions: [
          'Cook the rice according to packet directions, or use a rice cooker. 85g dry basmati + 170ml water on a low simmer, covered, for 12 minutes, then rest off heat 5 minutes.',
          'Reheat 1 serving of chilli in a saucepan or microwave.',
          'Pile the rice into a bowl. Ladle the chilli over the rice — generously, you want sauce flooding the rice.',
          'Top with grated cheese (the heat melts it), a dollop of sour cream, sliced or smashed avocado, and a scatter of fresh coriander leaves.',
          'Squeeze the lime wedge over everything just before eating.'
        ],
        assembly_time_minutes: 15,
        plate_macros: {
          kcal: 1263,
          protein_g: 52,
          carbs_g: 123,
          fat_g: 62,
          fiber_g: 18
        }
      },
      {
        id: 'nachos',
        display_name: 'Loaded Chilli Nachos',
        description: 'A Saturday-night stunt plate. Layer of corn chips, generous chilli, blanket of cheese baked until molten, then finished with sour cream, avocado, pickled jalapeños, spring onion, and lime.',
        is_stunt_plate: true,
        base_serving_multiplier: 1.0,
        equipment_required: ['oven'],
        additional_ingredients: [
          {
            ingredient_id: 'corn_chips',
            base_amount: 80,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately ⅓ of a 240g pack.'
          },
          {
            ingredient_id: 'cheese_tasty_grated',
            base_amount: 40,
            unit: 'g',
            scaling: 'fixed',
            notes: 'More than the bowl plate — needs to blanket the chips.'
          },
          {
            ingredient_id: 'sour_cream',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'avocado',
            base_amount: 60,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Less than the bowl plate — spreads across the surface.'
          },
          {
            ingredient_id: 'jalapenos_pickled',
            base_amount: 20,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Drained.'
          },
          {
            ingredient_id: 'spring_onion',
            base_amount: 1,
            unit: 'count',
            scaling: 'fixed',
            notes: 'Finely sliced.'
          },
          {
            ingredient_id: 'coriander_leaves_fresh',
            base_amount: 1,
            unit: 'tbsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'lime',
            base_amount: 0.25,
            unit: 'count',
            scaling: 'fixed',
            notes: 'One wedge.'
          }
        ],
        additional_instructions: [
          'Preheat the oven to 200°C.',
          'Reheat 1 serving of chilli in a small saucepan or microwave until hot.',
          'Spread the corn chips across an oven-safe dish or baking tray in a single thick layer.',
          'Spoon the hot chilli evenly over the chips — go right to the edges, you want chilli on every chip.',
          'Scatter the grated cheese over the top in an even layer.',
          'Bake for 8-10 minutes, until the cheese is fully melted and bubbling at the edges.',
          'Remove from the oven. Top immediately with dollops of sour cream, sliced or smashed avocado, scattered jalapeños, sliced spring onion, and fresh coriander.',
          'Squeeze the lime wedge over everything. Eat straight from the dish.'
        ],
        assembly_time_minutes: 18,
        plate_macros: {
          kcal: 1319,
          protein_g: 53,
          carbs_g: 94,
          fat_g: 82,
          fiber_g: 20
        },
        image_filename: 'Loaded Chilli Nachos ⚡ STUNT.png'
      }
    ],
    methods: [
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker', 'stovetop'],
        time_active_minutes: 15,
        time_total_minutes: 375,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'olive_oil',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 15g for sautéing aromatics, 15g for browning the mince.'
          },
          {
            ingredient_id: 'beef_mince_regular',
            base_amount: 1000,
            unit: 'g',
            scaling: 'scales',
            notes: 'Don\'t use lean — fat is doing real work here.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 medium onions, diced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 5,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'capsicum_red',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 large, diced.'
          },
          {
            ingredient_id: 'crushed_tomatoes_canned',
            base_amount: 1600,
            unit: 'g',
            scaling: 'scales',
            notes: 'Two 800g tins.'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 90,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 6 tbsp.'
          },
          {
            ingredient_id: 'kidney_beans_canned',
            base_amount: 400,
            unit: 'g',
            scaling: 'scales',
            notes: 'One 420g tin, drained weight approximately 250g — the recipe scales to 400g drained-equivalent. Drain and rinse before adding.'
          },
          {
            ingredient_id: 'black_beans_canned',
            base_amount: 400,
            unit: 'g',
            scaling: 'scales',
            notes: 'One 420g tin, drained weight approximately 250g. Drain and rinse before adding.'
          },
          {
            ingredient_id: 'beef_stock_cube',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Three cubes, crumbled.'
          },
          {
            ingredient_id: 'sugar_white',
            base_amount: 12,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 3 tsp. Balances tomato acidity.'
          },
          {
            ingredient_id: 'paprika_sweet',
            base_amount: 8,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ground_cumin',
            base_amount: 10,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'garlic_powder',
            base_amount: 4,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'onion_powder',
            base_amount: 4,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'oregano_dried',
            base_amount: 4,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'cayenne_pepper',
            base_amount: 2.5,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'Adjust to spice tolerance — 2 tsp for mild, 3 tsp for hot.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'water',
            base_amount: 250,
            unit: 'ml',
            scaling: 'scales'
          }
        ],
        instructions: [
          'Heat 15ml of the olive oil in a large skillet over medium-high heat. Add the onion, garlic, and capsicum. Cook 4-5 minutes until softening and slightly caramelised. Transfer to the slow cooker.',
          'Add the remaining 15ml oil to the same skillet over high heat. Add the beef mince and brown in two batches if needed — break it up with a wooden spoon as it cooks. You want proper browning, not stewing. Transfer to the slow cooker.',
          'Add to the slow cooker: crushed tomatoes, tomato paste, both drained beans, crumbled stock cubes, sugar, paprika, cumin, garlic powder, onion powder, oregano, cayenne, salt, and water. Stir well.',
          'Cook on LOW for 6 hours or HIGH for 4 hours.',
          'Taste and adjust — more cayenne for heat, more salt if needed, more sugar if too acidic. If the sauce is too liquid, prop the lid open on HIGH for 20 minutes to reduce.'
        ]
      },
      {
        id: 'stovetop',
        display_name: 'Stovetop',
        equipment_required: ['stovetop'],
        time_active_minutes: 15,
        time_total_minutes: 105,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'olive_oil',
            base_amount: 30,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 15g for sautéing aromatics, 15g for browning the mince.'
          },
          {
            ingredient_id: 'beef_mince_regular',
            base_amount: 1000,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 medium onions, diced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 5,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'capsicum_red',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 large, diced.'
          },
          {
            ingredient_id: 'crushed_tomatoes_canned',
            base_amount: 1600,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 90,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'kidney_beans_canned',
            base_amount: 400,
            unit: 'g',
            scaling: 'scales',
            notes: 'Drained weight. One 420g tin. Drain and rinse before adding.'
          },
          {
            ingredient_id: 'black_beans_canned',
            base_amount: 400,
            unit: 'g',
            scaling: 'scales',
            notes: 'Drained weight. One 420g tin. Drain and rinse before adding.'
          },
          {
            ingredient_id: 'beef_stock_cube',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Three cubes, crumbled.'
          },
          {
            ingredient_id: 'sugar_white',
            base_amount: 12,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'paprika_sweet',
            base_amount: 8,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'ground_cumin',
            base_amount: 10,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'garlic_powder',
            base_amount: 4,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'onion_powder',
            base_amount: 4,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'oregano_dried',
            base_amount: 4,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'cayenne_pepper',
            base_amount: 2.5,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1.5,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'water',
            base_amount: 375,
            unit: 'ml',
            scaling: 'scales',
            notes: 'More than the slow cooker version because stovetop reduction is real.'
          }
        ],
        instructions: [
          'Heat 15ml olive oil in a large heavy-based pot over medium-high heat. Add the onion, garlic, and capsicum. Cook 5 minutes until soft and lightly browned.',
          'Push the vegetables to one side of the pot. Add the remaining 15ml oil and the beef mince. Brown it well, breaking it up — about 5-6 minutes. Don\'t rush this; the browning is where the flavour lives.',
          'Add all the spices (paprika, cumin, garlic powder, onion powder, oregano, cayenne) and stir for 30 seconds — toasting them in the fat blooms the flavour.',
          'Add the crushed tomatoes, tomato paste, beans, stock cubes, sugar, salt, and water. Stir well.',
          'Bring to a simmer. Reduce the heat to low. Cover loosely (lid slightly ajar). Simmer gently for 1.5 hours minimum, up to 2.5 hours for the weekend version. Stir every 20 minutes. The sauce thickens and the flavour deepens with time.',
          'Taste and adjust. The sauce should be thick, glossy, and rich. If too thin, simmer uncovered for the last 15-20 minutes.'
        ]
      }
    ]
  },

  lamb_shanks: {
    slug: 'lamb_shanks',
    display_name: 'Red Wine–Braised Lamb Shanks',
    cuisine: 'australian',
    primary_protein: 'lamb',
    produces_servings: 4,
    eligible_slots: ['dinner', 'early_dinner'],
    min_scale: 0.5,
    max_scale: 1.5,
    flex_ingredient_id: 'lamb_shank',
    contains_allergens: ['Dairy'],
    image_filename: 'Red Wine Braised Lamb Shanks.png',
    plates: [
      {
        id: 'mash',
        display_name: 'Lamb Shank on Creamy Mash',
        description: 'A whole shank of meltingly tender red wine-braised lamb served on a generous bed of butter-and-cream mashed potato, with the rich braising gravy spooned generously over everything. Weekend showpiece dinner.',
        base_serving_multiplier: 1.0,
        equipment_required: ['stovetop'],
        assembly_time_minutes: 25,
        additional_ingredients: [
          {
            ingredient_id: 'baking_potato',
            base_amount: 300,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 1 large or 2 medium. Sebago or Coliban for fluffy mash — don\'t use Desiree, it\'s too waxy.'
          },
          {
            ingredient_id: 'butter_salted',
            base_amount: 25,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 50,
            unit: 'ml',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 30,
            unit: 'ml',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'parsley_flat_leaf',
            base_amount: 3,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Finely chopped, for garnish.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For seasoning the mash.'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.125,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For seasoning the mash.'
          }
        ],
        additional_instructions: [
          'Peel the potato and cut into 3cm chunks. Place in a large saucepan, cover with cold water, and add a generous pinch of salt. Bring to a boil and cook 15-18 minutes until a knife slides in with no resistance.',
          'Drain the potatoes thoroughly, then return them to the empty hot saucepan. Leave for 30 seconds — this steams off excess moisture and gives you fluffier mash.',
          'Add the butter, cream, and milk. Mash until smooth (or use a potato ricer if you want it silky). Season generously with salt and pepper. Taste and adjust.',
          'Pile the hot mash into a wide shallow bowl. Make a slight well in the middle.',
          'Place the lamb shank on top of the mash. Spoon a generous amount of the reduced red wine sauce over the shank and onto the mash — the sauce should pool around the base.',
          'Scatter the chopped parsley over the top. Serve immediately.'
        ],
        plate_macros: {
          kcal: 1417,
          protein_g: 57,
          carbs_g: 80,
          fat_g: 90,
          fiber_g: 12
        },
        image_filename: 'Lamb Shank on Creamy Mash.png'
      }
    ],
    methods: [
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker', 'stovetop'],
        time_active_minutes: 25,
        time_total_minutes: 505,
        skill_min: 3,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'lamb_shank',
            base_amount: 4,
            unit: 'count',
            scaling: 'scales',
            notes: 'Approximately 400g each. Ask for French-trimmed if you want the bone exposed nicely.'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 45,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 30g for searing the shanks, 15g for sautéing the vegetables.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 150,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 medium, finely diced.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 3,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'carrot',
            base_amount: 130,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 large, finely diced (about 1 cup).'
          },
          {
            ingredient_id: 'celery',
            base_amount: 100,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 stalks, finely diced (about 1 cup).'
          },
          {
            ingredient_id: 'red_wine_cooking',
            base_amount: 625,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Full-bodied — cabernet sauvignon, merlot, or shiraz. Don\'t use expensive wine; cleanskins are fine.'
          },
          {
            ingredient_id: 'crushed_tomatoes_canned',
            base_amount: 800,
            unit: 'g',
            scaling: 'scales',
            notes: 'One 800g tin.'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'chicken_stock_liquid',
            base_amount: 500,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'thyme_fresh',
            base_amount: 5,
            unit: 'count',
            scaling: 'fixed',
            notes: '5 sprigs, tied together for easy removal. Substitute 2 tsp dried thyme if unavailable.'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 2,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Pat the shanks dry with paper towel. Season generously with salt and pepper.',
          'Heat 30ml of the olive oil in a large heavy skillet over high heat. Sear the shanks in two batches until well-browned all over — about 5 minutes per batch. Don\'t rush this; the colour is where the flavour comes from. Transfer browned shanks to the slow cooker.',
          'Drain any excess fat from the skillet. Drop the heat to medium-low. Add the remaining 15ml oil.',
          'Add the onion and garlic; cook 2 minutes. Add the carrot and celery; cook 5 minutes until the onion is translucent and starting to sweeten.',
          'Pour in the red wine. Bring to a simmer, scraping all the brown bits off the bottom of the pan into the wine — this is the fond, every bit of it matters. Simmer 2-3 minutes to cook off some of the alcohol.',
          'Add the crushed tomatoes, tomato paste, chicken stock, thyme, and bay leaves. Stir well and bring to a simmer.',
          'Pour the entire braising liquid into the slow cooker over the shanks. The shanks should be mostly submerged — squeeze them in to fit if needed.',
          'Cook on LOW for 8 hours. The meat should be fall-off-the-bone tender.',
          'Carefully remove the shanks (they\'re delicate when done — use two spoons). Strain the sauce into a saucepan, discarding the solids for a clean sauce or leaving the carrot and celery in for a rustic finish. Simmer on the stovetop for 10-15 minutes to reduce to a thick, glossy gravy.',
          'Return the shanks to the reduced sauce to warm through before serving.'
        ]
      },
      {
        id: 'oven_braise',
        display_name: 'Oven-Braise',
        equipment_required: ['oven', 'stovetop'],
        time_active_minutes: 25,
        time_total_minutes: 175,
        skill_min: 3,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'lamb_shank',
            base_amount: 4,
            unit: 'count',
            scaling: 'scales'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 45,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 30g for searing, 15g for sautéing the vegetables.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 150,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 3,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'carrot',
            base_amount: 130,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 large, finely diced.'
          },
          {
            ingredient_id: 'celery',
            base_amount: 100,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 stalks, finely diced.'
          },
          {
            ingredient_id: 'red_wine_cooking',
            base_amount: 625,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'crushed_tomatoes_canned',
            base_amount: 800,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'chicken_stock_liquid',
            base_amount: 500,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'thyme_fresh',
            base_amount: 5,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 2,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Preheat the oven to 180°C.',
          'Pat the shanks dry. Season with salt and pepper.',
          'Heat 30ml olive oil in a large Dutch oven over high heat. Sear the shanks in two batches until browned all over, 5 minutes per batch. Set aside on a plate.',
          'Drain the fat. Drop the heat to medium-low. Add the remaining 15ml oil.',
          'Add the onion and garlic; cook 2 minutes. Add the carrot and celery; cook 5 minutes.',
          'Pour in the red wine. Bring to a simmer, scraping the fond. Simmer 2-3 minutes.',
          'Add the crushed tomatoes, tomato paste, chicken stock, thyme, and bay leaves. Stir. Return the shanks to the pot, squeezing them in so they\'re mostly submerged.',
          'Bring the liquid to a simmer. Cover with the lid. Transfer to the oven for 2 hours covered.',
          'Remove the lid. Return to the oven for another 30 minutes uncovered. This finishes reducing the sauce and gives the shanks a beautiful crust.',
          'Remove from the oven. Carefully transfer the shanks to a plate. If the sauce needs more reduction, simmer on the stovetop for 5-10 minutes.'
        ]
      }
    ]
  },

  beef_stew: {
    slug: 'beef_stew',
    display_name: 'Red Wine Beef Stew',
    cuisine: 'australian',
    primary_protein: 'beef',
    produces_servings: 6,
    eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
    min_scale: 0.7,
    max_scale: 1.5,
    flex_ingredient_id: 'beef_chuck',
    contains_allergens: ['Dairy', 'Gluten/Wheat', 'Fish'],
    image_filename: 'Slow-Cooked Beef Stew.png',
    plates: [
      {
        id: 'mash',
        display_name: 'Beef Stew on Creamy Mash',
        description: 'A generous bowl of rich, fall-apart beef stew served on a bed of butter-and-cream mashed potato. The classic Sunday-dinner plate.',
        base_serving_multiplier: 1.0,
        equipment_required: ['stovetop'],
        assembly_time_minutes: 25,
        additional_ingredients: [
          {
            ingredient_id: 'baking_potato',
            base_amount: 300,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 1 large or 2 medium. Sebago or Coliban for fluffy mash.'
          },
          {
            ingredient_id: 'butter_salted',
            base_amount: 25,
            unit: 'g',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'thickened_cream',
            base_amount: 50,
            unit: 'ml',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'full_cream_milk',
            base_amount: 30,
            unit: 'ml',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'parsley_flat_leaf',
            base_amount: 3,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Finely chopped, for garnish.'
          },
          {
            ingredient_id: 'salt',
            base_amount: 0.25,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For seasoning the mash.'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.125,
            unit: 'tsp',
            scaling: 'fixed',
            notes: 'For seasoning the mash.'
          }
        ],
        additional_instructions: [
          'Peel the potato and cut into 3cm chunks. Place in a saucepan, cover with cold water, and salt generously. Boil 15-18 minutes until knife-tender.',
          'Drain thoroughly, return to the hot empty saucepan, and leave for 30 seconds to steam off moisture.',
          'Add the butter, cream, and milk. Mash until smooth. Season with salt and pepper.',
          'Pile the mash into a wide shallow bowl. Make a small well in the centre.',
          'Ladle a generous portion of stew over and around the mash — make sure plenty of sauce hits the mash.',
          'Scatter parsley over the top.'
        ],
        plate_macros: {
          kcal: 1288,
          protein_g: 52,
          carbs_g: 87,
          fat_g: 77,
          fiber_g: 11
        },
        image_filename: 'Beef Stew on Creamy Mash.png'
      },
      {
        id: 'bread',
        display_name: 'Beef Stew with Crusty Bread',
        description: 'A generous bowl of stew with a thick wedge of crusty sourdough or baguette on the side — perfect for mopping up every last drop of gravy. The weeknight version. No mash work required.',
        base_serving_multiplier: 1.0,
        assembly_time_minutes: 5,
        additional_ingredients: [
          {
            ingredient_id: 'sourdough_crusty',
            base_amount: 80,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Approximately 2 thick slices.'
          },
          {
            ingredient_id: 'butter_salted',
            base_amount: 10,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For the bread.'
          },
          {
            ingredient_id: 'parsley_flat_leaf',
            base_amount: 3,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Finely chopped, for garnish.'
          }
        ],
        additional_instructions: [
          'Reheat 1 serving of stew in a saucepan or microwave until piping hot.',
          'Slice the bread into 2 thick slices. Optionally warm in a 180°C oven for 3-4 minutes, or briefly under the grill, until just crisp on the outside.',
          'Ladle stew into a wide bowl. Scatter parsley over the top.',
          'Spread butter on the bread. Serve alongside.',
          'Eat by dipping the bread into the gravy as you go.'
        ],
        plate_macros: {
          kcal: 977,
          protein_g: 52,
          carbs_g: 76,
          fat_g: 48,
          fiber_g: 7
        },
        image_filename: 'Beef Stew with Crusty Bread.png'
      }
    ],
    methods: [
      {
        id: 'slow_cooker',
        display_name: 'Slow Cooker',
        equipment_required: ['slow_cooker', 'stovetop'],
        time_active_minutes: 25,
        time_total_minutes: 505,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'beef_chuck',
            base_amount: 1200,
            unit: 'g',
            scaling: 'scales',
            notes: 'Cut into 3.5cm cubes. Ask the butcher for it pre-cubed if you\'re rushed.'
          },
          {
            ingredient_id: 'flour_plain',
            base_amount: 50,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For dusting the beef. Approximately ⅓ cup.'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 45,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 30g for browning, 15g for sautéing the vegetables.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 250,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 1 large, halved and sliced 1cm thick.'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 4,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'carrot',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 3 medium, cut into 2.5cm chunks on the diagonal.'
          },
          {
            ingredient_id: 'celery',
            base_amount: 150,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 stalks, cut into 2.5cm chunks.'
          },
          {
            ingredient_id: 'mushroom_brown',
            base_amount: 250,
            unit: 'g',
            scaling: 'scales',
            notes: 'Halved. Optional but recommended for depth of flavour.'
          },
          {
            ingredient_id: 'potato_baby_chat',
            base_amount: 400,
            unit: 'g',
            scaling: 'scales',
            notes: 'Halved, skins on.'
          },
          {
            ingredient_id: 'red_wine_cooking',
            base_amount: 500,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Full-bodied — cabernet sauvignon, merlot, or shiraz. Discount bottles are fine.'
          },
          {
            ingredient_id: 'beef_stock_liquid',
            base_amount: 750,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Salt-reduced preferred. Campbell\'s Real Stock or Massel.'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 tbsp.'
          },
          {
            ingredient_id: 'worcestershire_sauce',
            base_amount: 10,
            unit: 'ml',
            scaling: 'scales',
            notes: 'Approximately 2 tsp.'
          },
          {
            ingredient_id: 'thyme_fresh',
            base_amount: 4,
            unit: 'count',
            scaling: 'fixed',
            notes: '4 sprigs, tied together for easy removal. Substitute 1 tsp dried thyme if unavailable.'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 2,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Pat the beef cubes dry with paper towel. Season with the salt and pepper. Place the beef and flour in a large zip-top bag or bowl and toss to coat evenly. Shake off the excess.',
          'Heat 30g olive oil in a large heavy skillet over high heat — get it properly hot. Brown the beef aggressively in 2-3 batches, about 1.5 minutes per side. Don\'t crowd the pan; you want crust, not steam. Transfer browned beef to the slow cooker.',
          'Drain the excess fat from the skillet. Drop the heat to medium-low. Add the remaining 15g oil.',
          'Add the onion and garlic; cook 3 minutes. Add the carrot and celery; cook 4 minutes until softening at the edges. Transfer to the slow cooker.',
          'Pour the red wine into the still-hot skillet. Bring to a vigorous simmer, scraping all the brown bits off the bottom of the pan (the fond). Simmer 2 minutes to cook off some alcohol and reduce slightly.',
          'Pour the wine into the slow cooker. Add the beef stock, tomato paste, Worcestershire sauce, thyme, and bay leaves. Stir.',
          'Add the mushrooms and baby potatoes on top. Push down so everything is mostly submerged in liquid.',
          'Cook on LOW for 8 hours or HIGH for 5 hours. Beef should be fork-tender and falling apart.',
          'Optional finishing reduction: if the sauce is thinner than you want (slow cookers vary), ladle the liquid into a saucepan and simmer 10-15 minutes to reduce. Or remove the lid for the last 30 minutes on HIGH.',
          'Discard the bay leaves and thyme sprigs before serving.'
        ]
      },
      {
        id: 'oven_braise',
        display_name: 'Oven-Braise',
        equipment_required: ['oven', 'stovetop'],
        time_active_minutes: 25,
        time_total_minutes: 165,
        skill_min: 2,
        shortcut_level: 'scratch',
        ingredients: [
          {
            ingredient_id: 'beef_chuck',
            base_amount: 1200,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'flour_plain',
            base_amount: 50,
            unit: 'g',
            scaling: 'fixed',
            notes: 'For dusting the beef. Approximately ⅓ cup.'
          },
          {
            ingredient_id: 'olive_oil',
            base_amount: 45,
            unit: 'g',
            scaling: 'fixed',
            notes: 'Split: 30g for browning, 15g for sautéing the vegetables.'
          },
          {
            ingredient_id: 'brown_onion',
            base_amount: 250,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'garlic_clove',
            base_amount: 4,
            unit: 'cloves',
            scaling: 'scales',
            notes: 'Minced.'
          },
          {
            ingredient_id: 'carrot',
            base_amount: 300,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 3 medium, cut into 2.5cm chunks.'
          },
          {
            ingredient_id: 'celery',
            base_amount: 150,
            unit: 'g',
            scaling: 'scales',
            notes: 'Approximately 2 stalks, cut into 2.5cm chunks.'
          },
          {
            ingredient_id: 'mushroom_brown',
            base_amount: 250,
            unit: 'g',
            scaling: 'scales',
            notes: 'Halved.'
          },
          {
            ingredient_id: 'potato_baby_chat',
            base_amount: 400,
            unit: 'g',
            scaling: 'scales',
            notes: 'Halved, skins on.'
          },
          {
            ingredient_id: 'red_wine_cooking',
            base_amount: 500,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'beef_stock_liquid',
            base_amount: 750,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'tomato_paste',
            base_amount: 30,
            unit: 'g',
            scaling: 'scales'
          },
          {
            ingredient_id: 'worcestershire_sauce',
            base_amount: 10,
            unit: 'ml',
            scaling: 'scales'
          },
          {
            ingredient_id: 'thyme_fresh',
            base_amount: 4,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'bay_leaves_dried',
            base_amount: 2,
            unit: 'count',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'salt',
            base_amount: 1,
            unit: 'tsp',
            scaling: 'fixed'
          },
          {
            ingredient_id: 'black_pepper_ground',
            base_amount: 0.5,
            unit: 'tsp',
            scaling: 'fixed'
          }
        ],
        instructions: [
          'Preheat the oven to 160°C.',
          'Pat the beef cubes dry. Season with salt and pepper. Toss with the flour to coat; shake off the excess.',
          'Heat 30g olive oil in a large Dutch oven over high heat. Brown the beef in 2-3 batches, 1.5 minutes per side. Transfer to a plate.',
          'Drain the excess fat. Drop the heat to medium-low. Add the remaining 15g oil. Sauté the onion and garlic for 3 minutes; add the carrot and celery, cook another 4 minutes.',
          'Pour in the red wine. Simmer 2 minutes, scraping the fond.',
          'Add the beef stock, tomato paste, Worcestershire sauce, thyme, and bay leaves. Stir.',
          'Return the beef to the pot with any juices. Add the mushrooms and potatoes. The liquid should cover everything.',
          'Bring to a simmer on the stovetop. Cover and transfer to the oven for 1.5 hours.',
          'Uncover and return to the oven for another 30 minutes to reduce and thicken the sauce. Total oven time: 2 hours.',
          'Check the beef is fork-tender. If not quite there, return covered for another 20 minutes.',
          'Discard the bay leaves and thyme sprigs before serving.'
        ]
      }
    ]
  }
};