import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import BodyHighlighter, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { RootStackParamList } from '../navigation/AppNavigator';

// ──────────────────────────────────────────────────────────────────
// Muscle mapping & contribution math (same as WorkoutHeatmapModal)
// ──────────────────────────────────────────────────────────────────

const MUSCLE_TO_SLUG: { [key: string]: Slug | null } = {
  'chest': 'chest',
  'core': 'abs',
  'upper back': 'trapezius',
  'lats': 'upper-back',
  'traps': 'trapezius',
  'lower back': 'lower-back',
  'front delts': 'deltoids',
  'side delts': 'deltoids',
  'rear delts': 'deltoids',
  'biceps': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearm',
  'quads': 'quadriceps',
  'hamstrings': 'hamstring',
  'glutes': 'gluteal',
  'calves': 'calves',
  'neck': null,
  'hip flexors': null,
  'hip abductors': 'gluteal',
  'shins': null,
  'serratus': null,
};

const setsToIntensity = (sets: number): number => {
  if (sets >= 1) return 1;
  return 0;
};

const SECONDARY_MUSCLE_WEIGHT = 0.5;

interface MuscleContribution {
  muscle: string;
  weight: number;
}

const getMuscleContributions = (exercise: any): MuscleContribution[] => {
  const muscleMapping: { [key: string]: string } = {
    'Chest': 'chest',
    'Upper Back': 'upper back',
    'Lats': 'lats',
    'Traps': 'traps',
    'Front Delts': 'front delts',
    'Side Delts': 'side delts',
    'Rear Delts': 'rear delts',
    'Biceps': 'biceps',
    'Triceps': 'triceps',
    'Forearms': 'forearms',
    'Quads': 'quads',
    'Hamstrings': 'hamstrings',
    'Glutes': 'glutes',
    'Calves': 'calves',
    'Core': 'core',
    'Abs': 'core',
    'Abdominals': 'core',
    'Abs (Upper)': 'core',
    'Abs (Lower)': 'core',
    'Neck': 'neck',
    'Lower Back': 'lower back',
    'Obliques': 'obliques',
    'Serratus Anterior': 'serratus',
    'Hip Abductors': 'hip abductors',
    'Hip Adductors': 'hip adductors',
    'Shins': 'shins',
    'Tibialis': 'shins',
    'Tibialis Anterior': 'shins',
  };

  const contributions: MuscleContribution[] = [];

  (exercise.primaryMuscles || []).forEach((muscle: string) => {
    const mapped = muscleMapping[muscle];
    if (mapped) contributions.push({ muscle: mapped, weight: 1.0 });
  });

  (exercise.secondaryMuscles || []).forEach((muscle: string) => {
    const mapped = muscleMapping[muscle];
    if (mapped) contributions.push({ muscle: mapped, weight: SECONDARY_MUSCLE_WEIGHT });
  });

  return contributions;
};

const SLUG_RENDER_ORDER: Slug[] = [
  'upper-back', 'lower-back', 'trapezius', 'chest', 'abs', 'obliques',
  'deltoids', 'biceps', 'triceps', 'forearm', 'quadriceps', 'hamstring',
  'gluteal', 'adductors', 'calves', 'tibialis', 'neck',
];

const buildWorkoutHighlighterData = (exercises: any[]): ExtendedBodyPart[] => {
  const volumeMap: { [muscle: string]: number } = {};

  exercises.forEach((exercise: any) => {
    const sets = exercise.sets || 3;
    const contributions = getMuscleContributions(exercise);
    contributions.forEach(({ muscle, weight }) => {
      if (!volumeMap[muscle]) volumeMap[muscle] = 0;
      volumeMap[muscle] += sets * weight;
    });
  });

  const slugVolume: Partial<Record<Slug, number>> = {};
  Object.entries(volumeMap).forEach(([muscle, volume]) => {
    if (volume > 0) {
      const slug = MUSCLE_TO_SLUG[muscle];
      if (slug) slugVolume[slug] = (slugVolume[slug] || 0) + volume;
    }
  });

  return Object.entries(slugVolume)
    .map(([slug, totalSets]) => ({
      slug: slug as Slug,
      intensity: setsToIntensity(totalSets!),
    }))
    .sort((a, b) => {
      const aIdx = SLUG_RENDER_ORDER.indexOf(a.slug);
      const bIdx = SLUG_RENDER_ORDER.indexOf(b.slug);
      const aRank = aIdx === -1 ? 999 : aIdx;
      const bRank = bIdx === -1 ? 999 : bIdx;
      return aRank - bRank;
    });
};

