import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
import { defaults as tsjPreset } from 'ts-jest/presets'

const config: InitialOptionsTsJest = {
  rootDir: "./tests",
  transform: {
    ...tsjPreset.transform,
  }
}
export default config
