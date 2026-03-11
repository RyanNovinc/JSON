import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { uploadMultipleImages } from './s3ImageUpload';

// Your AWS API Gateway endpoint (Sydney region)
const FEEDBACK_API_ENDPOINT = 'https://62awcpiych.execute-api.ap-southeast-2.amazonaws.com/prod/feedback';

export interface FeedbackData {
  type: 'import_negative' | 'rating' | 'bug' | 'feature' | 'testimonial';
  details?: string;
  programId?: string;
  stars?: number;
  comment?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high';
  steps?: string;
  // Testimonial specific fields
  testimonialText?: string;
  startWeight?: number;
  currentWeight?: number;
  weightUnit?: 'kg' | 'lbs';
  transformationDays?: number;
  weightLoss?: number;
  consentForMarketing?: boolean;
  beforePhotos?: string[];
  afterPhotos?: string[];
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

export const sendTestimonial = async (
  testimonialText: string,
  startWeight: number,
  currentWeight: number,
  weightUnit: 'kg' | 'lbs',
  transformationDays: number,
  consentForMarketing: boolean = true,
  beforePhotoUris: string[] = [],
  afterPhotoUris: string[] = []
): Promise<void> => {
  const weightLoss = startWeight - currentWeight;
  
  try {
    // Upload photos to S3 first
    let beforePhotos: string[] = [];
    let afterPhotos: string[] = [];

    if (beforePhotoUris.length > 0) {
      console.log('Uploading before photos to S3...');
      beforePhotos = await uploadMultipleImages(beforePhotoUris);
    }

    if (afterPhotoUris.length > 0) {
      console.log('Uploading after photos to S3...');
      afterPhotos = await uploadMultipleImages(afterPhotoUris);
    }

    // Send testimonial with S3 image keys
    await sendFeedbackToAPI({
      type: 'testimonial',
      testimonialText,
      startWeight,
      currentWeight,
      weightUnit,
      transformationDays,
      weightLoss,
      consentForMarketing,
      beforePhotos,
      afterPhotos,
    });

    console.log('Testimonial with photos sent successfully');
  } catch (error) {
    console.error('Error sending testimonial with photos:', error);
    
    // Fallback: send testimonial without photos
    console.log('Sending testimonial without photos as fallback...');
    await sendFeedbackToAPI({
      type: 'testimonial',
      testimonialText,
      startWeight,
      currentWeight,
      weightUnit,
      transformationDays,
      weightLoss,
      consentForMarketing,
      beforePhotos: [],
      afterPhotos: [],
    });
  }
};