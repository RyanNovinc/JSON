module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  // Two settings used to live here and both broke every suite that touches
  // react-native. Neither was a test failure — they were config failures, which is
  // why they presented as "suite failed to run" and nothing ever surfaced them.
  //
  //   moduleNameMapper: { '^react-native$': 'react-native-web' }
  //     react-native-web has never been a dependency of this project (no commit has
  //     ever added it, and there is no web target). Every suite importing
  //     react-native died at config time with "Could not locate module react-native
  //     mapped as react-native-web". jest-expo already resolves and transforms
  //     react-native correctly and needs no mapping.
  //
  //   testEnvironment: 'node'
  //     This overrode the environment jest-expo installs
  //     (react-native/jest/react-native-env.js), so react-native's Platform was
  //     undefined and anything reaching Platform.select threw
  //     "Cannot read properties of undefined (reading 'select')" on import.
  //
  // Leave the environment to the preset.

  // tmp/ holds scratch copies of source and test files. Without this, jest picks up
  // tmp/utils/buildPrepSession.test.js and runs a stale duplicate of a real suite.
  testPathIgnorePatterns: ['/node_modules/', '/tmp/', '/.aws-sam/'],

  // The preset's default testMatch treats EVERY file under __tests__/ as a suite,
  // so shared fixtures (testHelpers.ts) and scratch scripts (debugWorkoutUnits.js)
  // were being run and failing with "Your test suite must contain at least one
  // test." They are not tests. Only *.test.* files are.
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
};