import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
import { defaults as tsjPreset } from 'ts-jest/presets'

const mergedConfig: InitialOptionsTsJest & any = {
  rootDir: "./tests",
  transform: {
    ...tsjPreset.transform,
  },

  // Puppeteer
  globalSetup: __dirname + '/tests-config/browser/puppeteer/setup.js',
  globalTeardown: __dirname + '/tests-config/browser/puppeteer/teardown.js',
  testEnvironment: __dirname + '/tests-config/browser/puppeteer/puppeteer_environment.js',
}

export default mergedConfig;