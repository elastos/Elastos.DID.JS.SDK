import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
import { defaults as tsjPreset } from 'ts-jest/presets'

const config: InitialOptionsTsJest = {
  rootDir: "./src",
  transform: {
    ...tsjPreset.transform,
  },
  reporters: [
    "default",
    [
      "jest-html-reporter", {
        pageTitle: "DID JS SDK NodeJS test report",
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],
  globals: {
    "ts-jest": {
      "tsConfig": "./tsconfig.json"
    }
  }
}
export default config
