export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  clearMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/test/integration/'],
  testTimeout: 30000,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
