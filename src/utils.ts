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

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import { Buffer } from "buffer";
import { IllegalArgumentException } from "./exceptions/exceptions";
import { BASE64, SHA256 } from "./internals";


export function checkArgument(condition: boolean, errorMessage: string): void {
    if (!condition)
        throw new Error(errorMessage);
}

export function checkEmpty(value: string, errorMessage: string): void {
    checkArgument(value != null && value !== "", errorMessage);
}

export function checkNotNull(value: any, errorMessage: string): void {
    if (value === null) {
        throw new Error(errorMessage);
    }
}

export function checkState(state: boolean, errorMessage: string): void {
    if (!state)
        throw new Error(errorMessage);
}

export function isEmpty(value: string): boolean {
    return !value || value == null;
}

export function uint8ArrayCopy(src: Uint8Array, srcIndex: number, dest: Uint8Array, destIndex: number, length: number): void {
    let values = [...src.slice(srcIndex, srcIndex + length)];
    dest.set(values, destIndex);
}

export function hashCode(input: string | number | boolean): number {
    if (typeof input === 'string') {
        var h = 0, i = input.length;
        while (i > 0) {
            h = (h << 5) - h + input.charCodeAt(--i) | 0;
        }
        return h;
    }
    if (typeof input === 'number') {
        return input;
    }
    if (typeof input === 'boolean') {
        return input === true ? 1231 : 1237;
    }
    throw new IllegalArgumentException("Unsupported type " + typeof input);
}

export function base64Decode(input: string): string {
    return BASE64.decode(input);
}

export function sha256(input: string): string {
    return SHA256.encodeToString(Buffer.from(input, "utf-8"));
}

/**
 * Convenient method to return a Promise that returns a type and handles exceptions with rejections.
 */
export function promisify<T>(exec: (reject?: (e) => void) => T): Promise<T> {
    return new Promise((resolve, reject) => {
        try {
            let result: T = exec((e) => {
                reject(e);
            });
            resolve(result);
        }
        catch (e) {
            reject(e);
        }
    })
}