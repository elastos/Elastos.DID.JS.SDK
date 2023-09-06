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

import { File } from "@elastosfoundation/did-js-sdk";

/* declare global {
    interface Array<T> {
        remove(obj: T extends Comparable<T>): boolean;
    }
}

Array.prototype.remove = function(obj: Comparable<any>) {
    if (obj.equals === undefined)
        throw new Error("Array remove() can be called only on Comparable objects");

    let foundIndex = this.findIndex(item => item.equals(obj));
    if (foundIndex < 0)
        return false;

    this.splice(foundIndex, 1);
    return true;
};*/

class Arrays {
    public static remove(array: string[], entry: string) {
        let idx = array.indexOf(entry);
        if (idx >= 0)
            array.splice(idx, 1);
    }

    public static equals(array1: string[], array2: string[]): boolean {
        let workArray1 = Array.from(array1);
        let workArray2 = Array.from(array2);

        if (workArray1.length !== workArray2.length)
            return false;

        workArray1.sort();
        workArray2.sort();

        for (let i=0; i<workArray1.length; i++) {
            if (workArray1[i] !== workArray2[i])
                return false;
        }

        return true;
    }
}

export class Utils {
    private static removeIgnoredFiles(names: string[]): string[] {
        let list = Array.from(names);
        Arrays.remove(list, ".DS_Store");
        return list;
    }

    public static equals(file1: File, file2: File): boolean {
        if (file1 == null && file2 == null)
            return true;

        /* if (file1 == null ^ file2 == null)
            return false; */

        /* if (file1.compareTo(file2) == 0) // TODO TS: IF THE FILES HAVE THE SAME NAME WE RETURN TRUE?
            return true; */

        if (file1.exists() !== file2.exists())
            return false;

        if (!file1.exists())
            return true;

        if (file1.isDirectory() !== file2.isDirectory())
            return false;

        if (file1.isDirectory()) {

            let files1 = this.removeIgnoredFiles(file1.list());
            let files2 = this.removeIgnoredFiles(file2.list());

            if (files1.length != files2.length)
                return false;

            files1.sort();
            files2.sort();
            if (!Arrays.equals(files1, files2))
                return false;

            let files = files1;
            for (let i = 0; i < files.length; i++) {
                let f1 = new File(file1, files[i]);
                let f2 = new File(file2, files[i]);

                if (!this.equals(f1, f2))
                    return false;
            }

            return true;
        } else {
            if (file1.length() != file2.length())
                return false;

            return file1.readText() as string === file2.readText() as string; // BAD PERF
        }
    }

    public static deleteFile(file: File) {
        file.delete();
    }

    /*public static void dumpHex(String prompt, byte[] bytes) {
        System.out.print(prompt + "[" + bytes.length + "]: ");
        for (byte b : bytes)
            System.out.print(String.format("%02x", b));
        System.out.println();
    } */
}

export function assertArrayEquals(array1: any[], array2: any[]) {
    let error = new Error("Arrays should be equal");
    if (!array1) {
        if (array2) throw error;
        return;
    }
    if (!array2) {
        if (array1) throw error;
        return;
    }
    checkArgument(array1.length == array2.length, error.message);
    for (let element in array1) {
        checkArgument(array2.includes(element), error.message);
    }
}

export function assertNotNull(obj: any) {
    checkArgument(obj != null, "Should not be null");
}

export function assertNull(obj: any) {
    checkArgument(!obj || obj == null, "Should be null");
}

export function assertTrue(equality: boolean) {
    checkArgument(equality, "Should be true");
}

export function assertEquals(expected: any, value: any) {
    checkArgument(expected == value, "Should be equal");
}

function checkArgument(condition: boolean, errorMessage: string) {
    if (!condition)
        throw new Error(errorMessage);
}

/**
 * Tells whether this library is running in the browser or in a nodejs env.
 */
 export function runningInBrowser(): boolean {
    return process === undefined || (process.platform as string) === "browser" || process.title === "browser";
}