import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import {
  buildPrepSessionWithFreshness,
  PrepSessionWithFreshness,
} from '../utils/buildPrepSession';
import { CURATED_MEALS } from '../data/curated_meals';
import { INGREDIENTS } from '../data/ingredients';
import { displayIngredient } from '../utils/ingredientScaling';

// ============================================================================
// PREP MODE — the "technical level" of the prep session. The session screen is
// the high level (which dish now); this screen walks the steps for ONE dish,
// prep-day steps only, then ends on a generated STORE IT finale and marks the
// session task done on the way out.
//
// Standalone by design: reads straight from CURATED_MEALS, no dependency on
// CookModeScreen (whose current source wasn't available when this was built).
// If the two ever merge, this screen defines the prep-day behaviour to keep.
//
// Step sourcing:
//   - meals with sauce_variants: variant.instructions[methodId]
//   - all other meals:           method.instructions
// Steps may optionally carry `phase: 'prep' | 'day_of'` (being added to the 7
// partial-strategy meals). Untagged steps count as prep, so the 78 meals that
// need no tagging work unchanged, and day_of-tagged steps are excluded here
// and surfaced on the finale instead.
// ============================================================================

// Route params come from RootStackParamList.PrepMode (typed in AppNavigator).
type PrepModeRoute = RouteProp<RootStackParamList, 'PrepMode'>;

interface StepEntry {
  summary: string;
  substeps?: string[];
  phase?: 'prep' | 'day_of';
}

function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// ---------------------------------------------------------------------------
// Prose scaling — mirrors CookMode's documented behaviour so the two screens
// never disagree: single-serve recipes (produces_servings === 1) get their
// mass/volume tokens multiplied by the batch serving count; batch recipes are
// already written per pot and are left untouched. Only g/kg/ml/l scale —
// counts, temperatures, cm, and minutes never do.
// ---------------------------------------------------------------------------
function scalePrepText(text: string, scale: number): string {
  if (!text || scale === 1) return text;
  return text.replace(
    /(\d+(?:\.\d+)?)\s*(kg|g|ml|l)(?![a-zA-Z])/g,
    (_m, num: string, unit: string) => {
      const scaled = parseFloat(num) * scale;
      if (unit === 'g' || unit === 'ml') {
        return `${Math.round(scaled)}${unit}`;
      }
      const trimmed = Math.round(scaled * 100) / 100;
      return `${trimmed}${unit}`;
    }
  );
}

// First duration mentioned in a step, for the timer chip. Display-only.
function extractDuration(text: string): string | null {
  const m = text.match(
    /(\d+(?:\s*[-–]\s*\d+)?)\s*(minutes|minute|mins|min|hours|hour|hrs)\b/i
  );
  if (!m) return null;
  const unit = /hour|hr/i.test(m[2]) ? (m[1].includes('-') || m[1].includes('–') ? 'hours' : parseInt(m[1], 10) === 1 ? 'hour' : 'hours') : 'min';
  return `${m[1].replace(/\s/g, '')} ${unit}`;
}

