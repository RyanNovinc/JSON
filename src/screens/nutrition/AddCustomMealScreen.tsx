// src/screens/nutrition/AddCustomMealScreen.tsx
//
// "Your meal" — create or edit a user-created custom meal.
//
// Presented as a modal inside NutritionThemeProvider (green themeColor),
// registered as route 'AddCustomMeal' with optional { editSlug } param for
// edit mode.
//
// DESIGN NOTES (locked with the mockups, 6 Aug):
//   - SUMMARY SCREEN + EDITOR SHEETS. The screen itself is a one-viewport
//     summary of the meal. Every block below the header is a row showing its
//     current value; tapping opens a focused bottom sheet that owns the full
//     width and the keyboard. This replaced the single flat scroll, which gave
//     required and optional fields identical visual weight.
//   - CALORIES ARE DERIVED, never typed. kcal = round(P*4 + C*4 + F*9). The
//     plan engine and the AI prompt both treat custom macros as authoritative,
//     so a hand-typed kcal that disagreed with the macros produced day totals
//     nothing downstream could detect as wrong. Fibre is stored but contributes
//     zero kcal, matching AU labelling where carbohydrate already excludes it.
//     Edit mode never loads the stored kcal — it recomputes from stored macros,
//     so meals saved before this change self-correct on next save.
//   - Everything the user enters is PER SERVING (macros, ingredient amounts).
//     "Makes N servings" only informs batch scheduling — it never divides
//     the macros.
//   - Category chip drives `cuisine` (Breakfast/Snack/Smoothie/Dessert map
//     1:1; Main → 'australian' so it lands on the Mains shelf). Picking a
//     category preselects sensible "Eaten at" slots ONLY when none are
//     selected yet.
//   - Required to save: name, at least one macro above zero, category, main
//     protein, one slot. Everything else is optional. Save states what is
//     missing rather than throwing an Alert per problem.
//   - The photo stays a cache URI while editing the form; it is copied into
//     permanent storage (importCustomMealImage) only on Save, so abandoning
//     the form never orphans a file. Replaced/removed photos are cleaned up
//     by upsertCustomMeal.
//   - No cook mode for custom meals — steps are plain summaries
//     (RecipeStep.substeps always []).
//   - SHEET MOTION: the Modal runs with animationType="none" and the backdrop
//     and panel are animated separately — backdrop fades, panel slides. Modal's
//     own "slide" moved both together, which read as the whole screen sliding.
//   - KEYBOARD: KeyboardAvoidingView is not used. It is a no-op on Android with
//     behavior undefined, and it cannot shrink the sheet's inner ScrollView. A
//     Keyboard listener supplies the real height; the sheet pads its bottom by
//     that amount and the scroll area caps its maxHeight against it, so a field
//     at the bottom of a sheet is always above the keyboard and reachable.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import {
  AllergenType,
  CuisineType,
  MealSlot,
  PrimaryProtein,
} from '../../types/curated_meals';
import { CustomIngredient, CustomMeal } from '../../types/custom_meals';
import {
  importCustomMealImage,
  loadCustomMeals,
  newCustomMealSlug,
  upsertCustomMeal,
} from '../../utils/customMealsStorage';

// MediaTypeOptions is deprecated in current expo-image-picker in favour of a
// string array. Pick whichever the installed version understands (same shim
// as WeightTrackerScreen).
const PICKER_MEDIA_TYPES: any =
  (ImagePicker as any).MediaType != null
    ? ['images']
    : (ImagePicker as any).MediaTypeOptions?.Images;

// ---- option models ---------------------------------------------------------

type CategoryKey = 'breakfast' | 'main' | 'snack' | 'smoothie' | 'dessert';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'main', label: 'Main' },
  { key: 'snack', label: 'Snack' },
  { key: 'smoothie', label: 'Smoothie' },
  { key: 'dessert', label: 'Dessert' },
];

const CATEGORY_CUISINE: Record<CategoryKey, CuisineType> = {
  breakfast: 'breakfast',
  main: 'australian',
  snack: 'snack',
  smoothie: 'smoothie',
  dessert: 'dessert',
};

const CATEGORY_DEFAULT_SLOTS: Record<CategoryKey, MealSlot[]> = {
  breakfast: ['breakfast'],
  main: ['lunch', 'dinner'],
  snack: ['snack'],
  smoothie: ['breakfast', 'snack'],
  dessert: ['dessert'],
};

