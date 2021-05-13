import { Stats, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from "fs";

/**
 * Internal class mimicing Java File class in order to reduce the divergence with Java implementation
 * for now. NOTE: We could think about a totally different way to store items, and we will also need an
 * abstraction layer to use different storages. But for now, we try to remain as close as the java
 * implementation as we can until this SDK is totally stable.
 */

 import BrowserFS from "browserfs";
 BrowserFS.configure({
	fs: "LocalStorage",
	options: {}
}, function(e) {
	if (e) {
		throw e;
	}
});


 export class File { // Exported, for test cases only
	public static SEPARATOR = "/";

	private fullPath: string;
	private fileStats?: Stats;

	public constructor(path: File | string, subpath?: string) {
		let fullPath: string = path instanceof File ? path.getAbsolutePath() : path as string;

		if (subpath)
			fullPath += (File.SEPARATOR + subpath);

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

	private getStats(): any /* Stats */ {
		if (this.fileStats)
			return this.fileStats;
		return this.exists() ? statSync(this.fullPath) : null;
		return null;
	}

	public exists(): boolean {
		return existsSync(this.fullPath);
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
		return this.fullPath.includes(File.SEPARATOR) ? this.fullPath.substring(this.fullPath.lastIndexOf(File.SEPARATOR)) : this.fullPath;
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
		return this.exists() && this.getStats().isDirectory() ? readdirSync(this.fullPath) : null;
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
			files.push(new File(fileName));
		});

		return files;
	}

	public writeText(content: string) {
		if (!this.exists() || this.getStats().isFile()) {
			writeFileSync(this.fullPath, content, { encoding: "utf-8" });
		}
	}

	public readText(): string {
		return this.exists() ? readFileSync(this.fullPath, { encoding: "utf-8" }) : null;
		return null;
	}

	public rename(newName: string) {
		if (this.exists()) {
			let targetName = this.fullPath.includes(File.SEPARATOR) && !newName.includes(File.SEPARATOR) ? this.getParentDirectoryName + File.SEPARATOR + newName : newName;
			renameSync(this.fullPath, targetName);
			this.fullPath = targetName;
			this.fileStats = undefined;
		}
	}

	public createFile(overwrite?: boolean) {
		let replace = overwrite ? overwrite : false;
		if (!this.exists() || replace) {
			writeFileSync(this.fullPath, "", { encoding: "utf-8" });
			this.fileStats = undefined;
		}
	}

	public createDirectory(overwrite?: boolean) {
		let replace = overwrite ? overwrite : false;
		if (!this.exists() || replace) {
			mkdirSync(this.fullPath, { "recursive": true });
			this.fileStats = undefined;
		}
	}

	/**
	 * Deletes this file from storage.
	 */
	public delete() {
		if (this.exists()) {
			if (this.isDirectory())
				rmdirSync(this.fullPath, /* Java: { recursive: true } */);
			else
				console.error("TODO NOT IMPLEMENTED FROM JAVA - rmSync"); //rmSync(this.fullPath, { recursive: true, force: true });
			this.fileStats = undefined;
		}
	}

	public toString() {
		return this.fullPath;
	}
}
