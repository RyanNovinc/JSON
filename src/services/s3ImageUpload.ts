import axios from 'axios';

const FEEDBACK_API_ENDPOINT = 'https://62awcpiych.execute-api.ap-southeast-2.amazonaws.com/prod/feedback';

export interface UploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
  viewUrl: string;
}

export interface PresignedUrlsResponse {
  success: boolean;
  uploadUrls: UploadUrlResponse[];
  bucketName: string;
}

export const getPresignedUploadUrls = async (
  photoCount: number,
  testimonialId?: string
): Promise<UploadUrlResponse[]> => {
  try {
    const response = await axios.post<PresignedUrlsResponse>(
      FEEDBACK_API_ENDPOINT,
      {
        type: 'get_upload_urls',
        photoCount,
        testimonialId
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    if (response.data.success) {
      return response.data.uploadUrls;
    } else {
      throw new Error('Failed to get upload URLs');
    }
  } catch (error) {
    console.error('Error getting presigned URLs:', error);
    throw error;
  }
};

export const uploadImageToS3 = async (
  imageUri: string,
  uploadUrl: string
): Promise<void> => {
  try {
    // Convert local image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to S3 using presigned URL
    await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    console.log('Image uploaded successfully to S3');
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw error;
  }
};

export const uploadMultipleImages = async (
  imageUris: string[]
): Promise<string[]> => {
  try {
    // Get presigned URLs for all images
    const uploadUrls = await getPresignedUploadUrls(imageUris.length);
    
    // Upload all images in parallel
    const uploadPromises = imageUris.map(async (uri, index) => {
      if (!uri || !uploadUrls[index]) return null;
      
      await uploadImageToS3(uri, uploadUrls[index].uploadUrl);
      return uploadUrls[index].imageKey;
    });

    const imageKeys = await Promise.all(uploadPromises);
    
    // Filter out null values
    return imageKeys.filter(key => key !== null) as string[];
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};