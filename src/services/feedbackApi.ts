import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Your AWS API Gateway endpoint (Sydney region)
const FEEDBACK_API_ENDPOINT = 'https://62awcpiych.execute-api.ap-southeast-2.amazonaws.com/prod/feedback';

export interface FeedbackData {
  type: 'import_negative' | 'rating' | 'bug' | 'feature';
  details?: string;
  programId?: string;
  stars?: number;
  comment?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high';
  steps?: string;
}

const getDeviceInfo = () => {
  return {
    platform: Platform.OS,
    osVersion: Platform.Version,
    deviceName: Device.deviceName,
    brand: Device.brand,
    modelName: Device.modelName,
    deviceType: Device.deviceType,
  };
};

export const sendFeedbackToAPI = async (feedbackData: FeedbackData): Promise<void> => {
  try {
    const payload = {
      ...feedbackData,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || 'Unknown',
      deviceInfo: getDeviceInfo(),
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(FEEDBACK_API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data.success) {
      console.log('Feedback sent successfully:', response.data.feedbackId);
    }
  } catch (error) {
    // Don't throw the error - we don't want to interrupt the user experience
    // Just log it for debugging
    console.error('Failed to send feedback to API:', error);
    
    // Optionally, you could store failed feedback attempts locally
    // and retry them later
  }
};

export const sendImportFeedback = async (
  feedback: 'positive' | 'negative',
  details?: string,
  programId?: string
): Promise<void> => {
  // Only send negative feedback to API
  if (feedback === 'negative') {
    await sendFeedbackToAPI({
      type: 'import_negative',
      details,
      programId,
    });
  }
};

export const sendRatingFeedback = async (
  stars: number,
  comment?: string
): Promise<void> => {
  await sendFeedbackToAPI({
    type: 'rating',
    stars,
    comment,
  });
};

export const sendBugReport = async (
  description: string,
  severity?: 'low' | 'medium' | 'high',
  steps?: string
): Promise<void> => {
  await sendFeedbackToAPI({
    type: 'bug',
    description,
    severity,
    steps,
  });
};

export const sendFeatureRequest = async (
  description: string,
  priority?: 'low' | 'medium' | 'high'
): Promise<void> => {
  await sendFeedbackToAPI({
    type: 'feature',
    description,
    priority,
  });
};