import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface DeleteSetModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  setNumber: number;
  themeColor: string;
}

export default function DeleteSetModal({
  visible,
  onClose,
  onDelete,
  setNumber,
  themeColor,
}: DeleteSetModalProps) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const [internalVisible, setInternalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setInternalVisible(false);
      onClose();
    });
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleClose();
    setTimeout(() => {
      onDelete();
    }, 100);
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleClose();
  };

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.6)',
            opacity: backdropOpacity,
          },
        ]}
      />

      {/* Modal Container */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateY: slideY },
              { scale: scaleValue },
            ],
          },
        ]}
      >
        <View style={styles.modal}>
          {/* Icon */}
          <View style={[styles.iconContainer, { borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <Ionicons name="trash-outline" size={28} color="#ef4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Delete Set</Text>
          
          {/* Message */}
          <Text style={styles.message}>
            Remove set {setNumber}? This action cannot be undone.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modal: {
    backgroundColor: '#0a0a0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#9898a4',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#111116',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#e0e0e4',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
});