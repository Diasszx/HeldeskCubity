import base from './jest.config.mjs';
export default {
  ...base,
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  testPathIgnorePatterns: [],
  testTimeout: 60000,
};
