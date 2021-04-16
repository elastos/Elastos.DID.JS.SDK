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

import { List as ImmutableList } from "immutable";
import { CredentialMetadata } from "./credentialmetadata";
import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDMetadata } from "./didmetadata";
import { DIDStorage, ReEncryptor } from "./didstorage";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { DIDStorageException, DIDStoreException } from "./exceptions/exceptions";
import { JSONObject } from "./json";
import { Logger } from "./logger";
import { RootIdentity } from "./rootidentity";
import { VerifiableCredential } from "./verifiablecredential";

// Root prefix to distinguish this file's storage from other data in local storage.
const FILESYSTEM_LOCAL_STORAGE_PREFIX = "DID_FS_STORAGE";

const log = new Logger("FileSystemStorage");

type StorageEntry = {
	type: "file" | "dir";
}

/**
 * Structure representing a file entity, while stored in the local storage object.
 */
type FileEntry = StorageEntry & {
	data: string;
}

/**
 * Structure representing a folder entity, while stored in the local storage object.
 */
type DirEntry = StorageEntry & {
	files: string[]; // List of file names that belong to this virtual folder.
}

/**
 * Internal class mimicing Java File class in order to reduce the divergence with Java implementation
 * for now. NOTE: We could think about a totally different way to store items, and we will also need an
 * abstraction layer to use different storages. But for now, we try to remain as close as the java
 * implementation as we can until this SDK is totally stable.
 */
class File {
	public static SEPARATOR = "/";

	protected constructor(protected path: string) {}

	public static open(path: File | string, subpath?: string): File {
		let fullPath: string;
		if (path instanceof File)
			fullPath = path.getAbsolutePath();
		else
			fullPath = path;

		if (subpath)
			path = path + File.SEPARATOR + subpath;

		return File.createFromPath(fullPath);
	}

	/**
	 * Creates a File of the proper type according to its stored "type" information.
	 */
	private static createFromPath(filePath: string): File {
		let file: File | Dir;
		if (File.isFile(filePath))
			file = new File(filePath);
		else
			file = new Dir(filePath);
		return file;
	}

	public exists(): boolean {
		return localStorage.getItem(File.pathWithPrefix(this.path)) != null;
	}

	public getAbsolutePath(): string {
		return this.path;
	}

	/**
	 * Returns the file name, i.e. the last component part of the path.
	 */
	public getName(): string {
		let fileName = this.path.substring(this.path.lastIndexOf("/"));
		return fileName;
	}

	protected static pathWithPrefix(path: string): string {
		return FILESYSTEM_LOCAL_STORAGE_PREFIX + "_" + path;
	}

	/**
	 * Returns the directory object that contains this file.
	 */
	public getDirectory(): Dir {
		let rootPath = this.path.substring(0, this.path.lastIndexOf("/")-1);
		return new Dir(rootPath);
	}

	public isDirectory(): boolean {
		let storageItem: StorageEntry = JSON.parse(localStorage.getItem(File.pathWithPrefix(this.path)));
		return storageItem.type == "dir";
	}

	public isFile(): boolean {
		let storageItem: StorageEntry = JSON.parse(localStorage.getItem(File.pathWithPrefix(this.path)));
		return storageItem.type == "file";
	}

	public static isFile(file: File | string): boolean {
		if (typeof file === "string")
			file = new File(file);

		return file.isFile();
	}

	public writeText(text: string) {
		// Save the file content
		let fileEntry: FileEntry = {
			type: "file",
			data: text
		};
		localStorage.setItem(File.pathWithPrefix(this.path), JSON.stringify(fileEntry));

		// Make sure the containing directory knows this file
		this.getDirectory().addFile(this);
	}

	public readText(): string {
		let fileEntry: FileEntry = JSON.parse(localStorage.getItem(File.pathWithPrefix(this.path)));
		return fileEntry.data;
	}

	public createNewFile() {
		this.writeText("");
	}

	/**
	 * Creates this directory and all the parent ones, if they are missing.
	 */
	public mkdirs() {
		this.getDirectory().mkdirs();
	}

	/**
	 * Deletes this file from storage.
	 */
	public delete() {
		// Ask the containing folder to forget us
		let parentDir = this.getDirectory();
		parentDir.deleteFile(this);

		// Delete ourselves
		localStorage.removeItem(File.pathWithPrefix(this.getAbsolutePath()));
	}

