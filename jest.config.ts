import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
import { defaults as tsjPreset } from 'ts-jest/presets'
// import { jsWithTs as tsjPreset } from 'ts-jest/presets'
// import { jsWithBabel as tsjPreset } from 'ts-jest/presets'
const config: InitialOptionsTsJest = {
  rootDir: "./tests",
  // [...]
  transform: {
    ...tsjPreset.transform,
    // [...]
  },
  transformIgnorePatterns: [
      "node_modules/(?!(buffer-es6)/)"
   ]
}
export default config
