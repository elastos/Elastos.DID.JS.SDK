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

import { DIDStorageException, WrongPasswordException } from "./exceptions/exceptions";
import type { DIDStorage, ReEncryptor } from "./internals";
import { CredentialMetadata, DID, DIDDocument, DIDMetadata, DIDStoreMetadata, DIDURL, File, RootIdentity, VerifiableCredential } from "./internals";
import { Logger } from "./logger";

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
    size: number; // file size in bytes
}

/**
 * Structure representing a folder entity, while stored in the local storage object.
 */
type DirEntry = StorageEntry & {
    files: string[]; // List of file names that belong to this virtual folder.
}

/*
 * FileSystem DID Store: storage layout
 *
 *  + DIDStore root
 *    + data                            [Current data root folder]
 *      - .metadata                     [DIDStore metadata]
 *      + roots                         [Root identities folder]
 *        + xxxxxxx0                    [Root identity folder named by id]
 *          - .metadata                 [RootIdentity metadata]
 *          - mnemonic                  [Encrypted mnemonic file, OPTIONAL]
 *          - private                   [Encrypted root private key file]
 *          - public                    [Pre-derived public key file]
 *          - index                     [Last derive index]
 *        + ...
 *        + xxxxxxxN
 *      + ids                           [DIDs folder]
 *        + ixxxxxxxxxxxxxxx0           [DID root, named by id specific string]
 *          - .metadata                 [Meta for DID, json format, OPTIONAL]
 *          - document                  [DID document, json format]
 *          + credentials               [Credentials root, OPTIONAL]
 *            + credential-id-0         [Credential root, named by id' fragment]
 *              - .metadata             [Meta for credential, json format, OPTONAL]
 *              - credential            [Credential, json format]
 *            + ...
 *            + credential-id-N
 *          + privatekeys               [Private keys root, OPTIONAL]
 *            - privatekey-id-0         [Encrypted private key, named by pk' id]
 *            - ...
 *            - privatekey-id-N
 *        + ...
 *        + ixxxxxxxxxxxxxxxN
 */
export class FileSystemStorage implements DIDStorage {
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

    constructor(context: string) {
        this.storeRoot = new File(context);
        this.currentDataDir = FileSystemStorage.DATA_DIR;
    }

    public async init(): Promise<void> {
        if (await this.storeRoot.exists())
            await this.checkStore();
        else
            await this.initializeStore();
    }

    private async initializeStore(): Promise<void> {
        try {
            log.debug("Initializing DID store at {}", this.storeRoot.getAbsolutePath());
            await this.storeRoot.createDirectory();
            let metadata = await DIDStoreMetadata.create();
            let file = await this.getFile(true, this.currentDataDir, FileSystemStorage.METADATA);
            await file.writeText(metadata.serialize());
        } catch (e) {
            // IOException
            log.error("Initialize DID store error", e);
            throw new DIDStorageException("Initialize DIDStore \"" + this.storeRoot.getAbsolutePath() + "\" error.", e);
        }
    }

    private async checkStore(): Promise<void> {
        log.debug("Checking DID store at {}", this.storeRoot.getAbsolutePath());

        if (await this.storeRoot.isFile()) {
            log.error("Path {} not a directory", this.storeRoot.getAbsolutePath());
            throw new DIDStorageException("Invalid DIDStore \""
                + this.storeRoot.getAbsolutePath() + "\".");
        }

        await this.postOperations();

        let file: File = this.getDir(this.currentDataDir);
        if (!(await file.exists())) {
            let storeRootFiles = await this.storeRoot.list();
            if (storeRootFiles == null || storeRootFiles.length == 0) {
                // if an empty folder
                await this.initializeStore();
                return;
            } else {
                log.error("Path {} cannot be initialized as DID Store because it's not empty", this.storeRoot.getAbsolutePath());
                throw new DIDStorageException("Path cannot be initialized as DID Store because it's not empty \""
                    + this.storeRoot.getAbsolutePath() + "\".");
            }
        }

        if (!(await file.isDirectory())) {
            log.error("Path {} is not a DID store, missing data directory", this.storeRoot.getAbsolutePath());
            throw new DIDStorageException("Invalid DIDStore \""
                + this.storeRoot.getAbsolutePath() + "\".");
        }

        let metadataFile = await this.getFile(false, this.currentDataDir, FileSystemStorage.METADATA);
        if (!(await metadataFile.exists()) || !(await metadataFile.isFile())) {
            log.error("Path {} not a DID store, missing store metadata", this.storeRoot.getAbsolutePath());
            throw new DIDStorageException("Invalid DIDStore \"" + this.storeRoot.getAbsolutePath() + "\".");
        }

        try {
            let metadataContent = await metadataFile.readText();
            let metadata = await DIDStoreMetadata.parse(metadataContent);

            if (metadata.getType() !== DIDStoreMetadata.DID_STORE_TYPE)
                throw new DIDStorageException("Unknown DIDStore type");

            if (metadata.getVersion() != DIDStoreMetadata.DID_STORE_VERSION)
                throw new DIDStorageException("Unsupported DIDStore version");
        } catch (e) {
            // DIDSyntaxException | IOException
            log.error("Check DID store error, failed load store metadata", e);
            throw new DIDStorageException("Can not check the store metadata", e);
        }
    }

