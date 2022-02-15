# rollup-plugin-file-content-replace

Replace the content of files while bundling them.
In more technical terms, this plugin causes rollup to change the file an import resolves to based on if the file is specified 
in the configuration.


## Installation

```bash
npm install --save-dev rollup-plugin-file-content-replace
```


## Usage

Generally, you need to ensure that rollup-plugin-file-content-replace goes *before* other things in your `plugins` array, so that those plugins can apply any optimisations such as dead code removal.
Note: Imports are expected to be relative to the root of the project and use '.' or '..' to indicate this. 
Any import that does not start with . or .. will be ignored by this plugin so that this plugin does not affect non-local imports (like node_modules, etc);

```js
// rollup.config.js
import replace from 'rollup-plugin-file-content-replace';

export default {
  // ...
  plugins: [
    fileContentReplace(
        {
            fileReplacements: [{
                replace: 'external.module.js',
                with: 'external-replacement.module.js'
            }],
            root: resolve(__dirname, 'src')
        }   
    )
  ]
};
```


## Options

```js
const config = {
    // A list of file replacement objects relative to the executing directory of the plugin, usually __dirname
    fileReplacements: [{
        replace: 'src/internal.module.js',
        with: 'src/internal-replacement.module.js'
    }],
    // Root directory under which the replacement files exist. 
    // Used to validate that the files exist before running the plugin
    root: resolve(__dirname, 'src')
}
```

## License

MIT

Code draws influences from [the node resolve plugin](https://github.com/rollup/rollup-plugin-node-resolve)
Readme is blatantly copied from [the string replacement plugin](https://github.com/rollup/rollup-plugin-replace) with modifications.