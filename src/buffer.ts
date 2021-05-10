/**
 * Wrapper to make the Buffer class transparent no matter if we run on nodejs or in the browser.
 * This may not be the best way to deal with the lack of Buffer in Browser but for now rollup polyfills
 * don't seem to work well for typescript files.
 */

 import { Buffer as Buffer } from "buffer-es6";
 export {
     Buffer
 };