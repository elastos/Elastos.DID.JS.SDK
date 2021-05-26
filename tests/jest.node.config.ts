import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
import { defaults as tsjPreset } from 'ts-jest/presets'
import { writeFileSync, existsSync, mkdirSync } from "fs";

// Empty browser data stub for nodejs tests.
if (!existsSync("./generated"))
    mkdirSync("./generated");
writeFileSync("./generated/browserdata.json", "{}");

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
      "tsconfig": "./tsconfig.json"
    }
  },
  testTimeout: 20000
}
export default config
