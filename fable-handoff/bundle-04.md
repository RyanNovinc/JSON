# JSON.fit — meal / nutrition data layer handoff

**Part 4 of 5.** Read all 5 parts in order: bundle-01.md, bundle-02.md, bundle-03.md, bundle-04.md, bundle-05.md.

Generated read-only from branch `feature/file-import`. Order: type definitions → ingredient
database → meal data → runtime consumers → UI.

**Secrets:** every file was scanned for API keys, tokens and secrets before inclusion.
No secrets were found in any bundled file, so nothing was redacted.

**Read this first — three facts that will otherwise mislead you:**
1. An ingredient table exists (`src/data/ingredients.ts`, 195 rows) but it carries **no macros and
   no unit→gram conversions**. It is a shopping/dietary registry, not a nutrition database. Macros
   exist **only** as `plate_macros` precomputed per meal in `curated_meals.ts`.
2. `src/utils/ingredientScaling.ts` **deliberately ignores** the per-row
   `scaling: 'scales' | 'fixed' | 'flex'` field (see its header comment). Scaling is uniform across
   the plate. `flex_ingredient_id` is read **only** by the boot validator.
3. `CURATED_MEALS` is a static ES import — it is **compiled into the app bundle**, not fetched from
   json.fit at runtime.

---

---

# 5. UI (cont.)

## FILE: src/screens/RecipeDetailScreen.tsx  (860 lines)

```tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { INGREDIENTS } from '../data/ingredients';
import {
  CuratedMeal,
  Plate,
  CookingMethod,
  MealIngredient,
  RecipeStep,
} from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';
import { RecipeFavorites } from '../utils/recipeFavorites';
import { clampCookPortions } from '../utils/cookPortions';
import { displayIngredient } from '../utils/ingredientScaling';

type RecipeDetailRoute = RouteProp<RootStackParamList, 'RecipeDetail'>;
type RecipeDetailNav = StackNavigationProp<RootStackParamList, 'RecipeDetail'>;

// ============================================================================
// Helpers
// ============================================================================

function getIngredientName(ingredientId: string): string {
  const ing = (INGREDIENTS as any)[ingredientId];
  return ing?.display_name ?? ingredientId;
}

function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getMethodIcon(methodId: string): keyof typeof Ionicons.glyphMap {
  const id = methodId.toLowerCase();
  if (id.includes('slow_cooker')) return 'time-outline';
  if (id.includes('pressure_cooker') || id.includes('instant_pot')) return 'flash-outline';
  if (id.includes('oven')) return 'bonfire-outline';
  if (id.includes('jar') || id.includes('shortcut')) return 'flask-outline';
  if (id.includes('blender') || id.includes('smoothie')) return 'cafe-outline';
  if (id.includes('stovetop') || id.includes('pan') || id.includes('fry')) return 'flame-outline';
  return 'restaurant-outline';
}

function getMethodDescriptor(method: CookingMethod): string {
  const id = method.id.toLowerCase();
  const shortcut = method.shortcut_level as any;

  if (id.includes('slow_cooker')) return 'Hands-off · set & forget';
  if (id.includes('pressure_cooker') || id.includes('instant_pot')) return 'Fast pressure cook';
  if (id.includes('oven')) return 'Hands-off · oven roasted';

  if (shortcut === 'authentic' || shortcut === 'scratch' || shortcut === 'from_scratch') return 'Best flavour · more effort';
  if (shortcut === 'shortcut' || shortcut === 'jar') return 'Quickest · weeknight';
  if (shortcut === 'balanced') return 'Balanced · everyday';

  return 'Standard method';
}

/**
 * Defensive accessor for step summary text.
 * Handles both new format ({summary, substeps}), intermediate ({text, ingredients_used}),
 * and old format (raw string) for backward compatibility during migration.
 */
function getStepSummary(step: any): string {
  if (typeof step === 'string') return step;
  return step?.summary ?? step?.text ?? '';
}

// ============================================================================
// Component
// ============================================================================
export default function RecipeDetailScreen() {
  const navigation = useNavigation<RecipeDetailNav>();
  const route = useRoute<RecipeDetailRoute>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const { mealSlug } = route.params;
  const meal: CuratedMeal | undefined = (CURATED_MEALS as any)[mealSlug];

  // Optional plan scale — when opened from a plan-day meal, that occurrence is
  // "plate macros × scale_factor" (e.g. 0.85 → a 680 kcal serving of an 800
  // kcal plate). We multiply the macro panel and ingredient amounts by this so
  // the screen matches the day card. Absent / invalid → 1.0, so favourites,
  // shared links, and meal-prep opens show the base recipe unchanged.
  const planScale = (() => {
    const s = Number((route.params as any).scaleFactor);
    return Number.isFinite(s) && s > 0 ? s : 1;
  })();

  // Optional plate to pre-select — e.g. when opened from a logged "Burger"
  // plating, land on that plate rather than the recipe's default.
  const initialPlateIndex = (() => {
    const pid = (route.params as any)?.plateId;
    if (pid && meal?.plates) {
      const idx = meal.plates.findIndex((p) => p.id === pid);
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  const [selectedPlateIndex, setSelectedPlateIndex] = useState(initialPlateIndex);
  const [selectedMethodIndex, setSelectedMethodIndex] = useState(0);
  // Optional servings to pre-set — e.g. deep-linked from a Meal-Prep Session
  // "Cook N servings" card. Clamped to the cook-flow portion range; absent → 1.
  const [servings, setServings] = useState(() =>
    clampCookPortions((route.params as any).servings)
  );
  const [ingredientsExpanded, setIngredientsExpanded] = useState(true);
  // Instructions collapsed by default. This screen is decide + shop; the
  // CookMode flow ("Start cooking") owns the step-by-step execution, so the
  // full method here was just a second copy. The "N steps · ~time" meta stays
  // visible as the effort cue, and one tap reveals the steps for anyone who
  // wants to pre-read.
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Read favourite state whenever the screen gains focus OR the selected plate
  // changes, so the heart reflects the *currently selected plating* (each plate
  // is favourited independently). Keyed on mealSlug + selectedPlateIndex; both
  // are defined even if the meal lookup below fails, so hook order stays stable
  // regardless of the early return.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const plateId = meal?.plates?.[selectedPlateIndex]?.id;
      RecipeFavorites.isPlateFavorite(mealSlug, plateId).then((fav) => {
        if (active) setIsFavorite(fav);
      });
      return () => {
        active = false;
      };
    }, [mealSlug, selectedPlateIndex])
  );

  const imageSource = useMemo(() => {
    if (!meal) return undefined;
    const p = meal.plates[selectedPlateIndex];
    const plateImg = p?.image_filename ? getMealImage(p.image_filename) : undefined;
    if (plateImg) return plateImg;
    return getMealImage(meal.image_filename);
  }, [meal, selectedPlateIndex]);

  if (!meal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, padding: 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', marginTop: 60, fontSize: 18 }}>Recipe not found.</Text>
      </View>
    );
  }

  const plate: Plate = meal.plates[selectedPlateIndex];
  const method: CookingMethod = meal.methods[selectedMethodIndex];


  const macros = plate.plate_macros;
  // Macro panel reflects the planned serving: base plate macros × planScale.
  // planScale is 1 for un-scaled opens, so these equal the raw plate macros.
  const dispProtein = Math.round(macros.protein_g * planScale);
  const dispCarbs = Math.round(macros.carbs_g * planScale);
  const dispFat = Math.round(macros.fat_g * planScale);
  const dispKcal = Math.round(macros.kcal * planScale);
  const showPlateSwitcher = meal.plates.length > 1;
  const showMethodPicker = meal.methods.length > 1;

  const baseSteps = method.instructions.length;
  const plateSteps = plate.additional_instructions.length;
  const totalSteps = baseSteps + plateSteps;

  const handleStartCooking = () => {
    navigation.navigate('CookMode', {
      mealSlug: meal.slug,
      plateIndex: selectedPlateIndex,
      methodIndex: selectedMethodIndex,
      // Carry the cook amount through so CookMode's in-step quantities match
      // this screen. CookMode must multiply ingredient amounts by
      // (servings × scaleFactor), same as IngredientRow does here.
      servings,
      scaleFactor: planScale,
    } as any);
  };

  // Optimistic toggle: flip the heart immediately, persist the *selected plate*
  // in the background, and revert if the write fails. No popup — instant fill
  // is the feedback.
  const handleToggleFavorite = async () => {
    setIsFavorite((prev) => !prev);
    try {
      await RecipeFavorites.togglePlateFavorite(mealSlug, plate.id);
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
      setIsFavorite((prev) => !prev);
    }
  };

  const handleShare = async () => {
    try {
      const url = `https://json.fit/r/?meal=${meal.slug}&plate=${plate.id}`;
      const caption = `${plate.display_name} — ${macros.kcal} cal, ${macros.protein_g}g protein`;
      await Share.share(
        Platform.OS === 'ios'
          ? { message: caption, url }
          : { message: `${caption}\n\n${url}` }
      );
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO IMAGE */}
        <View style={[styles.heroWrap, { paddingTop: insets.top }]}>
          {imageSource ? (
            <Image source={imageSource} style={styles.heroImage16x9} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage16x9, styles.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={40} color="#52525b" />
            </View>
          )}
          <TouchableOpacity
            style={[styles.headerBackBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerShareBtn, { top: insets.top + 8 }]}
            onPress={handleShare}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Share recipe"
          >
            <Ionicons name="share-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerHeartBtn, { top: insets.top + 8 }]}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? themeColor : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* TITLE BLOCK */}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {plate.display_name}
          </Text>
          <Text style={styles.subtitle}>
            {meal.cuisine}
            {showPlateSwitcher ? ` · ${meal.plates.length} ways to plate` : ''}
          </Text>
        </View>

        {/* PLATE SWITCHER */}
        {showPlateSwitcher && (
          <View style={styles.sectionPad}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>SERVE AS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {meal.plates.map((p, i) => {
                const isActive = i === selectedPlateIndex;
                const isStunt = p.is_stunt_plate;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPlateIndex(i)}
                    activeOpacity={0.7}
                    style={[
                      styles.pill,
                      isActive && !isStunt && { backgroundColor: themeColor, borderColor: themeColor },
                      isActive && isStunt && styles.pillActiveStunt,
                      !isActive && isStunt && styles.pillInactiveStunt,
                    ]}
                  >
                    {isStunt && (
                      <Text style={[
                        styles.pillStuntBolt,
                        { color: isActive ? '#0a0a0b' : '#f59e0b' },
                      ]}>⚡</Text>
                    )}
                    <Text
                      style={[
                        styles.pillText,
                        isActive && !isStunt && { color: '#0a0a0b', fontWeight: '600' },
                        isActive && isStunt && { color: '#f59e0b', fontWeight: '600' },
                        !isActive && isStunt && { color: '#f59e0b' },
                      ]}
                    >
                      {p.display_name.split(' ').slice(0, 3).join(' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* PER PORTION label */}
        <Text style={[styles.macroEyebrow, { color: themeColor }]}>PER PORTION</Text>

        {/* MACRO GRID */}
        <View style={styles.macroGrid}>
          <View style={styles.macroCell}>
            <Text style={[styles.macroValue, { color: themeColor }]}>{dispProtein}g</Text>
            <Text style={styles.macroLabel}>PROTEIN</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroCell}>
            <Text style={styles.macroValueMuted}>{dispCarbs}g</Text>
            <Text style={styles.macroLabel}>CARBS</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroCell}>
            <Text style={styles.macroValueMuted}>{dispFat}g</Text>
            <Text style={styles.macroLabel}>FAT</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroCell}>
            <Text style={styles.macroValueMuted}>{dispKcal}</Text>
            <Text style={styles.macroLabel}>KCAL</Text>
          </View>
        </View>

        {/* PLATE DESCRIPTION */}
        {plate.description && (
          <View style={styles.sectionPad}>
            <Text style={styles.description}>{plate.description}</Text>
          </View>
        )}

        {/* METHOD PICKER + SERVINGS */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>
              {showMethodPicker ? 'METHOD' : 'TIME'}
            </Text>
            {/* Portions is the integer batch-cook count. Hidden when the meal
                is shown at a plan scale (≠ 1): "1 portion" would read as the
                base serving, but the macros above are already the scaled
                serving, so the count would mislead. Base / favourite / meal-prep
                opens (scale == 1) keep it. */}
            {planScale === 1 && (
              <View style={styles.servingsControl}>
                <Text style={styles.servingsLabel}>Portions</Text>
                <TouchableOpacity
                  style={styles.servingsBtn}
                  onPress={() => setServings(clampCookPortions(servings - 1))}
                  activeOpacity={0.6}
                >
                  <Ionicons name="remove" size={12} color="#a1a1aa" />
                </TouchableOpacity>
                <Text style={styles.servingsValue}>{servings}</Text>
                <TouchableOpacity
                  style={styles.servingsBtn}
                  onPress={() => setServings(clampCookPortions(servings + 1))}
                  activeOpacity={0.6}
                >
                  <Ionicons name="add" size={12} color="#a1a1aa" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {showMethodPicker ? (
            <View style={styles.methodList}>
              {meal.methods.map((m, i) => {
                const isActive = i === selectedMethodIndex;
                const iconName = getMethodIcon(m.id);
                const descriptor = getMethodDescriptor(m);
                const cleanName = m.display_name.includes('(')
                  ? `${m.display_name.split(' (')[0]}, ${m.display_name.split(' (')[1].replace(')', '').toLowerCase()}`
                  : m.display_name;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodRow,
                      isActive && {
                        borderColor: themeColor,
                        backgroundColor: themeColor + '14',
                      },
                    ]}
                    onPress={() => setSelectedMethodIndex(i)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.methodIconWrap}>
                      <Ionicons
                        name={iconName}
                        size={18}
                        color={isActive ? themeColor : '#71717a'}
                      />
                    </View>
                    <View style={styles.methodMiddle}>
                      <Text
                        style={[styles.methodName, isActive && { color: '#fff' }]}
                        numberOfLines={1}
                      >
                        {cleanName}
                      </Text>
                      <Text style={styles.methodDescriptor} numberOfLines={1}>
                        {descriptor}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.methodTime,
                        isActive && { color: themeColor, fontWeight: '700' },
                      ]}
                    >
                      {formatTime(m.time_total_minutes)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.singleMethodTime}>
              {method.display_name} · {formatTime(method.time_total_minutes)}
            </Text>
          )}
        </View>

        {/* INGREDIENTS */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>INGREDIENTS</Text>
            <TouchableOpacity
              onPress={() => setIngredientsExpanded(!ingredientsExpanded)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons
                name={ingredientsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#71717a"
              />
            </TouchableOpacity>
          </View>

          {ingredientsExpanded && (
            <>
              {plate.additional_ingredients.length > 0 && (
                <Text style={styles.subEyebrow}>FOR THE BASE</Text>
              )}
              {method.ingredients.map((ing, i) => (
                <IngredientRow
                  key={`base-${ing.ingredient_id}-${i}`}
                  ingredient={ing}
                  producesServings={meal.produces_servings}
                  portions={servings}
                  planScale={planScale}
                />
              ))}

              {plate.additional_ingredients.length > 0 && (
                <>
                  <Text style={[styles.subEyebrow, { marginTop: 16 }]}>TO PLATE IT UP</Text>
                  {plate.additional_ingredients.map((ing, i) => (
                    <IngredientRow
                      key={`plate-${ing.ingredient_id}-${i}`}
                      ingredient={ing}
                      producesServings={1}
                      portions={servings}
                      planScale={planScale}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* INSTRUCTIONS — collapsed by default; CookMode owns the step-by-step.
            Tappable header mirrors the INGREDIENTS accordion. The reserve note
            stays OUTSIDE the collapse: it's a before-you-start warning. */}
        <View style={styles.sectionPad}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setInstructionsExpanded(!instructionsExpanded)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.eyebrow, { color: themeColor }]}>INSTRUCTIONS</Text>
            <View style={styles.sectionMetaRow}>
              <Text style={styles.sectionMeta}>
                {totalSteps} steps · ~{formatTime(method.time_total_minutes + (plate.assembly_time_minutes ?? 0))}
              </Text>
              <Ionicons
                name={instructionsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#71717a"
              />
            </View>
          </TouchableOpacity>

          {plate.reserve_before_finishing_note && (
            <View style={styles.reserveNote}>
              <Ionicons name="information-circle" size={14} color="#f59e0b" style={{ marginTop: 1 }} />
              <Text style={styles.reserveNoteText}>
                {plate.reserve_before_finishing_note}
              </Text>
            </View>
          )}

          {instructionsExpanded && (
            <>
              {plate.additional_instructions.length > 0 && (
                <Text style={styles.subEyebrow}>COOK THE BASE</Text>
              )}
              {method.instructions.map((step, i) => (
                <View key={`base-step-${i}`} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { borderColor: themeColor + '4D', backgroundColor: themeColor + '1A' }]}>
                    <Text style={[styles.stepNumberText, { color: themeColor }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{getStepSummary(step)}</Text>
                </View>
              ))}

              {plate.additional_instructions.length > 0 && (
                <>
                  <Text style={[styles.subEyebrow, { marginTop: 16 }]}>PLATE IT UP</Text>
                  {plate.additional_instructions.map((step, i) => (
                    <View key={`plate-step-${i}`} style={styles.stepRow}>
                      <View style={[styles.stepNumber, { borderColor: themeColor + '4D', backgroundColor: themeColor + '1A' }]}>
                        <Text style={[styles.stepNumberText, { color: themeColor }]}>{baseSteps + i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{getStepSummary(step)}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* STICKY BOTTOM CTA */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
          onPress={handleStartCooking}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={16} color="#0a0a0b" />
          <Text style={styles.ctaText}>
            {meal.cuisine === 'smoothie' ? 'Start blending' : 'Start cooking'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// IngredientRow
// ============================================================================
function IngredientRow({
  ingredient,
  producesServings,
  portions,
  planScale,
}: {
  ingredient: MealIngredient;
  producesServings: number;
  portions: number;
  planScale: number;
}) {
  const name = getIngredientName(ingredient.ingredient_id);
  // displayIngredient returns the QUANTITY string only (uniform scaling, unit-class
  // rounding, plus pinch / batch-aromatic / fractional handling). The name is rendered
  // separately, and the two-column layout keeps a "(for the batch)" tag in the amount
  // column, so it never reads as "3 (for the batch) bay leaves".
  const qty = displayIngredient({
    baseAmount: ingredient.base_amount,
    unit: ingredient.unit,
    producesServings,
    portions,
    planScale,
  });

  return (
    <View style={styles.ingredientRow}>
      <Text style={styles.ingredientName}>{name}</Text>
      <Text style={styles.ingredientAmount}>{qty}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },

  heroWrap: { width: '100%', backgroundColor: '#000', position: 'relative' },
  heroImage16x9: { 
    width: '100%', 
    height: 220,
    backgroundColor: 'blue',
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272a' },
  headerBackBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerShareBtn: {
    position: 'absolute',
    right: 56,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHeartBtn: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleBlock: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14 },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitle: { color: '#71717a', fontSize: 12 },

  sectionPad: { paddingHorizontal: 18, marginBottom: 22 },

  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, marginBottom: 10 },
  subEyebrow: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionMeta: { color: '#71717a', fontSize: 11 },
  sectionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  pillRow: { gap: 8, paddingBottom: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: 'transparent',
  },
  pillActiveStunt: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  pillInactiveStunt: {
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  pillStuntBolt: { fontSize: 10 },
  pillText: { color: '#a1a1aa', fontSize: 12 },

  macroEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  macroGrid: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingVertical: 14,
    marginHorizontal: 18,
    marginBottom: 22,
  },
  macroCell: { flex: 1, alignItems: 'center' },
  macroDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#27272a' },
  macroValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, lineHeight: 20 },
  macroValueMuted: {
    color: '#d4d4d8',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  macroLabel: { color: '#71717a', fontSize: 9, marginTop: 4, letterSpacing: 0.4 },

  description: { color: '#a1a1aa', fontSize: 13, lineHeight: 19 },

  methodList: { gap: 8 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: 'transparent',
    gap: 12,
  },
  methodIconWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  methodMiddle: { flex: 1 },
  methodName: { color: '#a1a1aa', fontSize: 13, fontWeight: '500' },
  methodDescriptor: { color: '#52525b', fontSize: 10, marginTop: 2 },
  methodTime: { color: '#71717a', fontSize: 13 },

  singleMethodTime: { color: '#a1a1aa', fontSize: 13 },

  servingsControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  servingsLabel: { color: '#71717a', fontSize: 11 },
  servingsBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    minWidth: 14,
    textAlign: 'center',
  },

  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  ingredientName: { color: '#fff', fontSize: 13, flex: 1, paddingRight: 12 },
  ingredientAmount: { color: '#71717a', fontSize: 13 },

  reserveNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  reserveNoteText: { color: '#fbbf24', fontSize: 12, lineHeight: 18, flex: 1 },

  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: { fontSize: 11, fontWeight: '600' },
  stepText: { color: '#d1d5db', fontSize: 13, lineHeight: 20, flex: 1 },

  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: { color: '#0a0a0b', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
});
```

## FILE: src/screens/CookModeScreen.tsx  (1399 lines)

```tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import {
  useCookTimers,
  formatRemaining,
  formatEndTime,
  ActiveCookTimer,
} from '../contexts/CookTimerContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { MEAL_SUBSTEPS } from '../data/meal_substeps';
import {
  CuratedMeal,
  Plate,
  CookingMethod,
  RecipeStep,
} from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type CookModeRoute = RouteProp<RootStackParamList, 'CookMode'>;
type CookModeNav = StackNavigationProp<RootStackParamList, 'CookMode'>;

// ============================================================================
// Substep helpers
// ============================================================================

function getSubstepText(substep: any): string {
  if (typeof substep === 'string') return substep;
  if (substep && typeof substep === 'object' && 'text' in substep) return substep.text;
  return String(substep);
}

function getSubstepTimer(substep: any): { seconds: number; label: string } | null {
  if (
    substep &&
    typeof substep === 'object' &&
    'timer_seconds' in substep &&
    'timer_label' in substep
  ) {
    return { seconds: substep.timer_seconds, label: substep.timer_label };
  }
  return null;
}

function getStepSummary(step: any): string {
  if (typeof step === 'string') return step;
  return step?.summary ?? step?.text ?? '';
}

/**
 * Scale the mass/volume amounts (g, kg, ml, l) embedded in step text by `scale`,
 * rounding grams/millilitres to whole numbers. Deliberately leaves everything
 * else untouched: counts ("1 egg", "4 lamb shanks"), spoons (tsp/tbsp), cups,
 * cloves, temperatures (180C / 200°C), times, and pan sizes (cm / inch). Those
 * either don't scale cleanly in hand-written prose or must never scale. No-ops
 * at scale 1, so un-scaled recipes render byte-for-byte unchanged.
 *
 * This only matches the macro-dominant mass/volume ingredients, which is the
 * 90% that matters; the macro panel remains the exact source of truth.
 */
function scaleAmounts(text: string, scale: number): string {
  if (!text || scale === 1) return text;
  const parseNum = (s: string) => {
    if (s.includes('/')) {
      const [a, b] = s.split('/').map(Number);
      return b ? a / b : NaN;
    }
    return Number(s);
  };
  const round = (n: number, unit: string) =>
    unit === 'kg' || unit === 'l' ? Math.round(n * 100) / 100 : Math.round(n);
  return text.replace(
    /(\d+(?:\.\d+)?(?:\/\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?(?:\/\d+)?)\s*)?(kg|g|ml|l)\b/g,
    (m, a: string, b: string | undefined, unit: string) => {
      const u = unit.toLowerCase();
      const lo = parseNum(a);
      if (!isFinite(lo)) return m;
      if (b == null) return `${round(lo * scale, u)}${u}`;
      const hi = parseNum(b);
      if (!isFinite(hi)) return `${round(lo * scale, u)}${u}`;
      return `${round(lo * scale, u)}-${round(hi * scale, u)}${u}`;
    }
  );
}

function getSubstepsOverride(
  mealSlug: string,
  methodOrPlateId: string,
  stepIndex: number
): any[] | null {
  const mealSubsteps = (MEAL_SUBSTEPS as any)?.[mealSlug];
  if (!mealSubsteps) return null;
  const sectionSubsteps = mealSubsteps[methodOrPlateId];
  if (!sectionSubsteps) return null;
  const stepSubsteps = sectionSubsteps[stepIndex];
  if (!Array.isArray(stepSubsteps) || stepSubsteps.length === 0) return null;
  return stepSubsteps;
}

function renderHighlightedText(text: string, color: string) {
  const re =
    /(\b\d+(?:\.\d+)?(?:\/\d+)?\s*(?:-\s*\d+(?:\.\d+)?(?:\/\d+)?\s*)?(?:g\b|kg\b|ml\b|l\b|tsp\b|tbsp\b|oz\b|lb\b|cm\b|mm\b|minutes?\b|mins?\b|seconds?\b|secs?\b|hours?\b|hrs?\b|cups?\b|cloves?\b|°C\b|°F\b))/gi;

  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return parts.map((part, i) =>
    part.highlight ? (
      <Text key={i} style={{ color, fontWeight: '600' }}>
        {part.text}
      </Text>
    ) : (
      <Text key={i}>{part.text}</Text>
    )
  );
}

type CookStep =
  | { type: 'base'; index: number; raw: RecipeStep | string }
  | { type: 'plate'; index: number; raw: RecipeStep | string };

// ============================================================================
// Floating timer card
// ============================================================================

interface TimerCardProps {
  timer: ActiveCookTimer;
  themeColor: string;
  onAdjust: (delta_seconds: number) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

function TimerCard({
  timer,
  themeColor,
  onAdjust,
  onPause,
  onResume,
  onCancel,
  onDismiss,
}: TimerCardProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (timer.state === 'finished') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timer.state]);

  const isFinished = timer.state === 'finished';
  const isPaused = timer.state === 'paused';
  const endTimeLabel = formatEndTime(timer.remaining_seconds);

  const progress =
    timer.total_seconds > 0
      ? 1 - timer.remaining_seconds / timer.total_seconds
      : 1;

  const RADIUS = 15;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <Animated.View
      style={[
        styles.timerCard,
        isFinished && {
          backgroundColor: themeColor,
          borderColor: themeColor,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <View style={styles.timerRing}>
        <Svg
          width={36}
          height={36}
          viewBox="0 0 36 36"
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={18}
            cy={18}
            r={RADIUS}
            stroke={isFinished ? 'rgba(0,0,0,0.2)' : '#27272a'}
            strokeWidth={3}
            fill="none"
          />
          <Circle
            cx={18}
            cy={18}
            r={RADIUS}
            stroke={isFinished ? '#000' : themeColor}
            strokeWidth={3}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={`${CIRCUMFERENCE * (1 - progress)}`}
            strokeLinecap="round"
          />
        </Svg>
        {isFinished && (
          <Ionicons
            name="notifications"
            size={16}
            color="#000"
            style={{ position: 'absolute' }}
          />
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={[
            styles.timerLabel,
            { color: isFinished ? 'rgba(0,0,0,0.7)' : themeColor },
          ]}
        >
          {timer.label.toUpperCase()}
          {endTimeLabel && !isFinished && (
            <Text style={{ color: '#71717a', fontWeight: '400' }}>
              {'  ·  Ready ' + endTimeLabel}
            </Text>
          )}
        </Text>
        <Text
          style={[
            styles.timerTime,
            { color: isFinished ? '#000' : '#fff' },
          ]}
        >
          {isFinished ? "Time's up" : formatRemaining(timer.remaining_seconds)}
        </Text>
      </View>

      {isFinished ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={styles.timerActionFinished}
            onPress={() => onAdjust(60)}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>+1m</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerActionFinished}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <View style={styles.timerAdjustPill}>
            <TouchableOpacity
              style={styles.timerAdjustHalf}
              onPress={() => onAdjust(-15)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 0 }}
            >
              <Text style={styles.timerAdjustText}>−15s</Text>
            </TouchableOpacity>
            <View style={styles.timerAdjustDivider} />
            <TouchableOpacity
              style={styles.timerAdjustHalf}
              onPress={() => onAdjust(15)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 0, right: 4 }}
            >
              <Text style={styles.timerAdjustText}>+15s</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.timerAction}
            onPress={isPaused ? onResume : onPause}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={14}
              color="#d4d4d8"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerAction}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#71717a" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// Component
// ============================================================================
export default function CookModeScreen() {
  const navigation = useNavigation<CookModeNav>();
  const route = useRoute<CookModeRoute>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const {
    timers,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    adjustTimer,
    dismissFinished,
    isTimerActive,
  } = useCookTimers();

  useKeepAwake();

  const { mealSlug, plateIndex, methodIndex } = route.params;
  // Plan scale + batch count handed over by RecipeDetail's "Start cooking".
  // planScale is the plan's per-serving multiplier (1 for a base/favourite open);
  // cookPortions is the integer batch count (1 unless a meal-prep deep link set it).
  const planScale = (() => {
    const s = Number((route.params as any).scaleFactor);
    return Number.isFinite(s) && s > 0 ? s : 1;
  })();
  const cookPortions = (() => {
    const n = Number((route.params as any).servings);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })();
  const meal: CuratedMeal | undefined = (CURATED_MEALS as any)[mealSlug];
  const plate: Plate | undefined = meal?.plates?.[plateIndex];
  const method: CookingMethod | undefined = meal?.methods?.[methodIndex];

  const steps: CookStep[] = useMemo(() => {
    if (!method || !plate) return [];
    const baseSteps: CookStep[] = method.instructions.map((raw, i) => ({
      type: 'base' as const,
      index: i,
      raw,
    }));
    const plateSteps: CookStep[] = plate.additional_instructions.map((raw, i) => ({
      type: 'plate' as const,
      index: i,
      raw,
    }));
    return [...baseSteps, ...plateSteps];
  }, [method, plate]);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [checkedSubsteps, setCheckedSubsteps] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

  const sortedTimers = useMemo(() => {
    return [...timers].sort((a, b) => {
      if (a.state === 'finished' && b.state !== 'finished') return -1;
      if (b.state === 'finished' && a.state !== 'finished') return 1;
      return a.remaining_seconds - b.remaining_seconds;
    });
  }, [timers]);

  if (!meal || !plate || !method) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, padding: 20 }]}>
        <Text style={styles.errorTitle}>Recipe not found</Text>
        <TouchableOpacity style={styles.errorBack} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIdx];
  const isLastStep = currentStepIdx === totalSteps - 1;
  const isFirstStep = currentStepIdx === 0;

  // Cook-step quantities scale ONLY for single-serve recipes: there, cooking =
  // one (scaled) serving, so the amounts should match the plan. Batch recipes
  // (produces_servings > 1) are cooked whole and portioned across the week
  // regardless of how much of a serving the plan eats, so their authored amounts
  // are left exactly as-is. The integer batch count multiplies on top.
  const stepScale =
    meal.produces_servings === 1 ? cookPortions * planScale : 1;

  const rawSummary = getStepSummary(currentStep.raw);
  const stepSummary = scaleAmounts(rawSummary, stepScale);

  const sectionId = currentStep.type === 'base' ? method.id : plate.id;
  const overrideSubsteps = getSubstepsOverride(meal.slug, sectionId, currentStep.index);

  const hasSplitSubsteps =
    overrideSubsteps !== null &&
    (overrideSubsteps.length > 1 ||
      (overrideSubsteps.length === 1 &&
        getSubstepText(overrideSubsteps[0]) !== rawSummary));

  const sectionLabel = currentStep.type === 'plate' ? 'PLATE IT UP' : null;

  const showReserveNoteOnThisStep =
    !!plate.reserve_before_finishing_note &&
    currentStep.type === 'base' &&
    currentStep.index === method.instructions.length - 1;

  const makeTimerId = (substepIndex: number) =>
    `${meal.slug}-${sectionId}-${currentStepIdx}-${substepIndex}`;

  // ===== Handlers =====
  const handleClose = () => {
    setShowStopModal(true);
  };

  const handleKeepCooking = () => {
    setShowStopModal(false);
  };

  const handleStopCooking = () => {
    setShowStopModal(false);
    navigation.goBack();
  };

  const handleNext = () => {
    if (isLastStep) {
      setCompleted(true);
      return;
    }
    setCurrentStepIdx(Math.min(currentStepIdx + 1, totalSteps - 1));
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    setCurrentStepIdx(Math.max(currentStepIdx - 1, 0));
  };

  const toggleSubstep = (key: string) => {
    setCheckedSubsteps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  const handleShare = async () => {
    try {
      const url = `https://json.fit/r/?meal=${meal.slug}&plate=${plate.id}`;
      const m = plate.plate_macros;
      const caption = `${plate.display_name} — ${m.kcal} cal, ${m.protein_g}g protein`;
      await Share.share(
        Platform.OS === 'ios'
          ? { message: caption, url }
          : { message: `${caption}\n\n${url}` }
      );
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  // ============================================================
  // COMPLETION SCREEN — Option A: Full-bleed celebration
  // ============================================================
  if (completed) {
    const imageSource = getMealImage(plate.image_filename ?? meal.image_filename);

    const totalMinutes =
      (method.time_total_minutes ?? 0) + (plate.assembly_time_minutes ?? 0);

    const macros = plate.plate_macros;
    // Completion shows the serving you're about to eat → scale per-serving by
    // planScale (not the batch count). Matches the RecipeDetail macro panel.
    const dispKcal = Math.round(macros.kcal * planScale);
    const dispProtein = Math.round(macros.protein_g * planScale);
    const dispCarbs = Math.round(macros.carbs_g * planScale);

    return (
      <View style={styles.completionContainer}>
        {/* Full-bleed background image */}
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.completionBgImage}
            contentFit="cover"
            transition={200}
            priority="high"
          />
        ) : (
          <View
            style={[styles.completionBgImage, { backgroundColor: '#1a0a05' }]}
          />
        )}

        {/* Dark gradient overlays — top + bottom for legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)']}
          locations={[0, 0.2, 0.5]}
          style={styles.completionTopGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.55, 1]}
          style={styles.completionBottomGradient}
          pointerEvents="none"
        />

        {/* Top bar */}
        <View
          style={[
            styles.completionTopBar,
            { paddingTop: insets.top + 12 },
          ]}
        >
          <Text style={styles.completionEyebrow}>
            {meal?.cuisine === 'smoothie' ? 'DONE BLENDING' : 'DONE COOKING'}
          </Text>
          {meal?.cuisine !== 'snack' && (
            <TouchableOpacity
              style={styles.completionShareBtn}
              onPress={handleShare}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom content */}
        <View
          style={[
            styles.completionBottom,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Text style={styles.completionTitle}>
            {meal?.cuisine === 'smoothie' ? 'Drink up.' : 'Eat well.'}
          </Text>
          <Text style={styles.completionPlateName}>{plate.display_name}</Text>
          {plate.description && (
            <Text style={styles.completionDescription} numberOfLines={2}>
              {plate.description}
            </Text>
          )}

          {/* Macro strip */}
          <View style={styles.completionMacroStrip}>
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>TIME</Text>
              <Text style={styles.completionMacroValue}>
                {totalMinutes}
                <Text style={styles.completionMacroUnit}>m</Text>
              </Text>
            </View>
            <View style={styles.completionMacroDivider} />
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>CALS</Text>
              <Text style={styles.completionMacroValue}>{dispKcal}</Text>
            </View>
            <View style={styles.completionMacroDivider} />
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>PROTEIN</Text>
              <Text style={styles.completionMacroValue}>
                {dispProtein}
                <Text style={styles.completionMacroUnit}>g</Text>
              </Text>
            </View>
            <View style={styles.completionMacroDivider} />
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>CARBS</Text>
              <Text style={styles.completionMacroValue}>
                {dispCarbs}
                <Text style={styles.completionMacroUnit}>g</Text>
              </Text>
            </View>
          </View>

          {/* Done CTA */}
          <TouchableOpacity
            style={[
              styles.completionCta,
              { backgroundColor: themeColor, shadowColor: themeColor },
            ]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.completionCtaText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================
  // MAIN COOK MODE VIEW
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={24} color="#a1a1aa" />
        </TouchableOpacity>
        <Text style={styles.headerStepCount}>
          STEP {currentStepIdx + 1} OF {totalSteps}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= currentStepIdx ? themeColor : '#27272a' },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{
          paddingBottom: 100 + sortedTimers.length * 64,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sectionLabel && (
          <Text style={[styles.sectionEyebrow, { color: themeColor }]}>{sectionLabel}</Text>
        )}

        <View
          style={[
            styles.summaryCard,
            { borderColor: themeColor + '40', backgroundColor: themeColor + '0F' },
          ]}
        >
          <View style={styles.summaryHeaderRow}>
            <View style={[styles.summaryStepBubble, { backgroundColor: themeColor }]}>
              <Text style={styles.summaryStepBubbleText}>{currentStepIdx + 1}</Text>
            </View>
            <Text style={[styles.summaryHeaderLabel, { color: themeColor }]}>
              STEP {currentStepIdx + 1}
            </Text>
          </View>
          <Text style={styles.summaryBody}>{stepSummary}</Text>
        </View>

        {showReserveNoteOnThisStep && plate.reserve_before_finishing_note && (
          <View style={styles.reserveNote}>
            <Ionicons name="information-circle" size={14} color="#f59e0b" style={{ marginTop: 2 }} />
            <Text style={styles.reserveNoteText}>
              {plate.reserve_before_finishing_note}
            </Text>
          </View>
        )}

        {hasSplitSubsteps && overrideSubsteps && (
          <View style={styles.substepSection}>
            {overrideSubsteps.map((substep, i) => {
              const key = `${currentStepIdx}-${i}`;
              const checked = checkedSubsteps.has(key);
              const substepText = scaleAmounts(getSubstepText(substep), stepScale);
              const timer = getSubstepTimer(substep);
              const timerId = timer ? makeTimerId(i) : null;
              const timerActive = timerId ? isTimerActive(timerId) : false;

              const firstUncheckedIdx = overrideSubsteps.findIndex(
                (_, j) => !checkedSubsteps.has(`${currentStepIdx}-${j}`)
              );
              const isCurrentlyActive = i === firstUncheckedIdx;

              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleSubstep(key)}
                  activeOpacity={0.7}
                  style={[
                    styles.substepRow,
                    isCurrentlyActive && {
                      backgroundColor: themeColor + '14',
                    },
                    checked && { opacity: 0.45 },
                  ]}
                >
                  {isCurrentlyActive && (
                    <View
                      style={[
                        styles.substepActiveBar,
                        { backgroundColor: themeColor },
                      ]}
                    />
                  )}

                  <View style={styles.substepNumberWrap}>
                    {checked ? (
                      <Ionicons name="checkmark" size={16} color={themeColor} />
                    ) : (
                      <Text
                        style={[
                          styles.substepNumber,
                          isCurrentlyActive && { color: themeColor, fontWeight: '700' },
                        ]}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.substepText,
                        checked && styles.struckThrough,
                        isCurrentlyActive && !checked && { fontWeight: '500' },
                      ]}
                    >
                      {renderHighlightedText(substepText, checked ? '#52525b' : themeColor)}
                    </Text>

                    {timer && timerId && !timerActive && !checked && (
                      <TouchableOpacity
                        onPress={() => startTimer(timerId, timer.label, timer.seconds)}
                        activeOpacity={0.7}
                        style={[
                          styles.timerChip,
                          {
                            borderColor: themeColor + '4D',
                            backgroundColor: themeColor + '1F',
                          },
                        ]}
                      >
                        <Ionicons name="time-outline" size={12} color={themeColor} />
                        <Text style={[styles.timerChipText, { color: themeColor }]}>
                          Start {formatRemaining(timer.seconds)} timer
                        </Text>
                      </TouchableOpacity>
                    )}

                    {timer && timerId && timerActive && (
                      <View style={[styles.timerChipActive, { backgroundColor: themeColor }]}>
                        <View style={styles.timerChipDot} />
                        <Text style={styles.timerChipActiveText}>Timer running</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {sortedTimers.length > 0 && (
        <View
          style={[styles.timerStack, { bottom: 80 + insets.bottom }]}
          pointerEvents="box-none"
        >
          {sortedTimers.map(timer => (
            <TimerCard
              key={timer.id}
              timer={timer}
              themeColor={themeColor}
              onAdjust={(delta) => adjustTimer(timer.id, delta)}
              onPause={() => pauseTimer(timer.id)}
              onResume={() => resumeTimer(timer.id)}
              onCancel={() => stopTimer(timer.id)}
              onDismiss={() => dismissFinished(timer.id)}
            />
          ))}
        </View>
      )}

      <View style={[styles.navBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.navPrev, isFirstStep && { opacity: 0.3 }]}
          onPress={handlePrev}
          disabled={isFirstStep}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#a1a1aa" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navNext, { backgroundColor: themeColor, shadowColor: themeColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.navNextText}>
            {isLastStep ? 'Finish' : 'Next step'}
          </Text>
          <Ionicons
            name={isLastStep ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#0a0a0b"
          />
        </TouchableOpacity>
      </View>

      {/* Custom Stop Cooking Modal */}
      <Modal
        visible={showStopModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleKeepCooking}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Stop cooking?</Text>
              <Text style={styles.modalSubtitle}>You'll lose your place in the recipe.</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalKeepButton, { borderColor: themeColor }]}
                  onPress={handleKeepCooking}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, styles.modalKeepText, { color: themeColor }]}>
                    Keep cooking
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalStopButton]}
                  onPress={handleStopCooking}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, styles.modalStopText]}>
                    Stop
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerStepCount: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  progressDot: { flex: 1, height: 3, borderRadius: 2 },

  body: { flex: 1, paddingHorizontal: 20 },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },

  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryStepBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStepBubbleText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryBody: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 21,
  },

  reserveNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  reserveNoteText: { color: '#fbbf24', fontSize: 13, lineHeight: 19, flex: 1 },

  substepSection: {
    gap: 6,
    marginBottom: 16,
  },
  substepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 18,
    backgroundColor: '#18181b',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  substepActiveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  substepNumberWrap: {
    width: 16,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
  },
  substepNumber: {
    color: '#52525b',
    fontSize: 12,
    fontWeight: '600',
  },
  substepText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  struckThrough: {
    color: '#52525b',
    textDecorationLine: 'line-through',
  },

  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  timerChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timerChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  timerChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  timerChipActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },

  timerStack: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 6,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236,72,153,0.4)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timerRing: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  timerTime: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  timerAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerActionFinished: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerAdjustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 14,
    height: 28,
    paddingHorizontal: 2,
  },
  timerAdjustHalf: {
    paddingHorizontal: 8,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerAdjustDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: '#3f3f46',
  },
  timerAdjustText: {
    color: '#d4d4d8',
    fontSize: 10,
    fontWeight: '600',
  },

  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  navPrev: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navNext: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  navNextText: { color: '#0a0a0b', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },

  // ============================================================
  // COMPLETION SCREEN STYLES — Option A full-bleed
  // ============================================================
  completionContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  completionBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  completionTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  completionBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  completionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  completionEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  completionShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  completionTitle: {
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 6,
  },
  completionPlateName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  completionDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  completionMacroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  completionMacro: {
    flex: 1,
    alignItems: 'center',
  },
  completionMacroLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  completionMacroValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  completionMacroUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  completionMacroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  completionCta: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  completionCtaText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  errorTitle: { color: '#fff', fontSize: 18, marginBottom: 16 },
  errorBack: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignSelf: 'flex-start',
  },
  errorBackText: { color: '#fff', fontSize: 14 },

  // ============================================================
  // MODAL STYLES
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    width: '100%',
    maxWidth: 340,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  modalKeepButton: {
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  modalStopButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalKeepText: {
    // color will be set dynamically to themeColor
  },
  modalStopText: {
    color: '#fff',
  },
});
```

## FILE: src/screens/MealPlanDayScreen.tsx  (2150 lines)

```tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {Picker} from '@react-native-picker/picker';
// TouchableOpacity comes from react-native, NOT react-native-gesture-handler. Nothing in this
// file uses an RNGH gesture, and an RNGH touchable inside a <Modal> is dead on Android: a
// Modal is a detached native window that doesn't inherit the app's GestureHandlerRootView,
// so RNGH touchables inside it silently receive no touches.
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NUTRITION_STORAGE_KEYS, SimplifiedMeal, SimplifiedMealPlanDay } from '../types/nutrition';
import { buildFreshnessIndex } from '../utils/buildPrepSession';
import RecipeFavorites from '../utils/recipeFavorites';
import { CURATED_MEALS } from '../data/curated_meals';
import { getMealImage } from '../assets/mealImages';

type MealPlanDayScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDay'>;
type MealPlanDayScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDay'>;

// Use SimplifiedMeal from types instead of custom Meal interface
type Meal = SimplifiedMeal;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MUTED = '#8a8a90';
const FAINT = '#6a6a70';

// Resolve a meal photo from whatever field the curated record uses.
const getMealImageUri = (meal: any): string | null =>
  meal?.photo_url || meal?.image || meal?.imageUrl || meal?.image_url || meal?.photo || meal?.imageURL || meal?.img || meal?.thumbnail || null;

interface MealCardProps {
  meal: SimplifiedMeal;
  onPress: () => void;
  onLongPress: () => void;
  onToggleComplete: () => void;
  themeColor: string;
  mealIcon: string;
  mealColor: string;
  isCompleted: boolean;
  freshnessIndex: Map<string, Set<string>>;
  currentDate: string;
}

function MealCard({ meal, onPress, onLongPress, onToggleComplete, themeColor, mealIcon, mealColor, isCompleted, freshnessIndex, currentDate }: MealCardProps) {
  // Resolve the meal photo. Manually-logged meals carry image_filename / photo_url
  // directly. Curated meals (incl. AI-imported plans) carry only curated_meal_slug
  // + plate_id, so hydrate the image from the curated DB: per-plate image_filename
  // first, then the meal-level photo_url. Falls back to the type icon if neither.
  let imageFilename: string | null = (meal as any)?.image_filename || null;
  let uri = getMealImageUri(meal);
  if (!imageFilename && !uri) {
    const slug = (meal as any)?.curated_meal_slug || (meal as any)?.slug || null;
    const cm = slug ? (CURATED_MEALS as any)[slug] : null;
    if (cm) {
      const plates = Array.isArray(cm.plates) ? cm.plates : [];
      const plateId = (meal as any)?.plate_id || null;
      const plate = (plateId && plates.find((p: any) => p?.id === plateId)) || plates[0] || null;
      imageFilename = plate?.image_filename || cm.image_filename || null;
      uri = cm.photo_url || uri;
    }
  }
  const localImg = imageFilename ? getMealImage(imageFilename) : null;
  const cal = (meal.calories && typeof meal.calories === 'number') ? meal.calories : 0;
  const p = Math.round((meal.macros?.protein || meal.nutritionInfo?.protein || 0));
  const c = Math.round((meal.macros?.carbs || meal.nutritionInfo?.carbs || meal.nutritionInfo?.carbohydrates || 0));
  const f = Math.round((meal.macros?.fat || meal.nutritionInfo?.fat || 0));
  const typeLabel = meal.tags?.includes('adjuster') 
    ? 'TOP-UP' 
    : (meal.type || 'snack').replace(/_/g, ' ').toUpperCase();
  const metaText = meal.time ? `${meal.time} · ${typeLabel}` : typeLabel;

  return (
    <View style={styles.mcard}>
      <Pressable style={styles.photoWrap} onPress={onPress} onLongPress={onLongPress}>
        {localImg ? (
          <Image source={localImg} style={styles.photo} resizeMode="cover" />
        ) : uri ? (
          <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoFallback}>
            <Ionicons name={mealIcon as any} size={36} color="#3a3a42" />
          </View>
        )}
        {isCompleted && <View style={styles.photoScrim} pointerEvents="none" />}
        <View style={styles.chip}>
          <Text style={styles.chipText}>{metaText}</Text>
        </View>
        <View style={styles.viewHint}>
          <Ionicons name="chevron-forward" size={16} color="#e8e8ea" />
        </View>
      </Pressable>

      <Pressable style={styles.mbody} onPress={onToggleComplete} onLongPress={onLongPress}>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={isCompleted ? themeColor : '#5a5a60'}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.mname, isCompleted && styles.mnameDone]} numberOfLines={2}>
            {meal.name || 'Unknown Meal'}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.mmacro, isCompleted && styles.mmacroDone]}>{cal} kcal · P{p} C{c} F{f}</Text>
            {(() => {
              // Check if this meal needs "From freezer" chip
              if (meal.curated_meal_slug) {
                const key = `${meal.curated_meal_slug}_${meal.plate_id || 'standard'}`;
                const freezeDates = freshnessIndex.get(key);
                if (freezeDates && freezeDates.has(currentDate)) {
                  return (
                    <View style={styles.freezerChip}>
                      <Ionicons name="snow-outline" size={12} color="#3b82f6" />
                      <Text style={styles.freezerChipText}>From freezer — thaw overnight</Text>
                    </View>
                  );
                }
              }
              return null;
            })()}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function MealPlanDayScreen() {
  const navigation = useNavigation<MealPlanDayScreenNavigationProp>();
  const route = useRoute<MealPlanDayScreenRouteProp>();
  const { themeColor } = useTheme();
  const { 
    getMealsForDate, 
    deleteMealFromDate, 
    addMealToDate,
    migrateLegacyPlan,
    currentPlan 
  } = useSimplifiedMealPlanning();
  
  const { getFavoriteMeals } = useMealPlanning();
  const favoriteMeals = getFavoriteMeals();

  // Build freshness index for freezer chips
  const freshnessIndex = useMemo(() => {
    return currentPlan ? buildFreshnessIndex(currentPlan) : new Map();
  }, [currentPlan]);

  // Clean parameter extraction with fallback support
  const cleanParams = route.params as any;
  
  // New clean navigation parameters
  const targetDate = cleanParams.targetDate;
  const planId = cleanParams.planId;
  const planName = cleanParams.planName || cleanParams.mealPlanName;
  const dayName = cleanParams.dayName;
  const displayDate = cleanParams.displayDate;

  // Legacy parameter support (for gradual migration)
  const legacyDay = cleanParams.day;
  const legacyDayIndex = cleanParams.dayIndex;
  const legacyCalculatedDateString = cleanParams.calculatedDateString;
  const legacyCalculatedDayName = cleanParams.calculatedDayName;
  const legacyWeekNumber = cleanParams.weekNumber;
  const legacyMealPlanName = cleanParams.mealPlanName;

  // Determine the actual date to use
  const viewingDate = targetDate || legacyCalculatedDateString || legacyDay?.date;
  
  console.log('🔍 MealPlanDayScreen using clean navigation:', {
    targetDate,
    planName,
    viewingDate,
    hasLegacyParams: !!legacyDay
  });

  const [allMeals, setAllMeals] = useState(legacyDay?.meals || []);
  const [isMigrated, setIsMigrated] = useState(false);
  
  // For display purposes, generate clean display values
  const displayInfo = React.useMemo(() => {
    if (targetDate) {
      // New clean navigation - calculate display from targetDate
      const date = new Date(targetDate + 'T00:00:00.000Z');
      return {
        dayName: dayName || date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
        displayDate: displayDate || date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'UTC' 
        }),
        planName: planName || 'Meal Plan'
      };
    } else {
      // Legacy fallback
      const legacyDate = legacyCalculatedDateString ? new Date(legacyCalculatedDateString + 'T00:00:00.000Z') : null;
      return {
        dayName: legacyCalculatedDayName || 'Day',
        displayDate: legacyDate ? legacyDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'UTC' 
        }) : 'Unknown Date',
        planName: legacyMealPlanName || 'Meal Plan'
      };
    }
  }, [targetDate, dayName, displayDate, planName, legacyCalculatedDayName, legacyCalculatedDateString, legacyMealPlanName]);

  // Auto-migrate legacy data on component mount
  useEffect(() => {
    const handleMigration = async () => {
      try {
        if (!currentPlan && !isMigrated) {
          console.log('🔄 MealPlanDay: No simplified plan found, checking for legacy data');
          const legacyData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
          
          if (legacyData) {
            console.log('🔄 MealPlanDay: Found legacy data, starting migration');
            const legacyPlan = JSON.parse(legacyData);
            const success = await migrateLegacyPlan(legacyPlan);
            
            if (success) {
              console.log('✅ MealPlanDay: Migration completed successfully');
            } else {
              console.log('❌ MealPlanDay: Migration failed');
            }
          }
          setIsMigrated(true);
        }
      } catch (error) {
        console.error('❌ MealPlanDay migration error:', error);
        setIsMigrated(true);
      }
    };

    handleMigration();
  }, [currentPlan, migrateLegacyPlan, isMigrated]);

  // Load meals when migration is complete or plan is available
  useEffect(() => {
    if (isMigrated || currentPlan) {
      loadCurrentDayMeals();
    }
  }, [isMigrated, currentPlan]);

  // Legacy function - no longer needed with clean navigation but kept for compatibility
  const parseDayNameToDate = (dayName?: string): string | null => {
    if (!dayName) return null;
    try {
      // Parse "Friday 20 Feb" format
      const parts = dayName.split(' ');
      if (parts.length >= 3) {
        const dayNumber = parseInt(parts[1]);
        const monthStr = parts[2];
        
        // Map month abbreviations to numbers
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        const monthIndex = monthMap[monthStr];
        if (monthIndex !== undefined) {
          // Assume current year (since meal plans are typically for current period)
          const currentYear = new Date().getFullYear();
          const date = new Date(currentYear, monthIndex, dayNumber);
          return date.toISOString().split('T')[0];
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing day name to date:', error);
      return null;
    }
  };

  const loadCurrentDayMeals = useCallback(() => {
    try {
      console.log('🔍 MealPlanDayScreen: Loading meals with clean navigation');
      console.log('📅 Target date:', viewingDate);
      
      // Validate viewing date
      if (!viewingDate) {
        console.error('❌ No viewing date available');
        setAllMeals(legacyDay?.meals || []);
        return;
      }
      
      // Use simplified context to get meals for this clean date
      const mealsForDay = getMealsForDate(viewingDate);
      console.log('🔍 Context returned:', mealsForDay.length, 'meals for', viewingDate);
      
      if (mealsForDay.length > 0) {
        console.log('✅ Using context meals');
        setAllMeals(mealsForDay);
      } else {
        console.log('⚠️ No context meals, using legacy fallback');
        setAllMeals(legacyDay?.meals || []);
      }
      
    } catch (error) {
      console.error('❌ Error loading meals:', error);
      setAllMeals(legacyDay?.meals || []);
    }
  }, [getMealsForDate, viewingDate, legacyDay]); // Removed day.meals dependency to prevent stale data

  // Load meals when screen mounts
  React.useEffect(() => {
    loadCurrentDayMeals();
  }, [loadCurrentDayMeals]);

  // Reload meals when screen comes into focus (ensures data consistency)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused, reloading meals for consistency');
      loadCurrentDayMeals();
    }, [loadCurrentDayMeals])
  );

  // Load meal completions when viewing date changes
  useEffect(() => {
    if (viewingDate) {
      loadMealCompletions(viewingDate);
    }
  }, [viewingDate]);

  // Add meal modal state
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [addMealType, setAddMealType] = useState<'manual' | 'favorite' | null>(null);
  const [selectedFavoriteMeal, setSelectedFavoriteMeal] = useState<any>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealType, setNewMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'custom'>('snack');
  const [customMealType, setCustomMealType] = useState('');
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('PM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [newMealFat, setNewMealFat] = useState('');
  
  // Action sheet and delete modal states
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ meal: Meal; index: number; mealId: string; isCompleted: boolean } | null>(null);
  
  // Meal completion tracking
  const [completedMeals, setCompletedMeals] = useState<Record<string, boolean>>({});

  // Favourited recipes (from the Library's recipe-favourites store), loaded
  // when the quick-add sheet opens. Slugs are resolved to curated meals.
  const [favRecipes, setFavRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  useEffect(() => {
    if (!showAddMealModal) return;
    (async () => {
      try {
        const favs = await RecipeFavorites.loadFavorites();
        const entries = (favs || [])
          .map(({ slug, plateId }) => {
            const meal = (CURATED_MEALS as any)[slug];
            if (!meal || !Array.isArray(meal.plates) || meal.plates.length === 0) return null;
            const plate = (plateId && meal.plates.find((p: any) => p.id === plateId)) || meal.plates[0];
            return { meal, plate, slug, plateId: plate?.id, key: `${slug}::${plate?.id}` };
          })
          .filter(Boolean);
        setFavRecipes(entries as any[]);
      } catch {
        setFavRecipes([]);
      }
    })();
  }, [showAddMealModal]);
  
  // Load and save meal completion state
  const loadMealCompletions = async (date: string) => {
    try {
      const key = `meal_completions_${date}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const completions = JSON.parse(stored);
        setCompletedMeals(completions);
        console.log('✅ Loaded meal completions for', date, ':', Object.keys(completions).length, 'entries');
      } else {
        setCompletedMeals({});
        console.log('📋 No saved meal completions for', date);
      }
    } catch (error) {
      console.error('❌ Failed to load meal completions:', error);
      setCompletedMeals({});
    }
  };

  const saveMealCompletions = async (date: string, completions: Record<string, boolean>) => {
    try {
      const key = `meal_completions_${date}`;
      await AsyncStorage.setItem(key, JSON.stringify(completions));
      console.log('💾 Saved meal completions for', date, ':', Object.keys(completions).length, 'entries');
    } catch (error) {
      console.error('❌ Failed to save meal completions:', error);
    }
  };
  
  // Note: Favorite meals functionality can be added later if needed
  // For now we focus on the core deletion functionality

  // Simplified meal addition using context
  const addMealToToday = async (meal: any, time: string) => {
    try {
      console.log('🚀 Adding meal via context:', meal?.name, 'at', time);
      
      // Get the viewing date using clean navigation
      const currentViewingDate = viewingDate;
      
      if (!viewingDate) {
        Alert.alert('Error', 'Could not determine the day date for adding meal.');
        return false;
      }
      
      // Use simplified context method for addition
      // Handle both direct meal properties and favorite meal structure
      const calories = meal.calories || meal.nutritionInfo?.calories || 0;
      
      // Extract macros properly from nutritionInfo structure
      const macros = meal.macros || {
        protein: meal.nutritionInfo?.protein || 0,
        carbs: meal.nutritionInfo?.carbs || 0,
        fat: meal.nutritionInfo?.fat || 0
      };
      
      console.log('🍽️ Adding meal with nutrition:', {
        name: meal.name,
        calories: calories,
        macros: macros,
        originalMeal: meal
      });
      
      const success = await addMealToDate(viewingDate, {
        name: meal.name,
        type: meal.type || 'snack',
        time: time,
        calories: calories,
        macros: macros,
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        tags: meal.tags || [],
        isOriginal: false,
      });
      
      if (success) {
        console.log('✅ Meal added successfully via context');
        // Reload meals to reflect changes
        loadCurrentDayMeals();
        return true;
      } else {
        Alert.alert('Error', 'Failed to add meal to timeline');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to add meal via context:', error);
      Alert.alert('Error', 'Failed to add meal to timeline');
      return false;
    }
  };


  // Generate a date string for this day using the same logic as other screens
  const getDayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getDayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the date for this specific day using the same logic as MealPlanDaysScreen
    const dayDate = new Date(today);
    
    if (weekNumber === 1) {
      // Week 1: Start from today
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      // Week 2+: Calculate based on week start offset
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < weekNumber; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    return dayDate.toLocaleDateString('en-US', options);
  };

  const dayDateString = getDayDateString();

  // Function to clean up invalid date entries
  const cleanupInvalidDates = async () => {
    try {
      if (!currentPlan) return;
      
      console.log('🧹 Cleaning up invalid date entries...');
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validDates: { [key: string]: SimplifiedMealPlanDay } = {};
      
      // Filter out invalid date entries
      Object.entries(currentPlan.dailyMeals).forEach(([date, dayData]) => {
        if (dateRegex.test(date)) {
          validDates[date] = dayData;
        } else {
          console.log(`🗑️ Removing invalid date entry: ${date}`);
        }
      });
      
      // Update the plan with only valid dates
      const cleanedPlan = {
        ...currentPlan,
        dailyMeals: validDates
      };
      
      // Save the cleaned plan
      await AsyncStorage.setItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN, JSON.stringify(cleanedPlan));
      
      // Update context state
      const success = await migrateLegacyPlan(cleanedPlan);
      if (success) {
        console.log('✅ Successfully cleaned up invalid date entries');
        Alert.alert('Success', 'Invalid date entries have been cleaned up');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up invalid dates:', error);
    }
  };

  // Debug function to gather all relevant data
  const generateDebugInfo = async () => {
    const currentViewingDate = viewingDate;
    const contextMeals = getMealsForDate(currentViewingDate);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      screenInfo: {
        targetDate,
        planName,
        dayName: displayInfo.dayName,
        displayDate: displayInfo.displayDate,
        currentViewingDate,
        hasLegacyParams: !!legacyDay
      },
      mealData: {
        allMealsCount: allMeals.length,
        contextMealsCount: contextMeals.length,
        allMeals: allMeals.map((meal, index) => ({
          index,
          name: meal.name,
          type: meal.type,
          time: meal.time,
          id: meal.id,
          calories: meal.calories,
          hasName: meal.name !== undefined,
          hasType: meal.type !== undefined,
          hasTime: meal.time !== undefined,
          rawMeal: meal
        })),
        contextMeals: contextMeals.map((meal, index) => ({
          index,
          name: meal.name,
          type: meal.type,
          time: meal.time,
          id: meal.id,
          calories: meal.calories,
          hasName: meal.name !== undefined,
          hasType: meal.type !== undefined,
          hasTime: meal.time !== undefined,
          rawMeal: meal
        }))
      },
      planContext: {
        hasPlan: !!currentPlan,
        planId: currentPlan?.id,
        planName: currentPlan?.name,
        dailyMealsKeys: currentPlan ? Object.keys(currentPlan.dailyMeals) : [],
        targetDateExists: currentPlan ? !!currentPlan.dailyMeals[currentViewingDate] : false,
        targetDateMealCount: currentPlan?.dailyMeals[currentViewingDate]?.meals?.length || 0
      },
      routeParams: route.params
    };

    const debugText = JSON.stringify(debugInfo, null, 2);
    
    try {
      await Clipboard.setStringAsync(debugText);
      Alert.alert(
        'Debug Info Copied!',
        'Debug information has been copied to your clipboard. You can now paste it to share.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy debug info to clipboard');
    }
  };

  // Generate a unique ID for meals since the current interface doesn't have one
  const generateMealId = (meal: Meal, globalIndex: number) => {
    // Use a combination of meal name, type, and index for uniqueness
    const cleanName = (meal.name || 'unknown_meal').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${cleanName}_${meal.type || 'unknown'}_${globalIndex}`;
  };

  // Simplified meal deletion using context
  const deleteMealFromDay = async (meal: Meal, index: number) => {
    try {
      console.log('🗑️ Attempting to delete meal via context:', meal.name);
      
      // Use the clean viewing date
      const currentViewingDate = viewingDate;
      
      console.log(`📅 Deletion: Using clean date ${currentViewingDate}`);
      
      if (!currentViewingDate) {
        Alert.alert('Error', 'Could not determine the day date for deletion.');
        return false;
      }
      
      // Use simplified context method for deletion
      // First we need to find the meal ID from the simplified context
      const simplifiedMeals = getMealsForDate(currentViewingDate);
      const targetMeal = simplifiedMeals.find(m => 
        m.name === meal.name && m.time === meal.time
      );
      
      if (!targetMeal) {
        console.log('⚠️ Meal not found in simplified context, may need migration');
        Alert.alert('Error', 'Meal not found. Please try refreshing the screen.');
        return false;
      }
      
      const success = await deleteMealFromDate(currentViewingDate, targetMeal.id);
      
      if (success) {
        // Reload meals to reflect changes
        loadCurrentDayMeals();
        return true;
      } else {
        Alert.alert('Error', 'Failed to delete meal. Please try again.');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error deleting meal via context:', error);
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
      return false;
    }
  };

  // Handle long press to show custom action sheet
  const handleMealLongPress = async (meal: Meal, index: number) => {
    const mealId = generateMealId(meal, index);
    const mealKey = `${index}_${meal.id || meal.name}`;
    const isCurrentlyCompleted = completedMeals[mealKey] || false;
    
    console.log('Long press:', { 
      mealName: meal.name, 
      mealId, 
      index, 
      dayDateString, 
      isCurrentlyCompleted,
      fullMeal: meal
    });
    
    // Set selected meal data and show custom action sheet
    setSelectedMeal({ meal, index, mealId, isCompleted: isCurrentlyCompleted });
    setShowActionSheet(true);
  };

  // Handle action sheet actions
  const handleActionSheetAction = async (action: 'complete' | 'edit' | 'delete' | 'cancel') => {
    if (!selectedMeal) return;

    setShowActionSheet(false);

    if (action === 'cancel') {
      setSelectedMeal(null);
      return;
    }

    if (action === 'complete') {
      // Toggle completion
      try {
        if (!viewingDate) {
          console.error('No viewing date available for meal completion');
          return;
        }
        
        const mealKey = `${selectedMeal.index}_${selectedMeal.meal.id || selectedMeal.meal.name}`;
        const newCompletionState = !selectedMeal.isCompleted;
        
        const updatedCompletions = {
          ...completedMeals,
          [mealKey]: newCompletionState
        };
        
        setCompletedMeals(updatedCompletions);
        saveMealCompletions(viewingDate, updatedCompletions);
        
        console.log('✅ Meal completion toggled:', selectedMeal.meal.name, '→', newCompletionState ? 'completed' : 'incomplete');
      } catch (error) {
        console.error('Failed to toggle meal completion:', error);
      }
      setSelectedMeal(null);
    } else if (action === 'edit') {
      // Navigate to edit screen
      try {
        console.log('🔄 Screen: Editing meal...', selectedMeal.meal.name);
        
        // Convert meal to the format expected by ManualMealEntryScreen
        const mealToEdit = {
          id: selectedMeal.meal.id,
          name: selectedMeal.meal.name,
          type: selectedMeal.meal.type,
          time: selectedMeal.meal.time,
          calories: selectedMeal.meal.calories,
          // Include both formats for nutrition data
          protein: selectedMeal.meal.macros?.protein || 0,
          carbs: selectedMeal.meal.macros?.carbs || 0,
          fat: selectedMeal.meal.macros?.fat || 0,
          macros: {
            protein: selectedMeal.meal.macros?.protein || 0,
            carbs: selectedMeal.meal.macros?.carbs || 0,
            fat: selectedMeal.meal.macros?.fat || 0,
          },
          // Include both formats for timing data
          prepTime: selectedMeal.meal.prep_time || 0,
          prep_time: selectedMeal.meal.prep_time || 0,
          cookTime: selectedMeal.meal.cook_time || 0,
          cook_time: selectedMeal.meal.cook_time || 0,
          servings: selectedMeal.meal.servings || 1,
          ingredients: selectedMeal.meal.ingredients || [],
          instructions: selectedMeal.meal.instructions || []
        };
        
        // Navigate to ManualMealEntryScreen with edit data
        navigation.navigate('ManualMealEntry', { 
          editMeal: mealToEdit,
          isEditing: true
        });
        
        setSelectedMeal(null);
      } catch (error) {
        console.error('Failed to navigate to edit screen:', error);
        Alert.alert('Error', 'Failed to open edit screen.');
        setSelectedMeal(null);
      }
    } else if (action === 'delete') {
      // Show delete confirmation modal
      setShowDeleteModal(true);
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (selectedMeal) {
      console.log('🔄 Screen: Starting deletion process...');
      const success = await deleteMealFromDay(selectedMeal.meal, selectedMeal.index);
      console.log('🔄 Screen: Deletion result:', success);
      
      setShowDeleteModal(false);
      setSelectedMeal(null);
      
      // CRITICAL FIX: Force immediate UI update
      if (success) {
        console.log('🔄 Screen: Forcing immediate meal reload...');
        
        // Get the viewing date using clean navigation
        const currentViewingDate = viewingDate;
        console.log(`📅 Reload: Using clean date ${currentViewingDate}`);
        if (currentViewingDate) {
          // Use simplified context for force reload
          const updatedMeals = getMealsForDate(currentViewingDate);
          console.log('🔄 Screen: Simplified context returned updated meals:', updatedMeals.length);
          
          // Always use simplified context data
          setAllMeals(updatedMeals);
          console.log('✅ Screen: Forced UI update complete with simplified context');
        }
      }
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    // Keep selectedMeal for action sheet return
  };

  // Quick toggle meal completion (for checkbox)
  const quickToggleMealCompletion = async (meal: Meal, index: number) => {
    try {
      if (!viewingDate) {
        console.error('No viewing date available for meal completion');
        return;
      }
      
      const mealKey = `${index}_${meal.id || meal.name}`;
      const currentCompletionState = completedMeals[mealKey] || false;
      const newCompletionState = !currentCompletionState;
      
      const updatedCompletions = {
        ...completedMeals,
        [mealKey]: newCompletionState
      };
      
      setCompletedMeals(updatedCompletions);
      saveMealCompletions(viewingDate, updatedCompletions);
      
      console.log('✅ Quick meal completion toggled:', meal.name, '→', newCompletionState ? 'completed' : 'incomplete');
    } catch (error) {
      console.error('Failed to quickly toggle meal completion:', error);
    }
  };

  const closeAddMeal = () => {
    setShowAddMealModal(false);
    setSelectedRecipe(null);
    setNewMealName('');
    setNewMealType('snack');
    setNewMealCalories('');
    setNewMealProtein('');
    setNewMealCarbs('');
    setNewMealFat('');
  };

  // A favourite entry is { meal, plate, slug, plateId, key }; we read macros /
  // name / photo from the specific favourited plate. Falls back gracefully if
  // handed a raw meal (defensive).
  const recipeFields = (r: any) => {
    const meal = r?.meal || r;
    const plate = r?.plate || meal?.plates?.[0];
    const m = plate?.plate_macros || {};
    return {
      slug: meal?.slug,
      plateId: plate?.id,
      key: r?.key || `${meal?.slug}::${plate?.id}`,
      name: plate?.display_name || meal?.display_name || 'Recipe',
      photo: meal?.photo_url || null,
      localName: plate?.image_filename || meal?.image_filename || null,
      kcal: Math.round(m.kcal || 0),
      protein: Math.round(m.protein_g || 0),
      carbs: Math.round(m.carbs_g || 0),
      fat: Math.round(m.fat_g || 0),
    };
  };

  const prefillFromRecipe = (r: any) => {
    const f = recipeFields(r);
    setSelectedRecipe(r);
    setNewMealName(f.name);
    setNewMealCalories(f.kcal ? String(f.kcal) : '');
    setNewMealProtein(f.protein ? String(f.protein) : '');
    setNewMealCarbs(f.carbs ? String(f.carbs) : '');
    setNewMealFat(f.fat ? String(f.fat) : '');
  };

  const logQuickMeal = async () => {
    const cal = parseInt(newMealCalories) || 0;
    const p = parseInt(newMealProtein) || 0;
    const c = parseInt(newMealCarbs) || 0;
    const f = parseInt(newMealFat) || 0;
    if (!cal && !p && !c && !f) return;

    const rf = selectedRecipe ? recipeFields(selectedRecipe) : null;

    // Typed loosely: photo_url/slug aren't on SimplifiedMeal yet, but we attach
    // them so logged-from-recipe meals can show their photo on the day screen.
    const meal: any = {
      name: newMealName.trim() || 'Logged meal',
      type: newMealType === 'custom' ? 'snack' : newMealType,
      time: '',
      calories: cal,
      macros: { protein: p, carbs: c, fat: f },
      ingredients: [],
      instructions: [],
      tags: ['off-plan'],
      isOriginal: false,
      addedAt: new Date().toISOString(),
    };
    if (rf?.photo) meal.photo_url = rf.photo;
    if (rf?.localName) meal.image_filename = rf.localName;
    if (rf?.slug) meal.slug = rf.slug;
    if (rf?.plateId) meal.plate_id = rf.plateId;

    let targetDate = viewingDate;
    if (!targetDate && currentPlan && typeof legacyDayIndex === 'number') {
      const dates = Object.keys(currentPlan.dailyMeals).sort();
      if (legacyDayIndex >= 0 && legacyDayIndex < dates.length) targetDate = dates[legacyDayIndex];
    }

    if (!targetDate) {
      Alert.alert('Error', 'Could not determine the day to log this meal.');
      return;
    }

    const success = await addMealToDate(targetDate, meal);
    if (success) {
      closeAddMeal();
      await loadCurrentDayMeals();
    } else {
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    }
  };

  const canLog = !!(newMealCalories.trim() || newMealProtein.trim() || newMealCarbs.trim() || newMealFat.trim());

  // Calculate daily totals
  const dailyTotals = allMeals.reduce((totals, meal) => {
    return {
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.macros?.protein || 0),
      carbs: totals.carbs + (meal.macros?.carbs || 0),
      fat: totals.fat + (meal.macros?.fat || 0),
      fiber: totals.fiber + (meal.macros?.fiber || 0),
      prepTime: totals.prepTime + (meal.total_time || meal.prep_time || 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, prepTime: 0 });

  // Calculate completion progress (simplified - completion tracking can be added later)
  const completedMealsCount = allMeals.filter((meal, index) => {
    const mealKey = `${index}_${meal.id || meal.name}`;
    const isCompleted = completedMeals[mealKey] || false;
    console.log('Progress check:', { 
      mealName: meal.name, 
      mealKey, 
      index, 
      isCompleted 
    });
    return isCompleted;
  }).length;
  
  // Calculate nutrition from completed meals only (simplified)
  const completedNutrition = allMeals.reduce((totals, meal, index) => {
    const mealKey = `${index}_${meal.id || meal.name}`;
    const isCompleted = completedMeals[mealKey] || false;
    
    if (isCompleted) {
      return {
        calories: totals.calories + (meal.calories || 0),
        protein: totals.protein + (meal.macros?.protein || 0),
        carbs: totals.carbs + (meal.macros?.carbs || 0),
        fat: totals.fat + (meal.macros?.fat || 0),
      };
    }
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  const progressPercentage = allMeals.length > 0 ? (completedMealsCount / allMeals.length) * 100 : 0;
  
  console.log('Progress summary:', {
    completedMealsCount,
    totalMeals: allMeals.length,
    progressPercentage
  });

  const getMealIcon = (mealType: string, isAdjuster?: boolean) => {
    if (isAdjuster) return 'add-circle-outline';
    
    switch (mealType) {
      case 'breakfast': return 'sunny';
      case 'brunch': return 'partly-sunny';
      case 'lunch': return 'restaurant';
      case 'second_lunch': return 'fast-food';
      case 'early_dinner': return 'wine';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      case 'morning_snack': return 'cafe';
      case 'afternoon_snack': return 'ice-cream';
      case 'evening_snack': return 'pizza';
      case 'pre_workout': return 'fitness';
      case 'post_workout': return 'barbell';
      default: return 'restaurant';
    }
  };

  const getMealColor = (mealType: string, isAdjuster?: boolean) => {
    if (isAdjuster) return '#6b7280'; // Neutral gray for adjusters
    
    switch (mealType) {
      // Main meals - warm to cool progression through the day
      case 'breakfast': return '#f97316'; // Warm orange (morning energy)
      case 'brunch': return '#eab308'; // Golden yellow (late morning)
      case 'lunch': return '#3b82f6'; // Blue (midday focus)
      case 'second_lunch': return '#2563eb'; // Darker blue
      case 'early_dinner': return '#7c3aed'; // Purple (early evening)
      case 'dinner': return '#8b5cf6'; // Lighter purple (evening)
      
      // Snacks - complementary colors between main meals
      case 'snack': return '#10b981'; // Green (general snack)
      case 'morning_snack': return '#f59e0b'; // Amber (between breakfast and lunch)
      case 'afternoon_snack': return '#06b6d4'; // Cyan (between lunch and dinner)
      case 'evening_snack': return '#ec4899'; // Pink (after dinner)
      
      // Special/workout meals
      case 'pre_workout': return '#dc2626'; // Red (energy/intensity)
      case 'post_workout': return '#16a34a'; // Green (recovery)
      
      default: return '#6b7280'; // Gray for unknown types
    }
  };

  const handleMealPress = (meal: Meal) => {
    const slug = (meal as any).curated_meal_slug || (meal as any).slug;
    // Curated meals resolve to a real recipe → open the full RecipeDetail.
    // Pass the plan's scale_factor so the screen shows THIS serving's macros
    // and ingredient amounts (plate macros × scale_factor), matching the day
    // card, instead of the unscaled base plate. plate_id pre-selects plating.
    if (slug) {
      navigation.navigate('RecipeDetail', {
        mealSlug: slug,
        plateId: (meal as any).plate_id,
        scaleFactor: (meal as any).scale_factor, // undefined → RecipeDetail opens at base (×1)
      } as any);
      return;
    }
    // Manually-logged / off-plan meals have no curated recipe → keep them on the
    // nutrition MealDetailScreen.
    navigation.navigate('MealDetail', { meal } as any);
  };

  // Helper function to convert time string to minutes for sorting
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    try {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let totalMinutes;
      if (period === 'AM') {
        if (hours === 12) {
          totalMinutes = minutes; // 12:XX AM = XX minutes after midnight
        } else {
          totalMinutes = hours * 60 + minutes;
        }
      } else { // PM
        if (hours === 12) {
          totalMinutes = 12 * 60 + minutes; // 12:XX PM = 720 + XX minutes
        } else {
          totalMinutes = (hours + 12) * 60 + minutes; // 1-11 PM = add 12 hours
        }
      }
      
      console.log(`⏰ Time conversion: ${timeStr} = ${totalMinutes} minutes`);
      return totalMinutes;
    } catch {
      return 0;
    }
  };

  // Sort meals chronologically by recommended_time, fallback to meal type order
  const mealTypeOrder = { 'breakfast': 0, 'snack': 1, 'lunch': 2, 'dinner': 3, 'dessert': 4 };
  const sortedMeals = allMeals.sort((a, b) => {
    const timeA = a.time ? timeToMinutes(a.time) : (mealTypeOrder[a.type] || 0) * 360; // 6-hour gaps as fallback
    const timeB = b.time ? timeToMinutes(b.time) : (mealTypeOrder[b.type] || 0) * 360;
    
    console.log(`⏰ Sorting: ${a.name || 'unnamed'} (${a.time || 'no time'}) = ${timeA} minutes`);
    console.log(`⏰ Sorting: ${b.name || 'unnamed'} (${b.time || 'no time'}) = ${timeB} minutes`);
    console.log(`⏰ Comparison: ${a.name || 'unnamed'} vs ${b.name || 'unnamed'} = ${timeA - timeB}`);
    
    return timeA - timeB;
  });

  // Keep each meal's original index (for completion keys), then split planned
  // meals from off-plan logged extras so they render in separate sections.
  const rows = sortedMeals.map((meal, index) => ({ meal, index }));
  const plannedRows = rows.filter((x) => (x.meal as any).isOriginal !== false);
  const offPlanRows = rows.filter((x) => (x.meal as any).isOriginal === false);
  const plannedDone = plannedRows.filter(({ meal, index }) => completedMeals[`${index}_${(meal as any).id || meal.name}`]).length;
  const plannedPct = plannedRows.length > 0 ? (plannedDone / plannedRows.length) * 100 : 0;

  // Fixed delete-button width: card is min(screenW-56, 340) wide, 26 padding each
  // side, two buttons with a 12 gap. (flex:1 on gesture-handler touchables
  // collapses, hiding the labels.)
  const delBtnW = (Math.min(Dimensions.get('window').width - 56, 340) - 52 - 12) / 2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddMealModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add" size={26} color={themeColor} />
          </TouchableOpacity>
        </View>

        {/* Menu-style header (no outline) */}
        <View style={styles.menuHeader}>
          <Text style={styles.menuOverline}>{displayInfo.displayDate}</Text>
          <Text style={styles.menuDay}>{displayInfo.dayName}</Text>
          <Text style={styles.menuSub}>
            <Text style={styles.menuSubAccent}>{Math.round(completedNutrition.protein)}</Text> / {Math.round(dailyTotals.protein)}g protein · <Text style={styles.menuSubAccent}>{Math.round(completedNutrition.calories).toLocaleString()}</Text> / {Math.round(dailyTotals.calories).toLocaleString()} kcal
          </Text>
          {allMeals.length > 0 && (
            <>
              <View style={styles.hairline} />
              <View style={styles.dayProgressTrack}>
                <View style={[styles.dayProgressFill, { width: `${progressPercentage}%`, backgroundColor: themeColor }]} />
              </View>
              <Text style={styles.loggedText}>{completedMealsCount} of {allMeals.length} eaten</Text>
            </>
          )}
        </View>

        {/* Photo meal timeline (planned) */}
        {plannedRows.length > 0 && (
          <View style={styles.timelineWrap}>
            <Text style={styles.timelineLabel}>Timeline</Text>
            {plannedRows.map(({ meal, index }) => {
              const mealKey = `${index}_${(meal as any).id || meal.name}`;
              const isCompleted = completedMeals[mealKey] || false;
              return (
                <MealCard
                  key={index}
                  meal={meal}
                  onPress={() => handleMealPress(meal)}
                  onLongPress={() => handleMealLongPress(meal, index)}
                  onToggleComplete={() => quickToggleMealCompletion(meal, index)}
                  themeColor={themeColor}
                  mealIcon={getMealIcon(meal.type, meal.tags?.includes('adjuster'))}
                  mealColor={getMealColor(meal.type, meal.tags?.includes('adjuster'))}
                  isCompleted={isCompleted}
                  freshnessIndex={freshnessIndex}
                  currentDate={targetDate}
                />
              );
            })}
          </View>
        )}

        {/* Off-plan / logged extras */}
        {offPlanRows.length > 0 && (
          <View style={styles.timelineWrap}>
            <Text style={styles.timelineLabel}>Off-plan</Text>
            {offPlanRows.map(({ meal, index }) => {
              const mealKey = `${index}_${(meal as any).id || meal.name}`;
              const isCompleted = completedMeals[mealKey] || false;
              return (
                <MealCard
                  key={index}
                  meal={meal}
                  onPress={() => handleMealPress(meal)}
                  onLongPress={() => handleMealLongPress(meal, index)}
                  onToggleComplete={() => quickToggleMealCompletion(meal, index)}
                  themeColor={themeColor}
                  mealIcon={getMealIcon(meal.type, meal.tags?.includes('adjuster'))}
                  mealColor={getMealColor(meal.type, meal.tags?.includes('adjuster'))}
                  isCompleted={isCompleted}
                  freshnessIndex={freshnessIndex}
                  currentDate={targetDate}
                />
              );
            })}
          </View>
        )}

        {allMeals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={56} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No meals planned</Text>
            <Text style={styles.emptyDescription}>
              This day doesn't have any meals yet. Tap + to add one.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick add / log a meal */}
      <Modal
        visible={showAddMealModal}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeAddMeal}
      >
        <View style={styles.modalScreen}>
          <View style={styles.qaHeader}>
            <TouchableOpacity onPress={closeAddMeal} style={styles.qaBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.qaTitle}>Log a meal</Text>
            <View style={{ width: 26 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={styles.modalScrollContent}
              contentContainerStyle={styles.qaContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.qaLabel}>What did you eat? <Text style={styles.qaOptional}>(optional)</Text></Text>
              <TextInput
                style={styles.qaField}
                placeholder="e.g. Cafe burrito"
                placeholderTextColor="#5a5a60"
                value={newMealName}
                onChangeText={setNewMealName}
                autoCapitalize="words"
              />

              <Text style={[styles.qaLabel, { marginTop: 18 }]}>Meal</Text>
              {([['breakfast', 'lunch', 'dinner'], ['snack', 'dessert']] as const).map((row, ri) => (
                <View key={ri} style={[styles.qaSegment, ri > 0 && { marginTop: 8 }]}>
                  {row.map((t) => {
                    const active = newMealType === t;
                    const segW = (Dimensions.get('window').width - 46) / row.length;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.qaSegItem, { width: segW }, active && { backgroundColor: themeColor }]}
                        activeOpacity={0.8}
                        onPress={() => setNewMealType(t)}
                      >
                        <Text style={[styles.qaSegText, active && styles.qaSegTextActive]} numberOfLines={1}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <Text style={[styles.qaLabel, { marginTop: 18 }]}>Macros</Text>
              <View style={styles.qaMacroRow}>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealCalories} onChangeText={setNewMealCalories} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Kcal</Text>
                </View>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealProtein} onChangeText={setNewMealProtein} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Protein</Text>
                </View>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealCarbs} onChangeText={setNewMealCarbs} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Carbs</Text>
                </View>
                <View style={styles.qaMacroCol}>
                  <TextInput style={styles.qaMacroInput} placeholder="0" placeholderTextColor="#5a5a60" value={newMealFat} onChangeText={setNewMealFat} keyboardType="numeric" textAlign="center" />
                  <Text style={styles.qaMacroLbl}>Fat</Text>
                </View>
              </View>

              {favRecipes.length > 0 && (
                <>
                  <View style={styles.qaDivider}>
                    <View style={styles.qaDivLine} />
                    <Text style={styles.qaDivText}>OR PICK A FAVOURITE</Text>
                    <View style={styles.qaDivLine} />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.qaFavRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {favRecipes.map((r) => {
                      const f = recipeFields(r);
                      const selected = selectedRecipe?.key === f.key;
                      const localSrc = f.localName ? getMealImage(f.localName) : null;
                      return (
                        <TouchableOpacity
                          key={f.key}
                          style={[styles.qaFav, selected && { borderColor: themeColor }]}
                          activeOpacity={0.8}
                          onPress={() => prefillFromRecipe(r)}
                        >
                          {localSrc ? (
                            <Image source={localSrc} style={styles.qaFavPhoto} resizeMode="cover" />
                          ) : f.photo ? (
                            <Image source={{ uri: f.photo }} style={styles.qaFavPhoto} resizeMode="cover" />
                          ) : (
                            <View style={styles.qaFavPhotoFallback}>
                              <Ionicons name="restaurant-outline" size={20} color="#52525b" />
                            </View>
                          )}
                          <Text style={[styles.qaFavName, selected && { color: themeColor }]} numberOfLines={1}>{f.name}</Text>
                          <Text style={styles.qaFavKcal}>{f.kcal} kcal · {f.protein}g P</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </ScrollView>

            <View style={styles.qaAction}>
              <TouchableOpacity
                style={[styles.qaBtn, canLog ? { backgroundColor: themeColor } : styles.qaBtnDisabled]}
                onPress={logQuickMeal}
                disabled={!canLog}
                activeOpacity={0.85}
              >
                <Text style={[styles.qaBtnText, !canLog && styles.qaBtnTextDisabled]}>Log it</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeAddMeal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                <Text style={styles.qaCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Action Sheet */}
      <Modal
        visible={showActionSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleActionSheetAction('cancel')}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => handleActionSheetAction('cancel')}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle} numberOfLines={1}>{selectedMeal?.meal.name}</Text>
            <View style={styles.sheetDivider} />

            <TouchableOpacity style={styles.sheetRow} onPress={() => handleActionSheetAction('complete')} activeOpacity={0.7}>
              <Ionicons name={selectedMeal?.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={themeColor} />
              <Text style={styles.sheetRowText}>{selectedMeal?.isCompleted ? 'Mark as not eaten' : 'Mark as eaten'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetRow, styles.sheetRowLast]} onPress={() => handleActionSheetAction('delete')} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.sheetRowText, { color: '#ef4444' }]}>Delete meal</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => handleActionSheetAction('cancel')} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.delOverlay}>
          <View style={styles.delCard}>
            <View style={styles.delIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.delTitle}>Delete meal</Text>
            <Text style={styles.delName} numberOfLines={2}>{selectedMeal?.meal.name}</Text>
            <Text style={styles.delBody}>This removes it from your day. You can't undo this.</Text>
            <View style={styles.delButtons}>
              <TouchableOpacity style={[styles.delCancel, { width: delBtnW }]} onPress={handleCancelDelete} activeOpacity={0.8}>
                <Text style={styles.delCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.delConfirm, { width: delBtnW }]} onPress={handleConfirmDelete} activeOpacity={0.85}>
                <Text style={styles.delConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPad: {
    paddingBottom: 48,
  },

  // ---- New: top bar ----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { padding: 4 },

  // ---- New: menu-style header (no outline) ----
  menuHeader: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 22,
  },
  menuOverline: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  menuDay: {
    fontFamily: SERIF,
    fontSize: 34,
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
  },
  menuSub: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    marginTop: 10,
  },
  menuSubAccent: {
    fontFamily: SERIF,
    fontSize: 16,
    color: '#dcdce0',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2a30',
    alignSelf: 'stretch',
    marginTop: 18,
    marginBottom: 14,
  },
  dayProgressTrack: {
    height: 4,
    backgroundColor: '#1c1c22',
    borderRadius: 2,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  loggedText: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 9,
  },

  // ---- New: photo meal timeline ----
  timelineWrap: {
    paddingHorizontal: 18,
  },
  timelineLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: FAINT,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  mcard: {
    borderRadius: 18,
    marginBottom: 18,
  },
  mcardDone: {
    opacity: 0.5,
  },
  photoWrap: {
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#121216',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141416',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,8,10,0.62)',
  },
  chip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  viewHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: '#e8e8ea',
    fontWeight: '600',
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#06262b',
    fontSize: 14,
    fontWeight: '700',
  },
  mbody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 11,
    paddingHorizontal: 2,
  },
  checkBtn: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mname: {
    fontFamily: SERIF,
    fontSize: 18,
    color: '#ffffff',
  },
  mnameDone: {
    textDecorationLine: 'line-through',
    color: '#8a8a90',
  },
  mmacroDone: {
    color: '#5a5a60',
  },
  mmacro: {
    fontSize: 12,
    color: MUTED,
    marginTop: 5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  freezerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  freezerChipText: {
    fontSize: 10,
    color: '#60a5fa',
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ---- Quick add / log a meal ----
  qaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#18181c' },
  qaBack: { padding: 4 },
  qaTitle: { fontFamily: SERIF, fontSize: 20, color: '#ffffff' },
  qaContent: { padding: 20, paddingBottom: 40 },
  qaLabel: { fontSize: 10, letterSpacing: 2, color: FAINT, fontWeight: '600', textTransform: 'uppercase', marginBottom: 9 },
  qaOptional: { letterSpacing: 0, textTransform: 'none', color: '#4a4a50' },
  qaFavRow: { paddingRight: 8 },
  qaFav: { width: 140, borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 14, overflow: 'hidden', marginRight: 9 },
  qaFavPhoto: { width: '100%', height: 76 },
  qaFavPhotoFallback: { width: '100%', height: 76, backgroundColor: '#141416', alignItems: 'center', justifyContent: 'center' },
  qaFavName: { fontFamily: SERIF, fontSize: 14, color: '#e8e8ea', paddingHorizontal: 10, paddingTop: 8 },
  qaFavKcal: { fontSize: 11, color: MUTED, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 3 },
  qaDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 18 },
  qaDivLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#222' },
  qaDivText: { fontSize: 10, letterSpacing: 1.5, color: '#5a5a60', fontWeight: '600' },
  qaField: { backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#f4f4f6', minHeight: 48 },
  qaMacroRow: { flexDirection: 'row', gap: 9 },
  qaSegment: { flexDirection: 'row', backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 13, padding: 3 },
  qaSegItem: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qaSegText: { fontSize: 13, color: '#9a9aa0' },
  qaSegTextActive: { color: '#06262b', fontWeight: '600' },
  qaMacroCol: { flex: 1 },
  qaMacroInput: { backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 12, paddingVertical: 13, fontSize: 15, color: '#f4f4f6', minHeight: 48 },
  qaMacroLbl: { textAlign: 'center', fontSize: 9, letterSpacing: 1, color: FAINT, fontWeight: '600', textTransform: 'uppercase', marginTop: 6 },
  qaAction: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#18181c' },
  qaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  qaBtnDisabled: { backgroundColor: '#1a1a1e' },
  qaBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  qaBtnTextDisabled: { color: '#5a5a60' },
  qaCancel: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 14 },

  // ===== Existing modal / picker / sheet styles (unchanged) =====
  modalScreen: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  navBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  navSpacer: {
    width: 44,
  },
  modalScrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
  },
  mealTypeOption: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  optionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  mealForm: {
    paddingTop: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    minHeight: 48,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  macroField: {
    flex: 1,
  },
  addMealButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addMealButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  favoritesSelection: {
    paddingTop: 20,
  },
  favoriteMealCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  selectedMealCard: {
    borderWidth: 2,
    backgroundColor: '#1a1a1f',
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favoriteMealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  mealMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calorieText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  macroItem: {
    fontSize: 12,
    color: '#9ca3af',
  },
  mealStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 11,
    color: '#6b7280',
  },
  timeSelectionSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  mealTypeSelection: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mealTypeButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  mealTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  timePickerButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    width: '90%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  timePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  timePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  timePickerContent: {
    padding: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePicker: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timePickerItem: {
    fontSize: 18,
    color: '#ffffff',
  },

  // ---- Revamped action sheet ----
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetBackdrop: { flex: 1 },
  sheetCard: { backgroundColor: '#141416', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#26262c' },
  sheetGrabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#2a2a30', marginBottom: 16 },
  sheetTitle: { fontFamily: SERIF, fontSize: 20, color: '#ffffff', textAlign: 'center' },
  sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#222', marginTop: 14, marginBottom: 2 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1c1c20' },
  sheetRowLast: { borderBottomWidth: 0 },
  sheetRowText: { fontSize: 16, color: '#f4f4f6', fontWeight: '500' },
  sheetCancel: { marginTop: 16, paddingVertical: 15, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2a2a30', alignItems: 'center' },
  sheetCancelText: { fontSize: 15, color: MUTED, fontWeight: '600' },

  // ---- Revamped delete confirm ----
  delOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  delCard: { width: '100%', maxWidth: 340, backgroundColor: '#141416', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', padding: 26, alignItems: 'center' },
  delIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  delTitle: { fontFamily: SERIF, fontSize: 21, color: '#ffffff', marginBottom: 6 },
  delName: { fontSize: 15, color: '#ef4444', fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  delBody: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  delButtons: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  delCancel: { paddingVertical: 14, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2a2a30', alignItems: 'center' },
  delCancelText: { fontSize: 15, color: '#cfcfd4', fontWeight: '600' },
  delConfirm: { paddingVertical: 14, borderRadius: 13, backgroundColor: '#ef4444', alignItems: 'center' },
  delConfirmText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },

  actionSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionSheetBackdrop: {
    flex: 1,
  },
  actionSheetContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionSheetSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#27272a',
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  actionSheetButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  actionSheetCancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  deleteModalCancelButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#404040',
  },
  deleteModalConfirmButton: {
    backgroundColor: '#ef4444',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
```

## FILE: src/screens/MealPlanPreviewScreen.tsx  (885 lines)

```tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { TouchableOpacity as GHTouchable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { MealPlan } from '../utils/storage';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { getMealImage } from '../assets/mealImages';

/**
 * MealPlanPreviewScreen — opens when a user taps a saved meal plan in Library.
 *
 * Revamped layout (v2) — photo-forward, fewer taps:
 *   - Hero mosaic: up to 4 unique meal photos as a full-bleed grid at the top,
 *     with a flat scrim holding the overline ("SAVED MEAL PLAN · N DAYS") and
 *     the plan title. Replaces the old pill + centered title + filmstrip.
 *   - Floating back button pinned over the hero (stays put while scrolling).
 *   - Borderless 3-stat strip: kcal/day · protein/day · meals/day. The day
 *     count lives in the overline now, freeing the third stat slot.
 *   - Day chips replace the accordion. One `selectedDay` index instead of an
 *     `openDays` Set — every day is one tap and meals are always visible.
 *   - Meal rows show macro CHIPS: protein tinted in themeColor (the number
 *     our avatar scans for), carbs/fat neutral.
 *   - Sticky "Use this plan" CTA unchanged.
 *
 * Example mode (isExample route param): same screen, two changes only —
 * overline reads "EXAMPLE PLAN" and the CTA reads "Build my own plan" and
 * routes into the meal questionnaire instead of saving. There is NO save path
 * in example mode, so a previewed example can never land in the user's plan
 * list (open it with 0 plans or 50, it changes nothing). Real Library previews
 * pass no flag and behave exactly as before.
 *
 * Empty-data gate: if no days resolve, the hero/stats/chips are suppressed
 * entirely (no broken mosaic of fallback icons) — plain header + empty state
 * + CTA only.
 *
 * A Library-saved meal plan stores the ORIGINAL SimplifiedMealPlan as its
 * `data` field (see NutritionHomeScreen.handleToggleSaveMealPlan), so meals
 * keep their curated_meal_slug + plate_id — exactly what we need to resolve
 * photos. Image resolution mirrors MealPlanDayScreen.MealCard: direct
 * image_filename / photo_url first, else hydrate from CURATED_MEALS via the
 * slug + plate, then getMealImage() for the local asset.
 *
 * Also understands the two legacy shapes (data.days[] / data.weeks[0].days[])
 * so it never renders blank, and falls back to a type icon when a meal has no
 * resolvable photo.
 *
 * Import = saveMealPlan(data): upserts by id (no dupe) AND sets the plan as
 * current in one shot. migrateLegacyPlan(plan) is the fallback for any plan
 * whose data isn't already a SimplifiedMealPlan.
 */

type RouteParams = {
  MealPlanPreview: { plan: MealPlan; isExample?: boolean };
};

type PreviewMeal = {
  key: string;
  name: string;
  type: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  imgLocal: any | null; // local require() from getMealImage
  imgUri: string | null; // remote URL fallback
  imgKey: string | null; // for de-duping the hero mosaic
};
type PreviewDay = {
  key: string;
  label: string;
  meals: PreviewMeal[];
};

// Fallback icon when a meal has no photo.
const iconForType = (t: string): any => {
  const k = (t || '').toLowerCase().replace(/\s+/g, '_');
  switch (k) {
    case 'breakfast':
    case 'brunch':
      return 'sunny-outline';
    case 'lunch':
    case 'second_lunch':
      return 'restaurant-outline';
    case 'dinner':
    case 'early_dinner':
      return 'moon-outline';
    case 'dessert':
      return 'ice-cream-outline';
    case 'pre_workout':
      return 'fitness-outline';
    case 'post_workout':
      return 'barbell-outline';
    case 'snack':
    case 'morning_snack':
    case 'afternoon_snack':
    case 'evening_snack':
      return 'nutrition-outline';
    default:
      return 'restaurant-outline';
  }
};

// Resolve a meal photo. Same chain as MealPlanDayScreen.MealCard.
const resolveMealImage = (
  m: any
): { local: any | null; uri: string | null; key: string | null } => {
  let imageFilename: string | null = m?.image_filename || null;
  let uri: string | null =
    m?.photo_url || m?.image || m?.imageUrl || m?.image_url || m?.photo || null;
  let key: string | null = imageFilename || uri || null;

  if (!imageFilename && !uri) {
    const slug = m?.curated_meal_slug || m?.slug || null;
    const cm = slug ? (CURATED_MEALS as any)[slug] : null;
    if (cm) {
      const plates = Array.isArray(cm.plates) ? cm.plates : [];
      const plateId = m?.plate_id || null;
      const plate =
        (plateId && plates.find((p: any) => p?.id === plateId)) || plates[0] || null;
      imageFilename = plate?.image_filename || cm.image_filename || null;
      uri = cm.photo_url || uri;
      key = (slug ? `${slug}:${plate?.id || ''}` : null) || imageFilename || uri;
    }
  }

  return { local: imageFilename ? getMealImage(imageFilename) : null, uri, key };
};

// Pull macros + photo off a meal regardless of which shape it came in as.
const readMeal = (m: any, dayKey: string, i: number): PreviewMeal => {
  const img = resolveMealImage(m);
  return {
    key: `${dayKey}-${i}`,
    name: m?.name || m?.meal_name || 'Meal',
    type: String(m?.type || m?.meal_type || '').replace(/_/g, ' '),
    time: m?.time || m?.recommended_time || '',
    calories: m?.calories || 0,
    protein: Math.round(m?.macros?.protein ?? 0),
    carbs: Math.round(m?.macros?.carbs ?? 0),
    fat: Math.round(m?.macros?.fat ?? 0),
    tags: Array.isArray(m?.tags) ? m.tags : [],
    imgLocal: img.local,
    imgUri: img.uri,
    imgKey: img.key,
  };
};

// Normalize a plan's data into an ordered list of days. Handles:
//   1. SimplifiedMealPlan  → data.dailyMeals (object keyed by date)
//   2. Legacy days         → data.days[]
//   3. Legacy weeks        → data.weeks[].days[]
const normalizeDays = (data: any): PreviewDay[] => {
  if (!data) return [];

  if (data.dailyMeals && typeof data.dailyMeals === 'object') {
    return Object.keys(data.dailyMeals)
      .sort()
      .map((dateKey, i) => {
        const d = data.dailyMeals[dateKey] || {};
        const meals = Array.isArray(d.meals) ? d.meals : [];
        return {
          key: dateKey,
          label: d.dayName || `Day ${i + 1}`,
          meals: meals.map((m: any, mi: number) => readMeal(m, dateKey, mi)),
        };
      });
  }

  const legacyDays: any[] = Array.isArray(data.days)
    ? data.days
    : Array.isArray(data.weeks)
    ? data.weeks.flatMap((w: any) => (Array.isArray(w?.days) ? w.days : []))
    : [];

  return legacyDays.map((d: any, i: number) => {
    const meals = Array.isArray(d?.meals) ? d.meals : [];
    const key = `day-${i}`;
    return {
      key,
      label: d?.day_name || d?.dayName || `Day ${i + 1}`,
      meals: meals.map((m: any, mi: number) => readMeal(m, key, mi)),
    };
  });
};

// Small reusable photo tile that picks local require → remote uri → icon.
function MealPhoto({
  meal,
  style,
  iconSize,
}: {
  meal: PreviewMeal;
  style: any;
  iconSize: number;
}) {
  if (meal.imgLocal) {
    return <Image source={meal.imgLocal} style={style} resizeMode="cover" />;
  }
  if (meal.imgUri) {
    return <Image source={{ uri: meal.imgUri }} style={style} resizeMode="cover" />;
  }
  return (
    <View style={[style, styles.photoFallback]}>
      <Ionicons name={iconForType(meal.type)} size={iconSize} color="#52525b" />
    </View>
  );
}

export default function MealPlanPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'MealPlanPreview'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const { saveMealPlan, migrateLegacyPlan } = useSimplifiedMealPlanning();

  const { plan, isExample } = route.params;
  const data = plan.data || {};

  const planName: string = data.name || plan.name || 'Untitled Plan';

  const days = useMemo(() => normalizeDays(data), [data]);
  const hasDays = days.length > 0;

  // Daily averages across days that have meals.
  const averages = useMemo(() => {
    let kcal = 0;
    let protein = 0;
    let mealCount = 0;
    let n = 0;
    for (const day of days) {
      if (!day.meals.length) continue;
      kcal += day.meals.reduce((t, m) => t + (m.calories || 0), 0);
      protein += day.meals.reduce((t, m) => t + (m.protein || 0), 0);
      mealCount += day.meals.length;
      n++;
    }
    if (n === 0 || kcal === 0) return null;
    return {
      kcal: Math.round(kcal / n / 10) * 10,
      protein: Math.round(protein / n),
      meals: Math.round(mealCount / n),
    };
  }, [days]);

  const dayCount = days.length || plan.duration || 0;

  // Hero mosaic: unique meal photos from across the whole plan (max 4).
  const heroMeals = useMemo(() => {
    const out: PreviewMeal[] = [];
    const seen = new Set<string>();
    for (const day of days) {
      for (const meal of day.meals) {
        if (!meal.imgLocal && !meal.imgUri) continue;
        const k = meal.imgKey || meal.name;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(meal);
        if (out.length >= 4) return out;
      }
    }
    return out;
  }, [days]);

  // Gate: only show the hero when there are real days AND real photos —
  // otherwise we'd render a broken-looking mosaic of fallback icons.
  const showHero = hasDays && heroMeals.length > 0;

  // Selected day — first day with meals by default.
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const idx = days.findIndex((d) => d.meals.length > 0);
    return idx >= 0 ? idx : 0;
  });
  const activeDay: PreviewDay | null = days[selectedDay] ?? days[0] ?? null;

  const overline = `${isExample ? 'EXAMPLE PLAN' : 'SAVED MEAL PLAN'}${
    dayCount ? ` · ${dayCount} ${dayCount === 1 ? 'DAY' : 'DAYS'}` : ''
  }`;

  const handleImport = () => {
    Alert.alert(
      'Use this meal plan?',
      `"${planName}" will become your active meal plan. You can still find it here in Library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use this plan',
          onPress: async () => {
            try {
              if (data && data.dailyMeals && data.id) {
                await saveMealPlan(data);
              } else if (data && (data.days || data.weeks)) {
                await migrateLegacyPlan(plan);
              } else {
                throw new Error('Meal plan has no usable data');
              }
              navigation.navigate('Main', { screen: 'Nutrition' });
            } catch (error) {
              console.error('Failed to set active meal plan:', error);
              Alert.alert('Error', 'Could not set as active. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Example mode: send them into the meal questionnaire to build a calibrated
  // plan rather than adopting this fixed sample. (Swap 'N1Goal' for the
  // onboarding contract screen once that's built.) No save happens here.
  const handleBuildOwn = () => {
    navigation.navigate('N1Goal', { fromOnboarding: true });
  };

  // Adaptive mosaic for 1–4 photos. gap:2 keeps the photo-grid feel.
  const renderMosaic = () => {
    const p = heroMeals;
    const tile = (meal: PreviewMeal) => (
      <View key={meal.key} style={styles.heroTile}>
        <MealPhoto meal={meal} style={styles.heroTileImg} iconSize={26} />
      </View>
    );
    if (p.length === 1) {
      return <View style={styles.heroGrid}>{tile(p[0])}</View>;
    }
    if (p.length === 2) {
      return (
        <View style={styles.heroGrid}>
          <View style={styles.heroRow}>
            {tile(p[0])}
            {tile(p[1])}
          </View>
        </View>
      );
    }
    if (p.length === 3) {
      return (
        <View style={styles.heroGrid}>
          <View style={styles.heroRow}>{tile(p[0])}</View>
          <View style={styles.heroRow}>
            {tile(p[1])}
            {tile(p[2])}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.heroGrid}>
        <View style={styles.heroRow}>
          {tile(p[0])}
          {tile(p[1])}
        </View>
        <View style={styles.heroRow}>
          {tile(p[2])}
          {tile(p[3])}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero mosaic with scrim title, OR plain header ─────────── */}
        {showHero ? (
          <View style={styles.hero}>
            {renderMosaic()}
            <View style={styles.heroOverlay}>
              <View style={styles.heroScrimSoft} />
              <View style={styles.heroScrim}>
                <Text style={[styles.overline, { color: themeColor }]}>{overline}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {planName}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.plainHeader, { paddingTop: insets.top + 56 }]}>
            <Text style={[styles.overline, { color: themeColor }]}>{overline}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {planName}
            </Text>
          </View>
        )}

        {hasDays && (
          <>
            {/* ── Stat strip: kcal/day · protein/day · meals/day ─────── */}
            <View style={styles.statRow}>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {averages ? averages.kcal.toLocaleString() : '—'}
                </Text>
                <Text style={styles.statLabel}>kcal / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {averages ? `${averages.protein}g` : '—'}
                </Text>
                <Text style={styles.statLabel}>protein / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {averages ? averages.meals : '—'}
                </Text>
                <Text style={styles.statLabel}>meals / day</Text>
              </View>
            </View>

            {/* ── Day chips (or a static label for single-day plans) ─── */}
            {days.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsRow}
              >
                {days.map((day, i) => {
                  const selected = i === selectedDay;
                  const empty = day.meals.length === 0;
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.dayChip,
                        selected && {
                          backgroundColor: themeColor,
                          borderColor: themeColor,
                        },
                        empty && !selected && styles.dayChipEmpty,
                      ]}
                      onPress={() => setSelectedDay(i)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          selected && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              activeDay && (
                <View style={styles.singleDayRow}>
                  <Text style={[styles.singleDayLabel, { color: themeColor }]}>
                    {activeDay.label.toUpperCase()}
                  </Text>
                  <Text style={styles.singleDayMeta}>
                    {activeDay.meals.length} meal
                    {activeDay.meals.length === 1 ? '' : 's'}
                  </Text>
                </View>
              )
            )}

            {/* ── Selected day's meals ───────────────────────────────── */}
            <View style={styles.mealList}>
              {activeDay && activeDay.meals.length > 0 ? (
                activeDay.meals.map((meal, mi) => {
                  const isLast = mi === activeDay.meals.length - 1;
                  const hasMacros = meal.protein > 0 || meal.carbs > 0 || meal.fat > 0;
                  return (
                    <View
                      key={meal.key}
                      style={[styles.mealRow, isLast && { borderBottomWidth: 0 }]}
                    >
                      <View style={styles.mealThumb}>
                        <MealPhoto meal={meal} style={styles.mealThumbImg} iconSize={20} />
                      </View>
                      <View style={styles.mealInfo}>
                        {(!!meal.type || !!meal.time) && (
                          <Text style={styles.mealMeta} numberOfLines={1}>
                            {meal.type.toUpperCase()}
                            {meal.type && meal.time ? ' · ' : ''}
                            {meal.time}
                          </Text>
                        )}
                        <Text style={styles.mealName} numberOfLines={1}>
                          {meal.name}
                        </Text>
                        <View style={styles.macroRow}>
                          {meal.calories > 0 && (
                            <Text style={styles.macroKcal}>{meal.calories} kcal</Text>
                          )}
                          {hasMacros && (
                            <>
                              <View
                                style={[
                                  styles.macroChip,
                                  { backgroundColor: themeColor + '20' },
                                ]}
                              >
                                <Text style={[styles.macroChipText, { color: themeColor }]}>
                                  P {meal.protein}
                                </Text>
                              </View>
                              <View style={[styles.macroChip, styles.macroChipNeutral]}>
                                <Text style={[styles.macroChipText, styles.macroChipTextNeutral]}>
                                  C {meal.carbs}
                                </Text>
                              </View>
                              <View style={[styles.macroChip, styles.macroChipNeutral]}>
                                <Text style={[styles.macroChipText, styles.macroChipTextNeutral]}>
                                  F {meal.fat}
                                </Text>
                              </View>
                            </>
                          )}
                          {meal.calories === 0 && !hasMacros && (
                            <Text style={styles.macroKcal}>—</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyDayBlock}>
                  <Ionicons name="cafe-outline" size={22} color="#52525b" />
                  <Text style={styles.emptyDayText}>No meals planned for this day.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Empty state if nothing resolved ───────────────────────── */}
        {!hasDays && (
          <View style={styles.emptyDataBlock}>
            <Ionicons name="alert-circle-outline" size={32} color="#71717a" />
            <Text style={styles.emptyDataText}>
              This plan doesn't have detailed day data. You can still use it.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating back button — pinned over the hero, above the scroll */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 4 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Sticky CTA */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <GHTouchable
          style={[styles.ctaButton, { backgroundColor: themeColor }]}
          onPress={isExample ? handleBuildOwn : handleImport}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {isExample ? 'Build my own plan' : 'Use this plan'}
          </Text>
        </GHTouchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    // No horizontal padding here — the hero is full-bleed.
    // Inner sections carry their own paddingHorizontal.
  },

  // Floating back button
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero mosaic
  hero: {
    height: 300,
    backgroundColor: '#131316',
  },
  heroGrid: {
    flex: 1,
    gap: 2,
  },
  heroRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  heroTile: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#131316',
  },
  heroTileImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Two flat layers fake a soft gradient without expo-linear-gradient.
  heroScrimSoft: {
    height: 26,
    backgroundColor: 'rgba(10, 10, 11, 0.45)',
  },
  heroScrim: {
    backgroundColor: 'rgba(10, 10, 11, 0.82)',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // Plain header (no resolvable photos / no day data)
  plainHeader: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  // Overline + title (shared by hero scrim and plain header)
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },

  // Stat strip
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Day chips
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#131316',
  },
  dayChipEmpty: {
    opacity: 0.4,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#a1a1aa',
  },
  dayChipTextSelected: {
    color: '#0a0a0b',
  },

  // Single-day label (chips would be pointless for one day)
  singleDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  singleDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    flex: 1,
  },
  singleDayMeta: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.3,
  },

  // Meal rows
  mealList: {
    paddingHorizontal: 18,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c20',
  },
  mealThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#131316',
    flexShrink: 0,
  },
  mealThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealMeta: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5f5f68',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroKcal: {
    fontSize: 12,
    color: '#a1a1aa',
    marginRight: 2,
  },
  macroChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  macroChipNeutral: {
    backgroundColor: '#1e1e22',
  },
  macroChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  macroChipTextNeutral: {
    color: '#a1a1aa',
  },

  // Empty selected day
  emptyDayBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  emptyDayText: {
    fontSize: 13,
    color: '#71717a',
  },

  // Empty data state
  emptyDataBlock: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyDataText: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
  },

  // Sticky CTA
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(10, 10, 11, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  ctaButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
  },
});
```

## FILE: src/screens/MealPrepSessionScreen.tsx  (988 lines)

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import {
  buildPrepSession,
  buildPrepSessionWithFreshness,
  PrepGroup,
  MakeFreshItem,
  PrepSession,
  PrepSessionWithFreshness,
  PrepSessionItem,
} from '../utils/buildPrepSession';
import { clampCookPortions } from '../utils/cookPortions';
import { getMealImage } from '../assets/mealImages';
import { CURATED_MEALS } from '../data/curated_meals';

type MealPrepNav = StackNavigationProp<RootStackParamList, 'MealPrepSession'>;

// ============================================================================
// The screen is a *guided worklist*, not a catalog. The user is never asked to
// decide what to do next — they're handed one active task at a time, in the
// order that finishes the whole session fastest. All the intelligence lives in
// buildWorklist(): everything else just renders the front of that queue.
// ============================================================================

// ---------------------------------------------------------------------------
// Time formatting — mirrors RecipeDetailScreen.formatTime.
// ---------------------------------------------------------------------------
function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function storageLine(storage?: { fridge_days?: number; freeze_months?: number }): string | null {
  if (!storage) return null;
  const parts: string[] = [];
  if (typeof storage.fridge_days === 'number' && storage.fridge_days > 0) {
    parts.push(`Fridge ${storage.fridge_days}d`);
  }
  if (typeof storage.freeze_months === 'number' && storage.freeze_months > 0) {
    parts.push(`Freezer ${storage.freeze_months}mo`);
  }
  return parts.length ? parts.join('  ·  ') : null;
}

function humanizeEquipment(e: string): string {
  return String(e).replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Prep-ahead copy. A prep-ahead meal is "cook the storable part now, finish one
// fresh thing at mealtime" — meatballs + sauce store, spaghetti is boiled fresh.
// That split is NOT reliably encoded in the recipe steps: for many partial meals
// the day-of element lives inside the method, not plate.additional_instructions,
// so there's no structured boundary to derive. We therefore render two SHORT
// authored fields, surfaced by buildPrepSession (plate meal_prep overrides meal):
//   prepAheadSummary  e.g. "Turkey meatballs + tomato sauce"
//   dayOfSummary      e.g. "Boil fresh spaghetti"
// No derivation from steps, no `prep_note` — both reintroduce long/ambiguous
// prose. A meal without summaries falls back to a clean generic label.
// ---------------------------------------------------------------------------
function prepNowText(g: PrepGroup): string {
  const v = g.prepAheadSummary?.trim();
  return v && v.length > 0 ? v : 'Prep the components ahead';
}
function dayOfText(g: PrepGroup): string {
  const v = g.dayOfSummary?.trim();
  return v && v.length > 0 ? v : 'Finish fresh at mealtime';
}

// ============================================================================
// Scheduling
// ----------------------------------------------------------------------------
// A WorkItem is a cook-ahead or prep-ahead batch the user has to actively get
// going. make-fresh items never enter the queue — they're cooked to order, so
// they have no place on prep day. This function is pure and could move into
// buildPrepSession.ts (the order is a deterministic property of the plan); it
// lives here for now to keep the prep-session builder untouched.
//
// Ordering model — minimise makespan for ONE cook:
//   passive = total − hands-on  ("set it and walk away" time)
//   A single cook is the bottleneck; their active work serialises while passive
//   cooks run unattended. So the makespan floor is the LONGEST single cook, and
//   you hit it by starting the longest-passive items first and spending their
//   idle hours on the quick active jobs. Hence: sort by passive desc.
// ============================================================================

type Strategy = 'cook' | 'prep';

// A WorkItem is one task in the queue. Crucially it can span MULTIPLE plates of
// the same meal: the cook/prep work is shared (you grill all the koftas once,
// then split them into a bowl and a wrap), so those plates collapse into a
// single task here. The per-plate day-of finishes are kept as `dayOfLines`.
interface WorkItem {
  group: PrepGroup; // representative plate — storage, slug, recipe nav
  image: ImageSourcePropType | null; // meal photo (representative plate)
  doneKey: string; // dedupe key for done-state (slug-scoped when merged)
  strategy: Strategy;
  title: string; // meal-level name when merged, else the specific plate name
  cookServings: number; // summed across merged plates
  coverage: number; // meals covered, summed across merged plates
  prepAheadSummary?: string; // shared prep-now copy ('prep' only)
  dayOfLines: string[]; // day-of finishes ('prep' only); 1 line, or 1-per-plate
  total: number; // wall-clock minutes for ONE cook (not summed)
  handsOn: number; // active minutes for ONE cook (falls back to total)
  handsOnKnown: boolean;
  passive: number; // max(0, total − hands-on)
  setAndForget: boolean; // mostly unattended → "start it and walk away"
}

// PrepGroup is assumed to carry per-batch active minutes as `activeMinutes`.
// If buildPrepSession names that field differently, change THIS LINE ONLY and
// everything downstream (ordering, copy, finish estimate) follows.
function readHandsOn(group: PrepGroup): number | null {
  const raw = (group as unknown as { activeMinutes?: number }).activeMinutes;
  return typeof raw === 'number' && raw > 0 ? raw : null;
}

// Meal photo, resolved the same way the rest of the app does: look up the
// curated meal by slug, prefer the specific plate's image_filename, fall back
// to the meal-level one, then hand the filename to getMealImage(). Mirrors
// renderFeedCard in NutritionHomeScreen. Returns null only if nothing resolves,
// so a missing asset degrades to a neutral block instead of a broken image.
function mealImageSource(group: PrepGroup): ImageSourcePropType | null {
  const meal = Object.values(CURATED_MEALS).find(
    (m: any) => m.slug === group.slug
  ) as any;
  if (!meal) return null;
  const plate = meal.plates?.find((p: any) => p.id === group.plateId);
  const fromPlate = plate?.image_filename ? getMealImage(plate.image_filename) : null;
  const fromMeal = meal.image_filename ? getMealImage(meal.image_filename) : null;
  return fromPlate ?? fromMeal ?? null;
}

function humanizeSlug(slug: string): string {
  return slug
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Per-plate view, before plates of the same meal are merged into one task.
interface RawItem {
  group: PrepGroup;
  strategy: Strategy;
  total: number;
  handsOn: number;
  handsOnKnown: boolean;
}

function toRaw(group: PrepGroup, strategy: Strategy): RawItem {
  const total = group.sortMinutes ?? 0;
  const rawHandsOn = readHandsOn(group);
  const handsOnKnown = rawHandsOn != null;
  const handsOn = handsOnKnown ? Math.min(rawHandsOn as number, total) : total;
  return { group, strategy, total, handsOn, handsOnKnown };
}

function buildWorklist(session: PrepSession): WorkItem[] {
  const raw: RawItem[] = [
    ...session.cookAhead.map((g) => toRaw(g, 'cook')),
    ...session.prepAhead.map((g) => toRaw(g, 'prep')),
  ];

  // Consolidate plates of the SAME meal. buildPrepSession groups by slug+plate,
  // so a meal on two plates yields two near-identical prep tasks — telling the
  // user to cook the same thing twice and double-counting its active minutes in
  // the finish estimate. Merge by strategy+slug: sum servings/coverage, take ONE
  // cook's time (not the sum), and keep each plate's distinct day-of finish.
  const buckets = new Map<string, RawItem[]>();
  for (const item of raw) {
    const k = `${item.strategy}:${item.group.slug}`;
    const arr = buckets.get(k);
    if (arr) arr.push(item);
    else buckets.set(k, [item]);
  }

  const items: WorkItem[] = [];
  for (const [bucketKey, plates] of buckets) {
    const rep = plates[0];
    const merged = plates.length > 1;

    const total = plates.reduce((m, i) => Math.max(m, i.total), 0);
    const handsOnKnown = plates.every((i) => i.handsOnKnown);
    // One cook, not N — the longest single batch's active time, never the sum.
    const handsOn = plates.reduce((m, i) => Math.max(m, i.handsOn), 0);
    const passive = Math.max(0, total - handsOn);
    const setAndForget = handsOnKnown && passive >= 20 && passive >= total * 0.5;

    const cookServings = plates.reduce((s, i) => s + (i.group.cookServings ?? 0), 0);
    const coverage = plates.reduce((s, i) => s + (i.group.occurrences ?? 0), 0);

    // Day-of finishes: collapse to one line when every plate finishes the same
    // way (lamb kofta bowl + wrap both "salad, sauce, warm rice/wrap"); label
    // each by plate name when they differ (schnitzel plate vs roll vs parma).
    let dayOfLines: string[] = [];
    if (rep.strategy === 'prep') {
      const seen = new Set<string>();
      const uniq: { label: string; summary: string }[] = [];
      for (const i of plates) {
        const summary = dayOfText(i.group);
        if (!seen.has(summary)) {
          seen.add(summary);
          uniq.push({ label: i.group.displayName, summary });
        }
      }
      dayOfLines =
        uniq.length <= 1
          ? uniq.map((u) => u.summary)
          : uniq.map((u) => `${u.label}: ${u.summary}`);
    }

    items.push({
      group: rep.group,
      image: mealImageSource(rep.group),
      doneKey: merged ? bucketKey : rep.group.key,
      strategy: rep.strategy,
      title: merged ? humanizeSlug(rep.group.slug) : rep.group.displayName,
      cookServings,
      coverage,
      prepAheadSummary: rep.strategy === 'prep' ? prepNowText(rep.group) : undefined,
      dayOfLines,
      total,
      handsOn,
      handsOnKnown,
      passive,
      setAndForget,
    });
  }

  // Longest passive first; tie-break on total time, then on coverage so the
  // batch feeding the most meals wins an otherwise-even race.
  items.sort((a, b) => b.passive - a.passive || b.total - a.total || b.coverage - a.coverage);
  return items;
}

// ============================================================================
// Make-fresh row — quiet, names-only. Not in the queue; shown as a heads-up.
// ============================================================================
function MakeFreshRow({ item }: { item: MakeFreshItem }) {
  return (
    <View style={styles.freshRow}>
      <View style={styles.freshTextCol}>
        <Text style={styles.freshName} numberOfLines={1}>
          {item.displayName}
        </Text>
        {item.reason ? (
          <Text style={styles.freshReason} numberOfLines={1}>
            {item.reason}
          </Text>
        ) : null}
      </View>
      {item.occurrences > 1 ? <Text style={styles.freshMeta}>×{item.occurrences}</Text> : null}
    </View>
  );
}

// ============================================================================
// Up-next row — a name, a one-word treatment tag, and the wall-clock time.
// Tappable so a user who wants to work out of order isn't trapped by the queue.
// ============================================================================
function UpNextRow({
  item,
  onOpen,
  opacity,
}: {
  item: WorkItem;
  onOpen: (g: PrepGroup, servings: number) => void;
  opacity: number;
}) {
  const tag = item.setAndForget ? 'set & forget' : item.strategy === 'prep' ? 'prep ahead' : 'hands-on';
  return (
    <TouchableOpacity
      style={[styles.upNextRow, { opacity }]}
      activeOpacity={0.6}
      onPress={() => onOpen(item.group, item.cookServings)}
    >
      {item.image ? (
        <Image source={item.image} style={styles.upNextThumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.upNextThumb, styles.thumbPlaceholder]}>
          <Ionicons name="image-outline" size={16} color="#52525b" />
        </View>
      )}
      <View style={styles.upNextTextCol}>
        <Text style={styles.upNextName} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.upNextTag}>{tag}</Text>
      </View>
      <Text style={styles.upNextTime}>{formatTime(item.total)}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Done row — struck through, tappable to restore (un-complete).
// ============================================================================
function DoneRow({
  item,
  onToggle,
}: {
  item: WorkItem;
  onToggle: (key: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.doneRow}
      activeOpacity={0.6}
      onPress={() => onToggle(item.doneKey)}
    >
      <Ionicons name="checkmark-circle" size={16} color="#52525b" />
      <Text style={styles.doneName} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// Screen
// ============================================================================
export default function MealPrepSessionScreen() {
  const navigation = useNavigation<MealPrepNav>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { currentPlan } = useSimplifiedMealPlanning();
  // The grocery list lives on the legacy MealPlanningContext (same source
  // GroceryListScreen reads), not on the simplified plan this screen runs on.
  const { currentMealPlan } = useMealPlanning();

  const session: PrepSession | null = useMemo(
    () => (currentPlan ? buildPrepSession(currentPlan) : null),
    [currentPlan]
  );

  const freshnessSession: PrepSessionWithFreshness | null = useMemo(
    () => (currentPlan ? buildPrepSessionWithFreshness(currentPlan) : null),
    [currentPlan]
  );

  const queue: WorkItem[] = useMemo(
    () => (session && !session.totals.isLegacyPlan ? buildWorklist(session) : []),
    [session]
  );

  // Per-item completion, scoped to this plan. Stored as an array of done keys
  // under @mealprep_done_<planId>; loaded into a lookup map on mount.
  const storageKey = currentPlan ? `@mealprep_done_${currentPlan.id}` : null;
  const [doneKeys, setDoneKeys] = useState<Record<string, boolean>>({});
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!storageKey) {
        setDoneKeys({});
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        if (!cancelled) {
          const map: Record<string, boolean> = {};
          for (const k of arr) map[k] = true;
          setDoneKeys(map);
        }
      } catch {
        if (!cancelled) setDoneKeys({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const toggleDone = useCallback(
    (key: string) => {
      setDoneKeys((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = true;
        }
        if (storageKey) {
          AsyncStorage.setItem(storageKey, JSON.stringify(Object.keys(next))).catch(() => {});
        }
        return next;
      });
    },
    [storageKey]
  );

  // Deep-link into the cook flow at the batch's serving count. Clamp on the
  // send side too (RecipeDetail clamps on receive) via the shared util.
  const openRecipe = useCallback(
    (group: PrepGroup, servings?: number) => {
      navigation.navigate('RecipeDetail', {
        mealSlug: group.slug,
        plateId: group.plateId,
        servings: clampCookPortions(servings ?? group.cookServings),
      });
    },
    [navigation]
  );

  const openGroceryList = useCallback(() => {
    // Mirror MealPlanDaysScreen's working "Shopping list" link. The real source
    // is the simplified plan's own grocery_list (priced + already categorised);
    // fall back to the legacy context, then to no param. This passes the exact
    // same object that screen does, so GroceryListScreen renders it identically.
    const groceryList =
      (currentPlan as any)?.grocery_list ||
      (currentMealPlan as any)?.data?.grocery_list ||
      null;
    navigation.navigate('GroceryList', groceryList ? { groceryList } : {});
  }, [navigation, currentPlan, currentMealPlan]);

  // ----- Derived session state ---------------------------------------------
  const remaining = useMemo(
    () => queue.filter((i) => !doneKeys[i.doneKey]),
    [queue, doneKeys]
  );
  const completed = useMemo(
    () => queue.filter((i) => doneKeys[i.doneKey]),
    [queue, doneKeys]
  );

  const current = remaining[0] ?? null;
  const upNext = remaining.slice(1, 4);
  const restCount = Math.max(0, remaining.length - 1 - upNext.length);

  const doneCount = completed.length;
  const totalCount = queue.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  // Finish estimate only makes sense when hands-on is known for every item.
  const handsOnKnown = queue.length > 0 && queue.every((i) => i.handsOnKnown);
  const makespan = useMemo(() => {
    if (!handsOnKnown) return null;
    const sumHandsOn = queue.reduce((s, i) => s + i.handsOn, 0);
    const maxTotal = queue.reduce((m, i) => Math.max(m, i.total), 0);
    return Math.max(maxTotal, sumHandsOn);
  }, [queue, handsOnKnown]);

  const header = (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.backBtn} hitSlop={10} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Meal Prep</Text>
      <View style={styles.backBtn} />
    </View>
  );

  // ----- Empty / legacy guards ----------------------------------------------
  if (!session) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.emptyWrap}>
          <Ionicons name="restaurant-outline" size={28} color="#3f3f46" />
          <Text style={styles.emptyText}>No active meal plan yet.</Text>
          <Text style={styles.emptySub}>
            Generate a plan and your prep session will appear here.
          </Text>
        </View>
      </View>
    );
  }

  if (session.totals.isLegacyPlan) {
    return (
      <View style={styles.container}>
        {header}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View style={styles.titleBlock}>
            <Text style={[styles.eyebrow, { color: themeColor }]}>MEAL PREP</Text>
            <Text style={styles.payoffSub}>Prep guidance isn't available for this plan.</Text>
          </View>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#71717a" />
            <Text style={styles.noticeText}>
              This plan predates prep support. Regenerate it to get a guided prep session.
            </Text>
          </View>
          <TouchableOpacity style={styles.groceryLink} activeOpacity={0.7} onPress={openGroceryList}>
            <Ionicons name="cart-outline" size={16} color={themeColor} />
            <Text style={[styles.groceryLinkText, { color: themeColor }]}>View grocery list</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const { totals, makeFresh } = session;
  const allDone = totalCount > 0 && remaining.length === 0;

  return (
    <View style={styles.container}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* ---- Progress + finish estimate ---- */}
        <View style={styles.titleBlock}>
          <View style={styles.progressTopRow}>
            <Text style={styles.eyebrowMuted}>PREP SESSION</Text>
            <Text style={styles.progressCount}>
              {doneCount} of {totalCount} done
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: themeColor },
              ]}
            />
          </View>
          <Text style={styles.progressSub}>
            {makespan != null
              ? `Done in ~${formatTime(makespan)}`
              : `Longest cook ~${formatTime(queue.reduce((m, i) => Math.max(m, i.total), 0))}`}
            {' · '}
            <Text style={{ color: themeColor }}>ordered to finish fastest</Text>
          </Text>
        </View>

        {/* ---- Session complete ---- */}
        {allDone ? (
          <View style={styles.completeCard}>
            <Ionicons name="checkmark-done-circle-outline" size={26} color={themeColor} />
            <Text style={styles.completeTitle}>All prepped.</Text>
            <Text style={styles.completeSub}>
              {totals.mealCount} {totals.mealCount === 1 ? 'meal' : 'meals'} ready for the week.
            </Text>
          </View>
        ) : null}

        {/* ---- DO NOW ---- */}
        {current ? (
          <View style={styles.nowCard}>
            {current.image ? (
              <Image source={current.image} style={styles.nowImage} contentFit="cover" transition={200} priority="high" />
            ) : (
              <View style={[styles.nowImage, styles.thumbPlaceholder]}>
                <Ionicons name="image-outline" size={28} color="#52525b" />
              </View>
            )}
            <View style={styles.nowBody}>
            <View style={styles.nowHeader}>
              <Text style={[styles.nowEyebrow, { color: themeColor }]}>DO NOW</Text>
              <Text style={styles.nowStrategy}>
                {current.strategy === 'prep' ? 'PREP AHEAD' : 'COOK AHEAD'}
              </Text>
            </View>

            <Text style={styles.nowTitle}>{current.title}</Text>

            {/* Prep-ahead is two actions at two times: headline the shared
                prep-now job, then the day-of finish(es) — one line when every
                plate finishes the same way, one per plate when they differ.
                Cook-ahead gets a single adaptive treatment line instead. */}
            {current.strategy === 'prep' ? (
              <View style={styles.splitBlock}>
                <View style={styles.splitRow}>
                  <Text style={[styles.splitLabel, { color: themeColor }]}>PREP NOW</Text>
                  <Text style={styles.splitText} numberOfLines={2}>
                    {current.prepAheadSummary}
                  </Text>
                </View>
                {(current.dayOfLines.length > 0
                  ? current.dayOfLines
                  : ['Finish fresh at mealtime']
                ).map((line, idx) => (
                  <View style={styles.splitRow} key={idx}>
                    <Text style={styles.splitLabelMuted}>{idx === 0 ? 'DAY-OF' : ''}</Text>
                    <Text style={styles.splitTextMuted} numberOfLines={2}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.nowInstruction}>
                {current.setAndForget
                  ? `Start it now, then walk away — it cooks for ${formatTime(
                      current.passive
                    )} on its own.`
                  : current.handsOnKnown
                  ? `Stays hands-on — about ${formatTime(current.handsOn)} of work.`
                  : 'Get this going next.'}
              </Text>
            )}

            <Text style={styles.nowMeta}>
              {current.strategy === 'prep' ? 'Prep' : 'Cook'} {current.cookServings}{' '}
              {current.cookServings === 1 ? 'serving' : 'servings'} · covers{' '}
              {current.coverage} {current.coverage === 1 ? 'meal' : 'meals'} ·{' '}
              {current.strategy === 'prep' && current.handsOnKnown
                ? `~${formatTime(current.handsOn)} now`
                : formatTime(current.total)}
            </Text>

            {storageLine(current.group.storage) ? (
              <Text style={styles.nowStorage}>{storageLine(current.group.storage)}</Text>
            ) : null}

            {/* Freezer note from freshness data */}
            {(() => {
              const freshnessItem = freshnessSession?.items.find(
                item => item.curated_meal_slug === current.group.slug && item.plate_id === current.group.plateId
              );
              return freshnessItem?.freshness?.freeze_note ? (
                <View style={styles.freezerNote}>
                  <Ionicons name="snow-outline" size={14} color="#3b82f6" />
                  <Text style={styles.freezerNoteText}>{freshnessItem.freshness.freeze_note}</Text>
                </View>
              ) : null;
            })()}

            <View style={styles.nowActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: themeColor }]}
                activeOpacity={0.85}
                onPress={() => toggleDone(current.doneKey)}
              >
                <Ionicons name="checkmark" size={16} color="#000" />
                <Text style={styles.primaryBtnText}>
                  {current.strategy === 'prep' ? 'Mark prep done' : 'Mark done'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.7}
                onPress={() => openRecipe(current.group, current.cookServings)}
              >
                <Text style={styles.secondaryBtnText}>Recipe</Text>
                <Ionicons name="chevron-forward" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
            </View>
          </View>
        ) : null}

        {/* ---- UP NEXT ---- */}
        {upNext.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.eyebrowMuted}>UP NEXT</Text>
            {upNext.map((item, idx) => (
              <UpNextRow
                key={item.doneKey}
                item={item}
                onOpen={openRecipe}
                opacity={[0.85, 0.62, 0.45][idx] ?? 0.4}
              />
            ))}
            {restCount > 0 ? (
              <Text style={styles.restNote}>
                {restCount} more · then {makeFresh.length}{' '}
                {makeFresh.length === 1 ? 'make-fresh item' : 'make-fresh items'}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ---- DONE (collapsible) ---- */}
        {doneCount > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.doneHeader}
              activeOpacity={0.7}
              onPress={() => setShowDone((s) => !s)}
            >
              <Text style={styles.eyebrowMuted}>DONE · {doneCount}</Text>
              <Ionicons
                name={showDone ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#3f3f46"
              />
            </TouchableOpacity>
            {showDone ? (
              <View style={styles.doneList}>
                {completed.map((item) => (
                  <DoneRow key={item.doneKey} item={item} onToggle={toggleDone} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ---- MAKE FRESH — heads-up only, never queued ---- */}
        {makeFresh.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.eyebrowMuted}>MAKE FRESH</Text>
            <Text style={styles.sectionBlurb}>Cook these to order — not part of the prep run.</Text>
            <View style={styles.freshCard}>
              {makeFresh.map((item, idx) => (
                <View key={item.key}>
                  {idx > 0 ? <View style={styles.freshDivider} /> : null}
                  <MakeFreshRow item={item} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---- Equipment — quiet, lowest priority ---- */}
        {totals.equipment.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.eyebrowMuted}>EQUIPMENT</Text>
            <View style={styles.chipRow}>
              {totals.equipment.map((e) => (
                <View key={String(e)} style={styles.chip}>
                  <Text style={styles.chipText}>{humanizeEquipment(e)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---- Grocery list ---- */}
        <TouchableOpacity style={styles.groceryLink} activeOpacity={0.7} onPress={openGroceryList}>
          <Ionicons name="cart-outline" size={16} color={themeColor} />
          <Text style={[styles.groceryLinkText, { color: themeColor }]}>View grocery list</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },

  titleBlock: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressCount: { color: '#71717a', fontSize: 11 },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: '#27272a', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressSub: { color: '#71717a', fontSize: 12, marginTop: 9 },
  payoffSub: { color: '#a1a1aa', fontSize: 13, lineHeight: 18, marginTop: 6 },

  section: { paddingHorizontal: 18, marginTop: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  eyebrowMuted: { color: '#71717a', fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  sectionBlurb: { color: '#52525b', fontSize: 11, lineHeight: 15, marginTop: 4, marginBottom: 10 },

  // DO NOW card
  nowCard: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  nowImage: { width: '100%', height: 120, backgroundColor: '#202023' },
  nowBody: { padding: 16 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  nowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nowEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  nowStrategy: { color: '#52525b', fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  nowTitle: { color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: -0.4, marginTop: 11 },
  nowInstruction: { color: '#fff', fontSize: 13, lineHeight: 19, marginTop: 9 },
  nowMeta: { color: '#a1a1aa', fontSize: 12, marginTop: 13 },
  nowStorage: { color: '#52525b', fontSize: 11, letterSpacing: 0.3, marginTop: 8 },
  freezerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingLeft: 2,
  },
  freezerNoteText: {
    flex: 1,
    color: '#3b82f6',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
  },

  // Prep-ahead now/day-of split
  splitBlock: {
    marginTop: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#27272a',
    paddingLeft: 12,
    gap: 9,
  },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  splitLabel: { width: 58, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 1 },
  splitLabelMuted: {
    width: 58,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#52525b',
    marginTop: 1,
  },
  splitText: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
  splitTextMuted: { flex: 1, color: '#71717a', fontSize: 12, lineHeight: 17 },

  nowActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  secondaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Up next
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  upNextThumb: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#202023' },
  upNextTextCol: { flex: 1, paddingRight: 10 },
  upNextName: { color: '#d4d4d8', fontSize: 14, fontWeight: '500' },
  upNextTag: { color: '#52525b', fontSize: 11, marginTop: 2, textTransform: 'lowercase' },
  upNextTime: { color: '#71717a', fontSize: 12 },
  restNote: { color: '#52525b', fontSize: 11, paddingTop: 10 },

  // Done
  doneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneList: { marginTop: 8 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  doneName: {
    flex: 1,
    color: '#52525b',
    fontSize: 13,
    textDecorationLine: 'line-through',
  },

  // Complete
  completeCard: {
    marginHorizontal: 18,
    marginTop: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  completeTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 },
  completeSub: { color: '#a1a1aa', fontSize: 12, textAlign: 'center' },

  // Make fresh
  freshCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  freshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  freshTextCol: { flex: 1, paddingRight: 10 },
  freshName: { color: '#d1d5db', fontSize: 13 },
  freshReason: { color: '#52525b', fontSize: 10, marginTop: 2 },
  freshMeta: { color: '#71717a', fontSize: 12 },
  freshDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#1f1f23' },

  // Equipment
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: 'transparent',
  },
  chipText: { color: '#a1a1aa', fontSize: 11, textTransform: 'capitalize' },

  // Notice (legacy)
  noticeCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginHorizontal: 18,
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    padding: 14,
    marginBottom: 18,
  },
  noticeText: { flex: 1, color: '#a1a1aa', fontSize: 13, lineHeight: 18 },

  // Grocery link
  groceryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  groceryLinkText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyText: { color: '#d1d5db', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#52525b', fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
```

## FILE: src/screens/MealsLibraryScreen.tsx  (609 lines)

```tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { CuratedMeal, CuisineType } from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type MealsLibraryNavigationProp = StackNavigationProp<RootStackParamList, 'MealsLibrary'>;
type MealsLibraryRouteProp = RouteProp<RootStackParamList, 'MealsLibrary'>;

// ============================================================================
// LAYOUT MATH
// ============================================================================
// 2-column grid. scrollContent padding 16 each side = 32. Inter-card gap = 10.
// Available width: contentWidth - 32 - 10 = card pair width. Each card = half.
// Content width is capped so cards don't stretch to unreasonable sizes on
// tablets/resized windows — see cardWidth in the component below.
const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 10;
const MAX_GRID_CONTENT_WIDTH = 700;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Same shape as NutritionHomeScreen.getCardSummary, but exposes both active
 * and total time. Active time is what matters for the meta line — pulled
 * pork's 8 hour slow-cook is mostly hands-off and the user just needs to
 * know they spend 30 minutes actually working.
 */
function getCardSummary(meal: CuratedMeal) {
  const firstPlate = meal.plates?.[0];
  const firstMethod = meal.methods?.[0];

  return {
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    carbs: firstPlate?.plate_macros?.carbs_g ?? 0,
    fat: firstPlate?.plate_macros?.fat_g ?? 0,
    activeMinutes: firstMethod?.time_active_minutes ?? 0,
    totalMinutes: firstMethod?.time_total_minutes ?? 0,
  };
}

function formatActiveTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// Cuisine label mapping — keys match CuisineType, values are display strings.
// 'breakfast' and 'mediterranean' aren't in current data but kept for future-proofing.
const CUISINE_LABELS: Record<CuisineType, string> = {
  australian: 'Australian',
  mediterranean: 'Mediterranean',
  asian: 'Asian',
  indian: 'Indian',
  mexican: 'Mexican',
  breakfast: 'Breakfast',
  italian: 'Italian',
  smoothie: 'Smoothie',
  thai: 'Thai',
  snack: 'Snack',
  dessert: 'Dessert',
};

type SortMode = 'name' | 'calories' | 'protein' | 'active_time';

const SORT_LABELS: Record<SortMode, string> = {
  name: 'Name',
  calories: 'Calories',
  protein: 'Protein',
  active_time: 'Active time',
};

const SORT_ORDER: SortMode[] = ['name', 'calories', 'protein', 'active_time'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function MealsLibraryScreen() {
  const navigation = useNavigation<MealsLibraryNavigationProp>();
  const route = useRoute<MealsLibraryRouteProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = useMemo(() => {
    const contentWidth = Math.min(windowWidth, MAX_GRID_CONTENT_WIDTH);
    return (contentWidth - GRID_HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
  }, [windowWidth]);

  // Get filtering parameters from route
  const { cuisine: routeCuisine, title: routeTitle } = route.params || {};
  
  // Check if we're showing a specific category view (no filters needed for single-category views)
  // Hide filters when showing any specific category (dessert, breakfast, snack, smoothie, mains, etc.)
  // Only keep filters for the default "all meals" view (no routeCuisine or 'all')
  const isSpecificCategory = routeCuisine && routeCuisine !== 'all';
  const shouldHideFilters = isSpecificCategory;

  // Filter meals based on route params, or default to all non-smoothie meals
  const allMeals = useMemo(() => {
    let meals = Object.values(CURATED_MEALS);
    
    // Handle special case of 'mains' - savoury main dishes (excluding leaf categories)
    if (routeCuisine === 'mains') {
      const LEAF = new Set(['breakfast', 'snack', 'dessert', 'smoothie']);
      meals = meals.filter(m => !LEAF.has(m.cuisine));
    } else if (routeCuisine && routeCuisine !== 'all') {
      // Filter by specific cuisine
      meals = meals.filter(m => m.cuisine === routeCuisine);
    } else {
      // Default: all non-smoothie meals
      meals = meals.filter(m => m.cuisine !== 'smoothie');
    }
    
    return meals;
  }, [routeCuisine]);

  // Derive cuisine chips from actual data. Stable order: alpha sort.
  // This way the chip row stays in sync as meals are added.
  const availableCuisines = useMemo(() => {
    const cuisines = new Set(allMeals.map(m => m.cuisine));
    return Array.from(cuisines).sort() as CuisineType[];
  }, [allMeals]);

  // State - set initial cuisine based on route params
  const [activeCuisine, setActiveCuisine] = useState<CuisineType | 'all'>(
    routeCuisine && routeCuisine !== 'all' ? routeCuisine as CuisineType : 'all'
  );
  const [sortMode, setSortMode] = useState<SortMode>('name');

  // Apply filter then sort
  const displayedMeals = useMemo(() => {
    // If showing a specific category (e.g. mains, dessert), allMeals is already filtered
    // Only apply additional filtering for the default "all meals" view
    const filtered = isSpecificCategory 
      ? allMeals
      : (activeCuisine === 'all'
          ? allMeals
          : allMeals.filter(m => m.cuisine === activeCuisine));

    const sorted = [...filtered];
    switch (sortMode) {
      case 'name':
        sorted.sort((a, b) =>
          (a.plates[0]?.display_name || a.display_name).localeCompare(
            b.plates[0]?.display_name || b.display_name
          )
        );
        break;
      case 'calories':
        // Descending — bulkers want to see the highest first
        sorted.sort(
          (a, b) =>
            (b.plates[0]?.plate_macros?.kcal ?? 0) -
            (a.plates[0]?.plate_macros?.kcal ?? 0)
        );
        break;
      case 'protein':
        sorted.sort(
          (a, b) =>
            (b.plates[0]?.plate_macros?.protein_g ?? 0) -
            (a.plates[0]?.plate_macros?.protein_g ?? 0)
        );
        break;
      case 'active_time':
        // Ascending — quickest first, more useful default
        sorted.sort(
          (a, b) =>
            (a.methods[0]?.time_active_minutes ?? 0) -
            (b.methods[0]?.time_active_minutes ?? 0)
        );
        break;
    }
    return sorted;
  }, [allMeals, activeCuisine, sortMode, isSpecificCategory]);

  // ===== Handlers =====

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMealPress = useCallback(
    (meal: CuratedMeal) => {
      navigation.navigate('RecipeDetail', { mealSlug: meal.slug });
    },
    [navigation]
  );

  // Cycle through sort modes on icon tap.
  // Could be a bottom sheet but a single tap-to-cycle is much simpler
  // and the label below the icon tells you the current mode.
  const handleSortPress = useCallback(() => {
    const currentIdx = SORT_ORDER.indexOf(sortMode);
    const nextIdx = (currentIdx + 1) % SORT_ORDER.length;
    setSortMode(SORT_ORDER[nextIdx]);
  }, [sortMode]);

  // ===== Render =====

  const renderCard = useCallback(
    ({ item: meal }: { item: CuratedMeal }) => {
      const { kcal, protein, carbs, fat, activeMinutes } = getCardSummary(meal);
      const imageSource = getMealImage(meal.plates?.[0]?.image_filename ?? meal.image_filename);

      return (
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          activeOpacity={0.85}
          onPress={() => handleMealPress(meal)}
        >
          <View style={styles.cardImageWrap}>
            {imageSource ? (
              <Image 
                source={imageSource} 
                style={styles.cardImage} 
                resizeMode="cover"
                fadeDuration={200}
                loadingIndicatorSource={{ uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' }}
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="restaurant-outline" size={24} color="#52525b" />
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {meal.plates?.[0]?.display_name || meal.display_name}
            </Text>
            <Text style={styles.cardMeta}>
              {formatActiveTime(activeMinutes)} active · {kcal} kcal
            </Text>

            <View style={styles.macroGrid}>
              <View style={styles.macroCell}>
                <Text style={[styles.macroValue, { color: themeColor }]}>{protein}g</Text>
                <Text style={styles.macroLabel}>PROT</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCell}>
                <Text style={styles.macroValueMuted}>{carbs}g</Text>
                <Text style={styles.macroLabel}>CARB</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroCell}>
                <Text style={styles.macroValueMuted}>{fat}g</Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleMealPress, themeColor, cardWidth]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* ====================================================================
          NAV HEADER — back button on left, title centred, sort button on right.
          Sort button shows current mode below the icon so the user always knows
          what they're sorted by without opening a menu.
      ==================================================================== */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerSide}
          activeOpacity={0.7}
          onPress={handleBack}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={themeColor} />
          <Text style={[styles.headerBackText, { color: themeColor }]}>Nutrition</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{routeTitle || 'Meals'}</Text>
          <Text style={styles.headerSubtitle}>{displayedMeals.length} recipes</Text>
        </View>

        {!shouldHideFilters ? (
          <TouchableOpacity
            style={[styles.headerSide, styles.headerSortBtn]}
            activeOpacity={0.7}
            onPress={handleSortPress}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${SORT_LABELS[sortMode]}. Tap to change.`}
          >
            <Ionicons name="swap-vertical" size={20} color="#d4d4d8" />
            <Text style={styles.headerSortLabel} numberOfLines={1}>
              {SORT_LABELS[sortMode]}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      {/* ====================================================================
          FILTER CHIPS — cuisine chips derived from the data. "All" is always
          the first chip and is active by default. Chips are horizontally
          scrollable so adding more cuisines doesn't break the layout.
          Hidden for category views (mains, desserts, breakfast, snacks, smoothies) since filters aren't needed.
      ==================================================================== */}
      {!shouldHideFilters && (
        <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRowContent}
        >
          {/* "All" chip */}
          <TouchableOpacity
            style={[
              styles.chip,
              activeCuisine === 'all' && [styles.chipActive, { backgroundColor: themeColor }],
            ]}
            activeOpacity={0.7}
            onPress={() => setActiveCuisine('all')}
          >
            <Text
              style={[
                styles.chipText,
                activeCuisine === 'all' && styles.chipTextActive,
              ]}
            >
              All · {allMeals.length}
            </Text>
          </TouchableOpacity>

          {availableCuisines.map(cuisine => {
            const count = allMeals.filter(m => m.cuisine === cuisine).length;
            const isActive = activeCuisine === cuisine;
            return (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.chip,
                  isActive && [styles.chipActive, { backgroundColor: themeColor }],
                ]}
                activeOpacity={0.7}
                onPress={() => setActiveCuisine(cuisine)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {CUISINE_LABELS[cuisine]} · {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      )}

      {/* ====================================================================
          GRID — 2 columns, FlatList for windowing.
          Empty state if a filter yields nothing (rare with current data, but
          will matter when meals grow).
      ==================================================================== */}
      {displayedMeals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No meals match</Text>
          <Text style={styles.emptyBody}>Try a different cuisine filter.</Text>
        </View>
      ) : (
        <FlatList
          data={displayedMeals}
          renderItem={renderCard}
          keyExtractor={item => item.slug}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          // Performance — optimized for smooth scrolling
          initialNumToRender={6}
          removeClippedSubviews={true}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={100}
          windowSize={10}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // ===== Header =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  headerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 88,
    height: 36,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 1,
  },
  headerSortBtn: {
    justifyContent: 'flex-end',
    gap: 4,
  },
  headerSortLabel: {
    fontSize: 12,
    color: '#d4d4d8',
    fontWeight: '500',
    maxWidth: 70,
  },

  // ===== Filter chips =====
  chipRowWrap: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  chipRowContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  chipTextActive: {
    color: '#0a0a0b',
    fontWeight: '600',
  },

  // ===== Grid =====
  gridContent: {
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingTop: 14,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ===== Card =====
  card: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0a0a0b',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  cardBody: {
    padding: 11,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 17,
    letterSpacing: -0.2,
    minHeight: 34,
  },
  cardMeta: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    marginBottom: 9,
  },
  macroGrid: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  macroCell: {
    flex: 1,
    alignItems: 'center',
  },
  macroDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
    letterSpacing: -0.3,
  },
  macroValueMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4d4d8',
    lineHeight: 15,
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 8,
    color: '#71717a',
    marginTop: 2,
    letterSpacing: 0.4,
  },

  // ===== Empty state =====
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 6,
    textAlign: 'center',
  },
});
```

## FILE: src/screens/nutrition/MealDetailScreen.tsx  (582 lines)

```tsx
// src/screens/nutrition/MealDetailScreen.tsx
//
// Meal preview presented as an iOS modal sheet (presentation: 'formSheet').
//
// Why this exists as a screen, not a component:
//   We tried building this as a custom bottom sheet using @gorhom/bottom-sheet,
//   which works but requires Reanimated + worklets + a native rebuild. The
//   animation problems we hit (animates first time, snaps thereafter) were a
//   known library bug worked around with awkward imperative refs.
//
//   Using a native-stack screen with presentation: 'formSheet' delegates the
//   entire sheet experience to UIKit — real iOS animation, real spring
//   physics, real drag-to-dismiss with momentum, real backdrop behaviour. No
//   JS animation code. No Reanimated. No babel plugin. No native rebuild.
//   This is what the Photos / Messages / Settings apps use for their sheets.
//
// To register this screen, add to your native-stack navigator:
//     <Stack.Screen
//       name="MealDetail"
//       component={MealDetailScreen}
//       options={{
//         presentation: 'formSheet',
//         headerShown: false,
//         sheetGrabberVisible: true,
//         sheetCornerRadius: 24,
//       }}
//     />
//
// Selection state changes (Add to my week / Remove) are persisted
// immediately via saveCuratedFavorites so the parent screen reflects them
// when the sheet dismisses. The parent already reloads favorites on mount.

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { CURATED_MEALS } from '../../data/curated_meals';
import { INGREDIENTS } from '../../data/ingredients';
import { CuratedMeal, Plate, CookingMethod } from '../../types/curated_meals';
import { getMealImage } from '../../assets/mealImages';
import {
  loadCuratedFavorites,
  saveCuratedFavorites,
} from '../../utils/curatedFavoritesStorage';

// ---- helpers ---------------------------------------------------------------

function getIngredientName(ingredientId: string): string {
  const ing = (INGREDIENTS as any)[ingredientId];
  return ing?.display_name ?? ingredientId;
}

function formatTotalTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

function methodSummary(method: CookingMethod): string {
  const time = formatTotalTime(method.time_total_minutes);
  const id = method.id.toLowerCase();
  if (id.includes('slow_cooker')) return `${time} · slow cooker, hands-off`;
  if (id.includes('pressure_cooker') || id.includes('instant_pot'))
    return `${time} · pressure cooker`;
  if (id.includes('oven')) return `${time} · oven`;
  if (id.includes('blender') || id.includes('smoothie'))
    return `${time} · blender`;
  if (id.includes('stovetop') || id.includes('pan')) return `${time} · stovetop`;
  if (id.includes('jar') || id.includes('shortcut'))
    return `${time} · quick prep`;
  return time;
}

const isMultiPlate = (m: CuratedMeal) => (m.plates?.length ?? 0) > 1;
const plateKey = (slug: string, plateId: string) => `${slug}:${plateId}`;

// ---- route params ----------------------------------------------------------

type ParamList = {
  MealDetail: { slug: string };
};

// =============================================================================
// Screen
// =============================================================================

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, 'MealDetail'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const meal: CuratedMeal | undefined = (CURATED_MEALS as Record<
    string,
    CuratedMeal
  >)[route.params.slug];

  // We load + mutate the favorites payload locally so Add/Remove persist
  // immediately and the parent reflects them on its next focus/reload.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [likedDishes, setLikedDishes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [plateIndex, setPlateIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fav = await loadCuratedFavorites();
      if (!cancelled) {
        setSelected(new Set(fav.slugs));
        setCuisines(fav.cuisines);
        setAvoid(fav.avoid);
        setLikedDishes(fav.likedDishes);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ingredientNames = useMemo(() => {
    if (!meal) return [] as string[];
    const m = meal.methods[0];
    if (!m) return [] as string[];
    const p = meal.plates[plateIndex] ?? meal.plates[0];
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (id: string) => {
      const name = getIngredientName(id);
      const key = name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(name); }
    };
    m.ingredients.forEach((ing) => push(ing.ingredient_id));
    p?.additional_ingredients.forEach((ing) => push(ing.ingredient_id));
    return out;
  }, [meal, plateIndex]);

  // ---- meal not found ----
  if (!meal) {
    return (
      <View style={[styles.sheet, styles.center]}>
        <Text style={styles.notFound}>Meal not found.</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.notFoundBtn}
        >
          <Text style={styles.notFoundBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const plate: Plate | undefined =
    meal.plates[plateIndex] ?? meal.plates[0];
  const method: CookingMethod | undefined = meal.methods[0];
  const macros = plate?.plate_macros;
  const multi = isMultiPlate(meal);

  const targetKey = multi && plate ? plateKey(meal.slug, plate.id) : meal.slug;
  const isPicked = selected.has(targetKey);

  const heroSrc =
    (plate?.image_filename && getMealImage(plate.image_filename)) ||
    getMealImage(meal.image_filename);


  // ---- mutation handlers ----
  // Toggle, persist immediately, then dismiss the sheet. The parent's
  // useFocusEffect (or its existing reload on mount) will pick up the change.
  const toggleAndDismiss = async () => {
    const next = new Set(selected);
    if (next.has(targetKey)) next.delete(targetKey);
    else next.add(targetKey);
    setSelected(next);
    try {
      await saveCuratedFavorites({
        slugs: Array.from(next),
        cuisines,
        avoid,
        likedDishes,
      });
    } catch (e) {
      console.error('toggle save failed', e);
    }
    navigation.goBack();
  };

  if (loading || !method) {
    // Brief — favorites load is local AsyncStorage, sub-frame typically.
    // Render a blank sheet to avoid layout pop.
    return <View style={styles.sheet} />;
  }

  return (
    <View style={styles.sheet}>
      {/* Close (×) — top-right. Native sheets also dismiss via swipe-down,
          but an explicit close button is the standard for accessibility. */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top > 0 ? 14 : 18 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={20} color="#a1a1aa" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          {heroSrc ? (
            <Image
              source={heroSrc}
              style={styles.hero}
              contentFit="cover"
              transition={200}
              priority="high"
            />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={32} color="#52525b" />
            </View>
          )}
        </View>

        {/* Title + cuisine */}
        <Text style={styles.title}>
          {plate?.display_name ?? meal.display_name}
        </Text>
        {meal.cuisine && <Text style={styles.cuisine}>{meal.cuisine}</Text>}

        {/* Plate switcher (multi-plate only) */}
        {multi && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.plateRow}
            keyboardShouldPersistTaps="handled"
          >
            {meal.plates.map((p, i) => {
              const on = i === plateIndex;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPlateIndex(i)}
                  activeOpacity={0.75}
                  style={[
                    styles.platePill,
                    on && {
                      backgroundColor: themeColor,
                      borderColor: themeColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text
                    style={[
                      styles.platePillText,
                      on && { color: '#0a0a0b', fontWeight: '600' },
                    ]}
                  >
                    {p.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Macro strip */}
        {macros && (
          <View style={styles.macroStrip}>
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>CAL</Text>
              <Text style={styles.macroValue}>{macros.kcal}</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>PROTEIN</Text>
              <Text style={styles.macroValue}>
                {macros.protein_g}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>CARBS</Text>
              <Text style={styles.macroValue}>
                {macros.carbs_g}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}>
              <Text style={styles.macroLabel}>FAT</Text>
              <Text style={styles.macroValue}>
                {macros.fat_g}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Method / time */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="#71717a" />
          <Text style={styles.metaText}>{methodSummary(method)}</Text>
        </View>

        {/* Description */}
        {plate?.description && (
          <Text style={styles.description}>{plate.description}</Text>
        )}

        {/* Ingredients */}
        {ingredientNames.length > 0 && (
          <View style={styles.ingBlock}>
            <Text style={styles.sectionLabel}>WHAT'S IN IT</Text>
            <Text style={styles.ingList}>
              {ingredientNames.join(' · ')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaWrap,
          { paddingBottom: Math.max(insets.bottom, 14) + 10 },
        ]}
      >
        {isPicked ? (
          <>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.goBack()}
              style={[styles.cta, { backgroundColor: themeColor }]}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.ctaText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleAndDismiss}
              style={styles.removeLink}
              accessibilityRole="button"
              accessibilityLabel="Remove from week"
            >
              <Text style={styles.removeText}>Remove from week</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={toggleAndDismiss}
            style={[styles.cta, { backgroundColor: themeColor }]}
            accessibilityRole="button"
            accessibilityLabel="Add to my week"
          >
            <Text style={styles.ctaText}>Add to my week</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#0d0d10',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFound: { fontSize: 15, color: '#a1a1aa', marginBottom: 14 },
  notFoundBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  notFoundBtnText: { fontSize: 14, color: '#22d3ee', fontWeight: '500' },

  closeBtn: {
    position: 'absolute',
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  heroWrap: {
    marginHorizontal: 18,
    marginTop: 18,
    aspectRatio: 16 / 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0a0a0b',
    marginBottom: 16,
  },
  hero: { width: '100%', height: '100%' },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1f',
  },

  title: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia',
    }),
    fontSize: 26,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 30,
    paddingHorizontal: 18,
  },
  cuisine: {
    fontSize: 12,
    color: '#71717a',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
    paddingHorizontal: 18,
    marginTop: 4,
  },

  plateRow: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  platePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#16161a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  platePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },

  macroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f1f23',
  },
  macroCell: { flex: 1, alignItems: 'center' },
  macroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#1f1f23',
  },
  macroLabel: {
    fontSize: 9,
    color: '#71717a',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  macroUnit: { fontSize: 11, color: '#a1a1aa', fontWeight: '500' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  metaText: { fontSize: 12, color: '#a1a1aa' },

  description: {
    fontSize: 14,
    color: '#d4d4d8',
    lineHeight: 21,
    letterSpacing: -0.1,
    paddingHorizontal: 18,
    marginBottom: 18,
  },

  ingBlock: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#71717a',
    letterSpacing: 0.7,
    fontWeight: '700',
    marginBottom: 6,
  },
  ingList: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 21,
    letterSpacing: -0.05,
  },

  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: '#0d0d10',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
  },
  cta: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0b',
    letterSpacing: -0.1,
  },
  removeLink: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  removeText: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});
```