const cuisineToCategory = (c: CuisineType): CategoryKey => {
  if (c === 'breakfast' || c === 'snack' || c === 'smoothie' || c === 'dessert')
    return c;
  return 'main';
};

const SLOT_OPTIONS: { slot: MealSlot; label: string }[] = [
  { slot: 'breakfast', label: 'Breakfast' },
  { slot: 'brunch', label: 'Brunch' },
  { slot: 'lunch', label: 'Lunch' },
  { slot: 'dinner', label: 'Dinner' },
  { slot: 'snack', label: 'Snack' },
  { slot: 'dessert', label: 'Dessert' },
  { slot: 'pre_workout', label: 'Pre-workout' },
  { slot: 'post_workout', label: 'Post-workout' },
];

const SLOT_LABEL: Record<string, string> = SLOT_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.slot]: o.label }),
  {} as Record<string, string>
);

const PROTEIN_OPTIONS: { value: PrimaryProtein; label: string }[] = [
  { value: 'chicken', label: 'Chicken' },
  { value: 'beef', label: 'Beef' },
  { value: 'lamb', label: 'Lamb' },
  { value: 'pork', label: 'Pork' },
  { value: 'turkey', label: 'Turkey' },
  { value: 'fish', label: 'Fish' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'plant', label: 'Plant' },
];

const PROTEIN_LABEL: Record<string, string> = PROTEIN_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>
);

const ALLERGEN_OPTIONS: AllergenType[] = [
  'Nuts',
  'Shellfish',
  'Dairy',
  'Eggs',
  'Gluten/Wheat',
  'Soy',
  'Fish',
  'Sesame',
];

// ---- small helpers ---------------------------------------------------------

const parseNum = (s: string): number | null => {
  const t = String(s ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  return isFinite(n) && n >= 0 ? n : null;
};

// Empty reads as zero for the derived calorie sum; only a malformed string
// (letters, negatives) returns null and blocks Save.
const numOrZero = (s: string): number => parseNum(s) ?? 0;

// Atwater factors. Fibre is deliberately excluded: AU labels report available
// carbohydrate with fibre broken out separately, so counting it here would
// double up against what the user reads off the packet.
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

const deriveKcal = (p: string, c: string, f: string): number =>
  Math.round(
    numOrZero(p) * KCAL_PER_G.protein +
      numOrZero(c) * KCAL_PER_G.carbs +
      numOrZero(f) * KCAL_PER_G.fat
  );

interface IngredientRow {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

interface StepRow {
  id: string;
  text: string;
}

let rowSeq = 0;
const nextRowId = (prefix: string) => `${prefix}_${Date.now()}_${rowSeq++}`;

type SheetKey = 'nutrition' | 'ingredients' | 'steps' | 'classify' | 'extras';

// Real keyboard height. iOS gets the "will" events so the sheet moves with the
// keyboard rather than after it; Android only fires the "did" events.
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e: any) =>
      setHeight(e?.endCoordinates?.height ?? 0)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}

// ---- route params ----------------------------------------------------------

type ParamList = {
  AddCustomMeal: { editSlug?: string } | undefined;
};

// =============================================================================
// Screen
// =============================================================================

