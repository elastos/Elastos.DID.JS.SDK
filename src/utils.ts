import { BASE64 } from "./crypto/base64";
import { SHA256 } from "./crypto/sha256";
import { IllegalArgumentException } from "./exceptions/exceptions";

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
        return this === true ? 1231 : 1237;
    }
    throw new IllegalArgumentException("Unsupported type " + typeof input);
}

export function base64Decode(input: string): string {
    return BASE64.fromString(input);
}

export function sha256(input: string): string {
    return SHA256.encodeToString(Buffer.from(input, "utf-8"));
}

/**
 * Convenient method to return a Promise that returns a type and handles exceptions with rejections.
 */
export function promisify<T>(exec: (reject?: (e)=>void)=>T): Promise<T> {
    return new Promise((resolve, reject)=>{
        try {
            let result: T = exec((e)=>{
                reject(e);
            });
            resolve(result);
        }
        catch (e) {
            reject (e);
        }
    })
}

/**
 * Tells whether this library is running in the browser or in a nodejs env.
 */
export function runningInBrowser(): boolean {
    return process === undefined || (process.platform as string) === "browser";
}