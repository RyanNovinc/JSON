import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundOption = {
  id: string;
  name: string;
  description: string;
};

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'none';

export interface TimerSettings {
  soundEnabled: boolean;
  selectedSound: string;
  hapticEnabled: boolean;
  hapticPattern: HapticPattern;
  volume: number;
  countUp: boolean;
}

// Built-in sound options (using system sounds for now)
export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'beep', name: 'Beep', description: 'Classic beep sound' },
  { id: 'chime', name: 'Chime', description: 'Gentle chime' },
  { id: 'bell', name: 'Bell', description: 'Bell sound' },
  { id: 'ding', name: 'Ding', description: 'Quick ding' },
];

const SETTINGS_KEY = 'timer_notification_settings';

export class TimerNotifications {
  private static sound: Audio.Sound | null = null;
  
  static defaultSettings: TimerSettings = {
    soundEnabled: true,
    selectedSound: 'beep',
    hapticEnabled: true,
    hapticPattern: 'medium',
    volume: 0.8,
    countUp: false,
  };

  // Load settings from storage
  static async loadSettings(): Promise<TimerSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...this.defaultSettings, ...JSON.parse(data) };
      }
      return this.defaultSettings;
    } catch (error) {
      console.error('Failed to load timer settings:', error);
      return this.defaultSettings;
    }
  }

  // Save settings to storage
  static async saveSettings(settings: TimerSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save timer settings:', error);
    }
  }

  // Play sound
  static async playSound(soundId: string, volume: number = 0.8): Promise<void> {
    try {
      // Stop any currently playing sound
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // For now, we'll use a system sound approach
      // In a real app, you'd load actual audio files here
      console.log(`Playing sound: ${soundId} at volume ${volume}`);
      
      // Placeholder: Create a brief tone using system audio
      // This would be replaced with actual sound files
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { 
          volume,
          shouldPlay: true,
          isLooping: false,
        }
      ).catch(() => {
        // If external sound fails, just log
        console.log('External sound failed, using haptic feedback only');
        return { sound: null };
      });
      
      this.sound = sound;
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  // Trigger haptic feedback
  static async triggerHaptic(pattern: HapticPattern): Promise<void> {
    try {
      switch (pattern) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'none':
          break;
      }
    } catch (error) {
      console.error('Failed to trigger haptic:', error);
    }
  }

  // Play complete timer notification
  static async playTimerComplete(): Promise<void> {
    const settings = await this.loadSettings();
    
    // Play sound if enabled
    if (settings.soundEnabled) {
      await this.playSound(settings.selectedSound, settings.volume);
    }
    
    // Play haptic if enabled
    if (settings.hapticEnabled) {
      await this.triggerHaptic(settings.hapticPattern);
    }
  }

  // Test notification (for settings)
  static async testNotification(settings: TimerSettings): Promise<void> {
    if (settings.soundEnabled) {
      await this.playSound(settings.selectedSound, settings.volume);
    }
    
    if (settings.hapticEnabled) {
      await this.triggerHaptic(settings.hapticPattern);
    }
  }
}