import { Platform } from 'react-native';
import { WorkoutStorage } from './storage';

// Import only when on iOS and expo-live-activity is available
let LiveActivity: any = null;

if (Platform.OS === 'ios') {
  try {
    LiveActivity = require('expo-live-activity').default;
  } catch (error) {
    console.log('Live Activity not available');
  }
}

export interface TimerLiveActivityData {
  title: string;
  timeLeft: number;
  isRunning: boolean;
  exerciseName?: string;
  setNumber?: number;
}

export class TimerLiveActivity {
  private static activityId: string | null = null;
  
  // Get the appropriate icon based on user theme
  private static async getThemeIcon(): Promise<string> {
    try {
      const isPinkTheme = await WorkoutStorage.loadThemePreference();
      return isPinkTheme ? 'icon_pink_transparent' : 'icon_transparent';
    } catch (error) {
      console.log('Failed to load theme preference, using default blue icon:', error);
      return 'icon_transparent'; // Default to blue
    }
  }
  
  // Start Live Activity for timer
  static async startTimer(data: TimerLiveActivityData): Promise<void> {
    if (!LiveActivity || Platform.OS !== 'ios') {
      console.log('📱 Live Activity not available on this platform');
      return;
    }

    try {
      // End any existing activity first
      await this.endTimer();

      // Get the appropriate icon for user's theme
      const iconName = await this.getThemeIcon();
      console.log('🎨 Using theme icon:', iconName);

      console.log('🚀 Starting Live Activity for timer:', data);
      
      const activityId = await LiveActivity.startActivity({
        // Dynamic Island configuration
        timerType: 'digital', // Use digital timer display
        imagePosition: 'left', // App icon on the left
        
        // Content for Dynamic Island compact mode
        compactLeading: 'J', // First letter of JSON.fit as text
        compactTrailing: `${Math.floor(data.timeLeft / 60)}:${(data.timeLeft % 60).toString().padStart(2, '0')}`,
        
        // Timer configuration - this makes it show as a countdown
        timer: {
          endDate: new Date(Date.now() + data.timeLeft * 1000).getTime(),
          style: 'timer'
        },
        
        // Icon configuration - use theme-appropriate icon
        imageName: iconName, // This should reference the icon in the app bundle
        dynamicIslandImageName: iconName, // Icon for Dynamic Island
        
        // Content data
        title: data.title,
        subtitle: data.exerciseName || 'Rest Timer',
        isRunning: data.isRunning,
        timeLeft: data.timeLeft,
        exerciseName: data.exerciseName || 'Exercise',
        setNumber: data.setNumber || 0,
      });

      this.activityId = activityId;
      console.log('✅ Live Activity started with ID:', activityId);
    } catch (error) {
      console.error('❌ Failed to start Live Activity:', error);
    }
  }

  // Update Live Activity
  static async updateTimer(data: Partial<TimerLiveActivityData>): Promise<void> {
    if (!LiveActivity || !this.activityId || Platform.OS !== 'ios') {
      return;
    }

    try {
      console.log('🔄 Updating Live Activity:', data);
      
      const updateData: any = {};
      
      // Get current theme icon in case theme changed
      const iconName = await this.getThemeIcon();
      updateData.imageName = iconName;
      updateData.dynamicIslandImageName = iconName;
      
      if (data.title) updateData.title = data.title;
      if (data.exerciseName) updateData.exerciseName = data.exerciseName;
      if (data.setNumber) updateData.setNumber = data.setNumber;
      if (typeof data.isRunning === 'boolean') updateData.isRunning = data.isRunning;
      
      // Update timer if timeLeft is provided
      if (data.timeLeft !== undefined) {
        updateData.timer = {
          endDate: new Date(Date.now() + data.timeLeft * 1000).getTime(),
          style: 'timer'
        };
        updateData.timeLeft = data.timeLeft;
        
        // Update compact trailing with formatted time
        updateData.compactTrailing = `${Math.floor(data.timeLeft / 60)}:${(data.timeLeft % 60).toString().padStart(2, '0')}`;
      }

      await LiveActivity.updateActivity(this.activityId, updateData);
      console.log('✅ Live Activity updated with theme icon:', iconName);
    } catch (error) {
      console.error('❌ Failed to update Live Activity:', error);
    }
  }

  // End Live Activity
  static async endTimer(): Promise<void> {
    if (!LiveActivity || !this.activityId || Platform.OS !== 'ios') {
      return;
    }

    try {
      console.log('🛑 Ending Live Activity:', this.activityId);
      await LiveActivity.endActivity(this.activityId);
      this.activityId = null;
      console.log('✅ Live Activity ended');
    } catch (error) {
      console.error('❌ Failed to end Live Activity:', error);
      // Clear ID anyway if it failed
      this.activityId = null;
    }
  }

  // Check if Live Activity is active
  static get isActive(): boolean {
    return this.activityId !== null;
  }

  // Get current activity ID
  static get currentId(): string | null {
    return this.activityId;
  }
}