	protected getStorageEntry<T>(): T {
		return JSON.parse(localStorage.getItem(File.pathWithPrefix(this.path)));
	}

	/**
	 * Modifies item's key in local storage.
	 */
	/* protected */ _changeStorageKeyPrefix(newPrefix: string) {
		let storageEntry = this.getStorageEntry();
		// Delete the previous key, then create a new one with the new path
		localStorage.removeItem(this.getAbsolutePath());

		let newFullPath = newPrefix + File.SEPARATOR + this.getName();
		localStorage.setItem(newFullPath, JSON.stringify(storageEntry));
	}

	public static join(...paths: string[]): string {
		return paths.join(File.SEPARATOR);
	}
}

class Dir extends File {
	/**
	 * Returns the directory object that contains this file.
	 */
	 public getDirectory(): Dir {
		 // TODO: probably buggy
		let rootPath = this.path.substring(0, this.path.lastIndexOf("/")-1);
		return new Dir(rootPath);
	}

	private setStorageEntry(dirEntry: DirEntry) {
		localStorage.setItem(File.pathWithPrefix(this.path), JSON.stringify(dirEntry));
	}

	public writeText(text: string) {
		throw new DIDStorageException("Directories are not writable");
	}

	public readText(): string {
		throw new DIDStorageException("Directories are not redable");
	}

	public createNewFile() {
		throw new DIDStorageException("Directories must be created with mkdir()");
	}

	/**
	 * Lists all files (as File) in this directory.
	 * An optional filter can be used to return only the target files.
	 */
	public listFiles(keepFilter?:(file: File)=>boolean): File[] {
		let dirEntry = this.getStorageEntry<DirEntry>();

		let files: File[] = [];
		dirEntry.files.forEach((fileName)=>{
			let file = File.open(this.getFilePathFromName(fileName));

			if (!keepFilter || (keepFilter && keepFilter(file)))
				files.push(file);
		});

		return files;
	}

	/**
	 * Lists all files (as file name strings) in this directory.
	 */
	public list(): string[] {
		let dirEntry = this.getStorageEntry<DirEntry>();
		return dirEntry.files;
	}

	/**
	 * Creates the directory = saves the entry to storage.
	 */
	public mkdir() {
		let dirEntry = this.getStorageEntry();
		if (!dirEntry) {
			/// If the entry already exists, do nothing. Otherwise, save it
			let dirEntry: DirEntry = {
				type: "dir",
				files: []
			};
			this.setStorageEntry(dirEntry);
		}
	}

	/**
	 * Creates this directory and all the parent ones, if they are missing.
	 */
	public mkdirs() {
		// Make parents
		let parentDir = this.getDirectory();
		if (parentDir) // Stop at the root
			parentDir.mkdirs();

		// Make self
		this.mkdir();
	}

	public renameTo(dir: Dir) {
		if (this.getDirectory().getName() !== dir.getDirectory().getName())
			throw new DIDStorageException("Directories can be renamed only inside the same folder");

		/*
		this = /my , renamed to /my2
		should rename:
		/my -> /my2
		/my/path/file1 -> /my2/path/file1
		/my/path2/file2 -> /my2/path2/file2

		Algo: from the source dir, recursively rename the storage keys of all files and folders to
		become the same one as the destination folder.
		*/
		let newPrefix = dir.getAbsolutePath();
		this._changeStorageKeyPrefix(newPrefix);

		// Tell the parent to modify our name.
		this.getDirectory().renameFile(this.getName(), dir.getName());
	}

	/**
	 * Renames a child file entry, not recursively.
	 */
	protected renameFile(oldName: string, newName: string) {
		let storageEntry = this.getStorageEntry<DirEntry>();
		storageEntry.files.splice(storageEntry.files.indexOf(oldName), 1);
		storageEntry.files.push(newName);
		this.setStorageEntry(storageEntry);
	}

	/* protected */ _changeStorageKeyPrefix(newPrefix: string) {
		// Recursively change storage key for children
		let storageEntry = this.getStorageEntry<DirEntry>();
		let newChildrenPrefix = newPrefix + File.SEPARATOR + this.getName();
		storageEntry.files.forEach((fileName)=>{
			let file = File.open(this.getFilePathFromName(fileName));
			file._changeStorageKeyPrefix(newChildrenPrefix);
		});

		// Change for self
		super._changeStorageKeyPrefix(newPrefix);
	}

