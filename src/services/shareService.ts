/**
 * Share Service for JSON.fit
 * Handles creating and fetching shared workouts via the backend API
 */

import { gzipSync, strToU8 } from 'fflate';

// The payload limits live with the Lambdas that enforce them, so the client and
// the server cannot drift apart. See that file for why the numbers are what they are.
import { ENCODING_GZIP_B64 } from '../../jsonfit-share-backend/src/shared/shareLimits';

const API_BASE_URL = 'https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com';
const SHARE_BASE_URL = 'https://json.fit/p';
const REQUEST_TIMEOUT = 10000; // 10 seconds

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Standard base64 for a byte array.
 *
 * Hand-rolled on purpose: React Native has no Buffer, and btoa is not reliably
 * present across the iOS/Android JS engines we ship on. Pulling in a polyfill
 * for fifteen lines of arithmetic is not worth the dependency.
 *
 * Standard alphabet, not base64url — the Lambda decodes with
 * Buffer.from(payload, 'base64'), and the value rides in a JSON string body,
 * so there is nothing here that needs to be URL-safe.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);

    out += BASE64_ALPHABET[(triple >> 18) & 63];
    out += BASE64_ALPHABET[(triple >> 12) & 63];
    out += b1 === undefined ? '=' : BASE64_ALPHABET[(triple >> 6) & 63];
    out += b2 === undefined ? '=' : BASE64_ALPHABET[triple & 63];
  }
  return out;
}

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

  // Compress the payload before it goes over the wire. Large programs were
  // exceeding the server's size limit as raw JSON — this JSON compresses ~13x,
  // which is what actually fixes "too large to share".
  //
  // Only the REQUEST is compressed. getShare still answers in plain JSON, so
  // clients already installed on phones are completely unaffected by this; the
  // codec lives between the app and the Lambda, never between two app versions.
  const json = JSON.stringify(data);
  const compressed = gzipSync(strToU8(json), { level: 9 });
  const body = JSON.stringify({
    enc: ENCODING_GZIP_B64,
    payload: bytesToBase64(compressed),
  });

  console.log(
    `📦 [SHARE] payload ${json.length}B -> ${body.length}B on the wire ` +
    `(${(json.length / body.length).toFixed(1)}x)`
  );

  try {
    const response = await fetch(`${API_BASE_URL}/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
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