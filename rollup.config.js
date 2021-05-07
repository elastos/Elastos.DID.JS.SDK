/* import commonjs from '@rollup/plugin-commonjs';
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
			// Mostly for NodeJS / require()
            sourcemap: true,
            format: 'cjs',
            file: 'dist/index.js'
        },
        {
			// Browsers
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
			browser: true, // This instructs the plugin to use the "browser" property in package.json
			dedupe: [],
			preferBuiltins: true // tell Rollup to use node's built-in modules (ex: crypto) without bundling them (hence the import statement still present in the output file)
		}),
		commonjs(),
        typescript({
            sourceMap: true,
            inlineSources: !production
        }),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser(),

        //analyze({
        //    limit: 10
        //})
	],
	watch: {
		clearScreen: true
	}
}; */

/**
 * Configuration originaly migrated from the rollup tool config itself at https://github.com/rollup/rollup/blob/master/rollup.config.js
 */

import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import fs from 'fs';
import path from 'path';
//import { string } from 'rollup-plugin-string';
import { terser } from 'rollup-plugin-terser';
//import typescript from 'rollup-plugin-typescript';
//import typescript from 'rollup-plugin-typescript2';
import typescript from "@rollup/plugin-typescript";
/* import addCliEntry from './build-plugins/add-cli-entry.js';
import conditionalFsEventsImport from './build-plugins/conditional-fsevents-import';*/
import emitModulePackageFile from './build-plugins/emit-module-package-file.js';
/*import esmDynamicImport from './build-plugins/esm-dynamic-import.js';
import getLicenseHandler from './build-plugins/generate-license-file';*/
import replaceBrowserModules from './build-plugins/replace-browser-modules.js';
import pkg from './package.json';
import serve from 'rollup-plugin-serve';
//import nodePolyfills from 'rollup-plugin-node-polyfills';
import nodePolyfills from 'rollup-plugin-polyfill-node';


const commitHash = (function () {
	try {
		return fs.readFileSync('.commithash', 'utf-8');
	} catch (err) {
		return 'unknown';
	}
})();

const now = new Date(
	process.env.SOURCE_DATE_EPOCH ? process.env.SOURCE_DATE_EPOCH * 1000 : new Date().getTime()
).toUTCString();

const banner = `/*
  @license
	DID.js v${pkg.version}
	${now} - commit ${commitHash}

	Released under the MIT License.
*/`;

const onwarn = warning => {
	// eslint-disable-next-line no-console
	/* console.warn(
		'Building the DID SDK produced warnings that need to be resolved. ' +
			'Please keep in mind that the browser build may never have external dependencies!'
	); */
	if (warning.code && warning.code === "CIRCULAR_DEPENDENCY")
		return; // TMP: don't get flooded by circular dependencies for now

	if (warning.code && warning.code === "THIS_IS_UNDEFINED")
		return; // TMP: don't get flooded by this for now

	console.warn("Rollup build warning:", warning);
	//throw new Error(warning.message);
};

/* const moduleAliases = {
	resolve: ['.js', '.json', '.md'],
	entries: [
		{ find: 'help.md', replacement: path.resolve('cli/help.md') },
		{ find: 'package.json', replacement: path.resolve('package.json') },
		{ find: 'acorn', replacement: path.resolve('node_modules/acorn/dist/acorn.mjs') }
	]
}; */

const treeshake = {
	moduleSideEffects: false,
	propertyReadSideEffects: false,
	tryCatchDeoptimization: false
};

const nodePlugins = [
	//alias(moduleAliases),
	resolve({
		preferBuiltins: true
	}),
	json(),
	//conditionalFsEventsImport(),
	//string({ include: '**/*.md' }),
	commonjs({ include: 'node_modules/**' }),
	typescript({

	})
];

export default command => {
	//const { collectLicenses, writeLicense } = getLicenseHandler();
	const commonJSBuild = {
		input: {
			'did.js': 'src/index.ts',
			//'loadConfigFile.js': 'cli/run/loadConfigFile.ts'
		},
		onwarn,
		plugins: [
			...nodePlugins,
			//addCliEntry(),
			//esmDynamicImport(),
			//!command.configTest && collectLicenses()
		],
		// fsevents is a dependency of chokidar that cannot be bundled as it contains binary code
		external: [
			'assert',
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
		treeshake,
		strictDeprecations: true,
		output: {
			banner,
			chunkFileNames: 'shared/[name].js',
			dir: 'dist',
			entryFileNames: '[name]',
			//exports: 'auto',
			externalLiveBindings: false,
			format: 'cjs',
			freeze: false,
			// TODO: delete occurences to fsevents - not used in did sdk
			interop: id => {
				if (id === 'fsevents') {
					return 'defaultOnly';
				}
				return 'default';
			},
			manualChunks: { did: ['src/index.ts'] },
			sourcemap: true
		}
	};

	if (command.configTest) {
		return commonJSBuild;
	}

	const esmBuild = {
		...commonJSBuild,
		input: { 'did.js': 'src/index.ts' },
		plugins: [
			...nodePlugins,
			emitModulePackageFile(),
			//collectLicenses()
		],
		output: {
			...commonJSBuild.output,
			dir: 'dist/es',
			format: 'es',
			sourcemap: true,
			minifyInternalExports: false
		}
	};

	const browserBuilds = {
		input: 'src/index.ts',
		onwarn,
		plugins: [
			//replaceBrowserModules(),
			//alias(moduleAliases),
			resolve({
				browser: true,
				preferBuiltins: false
			}),
			json(),
			// TMP BPI: ADDING POLYFILLS REMOVES UNRESOLVED IMPORTS BUT CREATES [!] Error: 'Parser' is not exported by node_modules/antlr4ts/Parser.js, imported by src/parser/DIDURLParser.ts
			// NOTE!! FOR THIS TO WORK ROLLUP-PLUGIN-POLYFILLS WAS PATCHED MANUALLY FOR NOW TO REMOVE THE
			// TRANSFORM() METHOD - FIND SOMETHING
			nodePolyfills({
				crypto:true
			}),  // To let some modules import stream, util, fs ... in browser
			typescript(),
			commonjs(),
			// LATER terser({ module: true, output: { comments: 'some' } }),
			//collectLicenses(),
			//writeLicense(),
			serve({
				contentBase:'dist/es/',
				headers: {
					'Access-Control-Allow-Origin': '*'
				}
			})
		],
		treeshake,
		strictDeprecations: true,
		output: [
			//{ file: 'dist/did.browser.js', format: 'umd', name: 'did.js', banner, sourcemap: true },
			{
				file: 'dist/es/did.browser.js',
				format: 'es',
				banner,
				sourcemap: true,
				intro: 'var global = typeof self !== undefined ? self : this;' // Fix "global is not defined"
			},
		]
	};

	return [ /* commonJSBuild, esmBuild, */ browserBuilds];
};