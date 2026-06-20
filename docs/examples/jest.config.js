/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.{js,ts,tsx}',
    '**/*.{spec,test}.{js,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    '^.+\\.jsx?$': 'babel-jest',
    '\\.svg$': '<rootDir>/src/test/svgTransform.js',
    '\\.css$': '<rootDir>/src/test/cssTransform.js',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^~ui/(.*)$': '<rootDir>/packages/ui/src/$1',
    '\\.css$': 'identity-obj-proxy',
    '\\.module\\.scss$': 'identity-obj-proxy',
  },
  moduleDirectories: ['node_modules', 'src'],
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterFramework: [
    '<rootDir>/src/test/setupTests.ts',
    '<rootDir>/src/test/mockHandlers.ts',
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'packages/*/src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 75,
      statements: 80,
    },
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true,
};
