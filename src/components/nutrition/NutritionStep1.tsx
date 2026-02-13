import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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

export const NutritionStep1: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  colors,
}) => {
  const goals = [
    {
      id: 'lose_weight',
      title: 'Lose Weight',
      subtitle: 'Burn fat and get lean',
      icon: 'flame',
      gradient: ['#FF6B6B', '#FF8E53'],
    },
    {
      id: 'gain_weight',
      title: 'Gain Weight',
      subtitle: 'Build muscle and size',
      icon: 'fitness',
      gradient: ['#4ECDC4', '#44A08D'],
    },
    {
      id: 'maintain',
      title: 'Maintain Weight',
      subtitle: 'Stay at current weight',
      icon: 'checkmark-circle',
      gradient: ['#A8EDEA', '#FED6E3'],
    },
  ];

  const handleGoalSelect = (goal: 'lose_weight' | 'gain_weight' | 'maintain') => {
    updateFormData({ goal });
    // Auto advance after a short delay
    setTimeout(() => {
      if (goal === 'maintain') {
        // Skip rate selection for maintenance
        nextStep(); // Will go to step 3
      } else {
        nextStep(); // Will go to step 2 for rate selection
      }
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animatable.View animation="fadeInDown" delay={200}>
          <View style={styles.header}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>1 of 6</Text>
            <Text style={styles.title}>What's Your Goal?</Text>
            <Text style={styles.subtitle}>
              Choose your primary nutrition goal to get started
            </Text>
          </View>
        </Animatable.View>

        <View style={styles.goalContainer}>
          {goals.map((goal, index) => (
            <Animatable.View
              key={goal.id}
              animation="fadeInUp"
              delay={400 + (index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.goalCard,
                  formData.goal === goal.id && styles.goalCardSelected,
                ]}
                onPress={() => handleGoalSelect(goal.id as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={goal.gradient}
                  style={styles.goalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.goalContent}>
                    <View style={styles.goalIcon}>
                      <Ionicons name={goal.icon as any} size={32} color="#000" />
                    </View>
                    <View style={styles.goalText}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
                    </View>
                    {formData.goal === goal.id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark" size={24} color="#000" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>

        <Animatable.View animation="fadeInUp" delay={800}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={[styles.progressFill, { width: '16.66%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 1 of 6</Text>
          </View>
        </Animatable.View>
      </View>
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
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  goalContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  goalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalGradient: {
    padding: 24,
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  goalText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  goalSubtitle: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.7)',
    fontWeight: '500',
  },
  selectedIndicator: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 20,
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