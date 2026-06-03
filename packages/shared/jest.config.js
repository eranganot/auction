module.exports = {
  displayName: 'shared',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/matching.ts',
    '<rootDir>/src/normalize.ts',
    '<rootDir>/src/enums.ts',
    '<rootDir>/src/filter.ts',
  ],
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
};
