import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, MealPlan } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import muscleGainMealPlanData from '../data/muscle_building_7day.json';

type SampleMealPlansNavigationProp = StackNavigationProp<RootStackParamList, 'SampleMealPlans'>;

export default function SampleMealPlansScreen() {
  const navigation = useNavigation<SampleMealPlansNavigationProp>();
  const { themeColor } = useTheme();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleSelectMealPlan = async () => {
    try {
      // Copy JSON to clipboard
      const jsonString = JSON.stringify(muscleGainMealPlanData, null, 2);
      await Clipboard.setStringAsync(jsonString);
      
      // Show copied overlay
      setCopiedId('muscle-gain-pro');
      
      // Hide overlay after 1.5 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy meal plan:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Meal Plans</Text>
        </View>
      </View>

      {/* Meal Plan Card */}
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={handleSelectMealPlan}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }}
            style={styles.backgroundImage}
            imageStyle={styles.backgroundImageStyle}
          >
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
              style={styles.gradient}
            >
              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>Meal Prep</Text>
              </View>
              
              {/* Recipe Count Badge */}
              <View style={[styles.recipeBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.recipeText}>10 recipes</Text>
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text style={styles.title}>Muscle Gain Pro</Text>
                <Text style={styles.subtitle}>High-protein muscle building</Text>
                
                <View style={styles.details}>
                  <Text style={styles.detailText}>Muscle Building & Performance</Text>
                  <Text style={styles.macros}>7 days • 30P/39C/31F</Text>
                  <Text style={styles.calories}>2,500 calories per day</Text>
                </View>
              </View>

              {/* Info Button */}
              <TouchableOpacity style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
          
          {/* Copied Overlay */}
          {copiedId === 'muscle-gain-pro' && (
            <View style={styles.copiedOverlay}>
              <LinearGradient
                colors={[`${themeColor}F2`, `${themeColor}D9`]}
                style={styles.copiedGradient}
              >
                <View style={styles.copiedContent}>
                  <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                  <Text style={styles.copiedTitle}>Copied!</Text>
                  <Text style={styles.copiedSubtitle}>Muscle Gain Pro is ready to import</Text>
                </View>
              </LinearGradient>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  card: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    borderRadius: 20,
  },
  gradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  recipeBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recipeText: {
    color: '#0a0a0b',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e4e4e7',
    marginBottom: 12,
  },
  details: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  macros: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  calories: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
    marginTop: 4,
  },
  infoButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  copiedGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copiedContent: {
    alignItems: 'center',
  },
  copiedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  copiedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});