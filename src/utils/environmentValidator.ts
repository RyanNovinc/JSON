// Environment validation for production builds
export function validateProductionEnvironment() {
  if (__DEV__) {
    // Skip validation in development
    return;
  }

  const errors: string[] = [];

  // Validate that we're not using localhost URLs in production
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.includes('localhost')) {
    errors.push('Production build cannot use localhost API URL');
  }

  // Validate that required environment variables are set for production
  const requiredEnvVars = [
    // Add any required production environment variables here
    // 'EXPO_PUBLIC_API_URL',
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  });

  // Validate app configuration
  const appVersion = require('../../app.json').expo.version;
  if (!appVersion || appVersion === '1.0.0') {
    console.warn('⚠️ [ENV] App version should be updated for production builds');
  }

  if (errors.length > 0) {
    console.error('🚨 [ENV] Production environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    // In production, we might want to throw an error or show a warning
    // For now, just log the errors
    if (!__DEV__) {
      console.error('🚨 [ENV] Production build has configuration errors!');
    }
  } else {
    console.log('✅ [ENV] Production environment validation passed');
  }
}

export function getEnvironmentInfo() {
  return {
    isDevelopment: __DEV__,
    hasApiUrl: !!process.env.EXPO_PUBLIC_API_URL,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'Not set',
    bundleId: require('../../app.json').expo.ios?.bundleIdentifier,
    version: require('../../app.json').expo.version,
  };
}