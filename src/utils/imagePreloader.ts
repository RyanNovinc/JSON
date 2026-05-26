/**
 * Image Preloader Utility
 * 
 * Preloads critical images to improve perceived performance,
 * especially for key screens like CreateChooser and main meal galleries.
 */

import { Asset } from 'expo-asset';
import { Image } from 'react-native';

// Critical images that should be preloaded on app startup
const CRITICAL_IMAGES = [
  // Create screen images
  require('../assets/create/workout.png'),
  require('../assets/create/nutrition.png'),
  
  // Most popular meal images (based on usage)
  require('../assets/meals/pulled_pork.png'),
  require('../assets/meals/butter_chicken_curry.png'),
  require('../assets/meals/bolognese.png'),
  require('../assets/meals/massaman.png'),
  require('../assets/meals/chilli_con_carne.png'),
  
  // Popular smoothie images
  require('../assets/meals/mango_mass.png'),
  require('../assets/meals/strawberry_stack.png'),
  require('../assets/meals/banana_bulk.png'),
];

/**
 * Preload critical images using Asset.loadAsync for initial bundling
 * and Image.prefetch for expo-image caching
 */
export async function preloadCriticalImages(): Promise<void> {
  try {
    console.log('🖼️ Starting image preloading...');
    
    // Preload using Asset (bundles images for offline use)
    await Asset.loadAsync(CRITICAL_IMAGES);
    
    // Also prefetch using React Native Image for better caching
    const prefetchPromises = CRITICAL_IMAGES.map(async (imageSource) => {
      try {
        // React Native Image.prefetch expects a URI string
        const uri = Image.resolveAssetSource(imageSource).uri;
        await Image.prefetch(uri);
      } catch (error) {
        console.warn('Failed to prefetch image:', imageSource, error);
      }
    });
    
    await Promise.allSettled(prefetchPromises);
    
    console.log(`✅ Preloaded ${CRITICAL_IMAGES.length} critical images`);
  } catch (error) {
    console.warn('Image preloading failed:', error);
    // Non-critical error - app should continue normally
  }
}

/**
 * Preload images for a specific screen (lazy loading)
 */
export async function preloadScreenImages(imageList: any[]): Promise<void> {
  try {
    const prefetchPromises = imageList.map(async (imageSource) => {
      try {
        const uri = Image.resolveAssetSource(imageSource).uri;
        await Image.prefetch(uri);
      } catch (error) {
        console.warn('Failed to prefetch screen image:', imageSource, error);
      }
    });
    
    await Promise.allSettled(prefetchPromises);
  } catch (error) {
    console.warn('Screen image preloading failed:', error);
  }
}

/**
 * Clear image cache to free up memory (useful for debugging or low memory situations)
 */
export async function clearImageCache(): Promise<void> {
  try {
    // React Native Image doesn't have built-in cache clearing
    // This would require a third-party library or native implementation
    console.log('🧹 Image cache clear requested (manual implementation needed)');
  } catch (error) {
    console.warn('Cache clearing failed:', error);
  }
}