	/**
	 * Returns the full path for the given file name (or folder name) in this folder.
	 */
	private getFilePathFromName(fileName: string): string {
		return this.getAbsolutePath()+File.SEPARATOR+fileName;
	}

	/**
	 * Adds a file from this folder, meaning that we add the file to the folder files list.
	 */
	 public addFile(file: File) {
		// Add to the directory listing
		let dirEntry = this.getStorageEntry<DirEntry>();
		dirEntry.files.push(file.getName());
		this.setStorageEntry(dirEntry);
	}

	/**
	 * Removes a file from this folder, meaning that we remove the file from the folder files list.
	 */
	public deleteFile(file: File) {
		// Delete from the directory listing
		let dirEntry = this.getStorageEntry<DirEntry>();
		dirEntry.files = dirEntry.files.filter((name)=>file.getName() !== name);
		this.setStorageEntry(dirEntry);
	}

	/**
	 * Recursively deletes this directory and all sub directories and folders.
	 */
	 public delete() {
		// Recursive deletion
		let dirEntry = this.getStorageEntry<DirEntry>();
		dirEntry.files.forEach((fileName)=>{
			new File(this.getFilePathFromName(fileName)).delete();
		});

		// Delete the directory entry itself
		localStorage.removeItem(File.pathWithPrefix(this.getAbsolutePath()));
	}
}

/*
 * FileSystem DID Store: storage layout
 *
 *  + DIDStore root
 *    + data 						    [Current data root folder]
 *      - .metadata						[DIDStore metadata]
 *      + roots							[Root identities folder]
 *        + xxxxxxx0					[Root identity folder named by id]
 *          - .metadata					[RootIdentity metadata]
 *          - mnemonic					[Encrypted mnemonic file, OPTIONAL]
 *          - private					[Encrypted root private key file]
 *          - public					[Pre-derived public key file]
 *          - index						[Last derive index]
 *        + ...
 *        + xxxxxxxN
 *      + ids							[DIDs folder]
 *        + ixxxxxxxxxxxxxxx0 			[DID root, named by id specific string]
 *          - .metadata					[Meta for DID, json format, OPTIONAL]
 *          - document					[DID document, json format]
 *          + credentials				[Credentials root, OPTIONAL]
 *            + credential-id-0         [Credential root, named by id' fragment]
 *              - .metadata				[Meta for credential, json format, OPTONAL]
 *              - credential			[Credential, json format]
 *            + ...
 *            + credential-id-N
 *          + privatekeys				[Private keys root, OPTIONAL]
 *            - privatekey-id-0			[Encrypted private key, named by pk' id]
 *            - ...
 *            - privatekey-id-N
 *        + ...
 *        + ixxxxxxxxxxxxxxxN
 */
class FileSystemStorage implements DIDStorage {
	private static DATA_DIR = "data";

	private static ROOT_IDENTITIES_DIR = "roots";

	private static ROOT_IDENTITY_MNEMONIC_FILE = "mnemonic";
	private static ROOT_IDENTITY_PRIVATEKEY_FILE = "private";
	private static ROOT_IDENTITY_PUBLICKEY_FILE = "public";
	private static ROOT_IDENTITY_INDEX_FILE = "index";

	private static DID_DIR = "ids";
	private static DOCUMENT_FILE = "document";

	private static CREDENTIALS_DIR = "credentials";
	private static CREDENTIAL_FILE = "credential";

	private static PRIVATEKEYS_DIR = "privatekeys";

	private static METADATA = ".metadata";

	private static JOURNAL_SUFFIX = ".journal";

	private storeRoot: Dir;
	private currentDataDir: string;

	protected constructor(context: string) {
		this.storeRoot = Dir.open(File.SEPARATOR+context+File.SEPARATOR) as Dir;
		this.currentDataDir = FileSystemStorage.DATA_DIR;

		if (this.storeRoot.exists())
			this.checkStore();
		else
			this.initializeStore();
	}

	private initializeStore() {
		try {
			log.debug("Initializing DID store at {}", this.storeRoot.getAbsolutePath());

			this.storeRoot.mkdirs();

			let metadata = new DIDStore.Metadata();

			let  file = this.getFile(true, this.currentDataDir, FileSystemStorage.METADATA);
			file.writeText(metadata.serialize());
		} catch (e) {
			// IOException
			log.error("Initialize DID store error", e);
			throw new DIDStorageException("Initialize DIDStore \""+ this.storeRoot.getAbsolutePath() + "\" error.", e);
		}
	}

