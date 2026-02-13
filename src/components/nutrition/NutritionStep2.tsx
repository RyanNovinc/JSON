import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import Slider from '@react-native-community/slider';
import { NutritionFormData } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  updateFormData: (data: Partial<NutritionFormData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  colors: any;
}

export const NutritionStep2: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  previousStep,
  colors,
}) => {
  // This component should not render for maintain goals - handled by navigation logic

  const isWeightLoss = formData.goal === 'lose_weight';
  const minRate = isWeightLoss ? 0.25 : 0.25;
  const maxRate = isWeightLoss ? 0.75 : 0.5;
  
  const getRateDescription = (rate: number) => {
    if (isWeightLoss) {
      if (rate <= 0.3) return 'Conservative & Sustainable';
      if (rate <= 0.5) return 'Moderate & Balanced';
      return 'Aggressive & Fast';
    } else {
      if (rate <= 0.3) return 'Lean Muscle Focus';
      if (rate <= 0.4) return 'Balanced Growth';
      return 'Maximum Muscle Gain';
    }
  };

  const handleNext = () => {
    if (formData.targetRate > 0) {
      nextStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeInDown" delay={200}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={previousStep}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>2 of 6</Text>
            <Text style={styles.title}>
              How {isWeightLoss ? 'Fast' : 'Quickly'} Do You Want to {isWeightLoss ? 'Lose' : 'Gain'} Weight?
            </Text>
            <Text style={styles.subtitle}>
              Choose your target rate to customize your calorie goals
            </Text>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400} style={styles.sliderContainer}>
          <View style={styles.rateDisplay}>
            <Text style={[styles.rateNumber, { color: colors.primary }]}>
              {isWeightLoss ? '-' : '+'}{formData.targetRate.toFixed(2)} kg
            </Text>
            <Text style={styles.rateUnit}>per week</Text>
            <Text style={styles.rateDescription}>
              {getRateDescription(formData.targetRate)}
            </Text>
          </View>

          <View style={styles.sliderWrapper}>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Slow</Text>
              <Text style={styles.sliderLabel}>Fast</Text>
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={minRate}
              maximumValue={maxRate}
              value={formData.targetRate}
              onValueChange={(value) => updateFormData({ targetRate: value })}
              step={0.05}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
              thumbStyle={{
                backgroundColor: colors.primary,
                width: 24,
                height: 24,
                borderRadius: 12,
              }}
              trackStyle={{
                height: 8,
                borderRadius: 4,
              }}
            />
            
            <View style={styles.sliderValues}>
              <Text style={styles.sliderValue}>{minRate.toFixed(2)} kg</Text>
              <Text style={styles.sliderValue}>{maxRate.toFixed(2)} kg</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <LinearGradient
              colors={[colors.primary + '15', colors.primary + '05']}
              style={styles.infoGradient}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                {isWeightLoss 
                  ? 'Losing 0.5-0.75kg per week is generally recommended for sustainable fat loss while preserving muscle.'
                  : 'Gaining 0.25-0.5kg per week helps maximize muscle growth while minimizing fat gain.'
                }
              </Text>
            </LinearGradient>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={600}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              formData.targetRate === 0 && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={formData.targetRate === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={[styles.progressFill, { width: '33.33%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 2 of 6</Text>
          </View>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 60,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rateDisplay: {
    alignItems: 'center',
    marginBottom: 60,
  },
  rateNumber: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 4,
  },
  rateUnit: {
    fontSize: 16,
    color: '#B0B0B0',
    fontWeight: '600',
    marginBottom: 12,
  },
  rateDescription: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  sliderWrapper: {
    marginVertical: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 50,
  },
  sliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sliderValue: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  infoGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
  },
});