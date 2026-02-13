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
import { NutritionFormData } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  updateFormData: (data: Partial<NutritionFormData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  colors: any;
}

export const NutritionStep4: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  previousStep,
  colors,
}) => {
  const activityLevels = [
    {
      id: 'sedentary',
      title: 'Sedentary',
      subtitle: 'Little to no exercise',
      description: 'Desk job, minimal physical activity',
      icon: 'laptop',
      multiplier: '1.2x BMR',
    },
    {
      id: 'light',
      title: 'Lightly Active',
      subtitle: 'Light exercise 1-3 days/week',
      description: 'Some walking, occasional workouts',
      icon: 'walk',
      multiplier: '1.375x BMR',
    },
    {
      id: 'moderate',
      title: 'Moderately Active',
      subtitle: 'Moderate exercise 3-5 days/week',
      description: 'Regular gym sessions, active lifestyle',
      icon: 'bicycle',
      multiplier: '1.55x BMR',
    },
    {
      id: 'heavy',
      title: 'Very Active',
      subtitle: 'Heavy exercise 6-7 days/week',
      description: 'Daily workouts, sports, physical job',
      icon: 'barbell',
      multiplier: '1.725x BMR',
    },
    {
      id: 'extreme',
      title: 'Extremely Active',
      subtitle: 'Very heavy exercise + physical job',
      description: 'Professional athlete level activity',
      icon: 'flame',
      multiplier: '1.9x BMR',
    },
  ];

  const handleActivitySelect = (level: string) => {
    updateFormData({ activityLevel: level as any });
  };

  const isFormValid = () => {
    return formData.activityLevel !== null;
  };

  const handleNext = () => {
    if (isFormValid()) {
      nextStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" delay={200}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={previousStep}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>4 of 6</Text>
            <Text style={styles.title}>Activity Level</Text>
            <Text style={styles.subtitle}>
              Choose the option that best describes your typical week
            </Text>
          </View>
        </Animatable.View>

        <View style={styles.activitiesContainer}>
          {activityLevels.map((level, index) => (
            <Animatable.View
              key={level.id}
              animation="fadeInUp"
              delay={400 + (index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.activityCard,
                  formData.activityLevel === level.id && [
                    styles.activityCardSelected,
                    { borderColor: colors.primary }
                  ],
                ]}
                onPress={() => handleActivitySelect(level.id)}
                activeOpacity={0.8}
              >
                <View style={styles.activityContent}>
                  <View style={[
                    styles.activityIcon,
                    formData.activityLevel === level.id && { backgroundColor: colors.primary + '20' }
                  ]}>
                    <Ionicons 
                      name={level.icon as any} 
                      size={24} 
                      color={formData.activityLevel === level.id ? colors.primary : '#666'} 
                    />
                  </View>
                  
                  <View style={styles.activityText}>
                    <Text style={[
                      styles.activityTitle,
                      formData.activityLevel === level.id && { color: colors.primary }
                    ]}>
                      {level.title}
                    </Text>
                    <Text style={styles.activitySubtitle}>{level.subtitle}</Text>
                    <Text style={styles.activityDescription}>{level.description}</Text>
                  </View>
                  
                  <View style={styles.activityMultiplier}>
                    <Text style={[
                      styles.multiplierText,
                      formData.activityLevel === level.id && { color: colors.primary }
                    ]}>
                      {level.multiplier}
                    </Text>
                  </View>
                </View>
                
                {formData.activityLevel === level.id && (
                  <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>

        <Animatable.View animation="fadeInUp" delay={900}>
          <View style={styles.infoCard}>
            <LinearGradient
              colors={[colors.primary + '15', colors.primary + '05']}
              style={styles.infoGradient}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Your activity level determines your Total Daily Energy Expenditure (TDEE). 
                BMR is your Base Metabolic Rate - calories your body burns at rest. 
                TDEE = BMR × Activity Level. Choose based on your typical weekly routine.
              </Text>
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              !isFormValid() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isFormValid()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={[styles.progressFill, { width: '66.66%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 4 of 6</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 40,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  activitiesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  activityCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  activityMultiplier: {
    alignItems: 'center',
  },
  multiplierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
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