    private static toPath(id: DIDURL): string {
        let path = id.toString(id.getDid());
        return path.replace(';', '+').replace('/', '~').replace('?', '!');
    }

    private static toDIDURL(did: DID, path: string): DIDURL {
        path = path.replace('+', ';').replace('~', '/').replace('!', '?');
        return DIDURL.from(path, did);
    }

    private static async copyFile(src: File, dest: File): Promise<void> {
        // Copy content
        await dest.writeText(await src.readText());
    }

    /**
     * Gets a File object instance for the given path.
     * In "creation" mode:
     * - If the file already exists, it is overwritten (deleted)
     * - Intermediate folders are created if missing
     */
    private async getFile(create: boolean, ...path: string[]): Promise<File> {
        let file: File = null;

        let relPath = this.storeRoot.getAbsolutePath();
        for (let p of path) {
            relPath += (File.SEPARATOR + p);
        }
        file = new File(relPath);
        if (create)
            await file.getParentDirectory().createDirectory();

        return file;
    }

    private getDir(...paths: string[]): File {
        let relPath = this.storeRoot.getAbsolutePath() + File.SEPARATOR + paths.join(File.SEPARATOR);
        return new File(relPath);
    }

    public getLocation(): string {
        return this.storeRoot.toString();
    }

    public getStoreRoot(): File {
        return this.storeRoot;
    }

    public async storeMetadata(metadata: DIDStoreMetadata): Promise<void> {
        try {
            let file = await this.getFile(true, this.currentDataDir, FileSystemStorage.METADATA);

            if (metadata == null || metadata.isEmpty())
                await file.delete();
            else
                await file.writeText(metadata.serialize());
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store DIDStore metadata error", e);
        }
    }

    public async loadMetadata(): Promise<DIDStoreMetadata> {
        try {
            let file = await this.getFile(false, this.currentDataDir, FileSystemStorage.METADATA);
            let metadata: DIDStoreMetadata = null;
            if (await file.exists())
                metadata = await DIDStoreMetadata.parse(await file.readText());

            return metadata;
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDStorageException("Load DIDStore metadata error", e);
        }
    }

    private async getRootIdentityFile(id: string, file: string, create: boolean): Promise<File> {
        return await this.getFile(create, this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR, id, file);
    }