function ingredientName(id: string): string {
  const entry = (INGREDIENTS as any)[id];
  if (entry?.display_name) return entry.display_name as string;
  return id.split('_').filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Dates for the STORE IT finale. Shelf life as a number of days is a spec the
// user has to add to today themselves; a date is the same fact already usable.
// Date-only strings are built in LOCAL time — new Date('2026-08-07') parses as
// UTC midnight, which can render as the previous day.
// ---------------------------------------------------------------------------
function parseEatDate(raw: string): Date | null {
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// "2026-08-07" → "Fri 7 Aug". Unparseable values pass through untouched, so a
// format change upstream degrades to showing the raw value rather than "—".
function formatEatDate(raw: string): string {
  const d = parseEatDate(raw);
  if (!d) return raw;
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  return `${weekday} ${d.getDate()} ${month}`;
}

// "Fri 7 Aug" / "Fri 7 Aug and Sat 8 Aug" / "Fri 7 Aug, Sat 8 Aug and Sun 9 Aug"
function joinEatDates(dates: string[]): string {
  const parts = dates.map(formatEatDate);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// The last day the fridge portions are still good: today (cook day) + shelf life.
function eatByLabel(fridgeDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + fridgeDays);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  return `${weekday} ${d.getDate()} ${month}`;
}

function humanizeEquipment(id: string): string {
  const words = id.split('_').filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// A recognisable icon per piece of gear, matched on the raw equipment id so
// new ids fall through to a generic tool rather than breaking the tile.
function equipmentIcon(id: string): keyof typeof Ionicons.glyphMap {
  const k = id.toLowerCase();
  if (k.includes('slow_cooker') || k.includes('pressure') || k.includes('instant'))
    return 'timer-outline';
  if (k.includes('oven') || k.includes('tray') || k.includes('sheet') || k.includes('dish'))
    return 'grid-outline';
  if (k.includes('air_fry')) return 'thermometer-outline';
  if (k.includes('stove') || k.includes('pan') || k.includes('pot') || k.includes('wok') || k.includes('skillet'))
    return 'flame-outline';
  if (k.includes('knife') || k.includes('board')) return 'cut-outline';
  if (k.includes('blender') || k.includes('processor') || k.includes('mixer'))
    return 'flash-outline';
  if (k.includes('bowl') || k.includes('container') || k.includes('jar'))
    return 'ellipse-outline';
  if (k.includes('scale')) return 'speedometer-outline';
  if (k.includes('grill') || k.includes('bbq')) return 'bonfire-outline';
  return 'construct-outline';
}

interface IngredientRow {
  ingredient_id: string;
  base_amount: number;
  unit: string;
  notes?: string;
}

export default function PrepModeScreen() {
  const navigation = useNavigation();
  const route = useRoute<PrepModeRoute>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { currentPlan } = useSimplifiedMealPlanning();

  const { mealSlug, plateId, servings, planId, doneKey, title } = route.params;

  const meal = useMemo(
    () => Object.values(CURATED_MEALS).find((m: any) => m.slug === mealSlug) as any,
    [mealSlug]
  );

  const freshnessSession: PrepSessionWithFreshness | null = useMemo(
    () => (currentPlan ? buildPrepSessionWithFreshness(currentPlan) : null),
    [currentPlan]
  );

  const methods: any[] = meal?.methods ?? [];
  const variants: any[] | null = meal?.sauce_variants ?? null;
  const defaultVariantId: string | null =
    variants && variants.length > 0
      ? (variants.find((v) => v.is_default) ?? variants[0]).id
      : null;

  // Method: chosen on the entry picker when a dish has more than one (asked
  // every time, per Ryan's call), auto-selected when there's exactly one.
  const [methodId, setMethodId] = useState<string | null>(
    methods.length === 1 ? methods[0].id : null
  );
  const [pendingMethodId, setPendingMethodId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(defaultVariantId);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  // The gather (mise en place) screen shows once per dish entry, between the
  // method choice and step 1: everything to get out before cooking starts.
  const [gathered, setGathered] = useState(false);
  // Which gather rows have been pulled out. Keyed by row index within the
  // resolved ingredient list, so it survives a trip into step 1 and back but
  // resets whenever the method (and therefore the list) changes.
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggleChecked = useCallback((i: number) => {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[i]) delete next[i];
      else next[i] = true;
      return next;
    });
  }, []);

  // ----- Steps for the chosen variant × method -----------------------------
  const allSteps: StepEntry[] = useMemo(() => {
    if (!meal || !methodId) return [];
    if (variants && variants.length > 0) {
      const variant = variants.find((v) => v.id === variantId) ?? variants[0];
      return (variant?.instructions?.[methodId] ?? []) as StepEntry[];
    }
    const method = methods.find((m) => m.id === methodId);
    return (method?.instructions ?? []) as StepEntry[];
  }, [meal, methods, variants, variantId, methodId]);

  // Untagged = prep. Only steps explicitly tagged day_of are excluded, so the
  // meals without phase tags walk their full recipe (correct for strategy:
  // 'full', where the whole cook IS the prep).
  const prepSteps = useMemo(() => allSteps.filter((s) => s.phase !== 'day_of'), [allSteps]);
  const dayOfSteps = useMemo(() => allSteps.filter((s) => s.phase === 'day_of'), [allSteps]);

  // ----- Gather screen data ------------------------------------------------
  // Ingredient rows for the dish as configured: shared base_ingredients plus
  // the chosen variant's rows (variant meals keep method.ingredients empty),
  // plus method rows (where non-variant meals keep everything). Plate
  // additional_ingredients are day-of assembly and deliberately excluded.
  const ingredientRows: IngredientRow[] = useMemo(() => {
    if (!meal || !methodId) return [];
    const variant =
      variants && variants.length > 0
        ? variants.find((v) => v.id === variantId) ?? variants[0]
        : null;
    const method = methods.find((m) => m.id === methodId);
    return [
      ...((meal.base_ingredients ?? []) as IngredientRow[]),
      ...((variant?.ingredients ?? []) as IngredientRow[]),
      ...((method?.ingredients ?? []) as IngredientRow[]),
    ];
  }, [meal, methods, variants, variantId, methodId]);

  const equipment: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] =
    useMemo(() => {
      const method = methods.find((m) => m.id === methodId);
      return ((method?.equipment_required ?? []) as string[]).map((id) => ({
        id,
        label: humanizeEquipment(id),
        icon: equipmentIcon(id),
      }));
    }, [methods, methodId]);

  // Footer context on the gather screen: what's waiting on the other side of
  // the button, so the space under the list carries information instead of air.
  const activeMinutes: number | null = useMemo(() => {
    const method = methods.find((m) => m.id === methodId);
    const v = method?.time_active_minutes;
    return typeof v === 'number' && v > 0 ? v : null;
  }, [methods, methodId]);

  const checkedCount = useMemo(
    () => ingredientRows.reduce((n, _row, i) => n + (checked[i] ? 1 : 0), 0),
    [ingredientRows, checked]
  );

  const stepScale = meal?.produces_servings === 1 ? servings : 1;
  const totalScreens = prepSteps.length + 1; // + STORE IT finale
  const onFinale = stepIndex >= prepSteps.length;

  // ----- Finale content ----------------------------------------------------
  const storage = meal?.meal_prep?.storage as
    | { fridge_days?: number; freeze_months?: number }
    | undefined;

  // The whole freshness object, not just its prose note: fridge_days,
  // freeze_servings and freeze_dates are what let the finale say WHERE each
  // container goes instead of quoting shelf-life specs at the user.
  const freshness = useMemo(() => {
    const item = freshnessSession?.items.find(
      (i) => i.curated_meal_slug === mealSlug && i.plate_id === plateId
    );
    return item?.freshness ?? null;
  }, [freshnessSession, mealSlug, plateId]);

  // How the batch divides.
  //
  // These two numbers must be in the SAME unit, and they weren't: `servings` is
  // cookServings — round(Σ scale_factor), clamped to the cook flow's range —
  // while freeze_servings counts eat-dates. Subtracting one from the other went
  // wrong the moment a meal was scaled, or when the session screen merged two
  // plates of one dish into a single batch. So take the freezer's SHARE of the
  // eat dates and apply it to the containers actually being filled.
  const eatDateCount =
    (freshness?.fridge_dates?.length ?? 0) + (freshness?.freeze_dates?.length ?? 0);
  const freezeCount =
    freshness && eatDateCount > 0
      ? Math.min(
          servings,
          Math.round((servings * freshness.freeze_dates.length) / eatDateCount)
        )
      : 0;
  const fridgeCount = Math.max(0, servings - freezeCount);
  const fridgeDays = freshness?.fridge_days ?? storage?.fridge_days ?? null;

  // "On the day" lines, best source first: authored day_of_summary → day_of-
  // tagged steps → the plate's assembly instructions. All existing data.
  const onTheDayLines: string[] = useMemo(() => {
    const summary = meal?.meal_prep?.day_of_summary?.trim();
    if (summary) return [summary];
    if (dayOfSteps.length > 0) return dayOfSteps.map((s) => s.summary);
    const plate = meal?.plates?.find((p: any) => p.id === plateId);
    const assembly = (plate?.additional_instructions ?? []) as StepEntry[];
    return assembly.map((s) => s.summary).filter(Boolean);
  }, [meal, dayOfSteps, plateId]);

  // ----- Mark the session task done and leave ------------------------------
  // Same storage the session screen reads (@mealprep_done_<planId>); it
  // reloads on focus, so the return lands on the next undone task.
  const finishBatch = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const key = `@mealprep_done_${planId}`;
      const raw = await AsyncStorage.getItem(key);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(doneKey)) arr.push(doneKey);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
    } catch {
      // Non-fatal: the session screen's Done button still works as a fallback.
    }
    navigation.goBack();
  }, [saving, planId, doneKey, navigation]);

  const displayName = title ?? meal?.display_name ?? 'Prep';
  const entryVisible = methodId === null && methods.length > 1;

  // ----- Guard: meal missing from the catalogue ----------------------------
  if (!meal) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter} />
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>This meal isn't in the catalogue.</Text>
        </View>
      </View>
    );
  }

  // ----- Entry: method picker (and sauce toggle when it exists) ------------
  if (entryVisible) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.headerSub}>
              Prep · {servings} {servings === 1 ? 'serving' : 'servings'}
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        >
          <Text style={[styles.eyebrow, { color: themeColor }]}>CHOOSE A METHOD</Text>
          {methods.map((m) => {
            const selected = pendingMethodId === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.methodCard,
                  selected && { borderColor: themeColor, borderWidth: 1 },
                ]}
                activeOpacity={0.75}
                onPress={() => setPendingMethodId(m.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>{m.display_name}</Text>
                  <Text style={styles.methodMeta}>
                    {formatTime(m.time_active_minutes)} hands-on ·{' '}
                    {formatTime(m.time_total_minutes)} total
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selected ? themeColor : '#3f3f46'}
                />
              </TouchableOpacity>
            );
          })}

          {variants && variants.length > 1 ? (
            <>
              <Text style={[styles.eyebrow, { color: '#71717a', marginTop: 22 }]}>SAUCE</Text>
              <View style={styles.variantRow}>
                {variants.map((v) => {
                  const selected = variantId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.variantChip,
                        selected && { borderColor: themeColor },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setVariantId(v.id)}
                    >
                      <Text
                        style={[
                          styles.variantChipText,
                          selected && { color: '#fff' },
                        ]}
                      >
                        {v.display_name}
                        {v.is_default ? ' · default' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: pendingMethodId ? themeColor : '#27272a', marginTop: 26 },
            ]}
            activeOpacity={0.85}
            disabled={!pendingMethodId}
            onPress={() => {
              setMethodId(pendingMethodId);
              setStepIndex(0);
              setGathered(false);
              setChecked({});
            }}
          >
            <Ionicons name="play" size={14} color={pendingMethodId ? '#000' : '#52525b'} />
            <Text
              style={[
                styles.primaryBtnText,
                !pendingMethodId && { color: '#52525b' },
              ]}
            >
              Start
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ----- Gather: get everything out before step 1 --------------------------
  if (methodId && !gathered) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.headerSub}>
              Prep · {servings} {servings === 1 ? 'serving' : 'servings'}
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View style={styles.gatherBody}>
            <Text style={styles.gatherTitle}>Get everything out</Text>
            <Text style={styles.gatherLead}>
              Lay it all on the bench, then the steps run clean.
            </Text>

            {equipment.length > 0 ? (
              <View style={styles.gearRow}>
                {equipment.map((e) => (
                  <View key={e.id} style={styles.gearTile}>
                    <Ionicons name={e.icon} size={18} color={themeColor} />
                    <Text style={styles.gearText} numberOfLines={1}>
                      {e.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.gatherHead}>
              <Text style={styles.gatherHeadLabel}>INGREDIENTS</Text>
              <Text
                style={[
                  styles.gatherHeadCount,
                  { color: checkedCount === ingredientRows.length ? themeColor : '#71717a' },
                ]}
              >
                {checkedCount === ingredientRows.length
                  ? 'all out'
                  : `${checkedCount} of ${ingredientRows.length} out`}
              </Text>
            </View>

            {ingredientRows.map((row, i) => {
              const qty = displayIngredient({
                baseAmount: row.base_amount,
                unit: row.unit,
                producesServings: meal.produces_servings ?? 1,
                portions: servings,
                planScale: 1,
              });
              const isOut = !!checked[i];
              return (
                <TouchableOpacity
                  key={`${row.ingredient_id}-${i}`}
                  style={[
                    styles.ingRow,
                    i < ingredientRows.length - 1 && styles.ingRowDivider,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleChecked(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isOut }}
                  accessibilityLabel={`${ingredientName(row.ingredient_id)}, ${qty}`}
                >
                  <View
                    style={[
                      styles.tickCircle,
                      isOut
                        ? { backgroundColor: themeColor, borderColor: themeColor }
                        : { borderColor: '#3f3f46' },
                    ]}
                  >
                    {isOut ? <Ionicons name="checkmark" size={15} color="#000" /> : null}
                  </View>
                  <Text
                    style={[styles.ingName, isOut && styles.ingNameOut]}
                    numberOfLines={2}
                  >
                    {ingredientName(row.ingredient_id)}
                  </Text>
                  <Text style={[styles.ingQty, isOut && styles.ingQtyOut]}>{qty}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={[styles.gatherFooter, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.gatherFooterNote}>
            {prepSteps.length} {prepSteps.length === 1 ? 'step' : 'steps'} after this
            {activeMinutes ? ` · about ${formatTime(activeMinutes)} hands on` : ''}
          </Text>
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.prevBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (methods.length > 1) {
                  setMethodId(null);
                  setPendingMethodId(null);
                } else {
                  navigation.goBack();
                }
              }}
            >
              <Ionicons name="chevron-back" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: themeColor, flex: 1 }]}
              activeOpacity={0.85}
              onPress={() => {
                setGathered(true);
                setStepIndex(0);
              }}
            >
              <Text style={styles.primaryBtnText}>All out, start steps</Text>
              <Ionicons name="chevron-forward" size={15} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ----- Step walker / finale ----------------------------------------------
  const step = onFinale ? null : prepSteps[stepIndex];
  const stepText = step ? scalePrepText(step.summary, stepScale) : '';
  const duration = step ? extractDuration(stepText) : null;

  const goPrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      // Back off the first step returns to the gather screen.
      setGathered(false);
    }
  };
  const canGoPrev = true;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} hitSlop={10} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.headerSub}>
            Prep · {servings} {servings === 1 ? 'serving' : 'servings'}
          </Text>
        </View>
        <Text style={styles.headerCount}>
          {Math.min(stepIndex + 1, totalScreens)}/{totalScreens}
        </Text>
      </View>

      <View style={styles.strip}>
        {Array.from({ length: totalScreens }).map((_, i) => {
          const done = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <View
              key={i}
              style={[
                styles.stripSeg,
                done
                  ? { backgroundColor: themeColor }
                  : isCurrent
                  ? { backgroundColor: '#18181b', borderWidth: 1, borderColor: themeColor }
                  : { backgroundColor: '#27272a' },
              ]}
            />
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30, flexGrow: 1 }}
      >
        {onFinale ? (
          <View style={[styles.body, styles.finaleBody]}>
            <Text style={[styles.stepEyebrow, { color: themeColor }]}>STORE IT</Text>
            <Text style={styles.storeHeadline}>
              {freezeCount > 0 && fridgeCount > 0 ? (
                <>
                  Let it cool, then split it{'\n'}
                  <Text style={styles.storeHeadlineSub}>
                    {servings} containers, two places.
                  </Text>
                </>
              ) : freezeCount > 0 ? (
                <>
                  Let it cool, then freeze it{'\n'}
                  <Text style={styles.storeHeadlineSub}>
                    All {servings} {servings === 1 ? 'container' : 'containers'}.
                  </Text>
                </>
              ) : (
                <>
                  Let it cool, then fill{'\n'}
                  {servings} {servings === 1 ? 'container' : 'containers'}.
                </>
              )}
            </Text>

            {/* Where each container goes. The counts are the loudest thing on
                the screen because the split is the only decision being made. */}
            <View style={styles.destList}>
              {fridgeCount > 0 ? (
                <View style={styles.dest}>
                  <View style={styles.destNum}>
                    <Text style={styles.destNumText}>{fridgeCount}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.destWhere}>
                      <Ionicons name="cube-outline" size={15} color="#fff" />
                      <Text style={styles.destWhereText}>In the fridge</Text>
                    </View>
                    <Text style={styles.destWhen}>
                      {fridgeDays
                        ? `Eat ${fridgeCount === 1 ? 'this' : 'these'} by ${eatByLabel(
                            fridgeDays
                          )}`
                        : 'Keep chilled until you need them'}
                    </Text>
                  </View>
                </View>
              ) : null}

              {freezeCount > 0 ? (
                <View style={[styles.dest, styles.destIce]}>
                  <View style={[styles.destNum, styles.destNumIce]}>
                    <Text style={styles.destNumText}>{freezeCount}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.destWhere}>
                      <Ionicons name="snow-outline" size={15} color="#7dd3fc" />
                      <Text style={[styles.destWhereText, styles.destWhereTextIce]}>
                        In the freezer
                      </Text>
                    </View>
                    <Text style={[styles.destWhen, styles.destWhenIce]}>
                      {freshness?.freeze_dates && freshness.freeze_dates.length > 0
                        ? `For ${joinEatDates(freshness.freeze_dates)}. Move ${
                            freezeCount === 1 ? 'it' : 'one'
                          } to the fridge the night before${freezeCount === 1 ? '' : ' each'}.`
                        : 'Thaw overnight in the fridge before you need it.'}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {onTheDayLines.length > 0 ? (
              <View style={[styles.dayOfBlock, styles.finaleDayOf]}>
                <Text style={styles.dayOfEyebrow}>ON THE DAY</Text>
                {onTheDayLines.map((line, i) => (
                  <Text key={i} style={styles.dayOfText}>{line}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={[styles.stepEyebrow, { color: themeColor }]}>
              STEP {stepIndex + 1}
            </Text>
            <Text style={styles.stepText}>{stepText}</Text>
            {duration ? (
              <View style={styles.durationChip}>
                <Ionicons name="time-outline" size={13} color="#a1a1aa" />
                <Text style={styles.durationText}>{duration}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {onFinale ? (
          <>
            <TouchableOpacity style={styles.prevBtn} activeOpacity={0.7} onPress={goPrev}>
              <Ionicons name="chevron-back" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: themeColor, flex: 1 }]}
              activeOpacity={0.85}
              onPress={finishBatch}
            >
              <Ionicons name="checkmark" size={15} color="#000" />
              <Text style={styles.primaryBtnText}>Batch done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.prevBtn, !canGoPrev && { opacity: 0.35 }]}
              activeOpacity={0.7}
              disabled={!canGoPrev}
              onPress={goPrev}
            >
              <Ionicons name="chevron-back" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: themeColor, flex: 1 }]}
              activeOpacity={0.85}
              onPress={() => setStepIndex(stepIndex + 1)}
            >
              <Text style={styles.primaryBtnText}>
                {stepIndex === prepSteps.length - 1 ? 'Store it' : 'Next step'}
              </Text>
              <Ionicons name="chevron-forward" size={15} color="#000" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  headerSub: { color: '#a1a1aa', fontSize: 12, letterSpacing: 0.4, marginTop: 2 },
  headerCount: { color: '#71717a', fontSize: 11, width: 36, textAlign: 'right' },

  strip: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 6 },
  stripSeg: { flex: 1, height: 4, borderRadius: 2 },

  body: { paddingHorizontal: 20, paddingTop: 24 },
  stepEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  stepText: { color: '#fff', fontSize: 19, lineHeight: 29, marginTop: 12 },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  durationText: { color: '#a1a1aa', fontSize: 12 },

  // Gather screen — the one screen read at arm's length across a bench, so it
  // carries the largest type in the flow.
  gatherBody: { paddingHorizontal: 18, paddingTop: 18 },
  gatherTitle: { color: '#fff', fontSize: 21, fontWeight: '600', letterSpacing: -0.3 },
  gatherLead: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginTop: 5 },
  gearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  gearTile: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  gearText: { flex: 1, color: '#e4e4e7', fontSize: 13 },
  gatherHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  gatherHeadLabel: { color: '#71717a', fontSize: 12, fontWeight: '600', letterSpacing: 0.9 },
  gatherHeadCount: { fontSize: 12 },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 2,
  },
  ingRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  tickCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingName: { flex: 1, color: '#fff', fontSize: 16, lineHeight: 21 },
  ingNameOut: { color: '#52525b', textDecorationLine: 'line-through' },
  ingQty: { color: '#fff', fontSize: 16, fontWeight: '500' },
  ingQtyOut: { color: '#52525b', fontWeight: '400', textDecorationLine: 'line-through' },
  gatherFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
  },
  gatherFooterNote: {
    color: '#52525b',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 10,
  },
  footerRow: { flexDirection: 'row', gap: 10 },

  // STORE IT finale
  finaleBody: { flex: 1 },
  storeHeadline: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 12,
  },
  storeHeadlineSub: { color: '#9a9aa3' },
  destList: { marginTop: 22, gap: 11 },
  dest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 15,
    backgroundColor: '#141417',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  destIce: {
    backgroundColor: 'rgba(56,189,248,0.07)',
    borderColor: 'rgba(56,189,248,0.26)',
  },
  destNum: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4d4d8',
  },
  destNumIce: { backgroundColor: '#38bdf8' },
  destNumText: { color: '#000', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  destWhere: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destWhereText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  destWhereTextIce: { color: '#7dd3fc' },
  destWhen: { color: '#9a9aa3', fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  destWhenIce: { color: 'rgba(125,211,252,0.82)' },
  finaleDayOf: { marginTop: 'auto', paddingBottom: 8 },

  dayOfBlock: {
    marginTop: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#27272a',
    paddingLeft: 12,
  },
  dayOfEyebrow: { color: '#52525b', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  dayOfText: { color: '#71717a', fontSize: 13, lineHeight: 19, marginTop: 5 },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  prevBtn: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    paddingVertical: 13,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },

  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 15,
  },
  methodName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  methodMeta: { color: '#71717a', fontSize: 12, marginTop: 4 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  variantChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3f3f46',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  variantChipText: { color: '#a1a1aa', fontSize: 12 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#d1d5db', fontSize: 14 },
});