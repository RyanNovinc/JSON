import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SimplifiedMealPlan } from '../types/nutrition';

interface NutritionGeneratorStep4Props {
  onBack: () => void;
  onImportSuccess: (mealPlan: SimplifiedMealPlan) => void;
  onExitSlideMode: () => void;
}

export default function NutritionGeneratorStep4({ onBack, onImportSuccess, onExitSlideMode }: NutritionGeneratorStep4Props) {
  const { themeColor } = useTheme();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);


  return (
    <View style={styles.container}>
      <Animated.View style={{ 
        flex: 1,
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          })
        }]
      }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
          </View>

          <TouchableOpacity style={styles.headerInfoButton} onPress={() => setShowInfo(!showInfo)}>
            <Ionicons name="information-circle-outline" size={24} color="#71717a" />
          </TouchableOpacity>
        </View>

        {showInfo && (
          <View style={styles.headerInfoModal}>
            <Text style={styles.headerInfoMessage}>
              The AI will create a JSON file. Either copy this file or save it. Either option works perfectly fine.
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.centerContent}>
            <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.stepText}>4</Text>
            </View>
            
            <Text style={styles.mainTitle}>Import and Start Eating</Text>
            
            <TouchableOpacity 
              style={[styles.infoButton, { borderColor: themeColor }]}
              onPress={() => setShowInfoModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="information-circle" size={24} color={themeColor} />
              <Text style={[styles.infoButtonText, { color: themeColor }]}>How to Import</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.backToMainButton, { borderColor: themeColor }]}
            onPress={onExitSlideMode}
          >
            <Text style={[styles.backToMainText, { color: themeColor }]}>Back to Import Screen</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: themeColor }]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Ionicons name="close" size={24} color="#71717a" />
            </TouchableOpacity>
            
            <Ionicons name="information-circle" size={48} color={themeColor} />
            <Text style={styles.modalTitle}>Ready to Import!</Text>
            <Text style={styles.modalText}>
              Now that you have your meal plan, go back to the import screen and:
            </Text>
            
            <View style={styles.optionsList}>
              <View style={styles.optionItem}>
                <Ionicons name="restaurant" size={20} color={themeColor} />
                <Text style={styles.optionText}>Use "Paste Your Plan" if you copied the plan</Text>
              </View>
              <View style={styles.optionItem}>
                <Ionicons name="cloud-upload" size={20} color={themeColor} />
                <Text style={styles.optionText}>Use "Upload Your Plan" if you saved the plan as a file</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centerContent: {
    alignItems: 'center',
    gap: 32,
  },
  stepBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1.5,
    marginTop: -8,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#0a0a0b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  optionsList: {
    width: '100%',
    gap: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    color: '#e4e4e7',
    flex: 1,
    lineHeight: 20,
  },
  hintText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: -8,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    paddingTop: 20,
  },
  backToMainButton: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  backToMainText: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerInfoButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfoModal: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333336',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerInfoMessage: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
    textAlign: 'center',
  },
});