	private checkStore() {
		log.debug("Checking DID store at {}", this.storeRoot.getAbsolutePath());

		if (this.storeRoot.isFile()) {
			log.error("Path {} not a directory", this.storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \""
					+ this.storeRoot.getAbsolutePath() + "\".");
		}

		this.postOperations();

		let file: Dir = this.getDir(this.currentDataDir);
		if (!file.isDirectory()) {
			log.error("Path {} is not a DID store, missing data directory", this.storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \""
					+ this.storeRoot.getAbsolutePath() + "\".");
		}

		let metadataFile = this.getFile(false, this.currentDataDir, FileSystemStorage.METADATA);
		if (!metadataFile.exists() || !metadataFile.isFile()) {
			log.error("Path {} not a DID store, missing store metadata", this.storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \"" + this.storeRoot.getAbsolutePath() + "\".");
		}

		try {
			let metadata = DIDStore.Metadata.parse(metadataFile, DIDStore.Metadata.class);

			if (!metadata.getType().equals(DIDStore.DID_STORE_TYPE))
				throw new DIDStorageException("Unknown DIDStore type");

			if (metadata.getVersion() != DIDStore.DID_STORE_VERSION)
				throw new DIDStorageException("Unsupported DIDStore version");
		} catch (e) {
			// DIDSyntaxException | IOException
			log.error("Check DID store error, failed load store metadata", e);
			throw new DIDStorageException("Can not check the store metadata", e);
		}
	}

	private static toPath(id: DIDURL): string {
		let path = id.toString(id.getDid());
		return path.replace(';', '.').replace('/', '_').replace('?', '-');
	}

	private static toDIDURL(did: DID, path: string): DIDURL {
		path = path.replace('.', ';').replace('_', '/').replace('-', '?');
		return DIDURL.valueOf(did, path);
	}

	private static copyFile(src: File, dest: File) {
		// Copy content
		dest.writeText(src.readText());
	}

	/**
	 * Gets a File object instance for the given path.
	 * In "creation" mode:
	 * - If the file already exists, it is overwritten (deleted)
	 * - Intermediate folders are created if missing
	 */
	private getFile(create: boolean, ...path: string[]): File {
		let file: File = null;

		let relPath = this.storeRoot.getAbsolutePath();
		let lastIndex = path.length - 1;
		for (let i = 0; i <= lastIndex; i++) {
			relPath += File.SEPARATOR;
			relPath += path[i];

			if (create) {
				if (i < lastIndex) {
					// Directory
					let dir = Dir.open(relPath.toString());
					if (dir.exists())
						dir.delete();
				}
				else {
					// File
					file = File.open(relPath.toString());
					if (file.exists())
						file.delete();
				}
			}
		}

		file = File.open(relPath.toString());
		if (create)
			file.getDirectory().mkdirs();

		return file;
	}

	private getDir(...paths: string[]): Dir {
		let relPath = this.storeRoot.getAbsolutePath() + File.SEPARATOR + paths.join(File.SEPARATOR);
		return Dir.open(relPath);
	}

	public getLocation(): string {
		return this.storeRoot.toString();
	}

	public storeMetadata(metadata: DIDStore.Metadata) {
		try {
			let file = this.getFile(true, this.currentDataDir, FileSystemStorage.METADATA);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				file.writeText(metadata.serialize());
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store DIDStore metadata error", e);
		}
	}

	public loadMetadata(): DIDStore.Metadata {
		try {
			let file = this.getFile(false, this.currentDataDir, FileSystemStorage.METADATA);
			let metadata: DIDStore.Metadata = null;
			if (file.exists())
				metadata = DIDStore.Metadata.parse(file, DIDStore.Metadata.class);

			return metadata;
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDStorageException("Load DIDStore metadata error", e);
		}
	}

