import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';
import replace from '@rollup/plugin-replace';
import alias from "@rollup/plugin-alias";
import commonJs from "@rollup/plugin-commonjs";
import multiInput from 'rollup-plugin-multi-input';
import json from '@rollup/plugin-json';
import globals from 'rollup-plugin-node-globals';
import { resolve as pathResolve } from "path";
import { readdirSync, writeFileSync, lstatSync, readFileSync, mkdirSync, existsSync } from 'fs';

async function populateDataContent(folder, entry) {
    let folderFiles = readdirSync(folder);
    for (let file of folderFiles) {
        let fullPath = folder+"/"+file;
        const stat = lstatSync(fullPath);
        if (stat.isDirectory()) {
            // Folder - recurse
            entry[file] = {};
            populateDataContent(fullPath, entry[file]);
        }
        else {
            // File
            entry[file] = {
                _content: readFileSync(fullPath).toString("utf-8").replace(/\n|\r/g, "")
            }
        }
    }
}

// As the browser cannot access data files directly (load files, list files in folder...) we generate
// a temporary file that mimics the data/ folder structure so that the tests can load all the data from a bundled
// object instead. NodeJS keeps loading this from disk.
let rootDataFolder = pathResolve(__dirname+"/tests/data");
let dataBundle = {
    data: {}
};
populateDataContent(rootDataFolder, dataBundle.data);
//console.log(dataBundle)
if (!existsSync("./generated"))
    mkdirSync("./generated");
writeFileSync("./generated/browserdata.json", JSON.stringify(dataBundle, null, "  "));

export default [
    {
        //input: 'tests/didstore.test.ts',
        input: ['tests/**/*.ts'],
        //input: 'tests/crypto/ecdsasigner.test.ts',
        output: {
            //file: 'public/tests/did.browser.tests.js',
            dir: 'public/tests',
            format: 'es',
            sourcemap: true,
            //intro: "var __dirname = '/';"
        },
        //inlineDynamicImports: true
        //external: [],
        plugins: [
            multiInput(),
            json(),
            // Dirty circular dependency removal atttempt
			replace({
				delimiters: ['', ''],
				preventAssignment: true,
				include: [
					'node_modules/assert/build/internal/errors.js'
				],
				values: {
					'require(\'../assert\')': 'null',
				}
			}),
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
                mainFields: ['browser', 'jsnext:main', 'main'],
                browser: true,
                preferBuiltins: false
            }),
            commonJs({
                esmExternals: true,
                transformMixedEsModules: true
            }),
            globals(), // Defines fake values for nodejs' "process", etc.
            alias({
                include: [".js",".ts"],
				entries: [
                    { find: "buffer", replacement: "buffer-es6" },
                    { find: "path", replacement: "path-browserify" }
				]
			}),
            typescript({
                tsconfig: "./tsconfig.browsertests.json" // Custom config to build only tests/ files
            }),
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
    }
];