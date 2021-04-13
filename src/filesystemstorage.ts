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
import { DIDStorage } from "./didstorage";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { DIDStorageException, DIDStoreException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { RootIdentity } from "./rootidentity";
import { VerifiableCredential } from "./verifiablecredential";

// Root prefix to distinguish this file's storage from other data in local storage.
const FILESYSTEM_LOCAL_STORAGE_PREFIX = "DID_FS_STORAGE";

const log = new Logger("FileSystemStorage");

/**
 * Internal class mimicing Java File class in order to reduce the divergence with Java implementation
 * for now.
 */
class File {
	public static SEPARATOR = "/";

	constructor(private path: string) {}

	public exists(): boolean {
		return localStorage.getItem(File.pathWithPrefix(this.path)) != null;
	}

	public getAbsolutePath(): string {
		return this.path;
	}

	public isDirectory(): boolean {
		return false;
	}

	public isFile(): boolean {
		return true;
	}

	public writeText(text: string) {
		localStorage.setItem(File.pathWithPrefix(this.path), text);
	}

	public readText(): string {
		return localStorage.getItem(File.pathWithPrefix(this.path));
	}

	private static pathWithPrefix(path: string): string {
		return FILESYSTEM_LOCAL_STORAGE_PREFIX + "_" + path;
	}

	public static join(...paths: string[]): string {
		return paths.join(File.SEPARATOR);
	}
}

class Dir extends File {
	public isDirectory(): boolean {
		return true;
	}

	public isFile(): boolean {
		return false;
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

	private storeRoot: File;
	private currentDataDir: string;

	protected constructor(dir: File) {
		this.storeRoot = dir;
		this.currentDataDir = FileSystemStorage.DATA_DIR;

		if (this.storeRoot.exists())
			this.checkStore();
		else
			this.initializeStore();
	}

	private initializeStore() {
		try {
			log.debug("Initializing DID store at {}", this.storeRoot.getAbsolutePath());

			// Java: this.storeRoot.mkdirs();

			let metadata = new DIDStore.Metadata();

			let  file = this.getFile(true, this.currentDataDir, FileSystemStorage.METADATA);
			metadata.serialize(file);
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
		if (!file.exists()) {
			let oldMetadata = this.getFile(".meta");
			if (oldMetadata.exists()) {
				if (oldMetadata.isFile()) {

TODO: if metadata file not exist or parse error then throw the exception




					upgradeFromV2();
				} else {
					log.error("Path {} not a DID store", this.storeRoot.getAbsolutePath());
					throw new DIDStorageException("Invalid DIDStore \"" + this.storeRoot.getAbsolutePath() + "\".");
				}
			} else {
				let files: string[] = this.storeRoot.list();
				if (files == null || files.length == 0) {
					// if an empty folder
					this.initializeStore();
					return;
				} else {
					log.error("Path {} not a DID store", this.storeRoot.getAbsolutePath());
					throw new DIDStorageException("Invalid DIDStore \"" + this.storeRoot.getAbsolutePath() + "\".");
				}
			}
		}

		if (!file.isDirectory()) {
			log.error("Path {} not a DID store, missing data directory",
				this.storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \""
					+ this.storeRoot.getAbsolutePath() + "\".");
		}

		file = this.getFile(false, this.currentDataDir, FileSystemStorage.METADATA);
		if (!file.exists() || !file.isFile()) {
			log.error("Path {} not a DID store, missing store metadata", this.storeRoot.getAbsolutePath());
			throw new DIDStorageException("Invalid DIDStore \"" + this.storeRoot.getAbsolutePath() + "\".");
		}

		try {
			let metadata = DIDStore.Metadata.parse(file, DIDStore.Metadata.class);

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

	/* private static void deleteFile(File file) {
		if (file.isDirectory()) {
			File[] children = file.listFiles();
			for (File child : children)
				deleteFile(child);
		}

		file.delete();
	} */

	/* private static void copyFile(File src, File dest) throws IOException {
	    FileInputStream in = null;
	    FileOutputStream out = null;
	    try {
	        in = new FileInputStream(src);
	        out = new FileOutputStream(dest);
	        out.getChannel().transferFrom(in.getChannel(), 0,
	        		in.getChannel().size());
		} finally {
			if (in != null)
				in.close();

			if (out != null)
				out.close();
		}
	} */

	private File getFile(boolean create, String ... path) {
		StringBuffer relPath = new StringBuffer(256);
		File file;

		relPath.append(storeRoot.getAbsolutePath());
		int lastIndex = path.length - 1;
		for (int i = 0; i <= lastIndex; i++) {
			relPath.append(File.separator);
			relPath.append(path[i]);

			if (create) {
				boolean isDir = (i < lastIndex);

				file = new File(relPath.toString());
				if (file.exists() && file.isDirectory() != isDir)
					deleteFile(file);
			}
		}

		file = new File(relPath.toString());
		if (create)
			file.getParentFile().mkdirs();

		return file;
	}

	private getDir(...paths: string[]): File {
		let relPath = this.storeRoot.getAbsolutePath() + File.SEPARATOR + paths.join(File.SEPARATOR);
		return new File(relPath);
	}

	public getLocation(): string {
		return this.storeRoot.toString();
	}

	public storeMetadata(metadata: DIDStore.Metadata) {
		try {
			let file = this.getFile(true, this.currentDataDir, METADATA);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
		} catch (IOException e) {
			throw new DIDStorageException("Store DIDStore metadata error", e);
		}
	}

	public loadMetadata(): DIDStore.Metadata {
		try {
			let file = this.getFile(this.currentDataDir, METADATA);
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

	private getRootIdentityDir(id: string): File {
		return this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR, id);
	}

	public storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata) {
		try {
			let file = this.getRootIdentityFile(id, METADATA, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
		} catch (e) {
			// IOException
			throw new DIDStorageException("Store root identity metadata error: " + id, e);
		}
	}

	public loadRootIdentityMetadata(id: string): RootIdentity.Metadata {
		try {
			let file = this.getRootIdentityFile(id, METADATA, false);
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
			int index = Integer.valueOf(file.readText());

			return RootIdentity.create(publicKey, index);
		} catch (e) {
			// IOException
			throw new DIDStorageException("Load public key for identity error: " + id, e);
		}
	}

	public updateRootIdentityIndex(id: string, index: number) {
		try {
			let file = this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, false);
			file.writeText(Integer.toString(index));
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
			deleteFile(dir);
			return true;
		} else {
			return false;
		}
	}

	public listRootIdentities(): RootIdentity[] {
		let dir = this.getDir(currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR);

		if (!dir.exists())
			return [];

		let children = dir.listFiles((file) -> {
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

		let children = dir.listFiles((file) -> {
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
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), METADATA);
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
				metadata.serialize(file);
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
			doc.serialize(file, true);
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
			deleteFile(dir);
			return true;
		} else {
			return false;
		}
	}

	public listDids(): DID[] {
		let dir = this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR);
		if (!dir.exists())
			return [];

		let children = dir.listFiles((file) -> {
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
				FileSystemStorage.CREDENTIALS_DIR, this.toPath(id), FileSystemStorage.CREDENTIAL_FILE);
	}

	private getCredentialMetadataFile(id: DIDURL, create: boolean): File {
		return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
				FileSystemStorage.CREDENTIALS_DIR, this.toPath(id), METADATA);
	}

	private getCredentialDir(id: DIDURL): File {
		return getDir(this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
				FileSystemStorage.CREDENTIALS_DIR, this.toPath(id));
	}

	private getCredentialsDir(did: DID): File {
		return this.getDir(currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.CREDENTIALS_DIR);
	}

	public storeCredentialMetadata(id: DIDURL, metadata: CredentialMetadata) {
		try {
			let file = this.getCredentialMetadataFile(id, true);

			if (metadata == null || metadata.isEmpty())
				file.delete();
			else
				metadata.serialize(file);
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
			credential.serialize(file, true);
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

		let creds = dir.listFiles((file) -> {
			return file.isDirectory();
		});

		return creds == null ? false : creds.length > 0;
	}

	public deleteCredential(id: DIDURL): boolean {
		let dir = this.getCredentialDir(id);
		if (dir.exists()) {
			deleteFile(dir);

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

		let children = dir.listFiles((file) -> {
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
				FileSystemStorage.PRIVATEKEYS_DIR, this.toPath(id));
	}

	private getPrivateKeysDir(did: DID): File {
		return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.PRIVATEKEYS_DIR);
	}

	public storePrivateKey(id: DIDURL, privateKey: string) {
		try {
			File file = getPrivateKeyFile(id, true);
			writeText(file, privateKey);
		} catch (IOException e) {
			throw new DIDStorageException("Store private key error: " + id, e);
		}
	}

	public loadPrivateKey(id: DIDURL): string {
		try {
			let file = this.getPrivateKeyFile(id, false);
			if (!file.exists())
				return null;

			return readText(file);
		} catch (e) {
			throw new DIDStorageException("Load private key error: " + id, e);
		}
	}

	public containsPrivateKeys(did: DID): boolean {
		let dir = this.getPrivateKeysDir(did);
		if (!dir.exists())
			return false;

		let keys = dir.listFiles((file) -> {
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

		let keys = dir.listFiles((file) -> {
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
				"(.+)\\" + File.separator + DATA_DIR + "\\" + File.separator +
				FileSystemStorage.ROOT_IDENTITIES_DIR + "\\" + File.separator + "(.+)\\" +
				File.separator + FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE,
				// Root identity's mnemonic
				"(.+)\\" + File.separator + DATA_DIR + "\\" + File.separator +
				FileSystemStorage.ROOT_IDENTITIES_DIR + "\\" + File.separator + "(.+)\\" +
				File.separator + FileSystemStorage.ROOT_IDENTITY_MNEMONIC_FILE,
				// DID's private keys
				"(.+)\\" + File.separator + DATA_DIR + "\\" + File.separator +
				FileSystemStorage.DID_DIR + "\\" + File.separator + "(.+)\\" + File.separator +
				FileSystemStorage.PRIVATEKEYS_DIR + "\\" + File.separator + "(.+)"
		];

		let path = file.getAbsolutePath();
		for (let pattern of patterns) {
			if (path.matches(pattern))
				return true;
		}

		return false;
	}

	private copy(src: File, dest: File, reEncryptor: ReEncryptor) {
		if (src.isDirectory()) {
			if (!dest.exists()) {
				dest.mkdir();
			}

			let files = src.list();
			for (let file of files) {
				let srcFile = new File(src, file);
				let destFile = new File(dest, file);
				this.copy(srcFile, destFile, reEncryptor);
			}
		} else {
			if (this.needReencrypt(src)) {
				let text = src.readText();
				dest.writeText(reEncryptor.reEncrypt(text));
			} else {
			    this.copyFile(src, dest);
			}
		}
	}

	private postChangePassword() {
		let dataDir = this.getDir(DATA_DIR);
		let dataJournal = this.getDir(DATA_DIR + FileSystemStorage.JOURNAL_SUFFIX);

		let timestamp = new Date().getTime() / 1000;
		let dataDeprecated = this.getDir(DATA_DIR + "_" + timestamp);

		let stageFile = this.getFile("postChangePassword");

		if (stageFile.exists()) {
			if (dataJournal.exists()) {
				if (dataDir.exists())
					dataDir.renameTo(dataDeprecated);

				dataJournal.renameTo(dataDir);
			}

			stageFile.delete();
		} else {
			if (dataJournal.exists())
				deleteFile(dataJournal);
		}
	}

	public changePassword(reEncryptor: ReEncryptor) {
		try {
			let dataDir = this.getDir(DATA_DIR);
			let dataJournal = this.getDir(DATA_DIR + FileSystemStorage.JOURNAL_SUFFIX);

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
		let stageFile = this.getFile("postChangePassword");
		if (stageFile.exists()) {
			this.postChangePassword();
			return;
		}
	}
}