	private getRootIdentityFile(id: string, file: string, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR, id, file);
	}

	private getRootIdentityDir(id: string): Dir {
		return this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR, id);
	}

	public storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata) {
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.METADATA, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				file.writeText(metadata.serialize());
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store root identity metadata error: " + id, e);
		}
	}

	public loadRootIdentityMetadata(id: string): RootIdentity.Metadata {
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.METADATA, false);
			let metadata: RootIdentity.Metadata = null;
			if (file.exists())
				metadata = RootIdentity.Metadata.parse(file, RootIdentity.Metadata.class);

			return metadata;
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDStorageException("Load root identity metadata error: " + id, e);
		}
	}

	public storeRootIdentity(id: string, mnemonic: string, privateKey: string,
			publicKey: string, index: number) {
		try {
			let file: File;

			if (mnemonic != null) {
				file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_MNEMONIC_FILE, true);
				file.writeText(mnemonic);
			}

			if (privateKey != null) {
				file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE, true);
				file.writeText(privateKey);
			}

			if (publicKey != null) {
				file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PUBLICKEY_FILE, true);
				file.writeText(publicKey);
			}

			file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, true);
			file.writeText(index.toFixed());
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store root identity error: " + id, e);
		}
	}

	public loadRootIdentity(id: string): RootIdentity {
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PUBLICKEY_FILE, false);
			if (!file.exists())
				return null;

			let publicKey = file.readText();
			file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, false);
			let index = Number.parseInt(file.readText());

			return RootIdentity.createFromPreDerivedPublicKey(publicKey, index);
		} catch (e) {
			// IOException
			throw new DIDStorageException("Load public key for identity error: " + id, e);
		}
	}

	public updateRootIdentityIndex(id: string, index: number) {
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, false);
			file.writeText(""+index);
		} catch (e) {
			// IOException
			throw new DIDStorageException("Update index for indentiy error: " + id, e);
		}
	}

	public loadRootIdentityPrivateKey(id: string): string {
		// TODO: support multiple named identity
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE, false);
			if (!file.exists())
				return null;

			return file.readText();
		} catch (e) {
			// IOException
			throw new DIDStorageException("Load private key for identity error: " + id, e);
		}
	}

	public deleteRootIdentity(id: string): boolean {
		let dir = this.getRootIdentityDir(id);
		if (dir.exists()) {
			dir.delete();
			return true;
		} else {
			return false;
		}
	}

	public listRootIdentities(): RootIdentity[] {
		let dir = this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR);

		if (!dir.exists())
			return [];

		let children = dir.listFiles((file) => {
			return file.isDirectory();
		});

		if (children == null || children.length == 0)
			return [];

		let ids: RootIdentity[] = [];
		for (let id of children) {
			let identity = this.loadRootIdentity(id.getName());
			ids.push(identity);
		}

		return ids;
	}

	public containsRootIdenities(): boolean {
		let dir = this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR);
		if (!dir.exists())
			return false;

		let children = dir.listFiles((file) => {
			return file.isDirectory();
		});

		return (children != null && children.length > 0);
	}

	public loadRootIdentityMnemonic(id: string): string {
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_MNEMONIC_FILE, false);
			return file.readText();
		} catch (e) {
			// IOException
			throw new DIDStorageException("Load mnemonic for identity error: " + id, e);
		}
	}

	private getDidFile(did: DID, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.DOCUMENT_FILE);
	}

	private getDidMetadataFile(did: DID, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.METADATA);
	}

	private getDidDir(did: DID): File {
		return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId());
	}

	public storeDidMetadata(did: DID, metadata: DIDMetadata) {
		try {
			let file = this.getDidMetadataFile(did, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				file.writeText(metadata.serialize());
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store DID metadata error: " + did, e);
		}
	}

	public loadDidMetadata(did: DID): DIDMetadata {
		try {
			let file = this.getDidMetadataFile(did, false);
			let metadata: DIDMetadata = null;
			if (file.exists())
				metadata = DIDMetadata.parse(file, DIDMetadata.class);

			return metadata;
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDStorageException("Load DID metadata error: " + did, e);
		}
	}

	public storeDid(doc: DIDDocument) {
		try {
			let file = this.getDidFile(doc.getSubject(), true);
			file.writeText(doc.serialize(true));
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store DID document error: " + doc.getSubject(), e);
		}
	}

	public loadDid(did: DID): DIDDocument {
		try {
			let file = this.getDidFile(did, false);
			if (!file.exists())
				return null;

			return DIDDocument.parse(file);
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDStorageException("Load DID document error: " + did, e);
		}
	}

	public deleteDid(did: DID): boolean {
		let dir = this.getDidDir(did);
		if (dir.exists()) {
			dir.delete();
			return true;
		} else {
			return false;
		}
	}

	public listDids(): DID[] {
		let dir = this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR);
		if (!dir.exists())
			return [];

		let children = dir.listFiles((file) => {
			return file.isDirectory();
		});

		if (children == null || children.length == 0)
			return [];

		let dids: DID[] = [];
		for (let didRoot of children) {
			let did = new DID(DID.METHOD, didRoot.getName());
			dids.push(did);
		}

		return dids;
	}

	private getCredentialFile(id: DIDURL, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
				FileSystemStorage.CREDENTIALS_DIR, FileSystemStorage.toPath(id), FileSystemStorage.CREDENTIAL_FILE);
	}

	private getCredentialMetadataFile(id: DIDURL, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
				FileSystemStorage.CREDENTIALS_DIR, FileSystemStorage.toPath(id), FileSystemStorage.METADATA);
	}

	private getCredentialDir(id: DIDURL): Dir {
		return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
				FileSystemStorage.CREDENTIALS_DIR, FileSystemStorage.toPath(id));
	}

	private getCredentialsDir(did: DID): Dir {
		return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.CREDENTIALS_DIR);
	}

	public storeCredentialMetadata(id: DIDURL, metadata: CredentialMetadata) {
		try {
			let file = this.getCredentialMetadataFile(id, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				file.writeText(metadata.serialize());
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store credential metadata error: " + id, e);
		}
	}

	public loadCredentialMetadata(id: DIDURL): CredentialMetadata {
		try {
			let file = this.getCredentialMetadataFile(id, false);
			if (!file.exists())
				return null;

			return CredentialMetadata.parse(file, CredentialMetadata.class);
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDStorageException("Load credential metadata error: " + id, e);
		}
	}

	public storeCredential(credential: VerifiableCredential) {
		try {
			let file = this.getCredentialFile(credential.getId(), true);
			file.writeText(credential.serialize(true));
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store credential error: " + credential.getId(), e);
		}
	}

	public  loadCredential(id: DIDURL): VerifiableCredential {
		try {
			let file = this.getCredentialFile(id, false);
			if (!file.exists())
				return null;

			return VerifiableCredential.parse(file);
		} catch (e) {
			// DIDSyntaxException | IOException
			throw new DIDStorageException("Load credential error: " + id, e);
		}
	}

	public containsCredentials(did: DID): boolean {
		let dir = this.getCredentialsDir(did);
		if (!dir.exists())
			return false;

		let creds = dir.listFiles((file) => {
			return file.isDirectory();
		});

		return creds == null ? false : creds.length > 0;
	}

	public deleteCredential(id: DIDURL): boolean {
		let dir = this.getCredentialDir(id);
		if (dir.exists()) {
			dir.delete();

			// Remove the credentials directory is no credential exists.
			dir = this.getCredentialsDir(id.getDid());
			if (dir.list().length == 0)
				dir.delete();

			return true;
		} else {
			return false;
		}
	}

	public listCredentials(did: DID): DIDURL[] {
		let dir = this.getCredentialsDir(did);
		if (!dir.exists())
			return [];

		let children = dir.listFiles((file) => {
			return file.isDirectory();
		});

		if (children == null || children.length == 0)
			return [];

		let credentials: DIDURL[] = [];
		for (let credential of children)
			credentials.push(FileSystemStorage.toDIDURL(did, credential.getName()));

		return credentials;
	}

	private getPrivateKeyFile(id: DIDURL, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
				FileSystemStorage.PRIVATEKEYS_DIR, FileSystemStorage.toPath(id));
	}

	private getPrivateKeysDir(did: DID): Dir {
		return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.PRIVATEKEYS_DIR);
	}

	public storePrivateKey(id: DIDURL, privateKey: string) {
		try {
			let file = this.getPrivateKeyFile(id, true);
			file.writeText(privateKey);
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store private key error: " + id, e);
		}
	}

	public loadPrivateKey(id: DIDURL): string {
		try {
			let file = this.getPrivateKeyFile(id, false);
			if (!file.exists())
				return null;

			return file.readText();
		} catch (e) {
			throw new DIDStorageException("Load private key error: " + id, e);
		}
	}

	public containsPrivateKeys(did: DID): boolean {
		let dir = this.getPrivateKeysDir(did);
		if (!dir.exists())
			return false;

		let keys = dir.listFiles((file) => {
			return file.isFile();
		});

		return keys == null ? false : keys.length > 0;
	}

	public deletePrivateKey(id: DIDURL): boolean {
		let file = this.getPrivateKeyFile(id, false);
		if (file.exists()) {
			file.delete();

			// Remove the privatekeys directory is no privatekey exists.
			let dir = this.getPrivateKeysDir(id.getDid());
			if (dir.list().length == 0)
				dir.delete();

			return true;
		} else {
			return false;
		}
	}

	public listPrivateKeys(did: DID): DIDURL[] {
		let dir = this.getPrivateKeysDir(did);
		if (!dir.exists())
			return [];

		let keys = dir.listFiles((file) => {
			return file.isFile();
		});

		if (keys == null || keys.length == 0)
			return [];

		let sks: DIDURL[] = [];
		for (let key of keys)
			sks.push(FileSystemStorage.toDIDURL(did, key.getName()));

		return sks;
	}

	private needReencrypt(file: File): boolean {
		let patterns: string[] = [
				// Root identity's private key
				"(.+)\\" + File.SEPARATOR + FileSystemStorage.DATA_DIR + "\\" + File.SEPARATOR +
				FileSystemStorage.ROOT_IDENTITIES_DIR + "\\" + File.SEPARATOR + "(.+)\\" +
				File.SEPARATOR + FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE,
				// Root identity's mnemonic
				"(.+)\\" + File.SEPARATOR + FileSystemStorage.DATA_DIR + "\\" + File.SEPARATOR +
				FileSystemStorage.ROOT_IDENTITIES_DIR + "\\" + File.SEPARATOR + "(.+)\\" +
				File.SEPARATOR + FileSystemStorage.ROOT_IDENTITY_MNEMONIC_FILE,
				// DID's private keys
				"(.+)\\" + File.SEPARATOR + FileSystemStorage.DATA_DIR + "\\" + File.SEPARATOR +
				FileSystemStorage.DID_DIR + "\\" + File.SEPARATOR + "(.+)\\" + File.SEPARATOR +
				FileSystemStorage.PRIVATEKEYS_DIR + "\\" + File.SEPARATOR + "(.+)"
		];

		let path = file.getAbsolutePath();
		for (let pattern of patterns) {
			if (path.match(pattern))
				return true;
		}

		return false;
	}

	private copy(src: File, dest: File, reEncryptor: ReEncryptor) {
		if (src.isDirectory()) {
			let dir = src as Dir;
			if (!dest.exists()) {
				dest.mkdirs();
			}

			let files = dir.list();
			for (let file of files) {
				let srcFile = File.open(dir, file);
				let destFile = File.open(dest, file);
				this.copy(srcFile, destFile, reEncryptor);
			}
		} else {
			if (this.needReencrypt(src)) {
				let text = src.readText();
				dest.writeText(reEncryptor.reEncrypt(text));
			} else {
			    FileSystemStorage.copyFile(src, dest);
			}
		}
	}

	private postChangePassword() {
		let dataDir = this.getDir(FileSystemStorage.DATA_DIR);
		let dataJournal = this.getDir(FileSystemStorage.DATA_DIR + FileSystemStorage.JOURNAL_SUFFIX);

		let timestamp = new Date().getTime() / 1000;
		let dataDeprecated = this.getDir(FileSystemStorage.DATA_DIR + "_" + timestamp);

		let stageFile = this.getFile(false, "postChangePassword");

		if (stageFile.exists()) {
			if (dataJournal.exists()) {
				if (dataDir.exists())
					dataDir.renameTo(dataDeprecated);

				dataJournal.renameTo(dataDir);
			}

			stageFile.delete();
		} else {
			if (dataJournal.exists())
				dataJournal.delete();
		}
	}

	public changePassword(reEncryptor: ReEncryptor) {
		try {
			let dataDir = this.getDir(FileSystemStorage.DATA_DIR);
			let dataJournal = this.getDir(FileSystemStorage.DATA_DIR + FileSystemStorage.JOURNAL_SUFFIX);

			this.copy(dataDir, dataJournal, reEncryptor);

			let stageFile = this.getFile(true, "postChangePassword");
			stageFile.createNewFile();
		} catch (e) {
			// DIDStoreException | IOException
			throw new DIDStorageException("Change store password failed.");
		} finally {
			this.postChangePassword();
		}
	}

	private postOperations() {
		let stageFile = this.getFile(false, "postChangePassword");
		if (stageFile.exists()) {
			this.postChangePassword();
			return;
		}
	}
}
