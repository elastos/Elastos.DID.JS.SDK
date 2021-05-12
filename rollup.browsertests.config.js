import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';
import replace from '@rollup/plugin-replace';
import alias from "@rollup/plugin-alias";
import commonJs from "@rollup/plugin-commonjs";
import multiInput from 'rollup-plugin-multi-input';
import json from '@rollup/plugin-json';
import globals from 'rollup-plugin-node-globals';

export default [
    {
        //input: 'tests/didstore.test.ts',
        input: ['tests/*.ts'],
        output: {
            //file: 'public/tests/did.browser.tests.js',
            dir: 'public/tests',
            format: 'es',
            sourcemap: true,
        },
        //inlineDynamicImports: true
        //external: [],
        plugins: [
            multiInput(),
            json(),
            // Replace imports of nodejs DID library in tests, with the browser version
            replace({
                delimiters: ['', ''],
                preventAssignment: true,
                include: [
                    'tests/**/*.ts'
                ],
                values: {
                    '../dist/did': '../dist/es/did.browser',
                    '../../dist/did': '../../dist/es/did.browser',
                }
            }),
            resolve({
                browser: true,
                preferBuiltins: false
            }),
            alias({
				"entries": [
                    /* { "find": "process", "replacement": "process-es6" },
                    { "find": "fs", "replacement": "./tests/empty.ts" },
                    { "find": "stream", "replacement": "./tests/empty.ts" } */
					//{ "find": "fs", "replacement": "browserfs/dist/shims/fs" }

                   /*  { "find": "buffer", "replacement": "browserfs/dist/shims/buffer" },
					{ "find": "process", "replacement": "process-es6" },
					{ "find": "fs", "replacement": "browserfs/dist/shims/fs" },
					{ "find": "path", "replacement": "browserfs/dist/shims/path" },
					{ "find": "crypto", "replacement": "crypto-browserify" },
					{ "find": "util/", "replacement": "node_modules/util/util.js" },
					{ "find": "util", "replacement": "node_modules/util/util.js" },
					{ "find": "stream", "replacement": "./src/browser/stream.js" },
					{ "find": "string_decoder/", "replacement": "node_modules/string_decoder/lib/string_decoder.js" },
					{ "find": "string_decoder", "replacement": "node_modules/string_decoder/lib/string_decoder.js" },
					{ "find": "events", "replacement": "node_modules/events/events.js" },
					{ "find": "assert", "replacement": "node_modules/assert/build/assert.js" } */
				]
			}),
            typescript({
                tsconfig: "./tsconfig.browsertests.json" // Custom config to build only tests/ files
            }),
            /* commonJs({
                esmExternals: true,
                transformMixedEsModules: true
            }), */
            globals({
                include: 'tests/**/*.ts'
            }), // Defines fake values for nodejs' "process", etc.
            // Serve the generated tests JS file to be ran from the browser
            serve({
                contentBase: '',
                //open: true,
                openPage: '/public/browser-tests.html',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            }),
        ]
    },

    // CommonJS (for Node) and ES module (for bundlers) build.
    // (We could have three entries in the configuration array
    // instead of two, but it's quicker to generate multiple
    // builds from a single configuration where possible, using
    // an array for the `output` option, where we can specify
    // `file` and `format` for each target)
    /* {
      input: 'src/main.js',
      external: [],
      output: [
        { file: pkg.main, format: 'cjs' },
        { file: pkg.module, format: 'es' },
      ],
    }, */
];