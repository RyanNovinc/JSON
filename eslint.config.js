// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*', 
      'ios/*', 
      'android/*', 
      '.expo/*', 
      '**/DateDownMobile/**',
      // Backend and build artifacts
      'aws-dashboard-backend.js',
      'enhanced-dashboard-backend.js', 
      'jsonfit-share-backend/**/*',
      'scripts/**/*',
      // Jest config uses Jest globals
      'jest.setup.js',
      // Backup files
      '**/*.backup.*'
    ],
  },
]);