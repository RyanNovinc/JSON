import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'none';

export interface TimerSettings {
  volume: number;
  countUp: boolean;
}

const SETTINGS_KEY = 'timer_notification_settings';

export class TimerNotifications {
  private static sound: Audio.Sound | null = null;
  private static countdownSound: Audio.Sound | null = null;
  
  static defaultSettings: TimerSettings = {
    volume: 0.8,
    countUp: false, // false = countdown (default), true = countup
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

  // Play 3-second countdown sound
  static async playCountdownSound(volume: number = 0.8): Promise<void> {
    try {
      // Stop any currently playing countdown sound
      if (this.countdownSound) {
        await this.countdownSound.stopAsync();
        await this.countdownSound.unloadAsync();
        this.countdownSound = null;
      }

      console.log('🔊 Playing 3-second countdown sound');
      
      // Load and play the countdown sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/json_fit_timer_v3.wav'),
        { 
          shouldPlay: true, 
          volume: volume,
          isLooping: false 
        }
      );
      
      this.countdownSound = sound;
      
      // Clean up when sound finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.countdownSound = null;
        }
      });
      
    } catch (error) {
      console.error('Failed to play countdown sound:', error);
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
    console.log('✅ Timer notification complete');
  }

  // Play countdown sound if appropriate
  static async playCountdownIfNeeded(timeLeft: number): Promise<void> {
    if (timeLeft === 3) {
      const settings = await this.loadSettings();
      await this.playCountdownSound(settings.volume);
    }
  }

  // Placeholder notification methods (notifications not available without expo-notifications)
  static async scheduleTimerNotification(timeLeft: number, isCountUp: boolean = false): Promise<string | null> {
    console.log('📱 Timer notification scheduled for', timeLeft, 'seconds (notifications not implemented yet)');
    return null;
  }

  static async cancelTimerNotifications(): Promise<void> {
    console.log('🗑️ Timer notifications cancelled (notifications not implemented yet)');
  }
}