import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Slider from '@react-native-community/slider';
import { NutritionFormData, MacroResults } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  macroResults: MacroResults | null;
  displayCalories: number | null;
  setDisplayCalories: (calories: number) => void;
  targetRate: number;
  targetRatePercentage: number;
  setTargetRate: (rate: number) => void;
  setTargetRatePercentage: (percentage: number) => void;
  calculateCaloriesFromSlider: (rate: number) => number;
  recalculateMacrosWithNewCalories: (calories: number) => MacroResults;
  setMacroResults: (results: MacroResults) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRetake: () => void;
  colors: any;
}

export const NutritionSummary: React.FC<Props> = ({
  formData,
  macroResults,
  displayCalories,
  setDisplayCalories,
  targetRate,
  targetRatePercentage,
  setTargetRate,
  setTargetRatePercentage,
  calculateCaloriesFromSlider,
  recalculateMacrosWithNewCalories,
  setMacroResults,
  setHasUnsavedChanges,
  hasUnsavedChanges,
  onSave,
  onRetake,
  colors,
}) => {

  // Initialize displayCalories to match current slider position on first load
  useEffect(() => {
    if (!displayCalories && macroResults) {
      const initialCalories = calculateCaloriesFromSlider(targetRate);
      setDisplayCalories(initialCalories);
    }
  }, [macroResults, displayCalories, targetRate, calculateCaloriesFromSlider, setDisplayCalories]);

  // Recalculate calories when goal changes (only goal and TDEE changes)
  useEffect(() => {
    if (macroResults?.tdee && formData.goal) {
      const newCalories = calculateCaloriesFromSlider(targetRate);
      setDisplayCalories(newCalories);
    }
  }, [formData.goal, macroResults?.tdee, targetRate, calculateCaloriesFromSlider, setDisplayCalories]);

  if (!macroResults) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Calculating your nutrition plan...</Text>
      </View>
    );
  }

  const currentCalories = displayCalories || macroResults.targetCalories || 0;
  const currentMacros = displayCalories ? recalculateMacrosWithNewCalories(displayCalories) : macroResults;
  
  // Ensure macro values are always numbers
  const safeProtein = Number(currentMacros?.macros?.protein) || 0;
  const safeCarbs = Number(currentMacros?.macros?.carbs) || 0;
  const safeFat = Number(currentMacros?.macros?.fat) || 0;

  const handleSliderChange = (percentage: number) => {
    console.log('🔥 Slider changed to:', percentage, '%');
    setTargetRatePercentage(percentage);
    // Calculate kg rate from percentage
    const kgRate = formData.weight ? (formData.weight * percentage) / 100 : percentage;
    setTargetRate(kgRate);
    const newCalories = calculateCaloriesFromSlider(kgRate);
    console.log('🔥 New calories:', newCalories, 'for rate:', kgRate, 'kg (', percentage, '%)');
    setDisplayCalories(newCalories);
    const updatedMacros = recalculateMacrosWithNewCalories(newCalories);
    setMacroResults(updatedMacros);
    setHasUnsavedChanges(true);
  };

  const getGoalDescription = () => {
    if (formData.goal === 'lose_weight') {
      return targetRatePercentage <= 0.5 ? '🔥 Conservative & Sustainable' : 
             targetRatePercentage <= 0.75 ? '🔥 Moderate & Balanced' : '🔥 Aggressive & Fast';
    } else if (formData.goal === 'gain_weight') {
      return targetRatePercentage <= 0.25 ? '💪 Lean Muscle Focus' : 
             targetRatePercentage <= 0.38 ? '💪 Balanced Growth' : '💪 Maximum Muscle Gain';
    }
    return '⚖️ Weight Maintenance';
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView style={styles.fullScrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Your Nutrition Plan</Text>
            <Text style={styles.heroSubtitle}>Personalized & Science-Based</Text>
            
            <View style={styles.caloriesContainer}>
              <View style={styles.caloriesDisplay}>
                <Text style={styles.caloriesNumber}>{Number(currentCalories) || 0}</Text>
                <Text style={styles.caloriesLabel}>calories/day</Text>
              </View>
              
              {formData.goal !== 'maintain' && (
                <View style={styles.goalContainer}>
                  <Text style={styles.goalType}>{getGoalDescription()}</Text>
                  <Text style={styles.goalRate}>
                    {targetRatePercentage.toFixed(2)}% per week
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.waveContainer}>
            <View style={[styles.wave, { backgroundColor: '#000' }]} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Goal Adjustment Slider */}
          {formData.goal !== 'maintain' && (
            <Animatable.View animation="fadeInUp" delay={100} style={styles.adjustmentCard}>
              <Text style={styles.cardTitle}>Fine-tune Your Goal</Text>
              
              <View style={styles.sliderRow}>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>Conservative</Text>
                  <Text style={styles.sliderLabelText}>Aggressive</Text>
                </View>
              </View>
              
              <Slider
                style={styles.modernSlider}
                minimumValue={formData.goal === 'lose_weight' ? 0.25 : 0.16}
                maximumValue={formData.goal === 'lose_weight' ? 1.0 : 0.5}
                value={targetRatePercentage}
                onValueChange={handleSliderChange}
                step={0.05}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor="#333"
                thumbStyle={styles.sliderThumb}
                trackStyle={styles.sliderTrack}
              />
            </Animatable.View>
          )}

          {/* Macros in Circular Design */}
          <Animatable.View animation="fadeInUp" delay={200} style={styles.macrosCard}>
            <Text style={styles.cardTitle}>Daily Macros</Text>
            
            <View style={styles.macrosGrid}>
              <View style={styles.macroCircle}>
                <View style={[styles.circleOuter, { borderColor: '#4CAF50' }]}>
                  <View style={[styles.circleInner, { backgroundColor: '#4CAF50' + '20' }]}>
                    <Ionicons name="fitness" size={24} color="#4CAF50" />
                    <Text style={[styles.macroValue, { color: '#4CAF50' }]}>{safeProtein}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.macroCircle}>
                <View style={[styles.circleOuter, { borderColor: '#FF9800' }]}>
                  <View style={[styles.circleInner, { backgroundColor: '#FF9800' + '20' }]}>
                    <Ionicons name="flash" size={24} color="#FF9800" />
                    <Text style={[styles.macroValue, { color: '#FF9800' }]}>{safeCarbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.macroCircle}>
                <View style={[styles.circleOuter, { borderColor: '#2196F3' }]}>
                  <View style={[styles.circleInner, { backgroundColor: '#2196F3' + '20' }]}>
                    <Ionicons name="water" size={24} color="#2196F3" />
                    <Text style={[styles.macroValue, { color: '#2196F3' }]}>{safeFat}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Stats Cards */}
          <Animatable.View animation="fadeInUp" delay={300} style={styles.statsContainer}>
            <Text style={styles.cardTitle}>Metabolism Overview</Text>
            
            <View style={styles.statsRow}>
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={styles.statCard}
              >
                <Ionicons name="body" size={28} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.primary }]}>{Number(macroResults.bmr) || 0}</Text>
                <Text style={styles.statLabel}>BMR</Text>
                <Text style={styles.statSubtext}>Base Metabolic Rate</Text>
              </LinearGradient>
              
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={styles.statCard}
              >
                <Ionicons name="flash" size={28} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.primary }]}>{Number(macroResults.tdee) || 0}</Text>
                <Text style={styles.statLabel}>TDEE</Text>
                <Text style={styles.statSubtext}>Total Daily Energy</Text>
              </LinearGradient>
            </View>
          </Animatable.View>

          {/* Bottom Actions */}
          <Animatable.View animation="fadeInUp" delay={400} style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={onSave}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary + 'DD']}
                style={styles.buttonGradient}
              >
                <Ionicons 
                  name={hasUnsavedChanges ? "checkmark-circle" : "arrow-forward"} 
                  size={22} 
                  color="#000" 
                />
                <Text style={styles.primaryButtonText}>
                  {hasUnsavedChanges ? "Save & Continue" : "Let's Go!"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary + '40' }]}
              onPress={onRetake}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                Retake Quiz
              </Text>
            </TouchableOpacity>
            
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                🍎 Ready to start your nutrition journey? Your plan is personalized just for you.
              </Text>
            </View>
          </Animatable.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  fullScrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.7)',
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  caloriesDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#000',
    lineHeight: 72,
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 4,
  },
  goalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  goalType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  goalRate: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.7)',
  },
  goalRateSecondary: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 2,
    fontStyle: 'italic',
  },
  waveContainer: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 20,
  },
  wave: {
    height: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  adjustmentCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  sliderRow: {
    marginBottom: 10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  modernSlider: {
    width: '100%',
    height: 50,
    marginVertical: 20,
  },
  sliderThumb: {
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
  },
  macrosCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  macroCircle: {
    alignItems: 'center',
  },
  circleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '600',
    marginTop: 2,
  },
  statsContainer: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingTop: 20,
    gap: 16,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});