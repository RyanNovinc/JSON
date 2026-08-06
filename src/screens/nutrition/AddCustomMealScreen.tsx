// src/screens/nutrition/AddCustomMealScreen.tsx
//
// "Add your meal" — create or edit a user-created custom meal.
//
// Presented as a modal inside NutritionThemeProvider (green themeColor),
// registered as route 'AddCustomMeal' with optional { editSlug } param for
// edit mode.
//
// DESIGN NOTES (locked with the mockup, 3 Aug):
//   - Everything the user enters is PER SERVING (macros, ingredient amounts).
//     "Makes N servings" only informs batch scheduling — it never divides
//     the macros.
//   - Category chip drives `cuisine` (Breakfast/Snack/Smoothie/Dessert map
//     1:1; Main → 'australian' so it lands on the Mains shelf). Picking a
//     category preselects sensible "Eaten at" slots ONLY when none are
//     selected yet.
//   - The photo stays a cache URI while editing the form; it is copied into
//     permanent storage (importCustomMealImage) only on Save, so abandoning
//     the form never orphans a file. Replaced/removed photos are cleaned up
//     by upsertCustomMeal.
//   - No cook mode for custom meals — steps are plain summaries
//     (RecipeStep.substeps always []).

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [protein, setProtein] = useState<PrimaryProtein | null>(null);
  const [slots, setSlots] = useState<Set<MealSlot>>(new Set());
  const [kcal, setKcal] = useState('');
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
      setKcal(String(meal.macros.kcal));
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
  const addStepRow = () =>
    setSteps((prev) => [...prev, { id: nextRowId('st'), text: '' }]);
  const removeStepRow = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  // ---- validation + save ----
  const validationError = useMemo((): string | null => {
    if (!name.trim()) return 'Give your meal a name.';
    if (!category) return 'Pick a category.';
    if (!protein) return 'Pick the main protein.';
    if (slots.size === 0) return 'Pick at least one "Eaten at" slot.';
    const k = parseNum(kcal);
    if (k == null || k <= 0) return 'Enter calories per serving.';
    if (parseNum(proteinG) == null) return 'Enter protein per serving (0 is fine).';
    if (parseNum(carbsG) == null) return 'Enter carbs per serving (0 is fine).';
    if (parseNum(fatG) == null) return 'Enter fat per serving (0 is fine).';
    return null;
  }, [name, category, protein, slots, kcal, proteinG, carbsG, fatG]);

  const onSave = async () => {
    if (saving) return;
    if (validationError) {
      Alert.alert('Almost there', validationError);
      return;
    }
    setSaving(true);
    try {
      const slug = editSlug ?? newCustomMealSlug();

      let imageUri: string | undefined = existingUri;
      if (pickedUri) {
        imageUri = (await importCustomMealImage(pickedUri, slug)) ?? undefined;
      }

      const cleanIngredients: CustomIngredient[] = ingredients
        .filter((r) => r.name.trim().length > 0)
        .map((r) => {
          const amount = parseNum(r.amount);
          const unit = r.unit.trim();
          return {
            id: r.id,
            name: r.name.trim(),
            ...(amount != null ? { amount } : {}),
            ...(unit ? { unit } : {}),
          };
        });

      const cleanSteps = steps
        .map((r) => r.text.trim())
        .filter((t) => t.length > 0)
        .map((summary) => ({ summary, substeps: [] as string[] }));

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
          kcal: parseNum(kcal)!,
          protein_g: parseNum(proteinG)!,
          carbs_g: parseNum(carbsG)!,
          fat_g: parseNum(fatG)!,
          fiber_g: parseNum(fiberG) ?? 0,
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
  const saveDisabled = saving || loadingEdit;

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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit your meal' : 'Add your meal'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
                  <Ionicons name="camera-outline" size={14} color="#fafafa" />
                  <Text style={styles.photoActionText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionBtn} onPress={removePhoto}>
                  <Ionicons name="trash-outline" size={14} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoEmpty} onPress={pickPhoto}>
              <View
                style={[styles.photoIconCircle, { backgroundColor: `${themeColor}26` }]}
              >
                <Ionicons name="camera-outline" size={20} color={themeColor} />
              </View>
              <Text style={styles.photoEmptyText}>Add a photo</Text>
            </TouchableOpacity>
          )}

          {/* Name / description */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Mum's lasagne"
              placeholderTextColor="#52525b"
              maxLength={60}
            />
          </View>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Beef, rich tomato sauce, bechamel"
              placeholderTextColor="#52525b"
              maxLength={140}
            />
          </View>

          {/* Category */}
          <Text style={styles.sectionLabel}>Category</Text>
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
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Protein */}
          <Text style={styles.sectionLabel}>Main protein</Text>
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
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Eaten at */}
          <Text style={styles.sectionLabel}>Eaten at</Text>
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
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Controls where this meal can appear in your plan and which picker
            tabs show it.
          </Text>

          {/* Macros */}
          <Text style={styles.sectionLabel}>Macros per serving</Text>
          <View style={styles.macroRow}>
            {[
              { label: 'kcal', value: kcal, set: setKcal },
              { label: 'Protein g', value: proteinG, set: setProteinG },
              { label: 'Carbs g', value: carbsG, set: setCarbsG },
              { label: 'Fat g', value: fatG, set: setFatG },
            ].map(({ label, value, set }) => (
              <View key={label} style={styles.macroCell}>
                <TextInput
                  style={styles.macroInput}
                  value={value}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#52525b"
                  maxLength={6}
                />
                <Text style={styles.macroLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.fieldCard, { marginTop: 8 }]}>
            <Text style={styles.fieldLabel}>Fibre g (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={fiberG}
              onChangeText={setFiberG}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#52525b"
              maxLength={6}
            />
          </View>

          {/* Ingredients */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabelInline}>Ingredients · per serving</Text>
            <TouchableOpacity onPress={addIngredientRow} style={styles.addRowBtn}>
              <Ionicons name="add" size={14} color={themeColor} />
              <Text style={[styles.addRowText, { color: themeColor }]}>Add row</Text>
            </TouchableOpacity>
          </View>
          {ingredients.map((row) => (
            <View key={row.id} style={styles.ingRow}>
              <TextInput
                style={[styles.ingInput, { flex: 1.6 }]}
                value={row.name}
                onChangeText={(v) => setIngredientField(row.id, 'name', v)}
                placeholder="Ingredient"
                placeholderTextColor="#52525b"
              />
              <TextInput
                style={[styles.ingInput, { flex: 0.7 }]}
                value={row.amount}
                onChangeText={(v) => setIngredientField(row.id, 'amount', v)}
                keyboardType="decimal-pad"
                placeholder="Amt"
                placeholderTextColor="#52525b"
                maxLength={7}
              />
              <TextInput
                style={[styles.ingInput, { flex: 0.7 }]}
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
          <Text style={styles.hint}>
            Free text is fine — the AI localises these for your grocery list.
          </Text>

          {/* Steps */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabelInline}>Steps</Text>
            <TouchableOpacity onPress={addStepRow} style={styles.addRowBtn}>
              <Ionicons name="add" size={14} color={themeColor} />
              <Text style={[styles.addRowText, { color: themeColor }]}>Add step</Text>
            </TouchableOpacity>
          </View>
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

          {/* Cooking / time / servings */}
          <View style={[styles.fieldCard, styles.switchCard, { marginTop: 14 }]}>
            <Text style={styles.switchLabel}>Needs cooking</Text>
            <Switch
              value={requiresCooking}
              onValueChange={setRequiresCooking}
              trackColor={{ false: '#3f3f46', true: themeColor }}
              thumbColor="#fafafa"
            />
          </View>
          <View style={styles.twinRow}>
            <View style={[styles.fieldCard, styles.twinCell]}>
              <Text style={styles.fieldLabel}>Hands-on time (min)</Text>
              <TextInput
                style={styles.fieldInput}
                value={activeMinutes}
                onChangeText={setActiveMinutes}
                keyboardType="number-pad"
                placeholder="e.g. 25"
                placeholderTextColor="#52525b"
                maxLength={4}
              />
            </View>
            <View style={[styles.fieldCard, styles.twinCell]}>
              <Text style={styles.fieldLabel}>Makes (servings)</Text>
              <TextInput
                style={styles.fieldInput}
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#52525b"
                maxLength={3}
              />
            </View>
          </View>

          {/* Allergens */}
          <Text style={styles.sectionLabel}>Contains allergens (optional)</Text>
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

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: themeColor },
              saveDisabled && { opacity: 0.6 },
            ]}
            onPress={onSave}
            disabled={saveDisabled}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save meal'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  headerBtn: { width: 32, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
  },

  photoWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#16161a',
  },
  photo: { width: '100%', height: 170 },
  photoActions: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  photoActionText: { color: '#fafafa', fontSize: 12 },
  photoEmpty: {
    marginHorizontal: 14,
    marginBottom: 12,
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    backgroundColor: '#16161a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyText: { color: '#a1a1aa', fontSize: 12 },

  fieldCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#16161a',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  fieldLabel: { color: '#71717a', fontSize: 11, marginBottom: 2 },
  fieldInput: { color: '#fafafa', fontSize: 14, padding: 0 },

  sectionLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 7,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 7,
  },
  sectionLabelInline: { color: '#a1a1aa', fontSize: 12 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addRowText: { fontSize: 12, fontWeight: '600' },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginHorizontal: 14,
  },
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
  hint: {
    color: '#52525b',
    fontSize: 11,
    marginHorizontal: 14,
    marginTop: 7,
  },

  macroRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 14,
  },
  macroCell: {
    flex: 1,
    backgroundColor: '#16161a',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  macroInput: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    minWidth: 40,
    textAlign: 'center',
  },
  macroLabel: { color: '#71717a', fontSize: 11, marginTop: 2 },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 6,
  },
  ingInput: {
    backgroundColor: '#16161a',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fafafa',
    fontSize: 13,
  },
  rowRemove: { paddingLeft: 2 },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
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

  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  switchLabel: { color: '#fafafa', fontSize: 13 },
  twinRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 14,
  },
  twinCell: { flex: 1, marginHorizontal: 0 },

  saveBtn: {
    marginHorizontal: 14,
    marginTop: 18,
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnText: { color: '#0a0a0b', fontSize: 14, fontWeight: '700' },
});