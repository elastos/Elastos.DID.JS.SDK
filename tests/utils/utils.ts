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

import { Comparable } from "../../src/comparable";
import { Dir, File } from "../../src/filesystemstorage";

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
			let dir1 = file1 as Dir;
			let dir2 = file2 as Dir;

			let files1 = this.removeIgnoredFiles(dir1.list());
			let files2 = this.removeIgnoredFiles(dir2.list());

			if (files1.length != files2.length)
				return false;

			files1.sort();
			files2.sort();
			if (!Arrays.equals(files1, files2))
				return false;

			let files = files1;
			for (let i = 0; i < files.length; i++) {
				let f1 = File.open(dir1, files[i]);
				let f2 = File.open(dir2, files[i]);

				if (!this.equals(f1, f2))
					return false;
			}

			return true;
		} else {
			if (file1.length() != file2.length())
				return false;

	        return file1.readText() === file2.readText(); // BAD PERF
		}
	}

	public static deleteFile(file: File) {
		if (file.isDirectory()) {
			let dir = file as Dir;
			let children = dir.listFiles();
			for (let child of children)
				child.delete();
		}

		file.delete();
	}

	/*public static void dumpHex(String prompt, byte[] bytes) {
		System.out.print(prompt + "[" + bytes.length + "]: ");
		for (byte b : bytes)
			System.out.print(String.format("%02x", b));
		System.out.println();
	} */
}

