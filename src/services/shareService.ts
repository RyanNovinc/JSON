/**
 * Share Service for JSON.fit
 * Handles creating and fetching shared workouts via the backend API
 */

const API_BASE_URL = 'https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com';
const SHARE_BASE_URL = 'https://json.fit/p';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export interface ShareResponse {
  shareId: string;
  shareUrl: string;
  expiresAt: string;
}

export class ShareError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'EXPIRED' | 'TOO_LARGE' | 'SERVER_ERROR' | 'TIMEOUT' | 'INVALID_DATA'
  ) {
    super(message);
    this.name = 'ShareError';
  }
}

/**
 * Creates a shareable link for workout data
 */
export async function createShare(data: object): Promise<ShareResponse> {
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 413) {
        throw new ShareError('Workout data is too large to share', 'TOO_LARGE');
      }
      if (response.status >= 500) {
        throw new ShareError('Server error - please try again later', 'SERVER_ERROR');
      }
      throw new ShareError(`Failed to create share: ${response.status}`, 'SERVER_ERROR');
    }

    const result = await response.json();
    
    
    if (!result.shareId || !result.expiresAt) {
      throw new ShareError('Invalid response from server', 'INVALID_DATA');
    }

    return {
      shareId: result.shareId,
      shareUrl: `${SHARE_BASE_URL}/${result.shareId}`,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new ShareError('Request timed out - check your connection', 'TIMEOUT');
    }
    
    if (error instanceof ShareError) {
      throw error;
    }
    
    // Network or other errors
    throw new ShareError('Network error - check your connection', 'NETWORK_ERROR');
  }
}

/**
 * Fetches shared workout data by share ID
 */
export async function fetchShare(shareId: string): Promise<object> {
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  const url = `${API_BASE_URL}/shares/${shareId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });


    clearTimeout(timeoutId);

    if (!response.ok) {
      
      if (response.status === 404) {
        throw new ShareError('This shared workout has expired or is no longer available', 'EXPIRED');
      }
      if (response.status >= 500) {
        throw new ShareError('Server error - please try again later', 'SERVER_ERROR');
      }
      throw new ShareError(`Failed to fetch share: ${response.status}`, 'SERVER_ERROR');
    }

    const result = await response.json();
    
    if (!result || typeof result !== 'object') {
      throw new ShareError('Invalid workout data received', 'INVALID_DATA');
    }
    return result;
  } catch (error) {
    console.error('ShareService fetchShare error:', error?.message);
    
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new ShareError('Request timed out - check your connection', 'TIMEOUT');
    }
    
    if (error instanceof ShareError) {
      throw error;
    }
    
    // Network or other errors
    throw new ShareError('Network error - check your connection', 'NETWORK_ERROR');
  }
}