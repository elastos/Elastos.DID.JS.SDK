import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import typescript from "@rollup/plugin-typescript";
//import path from "path";
//import copy from "rollup-plugin-copy-assets";
//import analyze from 'rollup-plugin-analyzer';
import json from "@rollup/plugin-json";

const production = false; //!process.env.ROLLUP_WATCH;

export default {
	input: 'src/index.ts',
	output: [
        {
            sourcemap: true,
            format: 'cjs',
            file: 'dist/index.js'
        },
        {
            sourcemap: true,
            format: 'esm',
            file: 'dist.esm/index.js'
        }
    ],
	plugins: [
		postcss({
            extract: 'bundle.css'
        }),
		json(),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: [],
			preferBuiltins: true
		}),
		commonjs(),
        typescript({
            sourceMap: true,
            inlineSources: !production
        }),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser(),

        /*analyze({
            limit: 10
        })*/
	],
	watch: {
		clearScreen: true
	}
};