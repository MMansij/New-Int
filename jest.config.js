// jest.config.js
const nextJest = require('next/jest')

// Provide the path to your Next.js app to load next.config.js and .env files
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customJestConfig = {
  // Environment
  testEnvironment: 'jsdom',

  // Runs BEFORE the test framework is installed (good for env vars)
  setupFiles: ['<rootDir>/src/test/setupAwsEnv.ts'],

  // Runs AFTER the test framework is installed (RTL, custom matchers, mocks)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Useful defaults so absolute imports like @/foo work
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',

    // CSS modules / styles
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Static asset stubs
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',

    // If you want to silence parallax warnings in tests, uncomment this and create the mock file:
    // '^react-scroll-parallax$': '<rootDir>/__mocks__/react-scroll-parallax.tsx',
  },

  // File discovery
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage
  collectCoverage: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    'src/app/api/submit/*.{ts,tsx,js,jsx}',
    '!src/**/__tests__/**/*',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/__mocks__/',
    '/__tests__/',
  ],
  coverageReporters: ['text', 'lcov', 'html'],

  // Jest will use Next’s Babel preset via next/jest, so no manual "transform" needed.
}

module.exports = createJestConfig(customJestConfig)
