import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';

/**
 * N7 — Location & store
 * Step 7. Drives the prompt builder's pricing/availability assumptions
 * (country, store) and currency (countryCode). Country + store required,
 * city optional. countryCode is derived from a small map of common
 * countries so currency is right; falls back undefined (builder defaults).
 */

const COUNTRY_CODES: Record<string, string> = {
  australia: 'AU',
  'united states': 'US',
  usa: 'US',
  america: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  canada: 'CA',
  'new zealand': 'NZ',
  ireland: 'IE',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  netherlands: 'NL',
  belgium: 'BE',
};

function deriveCountryCode(country: string): string | undefined {
  return COUNTRY_CODES[country.trim().toLowerCase()];
}

type ParamList = {
  N7Location: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function N7LocationScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'N7Location'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;

  const [country, setCountry] = useState<string>(answersSoFar.country ?? '');
  const [city, setCity] = useState<string>(answersSoFar.city ?? '');
  const [store, setStore] = useState<string>(answersSoFar.groceryStore ?? '');
  const [focused, setFocused] = useState<string | null>(null);

  const valid = country.trim().length > 0 && store.trim().length > 0;

  const fields = [
    {
      key: 'country',
      label: 'Country',
      value: country,
      set: setCountry,
      placeholder: 'e.g. Australia',
      optional: false,
    },
    {
      key: 'city',
      label: 'City (optional)',
      value: city,
      set: setCity,
      placeholder: 'e.g. Canberra',
      optional: true,
    },
    {
      key: 'store',
      label: 'Where you shop',
      value: store,
      set: setStore,
      placeholder: 'e.g. Woolworths',
      optional: false,
    },
  ];

  const handleNext = async () => {
    if (!valid) return;
    const countryCode = deriveCountryCode(country);
    const payload = {
      country: country.trim(),
      city: city.trim(),
      groceryStore: store.trim(),
      ...(countryCode ? { countryCode } : {}),
    };
    // Always save the answers to storage, whether in edit mode or not
    await updateNutritionField('country', payload.country);
    await updateNutritionField('city', payload.city);
    await updateNutritionField('groceryStore', payload.groceryStore);
    if (countryCode) await updateNutritionField('countryCode', countryCode);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N8Budget',
      { answersSoFar: { ...answersSoFar, ...payload }, flowStepOffset: stepOffset }
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 10}
        totalSteps={stepOffset + 12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>Where do you shop?</Text>
          <Text style={styles.subtitle}>
            So your AI prices the plan for real products near you.
          </Text>

          {fields.map((f) => (
            <View key={f.key}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View
                style={[
                  styles.inputRow,
                  focused === f.key && { borderColor: themeColor },
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.set}
                  onFocus={() => setFocused(f.key)}
                  onBlur={() => setFocused(null)}
                  placeholder={f.placeholder}
                  placeholderTextColor="#52525b"
                  autoCapitalize="words"
                />
              </View>
            </View>
          ))}
        </ScrollView>

        <View
          style={[
            styles.ctaBar,
            { paddingBottom: Math.max(insets.bottom, 12) + 4 },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!valid}
            onPress={handleNext}
            style={[
              styles.ctaButton,
              { backgroundColor: valid ? themeColor : '#1c1c1f' },
            ]}
          >
            <Text
              style={[styles.ctaText, { color: valid ? '#0a0a0b' : '#3f3f46' }]}
            >
              {editMode ? 'Save' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 19,
    marginBottom: 28,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputRow: {
    backgroundColor: '#131316',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#27272a',
    marginBottom: 22,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    paddingVertical: 15,
  },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '500' },
});