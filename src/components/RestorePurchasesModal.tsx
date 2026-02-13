import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface RestorePurchasesModalProps {
  visible: boolean;
  onClose: () => void;
}

const RestorePurchasesModal: React.FC<RestorePurchasesModalProps> = ({ 
  visible, 
  onClose 
}) => {
  const { themeColor } = useTheme();
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      // Parallel animations for fade and slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      
      // TODO: Replace with actual IAP restore logic
      // For now, simulate the restore process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful restore
      const hasRestoredPurchases = false; // This would come from actual IAP check
      
      if (hasRestoredPurchases) {
        Alert.alert(
          'Restore Successful',
          'Your Pro Access purchase has been restored!',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert(
        'Restore Failed',
        'Failed to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="refresh-circle" size={32} color={themeColor} />
                </View>
                <Text style={styles.title}>Restore Purchases</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                  disabled={isRestoring}
                >
                  <Ionicons name="close" size={24} color="#71717a" />
                </TouchableOpacity>
              </View>


              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.restoreButton,
                    { backgroundColor: themeColor },
                    isRestoring && styles.restoreButtonDisabled
                  ]}
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator 
                        size="small" 
                        color="#ffffff" 
                        style={styles.spinner}
                      />
                      <Text style={styles.restoreButtonText}>
                        Checking purchases...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.restoreButtonText}>
                      Restore Pro Access
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={isRestoring}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    width: screenWidth - 40,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#a1a1aa',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  restoreButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  restoreButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
});

export default RestorePurchasesModal;