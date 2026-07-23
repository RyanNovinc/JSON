// Global per-meal sauce-variant choice ("MAKE IT"), shared by the shopping
// list, RecipeDetailScreen, and (via navigation params) CookMode. Only
// deviations from the default are stored — absence means "easy default".
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nutrition_variant_choices_v1';

export type VariantChoices = Record<string, string>; // slug -> variantId

export async function getVariantChoices(): Promise<VariantChoices> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function setVariantChoice(slug: string, variantId: string | null): Promise<VariantChoices> {
  const choices = await getVariantChoices();
  if (variantId == null) delete choices[slug];
  else choices[slug] = variantId;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(choices));
  } catch {}
  return choices;
}