    private getRootIdentityDir(id: string): File {
        return this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR, id);
    }

    public async storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata): Promise<void> {
        try {
            let file = await this.getRootIdentityFile(id, FileSystemStorage.METADATA, true);

            if (metadata == null || metadata.isEmpty())
                await file.delete();
            else
                await file.writeText(metadata.serialize());
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store root identity metadata error: " + id, e);
        }
    }

    public async loadRootIdentityMetadata(id: string): Promise<RootIdentity.Metadata> {
        try {
            let file = await this.getRootIdentityFile(id, FileSystemStorage.METADATA, false);
            let metadata: RootIdentity.Metadata = null;
            if (await file.exists())
                metadata = RootIdentity.Metadata.parse(await file.readText());

            return metadata;
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDStorageException("Load root identity metadata error: " + id, e);
        }
    }

    public async storeRootIdentity(id: string, mnemonic: string, privateKey: string,
        publicKey: string, index: number): Promise<void> {
        try {
            let file: File;

            if (mnemonic != null) {
                file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_MNEMONIC_FILE, true);
                await file.writeText(mnemonic);
            }

            if (privateKey != null) {
                file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE, true);
                await file.writeText(privateKey);
            }

            if (publicKey != null) {
                file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PUBLICKEY_FILE, true);
                await file.writeText(publicKey);
            }

            file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, true);
            await file.writeText(index.toFixed());
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store root identity error: " + id, e);
        }
    }

    public async loadRootIdentity(id: string): Promise<RootIdentity> {
        try {
            let file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PUBLICKEY_FILE, false);
            if (!(await file.exists()))
                return null;

            let publicKey = await file.readText();
            file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, false);
            let index = Number.parseInt(await file.readText());

            return RootIdentity.createFromPreDerivedPublicKey(publicKey, index);
        } catch (e) {
            // IOException
            throw new DIDStorageException("Load public key for identity error: " + id, e);
        }
    }

    public containsRootIdentity(id: string): Promise<boolean> {
        let dir = this.getRootIdentityDir(id);
        return dir.exists();
    }

    public async updateRootIdentityIndex(id: string, index: number): Promise<void> {
        try {
            let file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_INDEX_FILE, false);
            await file.writeText("" + index);
        } catch (e) {
            // IOException
            throw new DIDStorageException("Update index for indentiy error: " + id, e);
        }
    }

    public async loadRootIdentityPrivateKey(id: string): Promise<string> {
        // TODO: support multiple named identity
        try {
            let file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE, false);
            if (!(await file.exists()))
                return null;

            return await file.readText();
        } catch (e) {
            // IOException
            throw new DIDStorageException("Load private key for identity error: " + id, e);
        }
    }

    public async deleteRootIdentity(id: string): Promise<boolean> {
        let dir = this.getRootIdentityDir(id);
        if (await dir.exists()) {
            await dir.delete();
            return true;
        } else {
            return false;
        }
    }

    public async listRootIdentities(): Promise<RootIdentity[]> {
        let dir = this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR);

        if (!(await dir.exists()))
            return [];

        let children = (await dir.listFiles()).filter(async (file) => {
            if (!(await file.isDirectory()))
                return false;

            let sk = new File(file, FileSystemStorage.ROOT_IDENTITY_PRIVATEKEY_FILE);
            return await sk.exists() && await sk.isFile();
        });

        if (children == null || children.length == 0)
            return [];

        let ids: RootIdentity[] = [];
        for (let id of children) {
            let identity = await this.loadRootIdentity(id.getName());
            ids.push(identity);
        }

        return ids;
    }

    public async containsRootIdenities(): Promise<boolean> {
        let dir = this.getDir(this.currentDataDir, FileSystemStorage.ROOT_IDENTITIES_DIR);
        if (!(await dir.exists()))
            return false;

        const files = await dir.listFiles();
        if (!files)
            return false;

        for (const file of files) {
            if (await file.isDirectory())
                return true;
        }

        return false;
    }

    public async loadRootIdentityMnemonic(id: string): Promise<string> {
        try {
            let file = await this.getRootIdentityFile(id, FileSystemStorage.ROOT_IDENTITY_MNEMONIC_FILE, false);
            return await file.readText();
        } catch (e) {
            // IOException
            throw new DIDStorageException("Load mnemonic for identity error: " + id, e);
        }
    }

    private async getDidFile(did: DID, create: boolean): Promise<File> {
        return await this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.DOCUMENT_FILE);
    }

    private async getDidMetadataFile(did: DID, create: boolean): Promise<File> {
        return await this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.METADATA);
    }

    private getDidDir(did: DID): File {
        return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId());
    }

    public async storeDidMetadata(did: DID, metadata: DIDMetadata): Promise<void> {
        try {
            let file = await this.getDidMetadataFile(did, true);

            if (metadata == null || metadata.isEmpty())
                await file.delete();
            else
                await file.writeText(metadata.serialize());
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store DID metadata error: " + did, e);
        }
    }

    public async loadDidMetadata(did: DID): Promise<DIDMetadata> {
        try {
            let file = await this.getDidMetadataFile(did, false);
            let metadata: DIDMetadata = null;
            if (await file.exists())
                metadata = DIDMetadata.parse(await file.readText());

            return metadata;
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDStorageException("Load DID metadata error: " + did, e);
        }
    }

    public async storeDid(doc: DIDDocument): Promise<void> {
        try {
            let file = await this.getDidFile(doc.getSubject(), true);
            await file.writeText(doc.serialize(true));
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store DID document error: " + doc.getSubject(), e);
        }
    }

    public async loadDid(did: DID): Promise<DIDDocument> {
        try {
            let file = await this.getDidFile(did, false);
            if (!(await file.exists()))
                return null;

            return await DIDDocument.parseAsync(await file.readText());
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDStorageException("Load DID document error: " + did, e);
        }
    }

    public async deleteDid(did: DID): Promise<boolean> {
        let dir = this.getDidDir(did);
        if (await dir.exists()) {
            await dir.delete();
            return true;
        } else {
            return false;
        }
    }

    public async listDids(): Promise<DID[]> {
        let dir = this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR);
        if (!(await dir.exists()))
            return [];

        let dids: DID[] = [];
        const files = await dir.listFiles();
        if (files) {
            for (const file of files) {
                if (!(await file.isDirectory()))
                    continue;

                const didRoot = new File(file, FileSystemStorage.DOCUMENT_FILE);
                if (await didRoot.exists() && await didRoot.isFile())
                    dids.push(new DID(DID.METHOD, didRoot.getName()));
            }
        }
        return dids;
    }

    public containsDid(did: DID): Promise<boolean> {
        let dir = this.getDidDir(did);
        return dir.exists();
    }

    public async containsDids(): Promise<boolean> {
        let dir = this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR);
        if (!(await dir.exists()))
            return false;

        const files = await dir.listFiles();
        if (!files)
            return false;

        for (const file of files) {
            if (await file.isDirectory())
                return true;
        }
        return false;
    }

    private getCredentialFile(id: DIDURL, create: boolean): Promise<File> {
        return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
            FileSystemStorage.CREDENTIALS_DIR, FileSystemStorage.toPath(id), FileSystemStorage.CREDENTIAL_FILE);
    }

    private getCredentialMetadataFile(id: DIDURL, create: boolean): Promise<File> {
        return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
            FileSystemStorage.CREDENTIALS_DIR, FileSystemStorage.toPath(id), FileSystemStorage.METADATA);
    }

    private getCredentialDir(id: DIDURL): File {
        return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
            FileSystemStorage.CREDENTIALS_DIR, FileSystemStorage.toPath(id));
    }

    private getCredentialsDir(did: DID): File {
        return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.CREDENTIALS_DIR);
    }

    public async storeCredentialMetadata(id: DIDURL, metadata: CredentialMetadata): Promise<void> {
        try {
            let file = await this.getCredentialMetadataFile(id, true);

            if (metadata == null || metadata.isEmpty())
                await file.delete();
            else
                await file.writeText(metadata.serialize());
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store credential metadata error: " + id, e);
        }
    }

    public async loadCredentialMetadata(id: DIDURL): Promise<CredentialMetadata> {
        try {
            let file = await this.getCredentialMetadataFile(id, false);
            if (!(await file.exists()))
                return null;

            return CredentialMetadata.parse(await file.readText());
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDStorageException("Load credential metadata error: " + id, e);
        }
    }

    public async storeCredential(credential: VerifiableCredential): Promise<void> {
        try {
            let file = await this.getCredentialFile(credential.getId(), true);
            await file.writeText(credential.serialize(true));
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store credential error: " + credential.getId(), e);
        }
    }

    public async loadCredential(id: DIDURL): Promise<VerifiableCredential> {
        try {
            let file = await this.getCredentialFile(id, false);
            if (!(await file.exists()))
                return null;

            return VerifiableCredential.parse(await file.readText());
        } catch (e) {
            // DIDSyntaxException | IOException
            throw new DIDStorageException("Load credential error: " + id, e);
        }
    }

    public containsCredential(id: DIDURL): Promise<boolean> {
        let dir = this.getCredentialDir(id);
        return dir.exists();
    }

    public async containsCredentials(did: DID): Promise<boolean> {
        let dir = this.getCredentialsDir(did);
        if (!(await dir.exists()))
            return false;

        const files = await dir.listFiles();
        if (!files)
            return false;

        for (const file of files) {
            if (await file.isDirectory()) {
                return true;
            }
        }
        return false;
    }

    public async deleteCredential(id: DIDURL): Promise<boolean> {
        let dir = this.getCredentialDir(id);
        if (await dir.exists()) {
            await dir.delete();

            // Remove the credentials directory is no credential exists.
            dir = this.getCredentialsDir(id.getDid());
            if ((await dir.list()).length == 0)
                await dir.delete();

            return true;
        } else {
            return false;
        }
    }

    public async listCredentials(did: DID): Promise<DIDURL[]> {
        let dir = this.getCredentialsDir(did);
        if (!(await dir.exists()))
            return [];

        let credentials: DIDURL[] = [];
        const files = await dir.listFiles();
        if (files) {
            for (const file of files) {
                if(!(await file.isDirectory()))
                    continue;

                let vc = new File(file, FileSystemStorage.CREDENTIAL_FILE);
                if (await vc.exists() && await vc.isFile()) {
                    credentials.push(FileSystemStorage.toDIDURL(did, vc.getName()));
                }
            }
        }
        return credentials;
    }

    private getPrivateKeyFile(id: DIDURL, create: boolean): Promise<File> {
        return this.getFile(create, this.currentDataDir, FileSystemStorage.DID_DIR, id.getDid().getMethodSpecificId(),
            FileSystemStorage.PRIVATEKEYS_DIR, FileSystemStorage.toPath(id));
    }

    private getPrivateKeysDir(did: DID): File {
        return this.getDir(this.currentDataDir, FileSystemStorage.DID_DIR, did.getMethodSpecificId(), FileSystemStorage.PRIVATEKEYS_DIR);
    }

    public async containsPrivateKey(id: DIDURL): Promise<boolean> {
        let file = await this.getPrivateKeyFile(id, false);
        return await file.exists();
    }

    public async storePrivateKey(id: DIDURL, privateKey: string): Promise<void> {
        try {
            let file = await this.getPrivateKeyFile(id, true);
            await file.writeText(privateKey);
        } catch (e) {
            // IOException
            throw new DIDStorageException("Store private key error: " + id, e);
        }
    }

    public async loadPrivateKey(id: DIDURL): Promise<string> {
        try {
            let file = await this.getPrivateKeyFile(id, false);
            if (!(await file.exists()))
                return null;

            return file.readText();
        } catch (e) {
            throw new DIDStorageException("Load private key error: " + id, e);
        }
    }

    public async containsPrivateKeys(did: DID): Promise<boolean> {
        let dir = this.getPrivateKeysDir(did);
        if (!(await dir.exists()))
            return false;

        const files = await dir.listFiles();
        if (!files)
            return false;

        for (const file of files) {
            if (await file.isFile()) {
                return true;
            }
        }
        return false;
    }

    public async deletePrivateKey(id: DIDURL): Promise<boolean> {
        let file = await this.getPrivateKeyFile(id, false);
        if (await file.exists()) {
            await file.delete();

            // Remove the privatekeys directory is no privatekey exists.
            let dir = this.getPrivateKeysDir(id.getDid());
            if ((await dir.list()).length == 0)
                await dir.delete();

            return true;
        } else {
            return false;
        }
    }

    public async listPrivateKeys(did: DID): Promise<DIDURL[]> {
        let dir = this.getPrivateKeysDir(did);
        if (!(await dir.exists()))
            return [];

        let keys: DIDURL[] = [];
        const files = await dir.listFiles();
        if (files) {
            for (const file of files) {
                if (await file.isFile()) {
                    keys.push(FileSystemStorage.toDIDURL(did, file.getName()));
                }
            }
        }
        return keys;
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

    private async copy(src: File, dest: File, reEncryptor: ReEncryptor): Promise<void> {
        if (await src.isDirectory()) {
            let dir = src;
            if (!(await dest.exists())) {
                await dest.createDirectory();
            }

            let files = await dir.list();
            for (let file of files) {
                let srcFile = new File(dir, file);
                let destFile = new File(dest, file);
                await this.copy(srcFile, destFile, reEncryptor);
            }
        } else {
            if (this.needReencrypt(src)) {
                let text = await src.readText();
                await dest.writeText(reEncryptor.reEncrypt(text));
            } else {
                await FileSystemStorage.copyFile(src, dest);
            }
        }
    }

    private async postChangePassword(): Promise<void> {
        let dataDir = this.getDir(FileSystemStorage.DATA_DIR);
        let dataJournal = this.getDir(FileSystemStorage.DATA_DIR + FileSystemStorage.JOURNAL_SUFFIX);

        let timestamp = new Date().getTime() / 1000;
        let dataDeprecated = this.getDir(FileSystemStorage.DATA_DIR + "_" + timestamp);

        let stageFile = await this.getFile(false, "postChangePassword");

        if (await stageFile.exists()) {
            if (await dataJournal.exists()) {
                if (await dataDir.exists())
                    await dataDir.rename(dataDeprecated.getAbsolutePath());

                await dataJournal.rename(dataDir.getAbsolutePath());
            }

            await stageFile.delete();
        } else {
            if (await dataJournal.exists())
                await dataJournal.delete();
        }
    }

    public async changePassword(reEncryptor: ReEncryptor): Promise<void> {
        try {
            let dataDir = this.getDir(FileSystemStorage.DATA_DIR);
            let dataJournal = this.getDir(FileSystemStorage.DATA_DIR + FileSystemStorage.JOURNAL_SUFFIX);

            await this.copy(dataDir, dataJournal, reEncryptor);

            let stageFile = await this.getFile(true, "postChangePassword");
            await stageFile.createFile();
        } catch (e) {
            if (e instanceof WrongPasswordException)
                throw e;
            // DIDStoreException | IOException
            throw new DIDStorageException("Change store password failed.");
        } finally {
            await this.postChangePassword();
        }
    }

    private async postOperations(): Promise<void> {
        const stageFile = await this.getFile(false, "postChangePassword");
        if (await stageFile.exists())
            await this.postChangePassword();
    }
}
