/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import BrowserFS, { BFSRequire } from "browserfs";
import Stats from "browserfs/dist/node/core/node_fs_stats";
const fs = BFSRequire("fs");

if (typeof window != 'undefined' && 'didUseIndexedDb' in window) { //IndexedDB
    BrowserFS.configure({
        fs: "MountableFileSystem",
        options: {
            "/": {
                fs: "IndexedDB",
                options: {
                    storeName: "DIDDatabase"
                }
            }
        }
    }, function (e) {
        if (e) {
            // An error occurred.
            throw e;
        }
        // Otherwise, BrowserFS is ready to use!
    });
} else { //Local Storage
    BrowserFS.configure({
        fs: "LocalStorage",
        options: {}
    }, function (e) {
        if (e) {
            throw e;
        } else {
            //console.log("BrowserFS initialization complete");
        }
    });
}

export function existsSync(path: string): Promise<boolean> {
    return new Promise<boolean>(resolve => fs.exists(path, exists => {
        resolve(exists);
    }));
}

export function mkdirSync(path: string, mode?: number | string): Promise<void> {
    return new Promise<void>((resolve, reject) => fs.mkdir(path, mode, e => {
        e ? reject(e) : resolve();
    }));
}

export function readdirSync(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => fs.readdir(path, (e, rv) => {
        e ? reject(e) : resolve(rv);
    }));
}

export function readFileSync(filename: string, options?: { encoding: string; flag?: string; }): Promise<string> {
    return new Promise<string>((resolve, reject) => fs.readFile(filename, options, (e, rv: string) => {
        e ? reject(e) : resolve(rv);
    }));
}

export function renameSync(oldPath: string, newPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => fs.rename(oldPath, newPath, e => {
        e ? reject(e) : resolve();
    }));
}

export function rmdirSync(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => fs.rmdir(path, e => {
        e ? reject(e) : resolve();
    }));
}

export function statSync(path: string): Promise<Stats> {
    return new Promise<Stats>((resolve, reject) => fs.stat(path, (e, rv) => {
        e ? reject(e) : resolve(rv);
    }));
}

export function lstatSync(path: string): Promise<Stats> {
    return new Promise<Stats>((resolve, reject) => fs.lstat(path, (e, rv) => {
        e ? reject(e) : resolve(rv);
    }));
}

export function writeFileSync(filename: string, data: any, options?): Promise<void> {
    return new Promise<void>((resolve, reject) => fs.writeFile(filename, data, options, e => {
        e ? reject(e) : resolve();
    }));
}

export function unlinkSync(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => fs.unlink(path, e => {
        e ? reject(e) : resolve();
    }));
}
