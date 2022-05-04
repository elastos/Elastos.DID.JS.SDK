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

import path from "path";

//import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from "./fs";
import * as fs from "./fs";

/**
 * Internal class mimicing Java File class in order to reduce the divergence with Java implementation
 * for now. NOTE: We could think about a totally different way to store items, and we will also need an
 * abstraction layer to use different storages. But for now, we try to remain as close as the java
 * implementation as we can until this SDK is totally stable.
 */

/**
 * @Internal (tag for docs)
*/
 export class File { // Exported, for test cases only
    public static SEPARATOR = "/";

    private fullPath: string;
    private fileStats?: fs.Stats;

    public constructor(path: File | string, subpath?: string) {
        let fullPath: string = path instanceof File ? path.getAbsolutePath() : path as string;

        if (subpath)
            fullPath += (File.SEPARATOR + subpath);

        if (!fullPath.startsWith("/") && !fullPath.startsWith("./") && fullPath[1] !== ':')
            fullPath = "./" + fullPath;

        this.fullPath = fullPath;
    }

    public static exists(file: File | string): boolean {
        if (typeof file === "string")
            file = new File(file);

        return file.exists();
    }

    public static isFile(file: File | string): boolean {
        if (typeof file === "string")
            file = new File(file);

        return file.isFile();
    }

    public static isDirectory(file: File | string): boolean {
        if (typeof file === "string")
            file = new File(file);

        return file.isDirectory();
    }

    private getStats(): fs.Stats {
        if (this.fileStats)
            return this.fileStats;
        return this.exists() ? fs.statSync(this.fullPath) : null;
    }

    public exists(): boolean {
        return fs.existsSync(this.fullPath);
    }

    // Entry size in bytes
    public length(): number {
        return this.exists() ? this.getStats().size : 0;
    }

    public getAbsolutePath(): string {
        return this.fullPath;
    }

    /**
     * Returns the file name, i.e. the last component part of the path.
     */
    public getName(): string {
        return this.fullPath.includes(File.SEPARATOR) ? this.fullPath.substring(this.fullPath.lastIndexOf(File.SEPARATOR)+1) : this.fullPath;
    }

    /**
     * Returns the directory object that contains this file.
     */
    public getParentDirectory(): File {
        let directoryName = this.getParentDirectoryName();
        if (directoryName) {
            return new File(directoryName);
        }
        return null;
    }

    public getParentDirectoryName(): string {
        if (this.fullPath.includes(File.SEPARATOR))
            return this.fullPath.substring(0, this.fullPath.lastIndexOf(File.SEPARATOR));
        if (this.isDirectory)
            return this.fullPath;
        return "";
    }

    public isDirectory(): boolean {
        return this.exists() ? this.getStats().isDirectory() : false;
    }

    public isFile(): boolean {
        return this.exists() ? this.getStats().isFile() : false;
    }

    /**
     * Lists all file names in this directory.
     */
    public list(): string[] {
        return this.exists() && this.getStats().isDirectory() ? fs.readdirSync(this.fullPath) : null;
    }

    /**
     * Lists all files (as File) in this directory.
     */
    public listFiles(): File[] {
        if (!this.exists() || !this.getStats().isDirectory()) {
            return null;
        }
        let files: File[] = [];
        this.list().forEach((fileName)=>{
            files.push(new File(this.getAbsolutePath()+"/"+fileName));
        });

        return files;
    }

    public writeText(content: string) {
        if (!this.exists() || this.getStats().isFile()) {
            fs.writeFileSync(this.fullPath, content, { encoding: "utf-8" });
        }
    }

    public readText(): string {
        return this.exists() ? fs.readFileSync(this.fullPath, { encoding: "utf-8" }) : null;
        return null;
    }

    public rename(newName: string) {
        if (this.exists()) {
            let targetName = this.fullPath.includes(File.SEPARATOR) && !newName.includes(File.SEPARATOR) ? this.getParentDirectoryName + File.SEPARATOR + newName : newName;
            fs.renameSync(this.fullPath, targetName);
        }
    }

    public createFile(overwrite?: boolean) {
        let replace = overwrite ? overwrite : false;
        if (!this.exists() || replace) {
            fs.writeFileSync(this.fullPath, "", { encoding: "utf-8" });
            this.fileStats = undefined;
        }
    }

    public createDirectory(overwrite?: boolean) {
        let replace = overwrite ? overwrite : false;
        if (!this.exists() || replace) {
            //mkdirSync(this.fullPath, { "recursive": true });
            this.mkdirpath(this.fullPath);
            this.fileStats = undefined;
        }
    }

    /**
     * Internal reimplementation of mkdir because even if nodejs now has a "recursive" option,
     * browserfs localstorage driver doesn't.
     */
    private mkdirpath(dirPath: string)
    {
        if(!fs.existsSync(dirPath)){
            try
            {
                fs.mkdirSync(dirPath);
            }
            catch(e)
            {
                let dirname = path.dirname(dirPath);
                if (dirname !== dirPath) {
                    this.mkdirpath(dirname);
                    this.mkdirpath(dirPath);
                }
                else {
                    // We reached the root path. Folder creation has failed for some reason, so we
                    // throw an error.
                    throw e;
                }
            }
        }
    }

    /**
     * Deletes this file from storage.
     */
    public delete() {
        if (this.exists()) {
            if (this.isDirectory())
                this.deleteDirectory(this.fullPath);
            else
                fs.unlinkSync(this.fullPath);
            this.fileStats = undefined;
        }
    }

    /**
     * Internal reimplementation of rmdir because even if nodejs now has a "resursive" option,
     * browserfs localstorage driver doesn't.
     */
    private deleteDirectory(directoryPath: string) {
        if (fs.existsSync(directoryPath)) {
            fs.readdirSync(directoryPath).forEach((file, index) => {
              const curPath = path.join(directoryPath, file);
              if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                this.deleteDirectory(curPath);
              } else {
                // delete file
                fs.unlinkSync(curPath);
              }
            });
            fs.rmdirSync(directoryPath);
        }
    }

    public toString() {
        return this.fullPath;
    }
}
