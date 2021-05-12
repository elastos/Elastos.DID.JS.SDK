import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';
import replace from '@rollup/plugin-replace';

export default [
    {
        input: 'tests/didurl.test.ts',
        output: {
            name: 'rollupJestBoilerplate',
            file: 'public/tests/did.browser.tests.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [
            // Replace imports of nodejs DID library in tests, with the browser version
            replace({
                delimiters: ['', ''],
                preventAssignment: true,
                include: [
                    'tests/**/*.test.ts'
                ],
                values: {
                    '../dist/did': '../dist/es/did.browser',
                }
            }),
            typescript({
                tsconfig: "./tests/tsconfig.json" // Custom config to build only tests/ files
            }),
            resolve({
                browser: true
            }),
            // Serve the generated tests JS file to be ran from the browser
            serve({
                contentBase: '',
                open: true,
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