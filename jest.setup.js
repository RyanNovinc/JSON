// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Clear AsyncStorage mock before each test to ensure no test shares state
beforeEach(() => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  AsyncStorage.clear();
});