// ──────────────────────────────────────────────────────────────────
// Screen Component
// ──────────────────────────────────────────────────────────────────

type WeekVolumeScreenRouteProp = RouteProp<RootStackParamList, 'WeekVolumeScreen'>;

export default function WeekVolumeScreen() {
  const navigation = useNavigation();
  const route = useRoute<WeekVolumeScreenRouteProp>();
  const { exercises, blockName, weekNumber, themeColor } = route.params;
  
  const [bodyViewSide, setBodyViewSide] = useState<'front' | 'back'>('front');

  const muscleHighlighterData = buildWorkoutHighlighterData(exercises);

  // Effective sets per muscle (weighted: primary = 1.0, secondary = 0.5)
  const muscleBreakdown = useMemo(() => {
    const map: { [muscle: string]: number } = {};

    exercises.forEach((exercise: any) => {
      const sets = exercise.sets || 3;
      const contributions = getMuscleContributions(exercise);
      contributions.forEach(({ muscle, weight }) => {
        if (!map[muscle]) map[muscle] = 0;
        map[muscle] += sets * weight;
      });
    });

    return Object.entries(map)
      .map(([muscle, effectiveSets]) => ({ muscle, effectiveSets }))
      .filter((m) => m.effectiveSets > 0)
      .sort((a, b) => b.effectiveSets - a.effectiveSets);
  }, [exercises]);

  // Literal total sets (sum of exercise.sets, no weighting)
  const totalSets = useMemo(
    () => exercises.reduce((sum, ex) => sum + (ex.sets || 3), 0),
    [exercises],
  );

  const maxEffectiveSets = useMemo(
    () => muscleBreakdown.length > 0 ? muscleBreakdown[0].effectiveSets : 0,
    [muscleBreakdown],
  );

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerLabel}>MUSCLES</Text>

        <View style={styles.iconButtonSpacer} />
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Muscles worked</Text>
        <Text style={styles.subtitle}>
          {muscleBreakdown.length} MUSCLE GROUP{muscleBreakdown.length !== 1 ? 'S' : ''} · {totalSets} SET{totalSets !== 1 ? 'S' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Front/Back toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setBodyViewSide('front')}
              style={[
                styles.toggleButton,
                bodyViewSide === 'front' && {
                  backgroundColor: hexA(themeColor, 0.1),
                  borderColor: hexA(themeColor, 0.4),
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  bodyViewSide === 'front' && { color: themeColor },
                ]}
              >
                FRONT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBodyViewSide('back')}
              style={[
                styles.toggleButton,
                bodyViewSide === 'back' && {
                  backgroundColor: hexA(themeColor, 0.1),
                  borderColor: hexA(themeColor, 0.4),
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  bodyViewSide === 'back' && { color: themeColor },
                ]}
              >
                BACK
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body diagram */}
        <View style={styles.bodyDiagramContainer}>
          <BodyHighlighter
            data={muscleHighlighterData}
            colors={[themeColor, themeColor + '80']}
            side={bodyViewSide}
            scale={0.85}
            border="#27272a"
          />
        </View>

        {/* Effective sets breakdown */}
        {muscleBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>EFFECTIVE SETS</Text>

            <View style={styles.barsContainer}>
              {muscleBreakdown.map(({ muscle, effectiveSets }) => {
                const ratio =
                  maxEffectiveSets > 0
                    ? effectiveSets / maxEffectiveSets
                    : 0;
                return (
                  <View key={muscle} style={styles.barRow}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel} numberOfLines={1}>
                        {capitalize(muscle)}
                      </Text>
                      <Text style={styles.barValue}>
                        {formatSets(effectiveSets)}
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${ratio * 100}%`,
                            backgroundColor: themeColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Small explainer */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="information-circle-outline" size={16} color="#9898a4" />
              </View>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Effective sets</Text> count primary muscles fully and secondary muscles at half weight.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatSets(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Styles (identical to WorkoutHeatmapModal) ────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // Title
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  scrollView: {
    flex: 1,
  },

  // Front/Back toggle
  toggleContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleText: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // Body diagram
  bodyDiagramContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Section label
  sectionLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: 'DMMono-Medium',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
  },

  // Bars
  barsContainer: {
    paddingHorizontal: 16,
  },
  barRow: {
    marginBottom: 14,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    flex: 1,
    color: '#f0f0f2',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
    marginRight: 8,
  },
  barValue: {
    color: '#f0f0f2',
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.2,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#0a0a0f',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  infoIconWrap: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    color: '#9898a4',
    fontSize: 11,
    lineHeight: 17,
    fontFamily: 'Outfit-Regular',
  },
  infoBold: {
    color: '#f0f0f2',
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
});