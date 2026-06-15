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
      'aws-dashboard-backend.js',
      'enhanced-dashboard-backend.js',
      'jsonfit-share-backend/**/*',
      'scripts/**/*',
      'jest.setup.js',
      '**/*.backup.*',
    ],
  },
  {
    // Apostrophes/quotes in JSX text render fine — this rule is pure noise.
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // React Navigation's <Screen> uses a children render-callback as its API,
    // so no-children-prop is a false positive here. Rule stays on elsewhere.
    files: ['src/navigation/**/*.{ts,tsx}'],
    rules: {
      'react/no-children-prop': 'off',
    },
  },
]);