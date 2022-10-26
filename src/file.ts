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

    private readonly fullPath: string;
    private fileStats?: fs.Stats;

    public constructor(path: File | string, subpath?: string) {
        let fullPath: string = path instanceof File ? path.getAbsolutePath() : path as string;

        if (subpath)
            fullPath += (File.SEPARATOR + subpath);

        if (!fullPath.startsWith("/") && !fullPath.startsWith("./") && fullPath[1] !== ':')
            fullPath = "./" + fullPath;

        this.fullPath = fullPath;
    }

    public static async exists(file: File | string): Promise<boolean> {
        if (typeof file === "string")
            file = new File(file);

        return await file.exists();
    }

    public static async isFile(file: File | string): Promise<boolean> {
        if (typeof file === "string")
            file = new File(file);

        return await file.isFile();
    }

    public static async isDirectory(file: File | string): Promise<boolean> {
        if (typeof file === "string")
            file = new File(file);

        return await file.isDirectory();
    }

    private async getStats(): Promise<fs.Stats> {
        if (this.fileStats)
            return this.fileStats;
        return await this.exists() ? await fs.statSync(this.fullPath) : null;
    }

    public async exists(): Promise<boolean> {
        return await fs.existsSync(this.fullPath);
    }

    // Entry size in bytes
    public async length(): Promise<number> {
        return await this.exists() ? (await this.getStats()).size : 0;
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

    public async isDirectory(): Promise<boolean> {
        return await this.exists() ? (await this.getStats()).isDirectory() : false;
    }

    public async isFile(): Promise<boolean> {
        return await this.exists() ? (await this.getStats()).isFile() : false;
    }

    /**
     * Lists all file names in this directory.
     */
    public async list(): Promise<string[]> {
        return await this.exists() && (await this.getStats()).isDirectory() ? await fs.readdirSync(this.fullPath) : null;
    }

    /**
     * Lists all files (as File) in this directory.
     */
    public async listFiles(): Promise<File[]> {
        if (!(await this.exists()) || !(await this.getStats()).isDirectory()) {
            return null;
        }
        let files: File[] = [];
        (await this.list()).forEach((fileName)=>{
            files.push(new File(this.getAbsolutePath()+"/"+fileName));
        });

        return files;
    }

    public async writeText(content: string): Promise<void> {
        if (!(await this.exists()) || (await this.getStats()).isFile()) {
            await fs.writeFileSync(this.fullPath, content, { encoding: "utf-8" });
        }
    }

    public async readText(): Promise<string> {
        return await this.exists() ? await fs.readFileSync(this.fullPath, { encoding: "utf-8" }) : null;
    }

    public async rename(newName: string): Promise<void> {
        if (await this.exists()) {
            let targetName = this.fullPath.includes(File.SEPARATOR) && !newName.includes(File.SEPARATOR) ? this.getParentDirectoryName + File.SEPARATOR + newName : newName;
            await fs.renameSync(this.fullPath, targetName);
        }
    }

    public async createFile(overwrite?: boolean): Promise<void> {
        let replace = overwrite ? overwrite : false;
        if (!(await this.exists()) || replace) {
            await fs.writeFileSync(this.fullPath, "", { encoding: "utf-8" });
            this.fileStats = undefined;
        }
    }

    public async createDirectory(overwrite?: boolean): Promise<void> {
        let replace = overwrite ? overwrite : false;
        if (!(await this.exists()) || replace) {
            //mkdirSync(this.fullPath, { "recursive": true });
            await this.mkdirpath(this.fullPath);
            this.fileStats = undefined;
        }
    }

    /**
     * Internal reimplementation of mkdir because even if nodejs now has a "recursive" option,
     * browserfs localstorage driver doesn't.
     */
    private async mkdirpath(dirPath: string): Promise<void>
    {
        if(!(await fs.existsSync(dirPath))){
            try
            {
                await fs.mkdirSync(dirPath);
            }
            catch(e)
            {
                let dirname = path.dirname(dirPath);
                if (dirname !== dirPath) {
                    await this.mkdirpath(dirname);
                    await this.mkdirpath(dirPath);
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
    public async delete(): Promise<void> {
        if (await this.exists()) {
            if (await this.isDirectory())
                await this.deleteDirectory(this.fullPath);
            else
                await fs.unlinkSync(this.fullPath);
            this.fileStats = undefined;
        }
    }

    /**
     * Internal reimplementation of rmdir because even if nodejs now has a "resursive" option,
     * browserfs localstorage driver doesn't.
     */
    private async deleteDirectory(directoryPath: string): Promise<void> {
        if (await fs.existsSync(directoryPath)) {
            for (const file of await fs.readdirSync(directoryPath)) {
                const curPath = path.join(directoryPath, file);
                if ((await fs.lstatSync(curPath)).isDirectory()) {
                    // recurse
                    await this.deleteDirectory(curPath);
                } else {
                    // delete file
                    await fs.unlinkSync(curPath);
                }
            }
            await fs.rmdirSync(directoryPath);
        }
    }

    public toString() {
        return this.fullPath;
    }
}
