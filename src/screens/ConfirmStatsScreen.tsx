import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { loadGoalsProfile, updateGoalsProfileField } from '../utils/goalsProfileStorage';
import {
  continueWorkoutFlow,
  continueNutritionFlow,
} from '../utils/questionnaireRouting';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';

/**
 * ConfirmStatsScreen — the lightweight touchpoint for returning users
 * (a usable GoalsProfile already exists). Shown once, right before the
 * plan-specific questions, so current weight/body-fat don't silently go
 * stale between plans. Not part of the numbered questionnaire progress
 * bar — it's a single confirm-or-edit step, not a flow of its own.
 */

type Nav = StackNavigationProp<RootStackParamList, 'ConfirmStats'>;
type RouteProps = RouteProp<RootStackParamList, 'ConfirmStats'>;

export default function ConfirmStatsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const nextFlow = route.params?.nextFlow ?? 'workout';
  const extraParams = route.params?.extraParams ?? {};

  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);

  const [originalWeightKg, setOriginalWeightKg] = useState<number | null>(null);
  const [originalBodyFatPct, setOriginalBodyFatPct] = useState<number | undefined>(undefined);

  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [weightDisplay, setWeightDisplay] = useState('');
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  const [bodyFatInput, setBodyFatInput] = useState('');

  useEffect(() => {
    (async () => {
      const profile = await loadGoalsProfile();
      if (profile?.currentWeightKg) {
        setOriginalWeightKg(profile.currentWeightKg);
        setCurrentWeightKg(profile.currentWeightKg);
        setWeightDisplay(`${Math.round(profile.currentWeightKg * 10) / 10} kg`);
      }
      if (profile?.currentBodyFatPct != null) {
        setOriginalBodyFatPct(profile.currentBodyFatPct);
        setBodyFatInput(String(profile.currentBodyFatPct));
      }
      setLoading(false);
    })();
  }, []);

  const handleClose = () => navigation.goBack();

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      const newBodyFatPct = bodyFatInput ? parseFloat(bodyFatInput) : undefined;

      if (currentWeightKg != null && currentWeightKg !== originalWeightKg) {
        await updateGoalsProfileField('currentWeightKg', currentWeightKg);
      }
      if (newBodyFatPct !== originalBodyFatPct) {
        await updateGoalsProfileField('currentBodyFatPct', newBodyFatPct);
      }

      if (nextFlow === 'workout') {
        await continueWorkoutFlow(navigation, extraParams);
      } else {
        await continueNutritionFlow(navigation, extraParams);
      }
    } finally {
      setContinuing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerFill]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 36 }} />
        <Text style={styles.topBarTitle}>Quick check</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Still accurate?</Text>
          <Text style={styles.subtitle}>
            Your targets are calculated from these. Update anything that's changed.
          </Text>

          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => setWeightSheetVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.inputRowIcon}>
              <Ionicons name="scale-outline" size={18} color="#a1a1aa" />
            </View>
            <View style={styles.inputRowContent}>
              <Text style={styles.inputRowLabel}>Current weight</Text>
              {weightDisplay ? (
                <Text style={[styles.inputRowValue, { color: themeColor }]}>{weightDisplay}</Text>
              ) : (
                <Text style={styles.inputRowPlaceholder}>Tap to enter</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </TouchableOpacity>

          <View style={styles.inputRow}>
            <View style={styles.inputRowIcon}>
              <Ionicons name="body-outline" size={18} color="#a1a1aa" />
            </View>
            <View style={styles.inputRowContent}>
              <Text style={styles.inputRowLabel}>
                Body fat{'  '}
                <Text style={styles.optionalTag}>optional</Text>
              </Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. 18"
                placeholderTextColor="#52525b"
                keyboardType="decimal-pad"
                value={bodyFatInput}
                onChangeText={(t) => setBodyFatInput(t.replace(/[^0-9.]/g, ''))}
                maxLength={4}
                returnKeyType="done"
              />
            </View>
            {bodyFatInput ? <Text style={styles.unitSuffix}>%</Text> : null}
          </View>
        </View>

        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: themeColor }]}
            onPress={handleContinue}
            disabled={continuing || currentWeightKg == null}
            activeOpacity={0.85}
          >
            {continuing ? (
              <ActivityIndicator color="#0a0a0b" />
            ) : (
              <Text style={[styles.ctaText, { color: '#0a0a0b' }]}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <WeightEntrySheet
        visible={weightSheetVisible}
        title="Current weight"
        onClose={() => setWeightSheetVisible(false)}
        onSaved={(entry) => {
          const unit: 'kg' | 'lbs' = entry.unit === 'lbs' ? 'lbs' : 'kg';
          const kg = unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;
          setCurrentWeightKg(kg);
          setWeightDisplay(`${entry.weight} ${unit}`);
          setWeightSheetVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  centerFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topBarTitle: {
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
    marginBottom: 28,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 12,
  },
  inputRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRowContent: {
    flex: 1,
  },
  inputRowLabel: {
    fontSize: 13,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  inputRowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputRowPlaceholder: {
    fontSize: 15,
    color: '#52525b',
  },
  inlineInput: {
    fontSize: 15,
    color: '#ffffff',
    padding: 0,
    margin: 0,
  },
  unitSuffix: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  optionalTag: {
    fontSize: 11,
    color: '#52525b',
    fontWeight: '400',
  },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0a0a0b',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
