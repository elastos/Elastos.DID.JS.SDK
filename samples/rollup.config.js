import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from "@rollup/plugin-typescript";

export default {
    input: { 'samples': 'src/main.ts' },
    plugins: [
        resolve({
            jsnext: true,
            preferBuiltins: true
        }),
        json(),
        commonjs({}),
        typescript({})
    ],
    external: [
        'assert',
        'axios',
        'crypto',
        'events',
        'fs',
        'fsevents',
        'module',
        'path',
        'os',
        'stream',
        'url',
        'util'
    ],
    output: {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        externalLiveBindings: false
    }
}
