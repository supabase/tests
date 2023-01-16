import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'cjs', 'json', 'node'],
  globalSetup: '<rootDir>/.jest/token.ts',
  setupFilesAfterEnv: ['<rootDir>/.jest/jest-custom-reporter.ts'],
  testRunner: 'jest-jasmine2',
  testTimeout: 30000,
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
}
export default config
