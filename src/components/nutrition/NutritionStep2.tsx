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
  const minRatePercentage = isWeightLoss ? 0.25 : 0.16; // 0.25% for weight loss, 0.16% for weight gain
  const maxRatePercentage = isWeightLoss ? 1.0 : 0.5;   // 1.0% for weight loss, 0.5% for weight gain
  
  const getRateDescription = (ratePercentage: number) => {
    if (isWeightLoss) {
      if (ratePercentage <= 0.5) return 'Conservative & Sustainable';
      if (ratePercentage <= 0.75) return 'Moderate & Balanced';
      return 'Aggressive & Fast';
    } else {
      if (ratePercentage <= 0.25) return 'Lean Muscle Focus';
      if (ratePercentage <= 0.38) return 'Balanced Growth';
      return 'Maximum Muscle Gain';
    }
  };

  const getDetailedInfo = (ratePercentage: number) => {
    if (isWeightLoss) {
      if (ratePercentage <= 0.5) return 'Preserves muscle, easier to maintain';
      if (ratePercentage <= 0.75) return 'Balanced fat loss & muscle preservation';
      return 'Faster results, higher muscle loss risk';
    } else {
      if (ratePercentage <= 0.25) return '85% muscle, 15% fat';
      if (ratePercentage <= 0.38) return '75% muscle, 25% fat';
      return '65% muscle, 35% fat';
    }
  };

  const handleNext = () => {
    if (formData.targetRatePercentage > 0) {
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
            <View style={[styles.rateCard, { borderColor: colors.primary + '20', backgroundColor: colors.primary + '08' }]}>
              <Text style={[styles.rateNumber, { color: colors.primary }]}>
                {formData.targetRatePercentage.toFixed(2)}%
              </Text>
              <Text style={styles.rateUnit}>per week</Text>
              
              <View style={styles.descriptionContainer}>
                <Text style={styles.rateDescription}>
                  {getRateDescription(formData.targetRatePercentage)}
                </Text>
                
                <View style={styles.benefitTag}>
                  <Text style={[styles.benefitText, { color: colors.primary }]}>
                    {getDetailedInfo(formData.targetRatePercentage)}
                  </Text>
                </View>
                
              </View>
            </View>
          </View>

          <View style={styles.sliderWrapper}>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={minRatePercentage}
                maximumValue={maxRatePercentage}
                value={formData.targetRatePercentage}
                onValueChange={(value) => updateFormData({ targetRatePercentage: value })}
                step={0.05}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
                thumbStyle={{
                  backgroundColor: colors.primary,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
                trackStyle={{
                  height: 6,
                  borderRadius: 3,
                }}
              />
              
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>Conservative</Text>
                <Text style={styles.sliderLabel}>Aggressive</Text>
              </View>
            </View>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="help-circle" size={18} color={colors.primary} />
            </View>
            <Text style={styles.tipText}>
              {isWeightLoss 
                ? 'Slower rates help you keep muscle while losing fat'
                : 'Slower gains mean more muscle, less fat to cut later'
              }
            </Text>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={600}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              formData.targetRatePercentage === 0 && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={formData.targetRatePercentage === 0}
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
    marginBottom: 40,
  },
  rateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  rateNumber: {
    fontSize: 56,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: -2,
  },
  rateUnit: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
    marginBottom: 16,
    opacity: 0.8,
  },
  descriptionContainer: {
    alignItems: 'center',
    gap: 8,
  },
  rateDescription: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  benefitTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  calculatedRate: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  sliderWrapper: {
    marginVertical: 32,
  },
  sliderContainer: {
    paddingHorizontal: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 18,
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