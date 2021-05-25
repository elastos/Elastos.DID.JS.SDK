import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import alias from "@rollup/plugin-alias";
import commonJs from "@rollup/plugin-commonjs";
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
//import globals from 'rollup-plugin-node-globals';
//import nativePlugin from 'rollup-plugin-natives';

export default [
    {
        input: ['./src-no-jest/index.ts'],
        output: {
            file: 'generated/tests-no-jest.js',
            format: 'cjs',
            sourcemap: true
        },
        plugins: [
            json(),
            /* nativePlugin({
                copyTo: 'generated'
            }), */
            replace({
				delimiters: ['', ''],
				preventAssignment: true,
				values: {
					// Replace readable-stream with stream (polyfilled) because it uses dynamic requires and this doesn't work well at runtime
					// even if trying to add "readable-stream" to "dynamicRequireTargets" in commonJs().
					// https://github.com/rollup/rollup/issues/1507#issuecomment-340550539
					'require(\'readable-stream\')': 'require(\'stream\')',
					'require("readable-stream")': 'require("stream")',
					'require(\'readable-stream/writable\')': 'require(\'stream\').Writable',
					'require("readable-stream/writable")': 'require("stream").Writable',
					'require(\'readable-stream/readable\')': 'require(\'stream\').Readable',
					'require("readable-stream/readable")': 'require("stream").Readable',
					'LegacyTransportStream = require(\'./legacy\')': 'LegacyTransportStream = null',
					'LegacyTransportStream = require(\'winston-transport/legacy\')': 'LegacyTransportStream = null',
                    //'require(\'node-gyp-build\')(__dirname)': 'require(\'node-gyp-build\')(\'../node_modules/secp256k1\')',
                    //'(__dirname)': '(\'../node_modules/secp256k1\')',
				}
			}),
            alias({
                include: [".js",".ts"],
				"entries": [
					{ "find": "electron", "replacement": "./src-no-jest/stubs/electron-stub.ts" },
                    // For convenience, because because secp256k1 looks for native .node bindings and they would have to be packaged in the output dir.
                    // KO: this lib works only in BROWSER (browser crypto module)
                    //{ find: "secp256k1", replacement: "@enumatech/secp256k1-js" }
				]
			}),
            resolve({
                preferBuiltins: true,
                dedupe: ['bn.js', 'secp256k1']
            }),
            // Very dirty way to "solve" the fact that .node files are not bundles well by rollup
            // even with a plugin such as rollup-plugin-natives.
            replace({
                include: "node_modules/secp256k1/bindings.js",
				values: { '__dirname': '(__dirname+\'/../node_modules/secp256k1\')' }
            }),
            replace({
                include: "node_modules/keccak/bindings.js",
				values: { '__dirname': '(__dirname+\'/../node_modules/keccak\')' }
            }),
            commonJs({
                //esmExternals: true,
                ignoreDynamicRequires: true,
                dynamicRequireTargets: ['secp256k1', 'node-gyp-build']
            }),
            typescript({
                tsconfig: "./src-no-jest/tsconfig.json"
            })
        ]
    }
];