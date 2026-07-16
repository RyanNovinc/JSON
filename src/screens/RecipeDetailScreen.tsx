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
import { resolveBaseIngredients, resolveMealInstructions } from '../utils/resolveMealIngredients';

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
  // Base recipe read through the single resolver path: legacy meals return
  // method.ingredients/instructions unchanged; template meals (butter_chicken)
  // surface base + default sauce variant, since their methods carry [].
  const baseIngredients = resolveBaseIngredients(meal, { methodId: method.id });
  const baseInstructions = resolveMealInstructions(meal, method.id);


  const macros = plate.plate_macros;
  // Macro panel reflects the planned serving: base plate macros × planScale.
  // planScale is 1 for un-scaled opens, so these equal the raw plate macros.
  const dispProtein = Math.round(macros.protein_g * planScale);
  const dispCarbs = Math.round(macros.carbs_g * planScale);
  const dispFat = Math.round(macros.fat_g * planScale);
  const dispKcal = Math.round(macros.kcal * planScale);
  const showPlateSwitcher = meal.plates.length > 1;
  const showMethodPicker = meal.methods.length > 1;

  const baseSteps = baseInstructions.length;
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
              {baseIngredients.map((ing, i) => (
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
              {baseInstructions.map((step, i) => (
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