export default function AddCustomMealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'AddCustomMeal'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const editSlug = route.params?.editSlug;
  const isEditing = !!editSlug;

  // ---- form state ----
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<SheetKey | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [protein, setProtein] = useState<PrimaryProtein | null>(null);
  const [slots, setSlots] = useState<Set<MealSlot>>(new Set());
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [fiberG, setFiberG] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { id: nextRowId('ci'), name: '', amount: '', unit: '' },
  ]);
  const [steps, setSteps] = useState<StepRow[]>([{ id: nextRowId('st'), text: '' }]);
  const [requiresCooking, setRequiresCooking] = useState(true);
  const [activeMinutes, setActiveMinutes] = useState('');
  const [servings, setServings] = useState('1');
  const [allergens, setAllergens] = useState<Set<AllergenType>>(new Set());

  // Photo: existingUri = already in permanent storage (edit mode);
  // pickedUri = fresh cache URI, copied to permanent storage on Save.
  const [existingUri, setExistingUri] = useState<string | undefined>(undefined);
  const [pickedUri, setPickedUri] = useState<string | undefined>(undefined);
  const previewUri = pickedUri ?? existingUri;

  // Preserved across an edit so upsert can keep created_at semantics simple.
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);

  // ---- edit-mode prefill ----
  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      const meal = (await loadCustomMeals()).find((m) => m.slug === editSlug);
      if (cancelled) return;
      if (!meal) {
        Alert.alert('Meal not found', 'This custom meal no longer exists.');
        navigation.goBack();
        return;
      }
      setName(meal.display_name);
      setDescription(meal.description ?? '');
      setCategory(cuisineToCategory(meal.cuisine));
      setProtein(meal.primary_protein);
      setSlots(new Set(meal.eligible_slots));
      // macros.kcal is deliberately NOT loaded — it is recomputed from the
      // macros below, which repairs any meal saved with a mismatched kcal.
      setProteinG(String(meal.macros.protein_g));
      setCarbsG(String(meal.macros.carbs_g));
      setFatG(String(meal.macros.fat_g));
      setFiberG(meal.macros.fiber_g ? String(meal.macros.fiber_g) : '');
      setIngredients(
        meal.ingredients.length > 0
          ? meal.ingredients.map((ing) => ({
              id: ing.id,
              name: ing.name,
              amount: ing.amount != null ? String(ing.amount) : '',
              unit: ing.unit ?? '',
            }))
          : [{ id: nextRowId('ci'), name: '', amount: '', unit: '' }]
      );
      setSteps(
        meal.steps.length > 0
          ? meal.steps.map((s) => ({ id: nextRowId('st'), text: s.summary }))
          : [{ id: nextRowId('st'), text: '' }]
      );
      setRequiresCooking(meal.requires_cooking !== false);
      setActiveMinutes(
        meal.time_active_minutes != null ? String(meal.time_active_minutes) : ''
      );
      setServings(String(meal.produces_servings || 1));
      setAllergens(new Set(meal.contains_allergens));
      setExistingUri(meal.image_uri);
      setCreatedAt(meal.created_at);
      setLoadingEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, editSlug, navigation]);

  // ---- photo ----
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access to add a meal photo.'
      );
      return;
    }
    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: PICKER_MEDIA_TYPES,
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });
    } catch (e) {
      console.error('AddCustomMeal: picker failed', e);
      Alert.alert('Could not open photos', 'Please try again.');
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    setPickedUri(result.assets[0].uri);
  };

  const removePhoto = () => {
    setPickedUri(undefined);
    setExistingUri(undefined);
  };

  // ---- chips / rows ----
  const pickCategory = (key: CategoryKey) => {
    setCategory(key);
    // Preselect sensible slots only when the user hasn't chosen any yet.
    setSlots((prev) =>
      prev.size === 0 ? new Set(CATEGORY_DEFAULT_SLOTS[key]) : prev
    );
  };

  const toggleSlot = (slot: MealSlot) => {
    setSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const toggleAllergen = (a: AllergenType) => {
    setAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  const setIngredientField = (
    id: string,
    field: 'name' | 'amount' | 'unit',
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };
  const addIngredientRow = () =>
    setIngredients((prev) => [
      ...prev,
      { id: nextRowId('ci'), name: '', amount: '', unit: '' },
    ]);
  const removeIngredientRow = (id: string) =>
    setIngredients((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev
    );

  const setStepText = (id: string, text: string) =>
    setSteps((prev) => prev.map((r) => (r.id === id ? { ...r, text } : r)));
  const addStepRow = () => setSteps((prev) => [...prev, { id: nextRowId('st'), text: '' }]);
  const removeStepRow = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  // ---- derived values ----
  const derivedKcal = useMemo(
    () => deriveKcal(proteinG, carbsG, fatG),
    [proteinG, carbsG, fatG]
  );

  const hasNutrition = derivedKcal > 0;

  const filledIngredients = useMemo(
    () => ingredients.filter((r) => r.name.trim().length > 0),
    [ingredients]
  );
  const filledSteps = useMemo(
    () => steps.filter((r) => r.text.trim().length > 0),
    [steps]
  );

  const slotSummary = useMemo(
    () =>
      SLOT_OPTIONS.filter((o) => slots.has(o.slot))
        .map((o) => o.label)
        .join(', '),
    [slots]
  );

  const classifySummary = useMemo(() => {
    if (!category) return 'Pick a category';
    const base = slotSummary || 'No slots picked';
    return protein ? `${base}, ${PROTEIN_LABEL[protein]}` : `${base}, protein needed`;
  }, [category, slotSummary, protein]);

  const extrasSummary = useMemo(() => {
    const n = Math.max(1, Math.round(parseNum(servings) ?? 1));
    const parts = [`Makes ${n}`];
    if (!requiresCooking) parts.push('no cook');
    if (allergens.size > 0) parts.push(`${allergens.size} allergen${allergens.size > 1 ? 's' : ''}`);
    return parts.join(', ');
  }, [servings, requiresCooking, allergens]);

  // ---- validation ----
  const missing = useMemo((): string[] => {
    const out: string[] = [];
    if (!name.trim()) out.push('a name');
    if (parseNum(proteinG) == null && proteinG.trim()) out.push('valid protein');
    if (parseNum(carbsG) == null && carbsG.trim()) out.push('valid carbs');
    if (parseNum(fatG) == null && fatG.trim()) out.push('valid fat');
    if (!hasNutrition) out.push('nutrition');
    if (!category) out.push('a category');
    if (!protein) out.push('a main protein');
    if (slots.size === 0) out.push('at least one slot');
    return out;
  }, [name, proteinG, carbsG, fatG, hasNutrition, category, protein, slots]);

  const canSave = missing.length === 0;

  const missingHint = useMemo(() => {
    if (canSave) return '';
    if (missing.length === 1) return `Add ${missing[0]} to save`;
    const head = missing.slice(0, -1).join(', ');
    return `Add ${head} and ${missing[missing.length - 1]} to save`;
  }, [missing, canSave]);

  const onSave = async () => {
    if (saving || loadingEdit) return;
    if (!canSave) {
      Alert.alert('Almost there', `${missingHint.replace(/ to save$/, '')}.`);
      return;
    }
    setSaving(true);
    try {
      const slug = editSlug ?? newCustomMealSlug();

      let imageUri: string | undefined = existingUri;
      if (pickedUri) {
        imageUri = (await importCustomMealImage(pickedUri, slug)) ?? undefined;
      }

      const cleanIngredients: CustomIngredient[] = filledIngredients.map((r) => {
        const amount = parseNum(r.amount);
        const unit = r.unit.trim();
        return {
          id: r.id,
          name: r.name.trim(),
          ...(amount != null ? { amount } : {}),
          ...(unit ? { unit } : {}),
        };
      });

      const cleanSteps = filledSteps.map((r) => ({
        summary: r.text.trim(),
        substeps: [] as string[],
      }));

      const now = new Date().toISOString();
      const meal: CustomMeal = {
        slug,
        display_name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        cuisine: CATEGORY_CUISINE[category!],
        primary_protein: protein!,
        eligible_slots: Array.from(slots),
        produces_servings: Math.max(1, Math.round(parseNum(servings) ?? 1)),
        contains_allergens: Array.from(allergens),
        macros: {
          kcal: derivedKcal,
          protein_g: numOrZero(proteinG),
          carbs_g: numOrZero(carbsG),
          fat_g: numOrZero(fatG),
          fiber_g: numOrZero(fiberG),
        },
        ingredients: cleanIngredients,
        steps: cleanSteps,
        ...(parseNum(activeMinutes) != null
          ? { time_active_minutes: Math.round(parseNum(activeMinutes)!) }
          : {}),
        requires_cooking: requiresCooking,
        ...(imageUri ? { image_uri: imageUri } : {}),
        created_at: createdAt ?? now,
        updated_at: now,
      };

      await upsertCustomMeal(meal);
      navigation.goBack();
    } catch (e) {
      console.error('AddCustomMeal: save failed', e);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- render ----
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerBtn}
        >
          <Ionicons name="close" size={22} color="#a1a1aa" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your meal</Text>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving || loadingEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.headerBtn, styles.headerBtnRight]}
        >
          <Text
            style={[
              styles.headerSave,
              { color: canSave ? themeColor : '#3f3f46' },
              (saving || loadingEdit) && { opacity: 0.6 },
            ]}
          >
            {saving ? 'Saving' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        {previewUri ? (
          <View style={styles.photoWrap}>
            <Image
              source={{ uri: previewUri }}
              style={styles.photo}
              contentFit="cover"
              transition={120}
            />
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={pickPhoto}>
                <Ionicons name="camera-outline" size={13} color="#fafafa" />
                <Text style={styles.photoActionText}>Change photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={removePhoto}>
                <Ionicons name="trash-outline" size={13} color="#f87171" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoEmpty} onPress={pickPhoto}>
            <Ionicons name="camera-outline" size={16} color="#52525b" />
            <Text style={styles.photoEmptyText}>Add a photo</Text>
          </TouchableOpacity>
        )}

        {/* Name + description */}
        <View style={styles.titleBlock}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Name your meal"
            placeholderTextColor="#52525b"
            maxLength={60}
          />
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description, optional"
            placeholderTextColor="#3f3f46"
            maxLength={140}
          />
        </View>

        {/* Nutrition */}
        {hasNutrition ? (
          <TouchableOpacity
            style={styles.macroCard}
            activeOpacity={0.75}
            onPress={() => setSheet('nutrition')}
          >
            <View style={styles.macroGrid}>
              {[
                { v: String(derivedKcal), l: 'kcal' },
                { v: String(numOrZero(proteinG)), l: 'prot' },
                { v: String(numOrZero(carbsG)), l: 'carb' },
                { v: String(numOrZero(fatG)), l: 'fat' },
              ].map((cell) => (
                <View key={cell.l} style={styles.macroCell}>
                  <Text style={styles.macroValue}>{cell.v}</Text>
                  <Text style={styles.macroLabel}>{cell.l}</Text>
                </View>
              ))}
            </View>
            <View style={styles.macroFooter}>
              <View style={styles.macroFooterLeft}>
                <Ionicons name="calculator-outline" size={12} color={themeColor} />
                <Text style={[styles.macroFooterText, { color: themeColor }]}>
                  Calories calculated, per serving
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#52525b" />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nutritionEmpty}
            activeOpacity={0.75}
            onPress={() => setSheet('nutrition')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nutritionEmptyTitle}>Add nutrition</Text>
              <Text style={styles.nutritionEmptySub}>
                Protein, carbs and fat per serving
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </TouchableOpacity>
        )}

        {/* Summary rows */}
        <View style={styles.rowList}>
          <SummaryRow
            label="Ingredients"
            value={
              filledIngredients.length > 0
                ? `${filledIngredients.length} item${filledIngredients.length > 1 ? 's' : ''}`
                : 'Add'
            }
            muted={filledIngredients.length === 0}
            onPress={() => setSheet('ingredients')}
            first
          />
          <SummaryRow
            label="Steps"
            value={
              filledSteps.length > 0
                ? `${filledSteps.length} step${filledSteps.length > 1 ? 's' : ''}`
                : 'Add'
            }
            muted={filledSteps.length === 0}
            onPress={() => setSheet('steps')}
          />
          <SummaryRow
            label="When you eat it"
            value={classifySummary}
            muted={!category || !protein}
            onPress={() => setSheet('classify')}
          />
          <SummaryRow
            label="Cooking, batch, allergens"
            value={extrasSummary}
            onPress={() => setSheet('extras')}
            last
          />
        </View>

        {!canSave && <Text style={styles.missingHint}>{missingHint}</Text>}
      </ScrollView>

      {/* ---------------- Nutrition sheet ---------------- */}
      <NutritionSheet
        visible={sheet === 'nutrition'}
        onClose={() => setSheet(null)}
        themeColor={themeColor}
        insets={insets}
        proteinG={proteinG}
        carbsG={carbsG}
        fatG={fatG}
        fiberG={fiberG}
        setProteinG={setProteinG}
        setCarbsG={setCarbsG}
        setFatG={setFatG}
        setFiberG={setFiberG}
        derivedKcal={derivedKcal}
      />

      {/* ---------------- Ingredients sheet ---------------- */}
      <Sheet
        visible={sheet === 'ingredients'}
        onClose={() => setSheet(null)}
        title="Ingredients"
        subtitle="Amounts are for one serving. Free text is fine, the AI localises these for your grocery list."
        themeColor={themeColor}
        insets={insets}
      >
        {ingredients.map((row) => (
          <View key={row.id} style={styles.ingRow}>
            <TextInput
              style={[styles.ingInput, { flex: 1.7 }]}
              value={row.name}
              onChangeText={(v) => setIngredientField(row.id, 'name', v)}
              placeholder="Ingredient"
              placeholderTextColor="#52525b"
            />
            <TextInput
              style={[styles.ingInput, { flex: 0.6 }]}
              value={row.amount}
              onChangeText={(v) => setIngredientField(row.id, 'amount', v)}
              keyboardType="decimal-pad"
              placeholder="Amt"
              placeholderTextColor="#52525b"
              maxLength={7}
            />
            <TextInput
              style={[styles.ingInput, { flex: 0.6 }]}
              value={row.unit}
              onChangeText={(v) => setIngredientField(row.id, 'unit', v)}
              placeholder="Unit"
              placeholderTextColor="#52525b"
              maxLength={12}
            />
            <TouchableOpacity
              onPress={() => removeIngredientRow(row.id)}
              style={styles.rowRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color="#3f3f46" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addIngredientRow} style={styles.addRowBtn}>
          <Ionicons name="add" size={15} color={themeColor} />
          <Text style={[styles.addRowText, { color: themeColor }]}>Add ingredient</Text>
        </TouchableOpacity>
      </Sheet>

      {/* ---------------- Steps sheet ---------------- */}
      <Sheet
        visible={sheet === 'steps'}
        onClose={() => setSheet(null)}
        title="Steps"
        subtitle="Plain summaries. Custom meals skip cook mode."
        themeColor={themeColor}
        insets={insets}
      >
        {steps.map((row, i) => (
          <View key={row.id} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: themeColor }]}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <TextInput
              style={[styles.ingInput, { flex: 1 }]}
              value={row.text}
              onChangeText={(v) => setStepText(row.id, v)}
              placeholder={`Step ${i + 1}`}
              placeholderTextColor="#52525b"
              multiline
            />
            <TouchableOpacity
              onPress={() => removeStepRow(row.id)}
              style={styles.rowRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color="#3f3f46" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addStepRow} style={styles.addRowBtn}>
          <Ionicons name="add" size={15} color={themeColor} />
          <Text style={[styles.addRowText, { color: themeColor }]}>Add step</Text>
        </TouchableOpacity>
      </Sheet>

      {/* ---------------- Classification sheet ---------------- */}
      <Sheet
        visible={sheet === 'classify'}
        onClose={() => setSheet(null)}
        title="When you eat it"
        subtitle="Controls where this meal can appear in your plan and which picker tabs show it."
        themeColor={themeColor}
        insets={insets}
      >
        <Text style={styles.sheetLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(({ key, label }) => {
            const on = category === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  on && { backgroundColor: themeColor, borderColor: themeColor },
                ]}
                onPress={() => pickCategory(key)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sheetLabel}>Eaten at</Text>
        <View style={styles.chipRow}>
          {SLOT_OPTIONS.map(({ slot, label }) => {
            const on = slots.has(slot);
            return (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.chip,
                  on && { backgroundColor: themeColor, borderColor: themeColor },
                ]}
                onPress={() => toggleSlot(slot)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sheetLabel}>Main protein</Text>
        <View style={styles.chipRow}>
          {PROTEIN_OPTIONS.map(({ value, label }) => {
            const on = protein === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.chip,
                  on && { backgroundColor: themeColor, borderColor: themeColor },
                ]}
                onPress={() => setProtein(value)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Sheet>

      {/* ---------------- Extras sheet ---------------- */}
      <Sheet
        visible={sheet === 'extras'}
        onClose={() => setSheet(null)}
        title="Cooking, batch, allergens"
        subtitle="Batch size informs meal prep scheduling. It never divides your macros."
        themeColor={themeColor}
        insets={insets}
      >
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Needs cooking</Text>
          <Switch
            value={requiresCooking}
            onValueChange={setRequiresCooking}
            trackColor={{ false: '#3f3f46', true: themeColor }}
            thumbColor="#fafafa"
          />
        </View>

        <View style={styles.sheetFieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetFieldLabel}>Hands-on time</Text>
            <Text style={styles.sheetFieldSub}>minutes, optional</Text>
          </View>
          <TextInput
            style={styles.sheetNumInput}
            value={activeMinutes}
            onChangeText={setActiveMinutes}
            keyboardType="number-pad"
            placeholder="25"
            placeholderTextColor="#52525b"
            maxLength={4}
          />
        </View>

        <View style={styles.sheetFieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetFieldLabel}>Makes</Text>
            <Text style={styles.sheetFieldSub}>servings per batch</Text>
          </View>
          <TextInput
            style={styles.sheetNumInput}
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#52525b"
            maxLength={3}
          />
        </View>

        <Text style={styles.sheetLabel}>Contains allergens</Text>
        <View style={styles.chipRow}>
          {ALLERGEN_OPTIONS.map((a) => {
            const on = allergens.has(a);
            return (
              <TouchableOpacity
                key={a}
                style={[
                  styles.chip,
                  on && { backgroundColor: themeColor, borderColor: themeColor },
                ]}
                onPress={() => toggleAllergen(a)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

// =============================================================================
// Summary row
// =============================================================================

function SummaryRow({
  label,
  value,
  onPress,
  muted,
  first,
  last,
}: {
  label: string;
  value: string;
  onPress: () => void;
  muted?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.summaryRow,
        first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1f1f24' },
        last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1f1f24' },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={styles.summaryValueWrap}>
        <Text
          style={[styles.summaryValue, muted && { color: '#52525b' }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={15} color="#52525b" />
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Generic bottom sheet
// =============================================================================

function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  themeColor,
  insets,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  themeColor: string;
  insets: { bottom: number };
  children: React.ReactNode;
}) {
  // Kept mounted through the exit animation so the panel can slide back down
  // and the backdrop can fade out before the Modal unmounts.
  const [mounted, setMounted] = useState(visible);
  const [panelHeight, setPanelHeight] = useState(520);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;

  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, fade, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, panelHeight || 520],
  });

  const backdropOpacity = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  // Chrome above the scroll area: grabber, title row, subtitle, safe area and
  // whatever the keyboard is currently covering.
  const chrome = 130 + keyboardHeight + (keyboardHeight > 0 ? 0 : insets.bottom);
  const scrollMaxHeight = Math.max(180, windowHeight * 0.82 - chrome);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Animated.View
          style={[styles.sheetBackdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingBottom:
                keyboardHeight > 0 ? keyboardHeight + 12 : Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.sheetDone, { color: themeColor }]}>Done</Text>
            </TouchableOpacity>
          </View>
          {!!subtitle && <Text style={styles.sheetSub}>{subtitle}</Text>}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 12 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// =============================================================================
// Nutrition sheet — calories are derived, never typed
// =============================================================================

function NutritionSheet({
  visible,
  onClose,
  themeColor,
  insets,
  proteinG,
  carbsG,
  fatG,
  fiberG,
  setProteinG,
  setCarbsG,
  setFatG,
  setFiberG,
  derivedKcal,
}: {
  visible: boolean;
  onClose: () => void;
  themeColor: string;
  insets: { bottom: number };
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  setProteinG: (v: string) => void;
  setCarbsG: (v: string) => void;
  setFatG: (v: string) => void;
  setFiberG: (v: string) => void;
  derivedKcal: number;
}) {
  // The arithmetic line only appears while a macro field has focus, so the
  // sheet stays quiet when it is simply reopened to check a number.
  const [focused, setFocused] = useState(false);

  const workingLine = `${numOrZero(proteinG)} x 4 + ${numOrZero(carbsG)} x 4 + ${numOrZero(
    fatG
  )} x 9`;

  const macroFields: {
    label: string;
    sub: string;
    value: string;
    set: (v: string) => void;
  }[] = [
    { label: 'Protein', sub: '4 kcal per gram', value: proteinG, set: setProteinG },
    { label: 'Carbs', sub: '4 kcal per gram', value: carbsG, set: setCarbsG },
    { label: 'Fat', sub: '9 kcal per gram', value: fatG, set: setFatG },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Nutrition"
      subtitle="For one serving. Batch size never divides these."
      themeColor={themeColor}
      insets={insets}
    >
      <View style={styles.kcalCard}>
        <Text style={styles.kcalValue}>{derivedKcal}</Text>
        <Text style={styles.kcalLabel}>kcal per serving</Text>
        <View style={[styles.kcalPill, { backgroundColor: `${themeColor}1f` }]}>
          <Ionicons name="calculator-outline" size={12} color={themeColor} />
          <Text style={[styles.kcalPillText, { color: themeColor }]}>
            Calculated from your macros
          </Text>
        </View>
      </View>
      {focused && <Text style={styles.kcalWorking}>{workingLine}</Text>}

      {macroFields.map((f) => (
        <View key={f.label} style={styles.sheetFieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetFieldLabel}>{f.label}</Text>
            <Text style={styles.sheetFieldSub}>{f.sub}</Text>
          </View>
          <View style={styles.macroInputWrap}>
            <TextInput
              style={styles.macroInput}
              value={f.value}
              onChangeText={f.set}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#52525b"
              maxLength={6}
            />
            <Text style={styles.macroUnit}>g</Text>
          </View>
        </View>
      ))}

      <View style={styles.sheetFieldRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sheetFieldLabel, { color: '#a1a1aa' }]}>Fibre</Text>
          <Text style={styles.sheetFieldSub}>optional, not counted in calories</Text>
        </View>
        <View style={styles.macroInputWrap}>
          <TextInput
            style={styles.macroInput}
            value={fiberG}
            onChangeText={setFiberG}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#52525b"
            maxLength={6}
          />
          <Text style={styles.macroUnit}>g</Text>
        </View>
      </View>
    </Sheet>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  headerBtn: { width: 52, alignItems: 'flex-start' },
  headerBtnRight: { alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '600',
  },
  headerSave: { fontSize: 14, fontWeight: '600' },

  photoWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#16161a',
  },
  photo: { width: '100%', height: 150 },
  photoActions: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,10,11,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  photoActionText: { color: '#fafafa', fontSize: 11 },
  photoEmpty: {
    marginHorizontal: 14,
    marginBottom: 12,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#26262b',
    backgroundColor: '#16161a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  photoEmptyText: { color: '#52525b', fontSize: 12 },

  titleBlock: { marginHorizontal: 14, marginBottom: 14 },
  nameInput: {
    color: '#fafafa',
    fontSize: 19,
    fontWeight: '600',
    padding: 0,
    marginBottom: 3,
  },
  descInput: { color: '#a1a1aa', fontSize: 12, padding: 0 },

  macroCard: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#26262b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 11,
    paddingBottom: 9,
  },
  macroGrid: { flexDirection: 'row' },
  macroCell: { flex: 1, alignItems: 'center' },
  macroValue: { color: '#fafafa', fontSize: 16, fontWeight: '600' },
  macroLabel: { color: '#71717a', fontSize: 10, marginTop: 2 },
  macroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#26262b',
    marginTop: 9,
    paddingTop: 8,
  },
  macroFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  macroFooterText: { fontSize: 10.5 },

  nutritionEmpty: {
    marginHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#2f2f36',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionEmptyTitle: { color: '#fafafa', fontSize: 13 },
  nutritionEmptySub: { color: '#71717a', fontSize: 11, marginTop: 3 },

  rowList: { marginHorizontal: 14 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f24',
  },
  summaryLabel: { color: '#a1a1aa', fontSize: 13, flexShrink: 0, marginRight: 12 },
  summaryValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  summaryValue: { color: '#fafafa', fontSize: 13, flexShrink: 1 },

  missingHint: {
    color: '#52525b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 14,
  },

  // ---- sheets ----
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    backgroundColor: '#0f0f11',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a30',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  grabber: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { color: '#fafafa', fontSize: 15, fontWeight: '600' },
  sheetDone: { fontSize: 13, fontWeight: '600' },
  sheetSub: { color: '#71717a', fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 12 },
  sheetLabel: { color: '#71717a', fontSize: 11, marginTop: 16, marginBottom: 8 },

  sheetFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f24',
  },
  sheetFieldLabel: { color: '#fafafa', fontSize: 13 },
  sheetFieldSub: { color: '#52525b', fontSize: 10, marginTop: 2 },
  sheetNumInput: {
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#26262b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fafafa',
    fontSize: 14,
    minWidth: 68,
    textAlign: 'right',
  },

  kcalCard: {
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#26262b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  kcalValue: { color: '#fafafa', fontSize: 30, fontWeight: '600' },
  kcalLabel: { color: '#71717a', fontSize: 11, marginTop: 3 },
  kcalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 9,
  },
  kcalPillText: { fontSize: 10 },
  kcalWorking: {
    color: '#52525b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
  macroInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#26262b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 74,
    justifyContent: 'flex-end',
    gap: 4,
  },
  macroInput: {
    color: '#fafafa',
    fontSize: 14,
    padding: 0,
    minWidth: 34,
    textAlign: 'right',
  },
  macroUnit: { color: '#71717a', fontSize: 11 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#16161a',
  },
  chipText: { color: '#a1a1aa', fontSize: 12 },
  chipTextOn: { color: '#0a0a0b', fontWeight: '600' },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ingInput: {
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: '#26262b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fafafa',
    fontSize: 13,
  },
  rowRemove: { paddingLeft: 2 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  addRowText: { fontSize: 12, fontWeight: '600' },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#0a0a0b', fontSize: 11, fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  switchLabel: { color: '#fafafa', fontSize: 13 },
});