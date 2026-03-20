import { NativeModules, Platform } from 'react-native';

interface LiveActivityOptions {
  timerEndDateInMilliseconds?: number;
  timeRemaining: string; // "3:45"
  exerciseName?: string;
  nextExercise?: string;
  setInfo?: string; // "Set 3 of 4"
  weightReps?: string; // "225 lbs × 8 reps"
  appName: string; // "JSON.fit"
  iconName?: string; // "IconBlue" or "IconPink"
  activityType?: string;
  themeColor?: string;
}

interface LiveActivityManager {
  startLiveActivity(options: LiveActivityOptions): Promise<string>;
  updateLiveActivity(options: LiveActivityOptions): Promise<string>;
  stopLiveActivity(): Promise<string>;
  isLiveActivitySupported(): Promise<boolean>;
}

const { LiveActivityManager } = NativeModules;

class NativeLiveActivity {
  private static isSupported: boolean | null = null;

  static async checkSupport(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    if (this.isSupported === null) {
      try {
        this.isSupported = await LiveActivityManager.isLiveActivitySupported();
      } catch (error) {
        console.log('Live Activity support check failed:', error);
        this.isSupported = false;
      }
    }
    
    return this.isSupported;
  }

  static async start(options: LiveActivityOptions): Promise<string | null> {
    const isSupported = await this.checkSupport();
    if (!isSupported) {
      console.log('📱 Live Activities not supported on this device');
      return null;
    }

    try {
      console.log('🎯 Starting native Live Activity:', options);
      const activityId = await LiveActivityManager.startLiveActivity(options);
      console.log('✅ Native Live Activity started:', activityId);
      return activityId;
    } catch (error) {
      console.error('❌ Failed to start native Live Activity:', error);
      return null;
    }
  }

  static async update(options: LiveActivityOptions): Promise<boolean> {
    const isSupported = await this.checkSupport();
    if (!isSupported) {
      return false;
    }

    try {
      console.log('🔄 Updating native Live Activity:', options);
      await LiveActivityManager.updateLiveActivity(options);
      console.log('✅ Native Live Activity updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update native Live Activity:', error);
      return false;
    }
  }

  static async stop(): Promise<boolean> {
    const isSupported = await this.checkSupport();
    if (!isSupported) {
      return false;
    }

    try {
      console.log('🛑 Stopping native Live Activity');
      await LiveActivityManager.stopLiveActivity();
      console.log('✅ Native Live Activity stopped');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop native Live Activity:', error);
      return false;
    }
  }

  static formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static getIconName(themeColor?: string): string {
    if (!themeColor) return 'IconBlue';
    
    const isPinkTheme = themeColor.toLowerCase().includes('pink') || 
                      themeColor === '#ec4899' || 
                      themeColor === '#f472b6';
    
    return isPinkTheme ? 'IconPink' : 'IconBlue';
  }
}

export default NativeLiveActivity;
export type { LiveActivityOptions };