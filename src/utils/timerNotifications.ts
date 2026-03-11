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

      console.log(`🔊 Playing timer sound: ${soundId} at volume ${volume}`);
      
      // Since we don't have sound files, use different haptic patterns for different "sounds"
      let hapticType: HapticPattern;
      
      switch (soundId) {
        case 'beep':
          hapticType = 'medium';
          break;
        case 'chime':
          hapticType = 'light';
          break;
        case 'bell':
          hapticType = 'heavy';
          break;
        case 'ding':
          hapticType = 'success';
          break;
        default:
          hapticType = 'medium';
      }

      // Play multiple haptic pulses to simulate sound
      console.log(`🔊 Playing ${soundId} as haptic pattern: ${hapticType}`);
      
      // Play primary haptic
      await this.triggerHaptic(hapticType);
      
      // For some sounds, add a second pulse after a brief delay
      if (soundId === 'bell' || soundId === 'chime') {
        setTimeout(async () => {
          await this.triggerHaptic('light');
        }, 200);
      }
      
    } catch (error) {
      console.error('Failed to play sound:', error);
      // Fallback to haptic
      await this.triggerHaptic('success');
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
    console.log('🎉 TIMER COMPLETED - Playing notification!');
    const settings = await this.loadSettings();
    console.log('🔊 Settings:', { soundEnabled: settings.soundEnabled, hapticEnabled: settings.hapticEnabled });
    
    // Play sound if enabled
    if (settings.soundEnabled) {
      console.log('🔊 Playing timer completion sound');
      await this.playSound(settings.selectedSound, settings.volume);
    }
    
    // Play haptic if enabled
    if (settings.hapticEnabled) {
      console.log('📱 Playing timer completion haptic');
      await this.triggerHaptic(settings.hapticPattern);
    }
    
    console.log('✅ Timer notification complete');
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