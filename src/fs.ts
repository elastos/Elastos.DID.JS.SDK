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

import * as fs from "fs";

export function existsSync(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        try {
            resolve(fs.existsSync(path));
        } catch (e) {
            reject(e);
        }
    });
}

export function mkdirSync(path: string, mode?): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            fs.mkdirSync(path, mode);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

export function readdirSync(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        try {
            resolve(fs.readdirSync(path));
        } catch (e) {
            reject(e);
        }
    });
}

export function readFileSync(filename: string, options?: { encoding: BufferEncoding; flag?: string | undefined; } | BufferEncoding): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        try {
            const result: string = fs.readFileSync(filename, options);
            resolve(result);
        } catch (e) {
            reject(e);
        }
    });
}

export function renameSync(oldPath: string, newPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            fs.renameSync(oldPath, newPath);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

export function rmdirSync(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            fs.rmdirSync(path);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

export function statSync(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
        try {
            resolve(fs.statSync(path));
        } catch (e) {
            reject(e);
        }
    });
}

export function lstatSync(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
        try {
            resolve(fs.lstatSync(path));
        } catch (e) {
            reject(e);
        }
    });
}

export function writeFileSync(filename: string, data: any, options?): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            fs.writeFileSync(filename, data, options)
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

export function unlinkSync(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            fs.unlinkSync(path);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

export {
    Stats
} from "fs";
