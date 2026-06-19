import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { WorkoutStorage } from '../../utils/storage';

/**
 * FridgePantryScreen — lightweight "use these up" replacement for the old
 * full inventory tracker. Optional add-on reached from the Summary.
 *
 * DESIGN: we deliberately do NOT collect a full fridge inventory (it bloats
 * the prompt and the user can't tell what matters — "do I add my bananas?").
 * Instead the screen only offers bulk proteins + carbs/grains — the only
 * categories that change a bulking plan — as a tappable grid, plus one
 * optional catch-all line. Spices/condiments/odds are designed out: they
 * aren't on the screen, and the copy says the AI assumes you have them.
 *
 * No quantities: knowing 1kg vs 10kg doesn't change the plan — the user uses
 * what they have and tops up at the shop regardless. So we just signal "lean
 * toward these".
 *
 * STORAGE — writes the shape the prompt already reads (a compatible SUBSET of
 * the old heavy inventory shape). The prompt template's quantity/expiry/
 * location fields are all conditional, so a bare {name, location} ingredient
 * works and lands on the gentle "use these when they fit" guidance:
 *   WorkoutStorage.saveFridgePantryResults({
 *     formData: {
 *       wantToUseExistingIngredients: boolean,
 *       ingredients: [{ name, location }],
 *       preferences: { primaryApproach: 'balanced' },
 *     },
 *     completedAt,
 *   })
 * primaryApproach 'balanced' maps to the prompt's AI-LED / "use when they fit"
 * branch (NOT 'maximize', which would over-constrain). NO prompt change needed.
 *
 * This screen lives at src/screens/nutrition/FridgePantryScreen.tsx (sibling
 * of CuratedFavoritesScreen — note the ../../ import depth, not ../../../).
 */

const PROTEINS = [
  'Chicken',
  'Beef / steak',
  'Mince',
  'Pork',
  'Fish / salmon',
  'Eggs',
  'Protein powder',
  'Tofu',
];

const CARBS = [
  'Rice',
  'Pasta',
  'Oats',
  'Potatoes',
  'Bread / wraps',
  'Noodles',
];

// Which storage "location" each preset maps to. Doesn't affect the plan much,
// but the prompt prints it, so we set something sensible.
const PANTRY_ITEMS = new Set(['Rice', 'Pasta', 'Oats', 'Bread / wraps', 'Noodles', 'Protein powder']);
const locationFor = (name: string): 'fridge' | 'pantry' =>
  PANTRY_ITEMS.has(name) ? 'pantry' : 'fridge';

type ParamList = {
  FridgePantry: { editMode?: boolean } | undefined;
};

export default function FridgePantryScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'FridgePantry'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const editMode = route.params?.editMode ?? false;

  const scrollRef = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prefill from any previously saved fridge/pantry result (edit / revisit).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await WorkoutStorage.loadFridgePantryResults();
        const f = saved?.formData;
        if (active && f?.ingredients?.length) {
          const known = [...PROTEINS, ...CARBS];
          const picks: string[] = [];
          const leftovers: string[] = [];
          for (const ing of f.ingredients) {
            const n = ing?.name;
            if (!n) continue;
            if (known.includes(n)) picks.push(n);
            else leftovers.push(n);
          }
          setSelected(picks);
          if (leftovers.length) setExtra(leftovers.join(', '));
        }
      } catch {
        // no saved data — fine, this step is optional
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = (item: string) =>
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );

  const extraItems = extra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const hasAnything = selected.length > 0 || extraItems.length > 0;

  const persist = async () => {
    if (!hasAnything) return;
    const ingredients = [
      ...selected.map((name) => ({ name, location: locationFor(name) })),
      ...extraItems.map((name) => ({ name, location: 'pantry' as const })),
    ];
    await WorkoutStorage.saveFridgePantryResults({
      formData: {
        wantToUseExistingIngredients: true,
        ingredients,
        preferences: { primaryApproach: 'balanced' },
      },
      completedAt: new Date().toISOString(),
    });
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await persist();
      navigation.goBack();
    } catch (e) {
      console.error('FridgePantry save failed', e);
      setSaving(false);
    }
  };

  const handleSkip = () => navigation.goBack();
  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const renderChip = (item: string) => {
    const on = selected.includes(item);
    return (
      <TouchableOpacity
        key={item}
        activeOpacity={0.8}
        onPress={() => toggle(item)}
        style={[styles.chip, on && { backgroundColor: themeColor, borderColor: 'transparent' }]}
      >
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Use up what you have</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={themeColor} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            <Text style={styles.question}>Got proteins or staples to use up?</Text>
            <Text style={styles.subtitle}>
              Tap anything you've got plenty of — the AI will build meals around
              it where it fits. Skip everyday stuff like spices and condiments;
              it assumes you have those.
            </Text>

            <Text style={styles.group}>Proteins</Text>
            <View style={styles.chips}>{PROTEINS.map(renderChip)}</View>

            <Text style={[styles.group, { marginTop: 24 }]}>Carbs & grains</Text>
            <View style={styles.chips}>{CARBS.map(renderChip)}</View>

            <Text style={[styles.group, { marginTop: 26 }]}>Anything else? (optional)</Text>
            <TextInput
              style={styles.extraInput}
              value={extra}
              onChangeText={setExtra}
              onFocus={() => {
                // Ensure the field clears the keyboard even on smaller phones.
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
              }}
              placeholder="e.g. 2kg frozen prawns, a tub of Greek yoghurt…"
              placeholderTextColor="#52525b"
              multiline
            />

            <View style={styles.note}>
              <Ionicons name="bulb-outline" size={15} color={themeColor} style={{ marginTop: 1 }} />
              <Text style={styles.noteText}>
                Only add things you've got a real amount of and want to get
                through. A few items is plenty.
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={saving}
              onPress={handleContinue}
              style={[
                styles.ctaButton,
                { backgroundColor: hasAnything ? themeColor : '#1c1c1f' },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0a0a0b" />
              ) : (
                <Text style={[styles.ctaText, { color: hasAnything ? '#0a0a0b' : '#71717a' }]}>
                  {editMode ? 'Save' : hasAnything ? 'Continue' : 'Done'}
                </Text>
              )}
            </TouchableOpacity>
            {!hasAnything && !editMode && (
              <TouchableOpacity activeOpacity={0.7} onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip — nothing to use up</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#d4d4d8',
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
  question: {
    fontSize: 25,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 31,
    letterSpacing: -0.4,
    marginBottom: 9,
  },
  subtitle: { fontSize: 13, color: '#71717a', lineHeight: 19, marginBottom: 24 },
  group: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 11,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
  chipTextOn: { color: '#0a0a0b', fontWeight: '600' },
  extraInput: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 48,
    textAlignVertical: 'top',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    borderRadius: 11,
  },
  noteText: { flex: 1, fontSize: 12, color: '#a1a1aa', lineHeight: 18 },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  ctaButton: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '500' },
  skipBtn: { height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  skipText: { fontSize: 13, fontWeight: '500', color: '#71717a' },
});