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

import { JsonInclude, JsonIncludeType, JsonPropertyOrder, JsonClassType, JsonIgnoreType, JsonProperty} from "@elastosfoundation/jackson-js";
import { CredentialMetadata } from "./internals";
import { File } from "./internals";
import { DID } from "./internals";
import { DIDDocument } from "./internals";
import { DIDEntity } from "./internals";
import { DIDMetadata } from "./internals";
import type { DIDStorage } from "./internals";
import { DIDURL } from "./internals";
import { DIDStoreCryptoException,
        DIDStoreException,
        IllegalArgumentException,
        WrongPasswordException,
        MalformedExportDataException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { RootIdentity } from "./internals";
import { checkArgument, hashCode } from "./internals";
import { LRUCache } from "./internals";
import { Aes256cbc } from "./internals";
import { HDKey } from "./internals";
import { VerifiableCredential } from "./internals";
import type { Hashable } from "./hashable";
import type { Comparable } from "./comparable";
import { FileSystemStorage } from "./internals";
import { EcdsaSigner } from "./internals";
import dayjs from "dayjs";
import type { ConflictHandle } from "./internals";
import { DefaultConflictHandle } from "./internals";
import type { DIDStoreMetadata } from "./internals";
import { md5 } from "./internals";
import { BASE64 } from "./internals";
import createHash from 'create-hash';
import * as fs from "fs";
import JSZip from "jszip";
import { async } from "q";

/**
 * DIDStore is local store for all DIDs.
 */
 const log = new Logger("DIDStore");

 // The @JsonIgnoreType() decorator is mandatory to avoid the cyclic references
 @JsonIgnoreType()
 export class DIDStore {
    private static CACHE_INITIAL_CAPACITY = 16;
    private static CACHE_MAX_CAPACITY = 128;

    private static NULL = null;

    private static DID_EXPORT = "did.elastos.export/2.0";
    private static DID_LAZY_PRIVATEKEY = "lazy-private-key";

    private cache: LRUCache<DIDStore.Key, any>; // TODO: Change any to the right type

    public storage: DIDStorage;
    private metadata: DIDStoreMetadata;

    private constructor(initialCacheCapacity: number, maxCacheCapacity: number, storage: DIDStorage) {
        if (initialCacheCapacity < 0)
            initialCacheCapacity = 0;

        if (maxCacheCapacity < 0)
            maxCacheCapacity = 0;

        this.cache = new LRUCache({
            maxItems: maxCacheCapacity
        });

        this.storage = storage;

        log.info("DID store opened: {}, cache(init:{}, max:{})",
            storage.getLocation(), initialCacheCapacity, maxCacheCapacity);
    }

        /**
         * Initialize or check the DIDStore.
         *
         * @param type the type for different file system
         * @param location the location of DIDStore
         * @param initialCacheCapacity the initial capacity for cache
         * @param maxCacheCapacity the max capacity for cache
         * @return the DIDStore object
         * @throws DIDStoreException Unsupport the specified store type.
         */
        /*
         * NOTE: Java uses a root folder but in our case we use a "context" string to separate various
         * DID Stores, as we don't have a concept of "folder" isolation.
         */
        public static async open(context: string, initialCacheCapacity: number = DIDStore.CACHE_INITIAL_CAPACITY, maxCacheCapacity: number = DIDStore.CACHE_MAX_CAPACITY): Promise<DIDStore> {
            checkArgument(context != null, "Invalid store context");
            checkArgument(maxCacheCapacity >= initialCacheCapacity, "Invalid cache capacity spec");

            let storage = new FileSystemStorage(context);
            await storage.init();
            let store = new DIDStore(initialCacheCapacity, maxCacheCapacity, storage);
            store.metadata = await storage.loadMetadata();
            store.metadata.attachStore(store);
            return store;
        }

        public close() {
            // log.verbose("Cache statistics: {}", cache.stats().toString());
            this.cache.invalidateAll();
            this.cache = null;
            this.metadata = null;
            this.storage = null;
        }

        private static calcFingerprint(password: string): string {
            let passwordDigest = md5(Buffer.from(password)).toString()

            try {
                let cipher = Aes256cbc.encrypt(Buffer.from(passwordDigest, "hex"), password);
                return md5(cipher).toString();
            } catch (e) {
                // CryptoException
                throw new DIDStoreCryptoException("Calculate fingerprint error.", e);
            }
        }

        /**
         * Encrypt by Base64 method.
         *
         * @param input the data be encrypted
         * @param passwd the password for encrypting
         * @return the encrypt result
         * @throws DIDStoreException Encrypt data error.
         */
        private static encryptToBase64(input: Buffer, passwd: string): string {
            try {
                return Aes256cbc.encryptToBase64(input, passwd);
                // TODO: CHECK IF CRYPTOJS HANDLE THOSE OPTIONS return Base64.encodeToString(cipher, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
            } catch (e) {
                // CryptoException
                throw new DIDStoreCryptoException("Encrypt data error.", e);
            }
        }

        /**
         * Decrypt data from Base64 method.
         *
         * @param input the data to decrypted
         * @param passwd the password for decrypting
         * @return the original data before encrpting
         * @throws DIDStoreException Decrypt private key error.
         */
        private static decryptFromBase64(input: string, passwd: string): Buffer {
            try {
                return Aes256cbc.decryptFromBase64(input, passwd);
            } catch (e) {
                // CryptoException
                throw new WrongPasswordException("Decrypt private key error.", e);
            }
        }

        public static reEncrypt(secret: string, oldpass: string, newpass: string): string {
            let plain = this.decryptFromBase64(secret, oldpass);
            let newSecret = this.encryptToBase64(plain, newpass);
            return newSecret;
        }

        private encrypt(input: Buffer, passwd: string): string {
            let fingerprint = this.metadata.getFingerprint();
            let currentFingerprint = DIDStore.calcFingerprint(passwd);

            if (fingerprint != null && currentFingerprint !== fingerprint)
                throw new WrongPasswordException("Password mismatched with previous password.");

            let result = DIDStore.encryptToBase64(input, passwd);

            if (fingerprint == null || fingerprint === "")
                this.metadata.setFingerprint(currentFingerprint);

            return result;
        }

        private decrypt(input: string, passwd: string): Buffer {
            let fingerprint = this.metadata.getFingerprint();
            let currentFingerprint = DIDStore.calcFingerprint(passwd);

            let result = DIDStore.decryptFromBase64(input, passwd);

            if (fingerprint == null || fingerprint === "")
                this.metadata.setFingerprint(currentFingerprint);

            return result;
        }

        public storeRootIdentity(identity: RootIdentity, storepass: string = undefined) {
            checkArgument(identity != null, "Invalid identity");

            if (storepass !== undefined) {
                checkArgument(storepass != null && storepass !== "", "Invalid storepass");

                let encryptedMnemonic = null;
                if (identity.getMnemonic() != null)
                    encryptedMnemonic = this.encrypt(Buffer.from(identity.getMnemonic(), 'utf8'), storepass);

                let encryptedPrivateKey = this.encrypt(identity.getRootPrivateKey().serialize(), storepass);

                let publicKey = identity.getPreDerivedPublicKey().serializePublicKeyBase58();

                this.storage.storeRootIdentity(identity.getId(), encryptedMnemonic,
                    encryptedPrivateKey, publicKey, identity.getIndex());

                if (this.metadata.getDefaultRootIdentity() == null)
                    this.metadata.setDefaultRootIdentity(identity.getId());

                this.cache.invalidate(DIDStore.Key.forRootIdentity(identity.getId()));
                this.cache.invalidate(DIDStore.Key.forRootIdentityPrivateKey(identity.getId()));
            }
            else {
                this.storage.updateRootIdentityIndex(identity.getId(), identity.getIndex());
            }
        }

        public setDefaultRootIdentity(identity: RootIdentity) {
            checkArgument(identity != null, "Invalid identity");

            if (!this.containsRootIdentity(identity.getId()))
                throw new IllegalArgumentException("Invalid identity, not exists in the store");

            this.metadata.setDefaultRootIdentity(identity.getId());
        }

        /**
         * Load private identity from DIDStore.
         *
         * @param storepass the password for DIDStore
         * @return the HDKey object(private identity)
         * @throws DIDStoreException there is invalid private identity in DIDStore.
         */
        public async loadRootIdentity(id: string = undefined): Promise<RootIdentity> {
            if (id === undefined) {
                id = this.metadata.getDefaultRootIdentity();
                if (id == null || id === "") {
                    let ids = this.storage.listRootIdentities();
                    if (ids.length != 1) {
                        return null;
                    } else {
                        let identity = ids[0];
                        let identityMetadata = await this.loadRootIdentityMetadata(identity.getId());
                        identity.setMetadata(identityMetadata);
                        this.metadata.setDefaultRootIdentity(identity.getId());
                        return identity;
                    }
                }
            }

            checkArgument(id != null && id !== "", "Invalid id");

            try {
                let value = await this.cache.getAsync(DIDStore.Key.forRootIdentity(id), async ()=>{
                    let identity = this.storage.loadRootIdentity(id);
                    if (identity != null) {
                        identity.setMetadata(await this.loadRootIdentityMetadata(id));
                        return {value: identity};
                    } else {
                        return {value: DIDStore.NULL};
                    }
                });

                return value === DIDStore.NULL ? null : value;
            } catch (e) {
                // ExecutionException
                throw new DIDStoreException("Load root identity failed: " + id, e);
            }
        }

        /**
         * Judge whether private identity exists in DIDStore.
         *
         * @return the returned value is true if private identity exists;
         *         the returned value if false if private identity doesnot exist.
         * @throws DIDStoreException Unsupport the specified store type.
         */
        public containsRootIdentity(id: string): boolean {
            return this.storage.loadRootIdentity(id) != null;
        }

        /**
         * Export mnemonic from DIDStore
         *
         * @param storepass the password for DIDStore
         * @return the mnemonic string
         * @throws DIDStoreException there is no mnemonic in DID Store.
         */
        public exportRootIdentityMnemonic(id: string, storepass: string): string | null {
            checkArgument(id != null && id !== "", "Invalid id");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let encryptedMnemonic = this.storage.loadRootIdentityMnemonic(id);
            if (encryptedMnemonic != null)
                return new String(this.decrypt(encryptedMnemonic, storepass)).valueOf();
            else
                return null;
        }

        public containsRootIdentityMnemonic(id: string): boolean {
            checkArgument(id != null && id !== "", "Invalid id");

            let encryptedMnemonic = this.storage.loadRootIdentityMnemonic(id);
            return encryptedMnemonic != null;
        }

        /**
         * Load private identity from DIDStore.
         *
         * @param storepass the password for DIDStore
         * @return the HDKey object(private identity)
         * @throws DIDStoreException there is invalid private identity in DIDStore.
         */
        private loadRootIdentityPrivateKey(id: string, storepass: string): HDKey {
            try {
                let value = this.cache.get(DIDStore.Key.forRootIdentityPrivateKey(id), () => {
                    let encryptedKey = this.storage.loadRootIdentityPrivateKey(id);
                    return {value: encryptedKey != null ? encryptedKey : DIDStore.NULL};
                });

                if (value !== DIDStore.NULL) {
                    let keyData = this.decrypt(value, storepass);
                    return HDKey.deserialize(keyData);
                } else {
                    return null;
                }
            } catch (e) {
                // ExecutionException
                if (e instanceof WrongPasswordException)
                    throw e;
                else
                    throw new DIDStoreException("Load root identity private key failed: " + id, e);
            }
        }

        public derive(id: string, path: string, storepass: string): HDKey {
            checkArgument(id != null && id !== "", "Invalid identity");
            checkArgument(path != null && path !== "", "Invalid path");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let rootPrivateKey = this.loadRootIdentityPrivateKey(id, storepass);
            if (!rootPrivateKey)
                throw new DIDStoreCryptoException("Unable to load root private key for id "+id+". Null private key returned.");

            let key = rootPrivateKey.deriveWithPath(path);

            return key;
        }

        public deleteRootIdentity(id: string): boolean {
            checkArgument(id != null && id !== "", "Invalid id");

            let success = this.storage.deleteRootIdentity(id);
            if (success) {
                if (this.metadata.getDefaultRootIdentity() != null && this.metadata.getDefaultRootIdentity() === id)
                    this.metadata.setDefaultRootIdentity(null);

                    this.cache.invalidate(DIDStore.Key.forRootIdentity(id));
                    this.cache.invalidate(DIDStore.Key.forRootIdentityPrivateKey(id));
            }

            return success;
        }

        public async listRootIdentities(): Promise<RootIdentity[]> {
            let ids = this.storage.listRootIdentities();

            for (let id of ids) {
                let identityMetadata = await this.loadRootIdentityMetadata(id.getId());
                id.setMetadata(identityMetadata);
            }
   
            return ids;
        }

        public containsRootIdentities(): boolean {
            return this.storage.containsRootIdenities();
        }

        public storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata ) {
            checkArgument(id != null && id !== "", "Invalid id");
            checkArgument(metadata != null, "Invalid metadata");

            this.storage.storeRootIdentityMetadata(id, metadata);
        }

        protected async loadRootIdentityMetadata(id: string): Promise<RootIdentity.Metadata> {
            checkArgument(id != null && id !== "", "Invalid id");

            let metadata = await this.storage.loadRootIdentityMetadata(id);
            if (metadata != null) {
                metadata.setId(id);
                metadata.attachStore(this);
            } else {
                metadata = new RootIdentity.Metadata(id, this);
            }

            return metadata;
        }

        /**
         * Store DID Document in the DIDStore.
         *
         * @param doc the DIDDocument object
         * @throws DIDStoreException DIDStore error.
         */
        public async storeDid(doc: DIDDocument): Promise<void> {
            checkArgument(doc != null, "Invalid doc");

            this.storage.storeDid(doc);
            if (doc.getStore() != this) {
                let metadata = await this.loadDidMetadata(doc.getSubject());
                doc.getMetadata().merge(metadata);
                doc.getMetadata().attachStore(this);
            }
            this.storeDidMetadata(doc.getSubject(), doc.getMetadata());

            for (let vc of doc.getCredentials())
                await this.storeCredential(vc);

            this.cache.put(DIDStore.Key.forDidDocument(doc.getSubject()), doc);
        }

        /**
         * Load the specified DID content(DIDDocument).
         *
         * @param did the specified DID
         * @return the DIDDocument object
         * @throws DIDStoreException DIDStore error.
         */
        public async loadDid(didOrString: DID | string): Promise<DIDDocument> {
            checkArgument(didOrString != null, "Invalid did");

            let did: DID;
            if (!(didOrString instanceof DID))
                did = DID.from(didOrString);
            else
                did = didOrString;

            try {
                let value = await this.cache.getAsync(DIDStore.Key.forDidDocument(did), async () => {
                    let doc = await this.storage.loadDid(did);
                    if (doc != null) {
                        doc.setMetadata(await this.loadDidMetadata(did));
                        return {value: doc};
                    } else {
                        return {value: DIDStore.NULL};
                    }
                });

                return value === DIDStore.NULL ? null : value;
            } catch (e) {
                // ExecutionException
                throw new DIDStoreException("Load did document failed: " + did, e);
            }
        }

        /**
         * Judge whether containing the specified DID or not.
         *
         * @param did the specified DID
         * @return the returned value is true if the specified DID is in the DIDStore;
         *         the returned value is false if the specified DID is not in the DIDStore.
         * @throws DIDStoreException DIDStore error.
         */
        public containsDid(did: DID | string): boolean {
            checkArgument(did != null, "Invalid did");

            if (did instanceof DID)
                return this.loadDid(did) != null;
            else
                return this.loadDid(DID.from(did)) != null;
        }

        /**
         * Store DID Metadata.
         *
         * @param did the owner of Metadata
         * @param metadata the meta data
         * @throws DIDStoreException DIDStore error.
         */
        public storeDidMetadata(did: DID, metadata: DIDMetadata) {
            checkArgument(did != null, "Invalid did");
            checkArgument(metadata != null, "Invalid metadata");

            this.storage.storeDidMetadata(did, metadata);
            metadata.attachStore(this);

            this.cache.put(DIDStore.Key.forDidMetadata(did), metadata);
        }

        /**
         * Load Meta data for the specified DID.
         *
         * @param did the specified DID
         * @return the Meta data
         * @throws DIDStoreException DIDStore error.
         */
        protected async loadDidMetadata(did: DID): Promise<DIDMetadata> {
            checkArgument(did != null, "Invalid did");

            try {
                let value = await this.cache.getAsync(DIDStore.Key.forDidMetadata(did), async () => {
                    let metadata = await this.storage.loadDidMetadata(did);
                    if (metadata != null) {
                        metadata.setDid(did);
                        metadata.attachStore(this);
                    } else {
                        metadata = new DIDMetadata(did, this);
                    }

                    return {value: metadata};
                });

                return value === DIDStore.NULL ? null : value;
            } catch (e) {
                // ExecutionException
                throw new DIDStoreException("Load did metadata failed: " + did, e);
            }
        }

        /**
         * Delete the specified DID.
         *
         * @param did the specified DID
         * @return the returned value is true if deleting is successful;
         *         the returned value is false if deleting is failed.
         * @throws DIDStoreException DIDStore error.
         */
        public deleteDid(didOrString: DID | string): boolean {
            checkArgument(didOrString != null, "Invalid did");

            let did: DID;
            if (didOrString instanceof DID)
                did = didOrString;
            else
                did = DID.from(didOrString);

            let success = this.storage.deleteDid(did);

            if (success) {
                this.cache.invalidate(DIDStore.Key.forDidDocument(did));
                this.cache.invalidate(DIDStore.Key.forDidMetadata(did));

                // invalidate every thing that belongs to this did
                this.cache.invalidateAll((key)=>{
                    return key.id instanceof DIDURL && key.id.getDid() === did;
                });
            }

            return success;
        }

        /**
         * List all DIDs according to the specified condition.
         *
         * @return the DID array.
         * @throws DIDStoreException DIDStore error.
         */
        public async listDids(): Promise<DID[]> {
            let dids = this.storage.listDids();
            for (let did of dids) {
                let metadata = await this.loadDidMetadata(did);
                if (metadata == null) {
                    metadata = new DIDMetadata(did, this);
                } else {
                    metadata.setDid(did);
                    metadata.attachStore(this);
                }

                did.setMetadata(metadata);
            }

            return dids;
        }

        public async selectDids(filter: DIDStore.DIDFilter): Promise<DID[]> {
            let dids = await this.listDids();

            if (filter != null) {
                let dest: DID[] = []

                for (let did of dids) {
                    if (filter.select(did))
                        dest.push(did);
                }

                dids = dest;
            }

            return dids;
        }

        /**
         * Store the specified Credential.
         *
         * @param credential the Credential object
         * @throws DIDStoreException DIDStore error.
         */
        public async storeCredential(credential: VerifiableCredential): Promise<void> {
            checkArgument(credential != null, "Invalid credential");

            this.storage.storeCredential(credential);
            if (credential.getMetadata().getStore() != this) {
                let metadata = await this.loadCredentialMetadata(credential.getId());
                credential.getMetadata().merge(metadata);
                credential.getMetadata().attachStore(this);
            }
            this.storeCredentialMetadata(credential.getId(), credential.getMetadata());

            this.cache.put(DIDStore.Key.forCredential(credential.getId()), credential);
        }

        /**
         * Load the specified Credential.
         *
         * @param did the owner of Credential
         * @param id the identifier of Credential
         * @return the Credential object
         * @throws DIDStoreException DIDStore error.
         */
        public async loadCredential(id: DIDURL | string): Promise<VerifiableCredential> {
            checkArgument(id != null, "Invalid credential id");

            if (typeof id === "string")
                id = DIDURL.from(id);

            try {
                let value = await this.cache.getAsync(DIDStore.Key.forCredential(id), async ()=>{
                    let vc = await this.storage.loadCredential(id as DIDURL);
                    if (vc != null) {
                        vc.setMetadata(await this.loadCredentialMetadata(id as DIDURL));
                        return {value: vc};
                    } else {
                        return {value: DIDStore.NULL};
                    }
                });

                return value === DIDStore.NULL ? null : value;
            } catch (e) {
                // ExecutionException
                throw new DIDStoreException("Load credential failed: " + id, e);
            }
        }

        /**
         * Judge whether does DIDStore contain the specified credential.
         *
         * @param did the owner of Credential
         * @param id the identifier of Credential
         * @return the returned value is true if there is no credential owned the specific DID;
         *         the returned value is false if there is credentials owned the specific DID.
         * @throws DIDStoreException DIDStore error.
         */
        public async containsCredential(id: DIDURL | string): Promise<boolean> {
            checkArgument(id != null, "Invalid credential id");
            return (await this.loadCredential(id)) != null;
        }

        /**
         * Judge whether does DIDStore contain any credential owned the specific DID.
         *
         * @param did the owner of Credential
         * @return the returned value is true if there is no credential owned the specific DID.
         * @throws DIDStoreException DIDStore error.
         */
        /* public boolean containsCredentials(DID did) throws DIDStoreException {
            checkArgument(did != null, "Invalid did");
            return storage.containsCredentials(did);
        } */

        /**
         * Judge whether does DIDStore contain any credential owned the specific DID.
         *
         * @param did the owner of Credential
         * @return the returned value is true if there is no credential owned the specific DID.
         * @throws DIDStoreException DIDStore error.
         */
        /* public boolean containsCredentials(String did) throws DIDStoreException {
            return containsCredentials(DID.from(did));
        } */

        /**
         * Store meta data for the specified Credential.
         *
         * @param did the owner of the specified Credential
         * @param id the identifier of Credential
         * @param metadata the meta data for Credential
         * @throws DIDStoreException DIDStore error.
         */
        public storeCredentialMetadata(id: DIDURL, metadata: CredentialMetadata) {
            checkArgument(id != null, "Invalid credential id");
            checkArgument(metadata != null, "Invalid credential metadata");

            this.storage.storeCredentialMetadata(id, metadata);
            metadata.attachStore(this);

            this.cache.put(DIDStore.Key.forCredentialMetadata(id), metadata);
        }

        /**
         * Load the meta data about the specified Credential.
         *
         * @param did the owner of Credential
         * @param id the identifier of Credential
         * @return the meta data for Credential
         * @throws DIDStoreException DIDStore error.
         */
         protected async loadCredentialMetadata(id: DIDURL): Promise<CredentialMetadata> {
            checkArgument(id != null, "Invalid credential id");

            try {
                let value = await this.cache.getAsync(DIDStore.Key.forCredentialMetadata(id), async () => {
                    let metadata = await this.storage.loadCredentialMetadata(id);
                    if (metadata != null) {
                        metadata.setId(id);
                        metadata.attachStore(this);
                    } else {
                        metadata = new CredentialMetadata(id, this);
                    }

                    return {value: metadata};
                });

                return value === DIDStore.NULL ? null : value;
            } catch (e) {
                // ExecutionException
                throw new DIDStoreException("Load Credential metadata failed: " + id, e);
            }
        }

        /**
         * Delete the specified Credential
         *
         * @param did the owner of Credential
         * @param id the identifier of Credential
         * @return the returned value is true if there is no credential owned the specific DID;
         *         the returned value is false if there is credentials owned the specific DID.
         * @throws DIDStoreException DIDStore error.
         */
        public deleteCredential(idOrString: DIDURL | string): boolean {
            checkArgument(idOrString != null, "Invalid credential id");

            let id = DIDURL.from(idOrString);

            let success = this.storage.deleteCredential(id);
            if (success) {
                this.cache.invalidate(DIDStore.Key.forCredential(id));
                this.cache.invalidate(DIDStore.Key.forCredentialMetadata(id));
            }

            return success;
        }

        /**
         * List the Credentials owned the specified DID.
         *
         * @param did the owner of Credential
         * @return the Credential array owned the specified DID.
         * @throws DIDStoreException DIDStore error.
         */
        public async listCredentials(didOrString: DID | string): Promise<DIDURL[]> {
            checkArgument(didOrString != null, "Invalid did");

            let did: DID;
            if (didOrString instanceof DID)
                did = didOrString;
            else
                did = DID.from(didOrString);

            let ids = this.storage.listCredentials(did);
            for (let id of ids) {
                let metadata = await this.loadCredentialMetadata(id);
                if (metadata == null) {
                    metadata = new CredentialMetadata(id, this);
                } else {
                    metadata.setId(id);
                    metadata.attachStore(this);
                }

                id.setMetadata(metadata);
            }

            return ids;
        }

        /**
         * Select the Credentials according to the specified condition.
         *
         * @param did the owner of Credential
         * @param id the identifier of Credential
         * @param type the Credential type
         * @return the Credential array
         * @throws DIDStoreException DIDStore error.
         */
        public async selectCredentials(didOrString: DID | string, filter: DIDStore.CredentialFilter): Promise<DIDURL[]> {
            checkArgument(didOrString != null, "Invalid did");

            let did: DID;
            if (didOrString instanceof DID)
                did = didOrString;
            else
                did = DID.from(didOrString);

            let vcs = await this.listCredentials(did);

            if (filter != null) {
                let dest: DIDURL[] = [];
                for (let id of vcs) {
                    if (filter.select(id))
                        dest.push(id);
                }

                vcs = dest;
            }

            return vcs;
        }

        /**
         * Store private key. Encrypt and encode private key with base64url method.
         *
         * @param did the owner of key
         * @param id the identifier of key
         * @param privateKey the original private key(32 bytes)
         * @param storepass the password for DIDStore
         * @throws DIDStoreException DIDStore error.
         */
         public storePrivateKey(idOrString: DIDURL | string, privateKey: Buffer, storepass: string) {
            checkArgument(idOrString != null, "Invalid private key id");

            let id = DIDURL.from(idOrString);

            checkArgument(privateKey != null && privateKey.length != 0, "Invalid private key");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let encryptedKey = this.encrypt(privateKey, storepass);
            this.storage.storePrivateKey(id, encryptedKey);

            this.cache.put(DIDStore.Key.forDidPrivateKey(id), encryptedKey);
        }

        /**
         * Store Lazy private key.
         *
         * @param id the identifier of key
         * @throws DIDStoreException DIDStore error.
         */
        public storeLazyPrivateKey(id: DIDURL) {
            checkArgument(id != null, "Invalid private key id");
            
            this.storage.storePrivateKey(id, DIDStore.DID_LAZY_PRIVATEKEY);
            this.cache.put(DIDStore.Key.forDidPrivateKey(id), DIDStore.DID_LAZY_PRIVATEKEY);
        }

        /**
         * Load private key.
         *
         * @param did the owner of key
         * @param id the identifier of key
         * @param storepass the password for DIDStore
         * @return the original private key
         * @throws DIDStoreException DIDStore error.
         */
         public async loadPrivateKey(id: DIDURL, storepass: string): Promise<Buffer> {
            checkArgument(id != null, "Invalid private key id");
            checkArgument(storepass && storepass != null, "Invalid storepass");

            let value = this.cache.get(DIDStore.Key.forDidPrivateKey(id), () => {
                let key = this.storage.loadPrivateKey(id);
                return {
                    value: key != null ? key : DIDStore.NULL
                };
            });

            if (value === DIDStore.NULL || !value) {
                return null;
            } else {
                if (value === DIDStore.DID_LAZY_PRIVATEKEY) 
                    return await RootIdentity.lazyCreateDidPrivateKey(id, this, storepass);
                else 
                    return this.decrypt(value, storepass);              
            }
        }

        /**
         * Judge that the specified key has private key in DIDStore.
         *
         * @param did the owner of key
         * @param id the identifier of key
         * @return the returned value is true if there is private keys owned the specified key;
         *         the returned value is false if there is no private keys owned the specified key.
         * @throws DIDStoreException DIDStore error.
         */
        public containsPrivateKey(id: DIDURL | string): boolean {
            checkArgument(id != null, "Invalid private key id");

            let keyId = id instanceof DIDURL ? id : DIDURL.from(id);
            let value = this.cache.get(DIDStore.Key.forDidPrivateKey(keyId), () => {
                let key = this.storage.loadPrivateKey(keyId);
                return {
                    value: key != null ? key : DIDStore.NULL
                };
            });
                
            return value === DIDStore.NULL ? false : true;
        }

        /**
         * Judge whether there is private key owned the specified DID in DIDStore.
         *
         * @param did the specified DID
         * @return the returned value is true if there is private keys owned the specified DID;
         *         the returned value is false if there is no private keys owned the specified DID.
         * @throws DIDStoreException DIDStore error.
         */
         public containsPrivateKeys(did: DID | string): boolean {
            checkArgument(did != null, "Invalid did");

            if (did instanceof DID)
                return this.storage.containsPrivateKeys(did);
            else
                return this.storage.containsPrivateKeys(DID.from(did));
        }

        /**
         * Delete the private key owned to the specified key.
         *
         * @param did the owner of key
         * @param id the identifier of key
         * @return the returned value is true if deleting private keys successfully;
         *         the returned value is false if deleting private keys failed.
         * @throws DIDStoreException DIDStore error.
         */
         public deletePrivateKey(idOrString: DIDURL | string): boolean {
            checkArgument(idOrString != null, "Invalid private key id");

            let id = DIDURL.from(idOrString);

            let success = this.storage.deletePrivateKey(id);
            if (success)
                this.cache.invalidate(DIDStore.Key.forDidPrivateKey(id));

            return success;
        }

        /**
         * Sign the digest data by the specified key.
         *
         * @param did the owner of sign key
         * @param id the identifier of sign key
         * @param storepass the password for DIDStore
         * @param digest the digest data
         * @return the signature string
         * @throws DIDStoreException can not get DID Document if no specified sign key.
         */
        public async sign(id: DIDURL, storepass: string, digest: Buffer): Promise<string> {
            checkArgument(id != null, "Invalid private key id");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");
            checkArgument(digest != null && digest.length > 0, "Invalid digest");

            let key = HDKey.deserialize(await this.loadPrivateKey(id, storepass));
            let sig = EcdsaSigner.sign(key.getPrivateKeyBytes(), digest);
            key = null;

            return BASE64.fromHex(sig.toString("hex"));
        }

        /**
         * Change password for DIDStore.
         *
         * @param oldPassword the old password
         * @param newPassword the new password
         * @throws DIDStoreException DIDStore error.
         */
        public changePassword(oldPassword: string, newPassword: string) {
            checkArgument(oldPassword != null && oldPassword !== "", "Invalid old password");
            checkArgument(newPassword != null && newPassword !== "", "Invalid new password");

            this.storage.changePassword({
                reEncrypt: (data)=>{
                    return DIDStore.reEncrypt(data, oldPassword, newPassword);
                }
            });

            this.metadata.setFingerprint(DIDStore.calcFingerprint(newPassword));
            this.cache.invalidateAll();
        }

        public async synchronize(handle: ConflictHandle = null) {
            if (handle == null)
                handle = DefaultConflictHandle.getInstance();

            let identities = await this.listRootIdentities();
            for (let identity of identities) {
                await identity.synchronize(handle);
            }

            let dids = this.storage.listDids();
            for (let did of dids) {
                let localDoc = await this.storage.loadDid(did);
                if (localDoc.isCustomizedDid()) {
                    let resolvedDoc = await did.resolve();
                    if (resolvedDoc == null)
                        continue;

                    let finalDoc = resolvedDoc;

                    localDoc.getMetadata().detachStore();

                    if (localDoc.getSignature() === resolvedDoc.getSignature() ||
                            (localDoc.getMetadata().getSignature() != null &&
                            localDoc.getProof().getSignature() ===
                                    localDoc.getMetadata().getSignature())) {
                        finalDoc.getMetadata().merge(localDoc.getMetadata());
                    } else {
                        log.debug("{} on-chain copy conflict with local copy.",
                                did.toString());

                        // Local copy was modified
                        finalDoc = handle.merge(resolvedDoc, localDoc);
                        if (finalDoc == null || !finalDoc.getSubject().equals(did)) {
                            log.error("Conflict handle merge the DIDDocument error.");
                            throw new DIDStoreException("deal with local modification error.");
                        } else {
                            log.debug("Conflict handle return the final copy.");
                        }
                    }

                    localDoc.getMetadata().attachStore(this);

                    let metadata = finalDoc.getMetadata();
                    metadata.setPublished(resolvedDoc.getMetadata().getPublished());
                    metadata.setSignature(resolvedDoc.getProof().getSignature());
                    if (resolvedDoc.getMetadata().isDeactivated())
                        metadata.setDeactivated(true);
                    metadata.attachStore(this);

                    this.storage.storeDid(finalDoc);
                }

                let vcIds = this.storage.listCredentials(did);
                for (let vcId of vcIds) {
                    let localVc = await this.storage.loadCredential(vcId);

                    let resolvedVc = await VerifiableCredential.resolve(vcId, localVc.getIssuer());
                    if (resolvedVc == null)
                        continue;

                    resolvedVc.getMetadata().merge(localVc.getMetadata());
                    this.storage.storeCredential(resolvedVc);
                }
            }
        }

        public async exportDid(did: DID | string, password: string, storepass: string): Promise<string> {
            checkArgument(did != null, "Invalid id");
            checkArgument(password != null && password !== "", "Invalid password");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            if (typeof did === "string")
                did = DID.from(did);

            // All objects should load directly from storage,
            // avoid affects the cached objects.
            let doc = await this.storage.loadDid(did);
            if (doc == null)
                throw new DIDStoreException("Export DID " + did + " failed, not exist.");

            doc.setMetadata(await this.storage.loadDidMetadata(did));

            log.debug("Exporting {}...", did.toString());

            let de = new DIDStore.DIDExport(did);
            de.setDocument(doc);

            if (this.storage.containsCredentials(did)) {
                let ids = Array.from(await this.listCredentials(did));
                ids.sort();
                for (let id of ids) {
                    log.debug("Exporting credential {}...", id.toString());

                    let vc = await this.storage.loadCredential(id);
                    vc.setMetadata(await this.storage.loadCredentialMetadata(id));
                    de.addCredential(vc);
                }
            }

            if (this.storage.containsPrivateKeys(did)) {
                let pks = doc.getPublicKeys();
                for (let pk of pks) {
                    let id = pk.getId();
                    let key = this.storage.loadPrivateKey(id);
                    if (key != null) {
                        log.debug("Exporting private key {}...", id.toString());
                        de.addPrivatekey(id, key, storepass, password);
                    }
                }
            }

            de.seal(password);
            return de.serialize(true);
        }

        public async importDid(data: string, password: string, storepass: string): Promise<void> {
            checkArgument(data != null && data !== "", "Invalid import data");
            checkArgument(password != null && password !== "", "Invalid password");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let de = await DIDStore.DIDExport.parse(data, DIDStore.DIDExport);
            de.verify(password);

            let doc = de.getDocument();
            this.storage.storeDid(doc);
            this.storage.storeDidMetadata(doc.getSubject(), doc.getMetadata());

            let vcs = de.getCredentials();
            for (let vc of vcs) {
                this.storage.storeCredential(vc);
                this.storage.storeCredentialMetadata(vc.getId(), vc.getMetadata());
            }

            let sks = de.getPrivateKeys();
            for (let sk of sks)
                this.storage.storePrivateKey(sk.getId(), sk.getKey(password, storepass));

            return null;
        }

        public async exportRootIdentity(id: string, password: string, storepass: string): Promise<string> {
            checkArgument(id != null && id !== "", "Invalid id");
            checkArgument(password != null && password !== "", "Invalid password");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let rie = new DIDStore.RootIdentityExport();

            let mnemonic = this.storage.loadRootIdentityMnemonic(id);
            if (mnemonic !== null)
                rie.setMnemonic(mnemonic, storepass, password);

            rie.setPirvateKey(this.storage.loadRootIdentityPrivateKey(id), storepass, password);

            let rootidentity = this.storage.loadRootIdentity(id);
            rie.setPublicKey(rootidentity.getPreDerivedPublicKey().serializePublicKeyBase58());
            rie.setIndex(rootidentity.getIndex());

            if (rootidentity.getId() == this.metadata.getDefaultRootIdentity())
                rie.setDefault();

            rie.seal(password);
            return rie.serialize(true);
        }

        public async importRootIdentity(data: string, password: string, storepass: string): Promise<void> {
            checkArgument(data != null && data !== "", "Invalid import data");
            checkArgument(password != null && password !== "", "Invalid password");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let rie = await DIDStore.RootIdentityExport.parse(data, DIDStore.RootIdentityExport);
            rie.verify(password);

            let encryptedMnemonic = rie.getMnemonic(password, storepass);
            let encryptedPrivateKey = rie.getPrivateKey(password, storepass);
            let publicKey = rie.getPublicKey();
            let hk = HDKey.deserializeBase58(publicKey);
            let id = RootIdentity.getId(hk.serializePublicKey());

            this.storage.storeRootIdentity(id, encryptedMnemonic, encryptedPrivateKey,
                publicKey, rie.getIndex());

            if (rie.isDefault() && this.metadata.getDefaultRootIdentity() == null)
                this.metadata.setDefaultRootIdentity(id);

            return null;
        }

        public async exportStore(zipFile : string, password: string, storepass: string): Promise<void> {
            checkArgument(zipFile != null, "Invalid zip file");
            checkArgument(password != null && password !== "", "Invalid password");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let zip = new JSZip();

            let dids = await this.listDids();
            for (let did of dids) {
                let data = await this.exportDid(did, password, storepass);
                zip.file(did.getMethodSpecificId(), data);
            }

            let internalpath = "rootidentity-";
            let identities = await this.listRootIdentities();
            for (let identity of identities) {
                internalpath = internalpath.concat(identity.getId());
                let data = await this.exportRootIdentity(identity.getId(), password, storepass);
                zip.file(internalpath, data);
            }

            let file = new File(zipFile);
            file.createFile();
            
            let content = await zip.generateAsync({type: "nodebuffer", platform: "UNIX"});
            fs.writeFileSync(zipFile, content, {mode: 0o644, flag: "w+"});
        }

        public async importStore(zipFile: string, password: string, storepass: string): Promise<void> {
            checkArgument(zipFile != null, "Invalid zip file");
            checkArgument(password != null && password !== "", "Invalid password");
            checkArgument(storepass != null && storepass !== "", "Invalid storepass");

            let fingerprint = this.metadata.getFingerprint();
            let currentFingerprint = DIDStore.calcFingerprint(storepass);

            if (fingerprint != null && currentFingerprint !== fingerprint)
                throw new WrongPasswordException("Password mismatched with previous password.");

            try {
                const promises = [];

                let data = await fs.readFileSync(zipFile);
                let zip = await JSZip.loadAsync(data);
                zip.forEach((relativePath, zipEntry) => {
                    let promise = zip.file(relativePath).async("string").then(async (content) => {
                        if (relativePath.startsWith("rootidentity-"))
                            await this.importRootIdentity(content, password, storepass);
                        else
                            await this.importDid(content, password, storepass);
                    });

                    promises.push(promise);
                });

                await Promise.all(promises);
            } catch(e) {
                throw new MalformedExportDataException(e);
            }

            if (fingerprint == null || fingerprint == "")
                this.metadata.setFingerprint(currentFingerprint);
        }
}

export namespace DIDStore {
    export interface KeyObject extends Hashable, Comparable<KeyObject> {}

    export class Key implements Hashable {
        private static TYPE_ROOT_IDENTITY = 0x00;
        private static TYPE_ROOT_IDENTITY_PRIVATEKEY = 0x01;
        private static TYPE_DID_DOCUMENT = 0x10;
        private static TYPE_DID_METADATA = 0x11;
        private static TYPE_DID_PRIVATEKEY = 0x12;
        private static TYPE_CREDENTIAL = 0x20;
        private static TYPE_CREDENTIAL_METADATA = 0x21;

        private constructor(private type: number, public id: KeyObject) {}

        public hashCode(): number {
            return this.type + this.id.hashCode();
        }

        public equals(obj: unknown): boolean {
            if (obj == this)
                return true;

            if (obj instanceof Key) {
                let key = obj as Key;
                return this.type == key.type ? this.id.equals(key.id) : false;
            }

            return false;
        }

        public static forRootIdentity(id: string): Key {
            return new Key(DIDStore.Key.TYPE_ROOT_IDENTITY, new class implements KeyObject {
                equals(o) {return o === id;}
                compareTo(o) {return id.localeCompare(o);}
                hashCode() {return hashCode(id);}
            });
        }

        public static forRootIdentityPrivateKey(id: string): Key {
            return new Key(DIDStore.Key.TYPE_ROOT_IDENTITY_PRIVATEKEY, new class implements KeyObject {
                key: string = id;
                equals(o) {return o === this.key;}
                compareTo(o) {
                    if (this.key < o) return -1;
                    if (this.key > o) return 1;
                    return 0;
                }
                hashCode() {return hashCode(this.key);}
            });
        }

        public static forDidDocument(did: DID): Key {
            return new Key(DIDStore.Key.TYPE_DID_DOCUMENT, did);
        }

        public static forDidMetadata(did: DID): Key {
            return new Key(DIDStore.Key.TYPE_DID_METADATA, did);
        }

        public static forDidPrivateKey(id: DIDURL): Key {
            return new Key(DIDStore.Key.TYPE_DID_PRIVATEKEY, id);
        }

        public static forCredential(id: DIDURL): Key {
            return new Key(DIDStore.Key.TYPE_CREDENTIAL, id);
        }

        public static forCredentialMetadata(id: DIDURL): Key {
            return new Key(DIDStore.Key.TYPE_CREDENTIAL_METADATA, id);
        }
    }

    export interface DIDFilter {
        select(did: DID): boolean;
    }

    export interface CredentialFilter {
        select(id: DIDURL): boolean;
    }

    @JsonPropertyOrder({ value: [
        "type",
        "id",
        "document",
        "credentials",
        "privatekeys",
        "created",
        "fingerprint"]})
    @JsonInclude({value : JsonIncludeType.NON_NULL})
    export class DIDExport extends DIDEntity<DIDExport> {
        private static DID_EXPORT = "did.elastos.export/2.0";

        @JsonProperty({ value: "type"})
        private type: string;
        @JsonProperty({ value: "id"})
        @JsonClassType({type: () => [DID]})
        private id: DID;
        @JsonProperty({value: "document"})
        @JsonClassType({type: () => [DIDExport.Document]})
        private document: DIDExport.Document | null = null;
        @JsonProperty({ value: "credential"})
        @JsonClassType({type: () => [Array, [DIDExport.Credential]]})
        private credentials: DIDExport.Credential[] = [];
        @JsonProperty({ value: "privatekey"})
        @JsonClassType({type: () => [Array, [DIDExport.PrivateKey]]})
        private privatekeys: DIDExport.PrivateKey[] = [];
        @JsonProperty({value: "created"})
        @JsonClassType({type: () => [Date]})
        private created: Date | null = null;
        @JsonProperty({ value: "fingerprint"})
        private fingerprint: string | null = null;

        //@JsonCreator
        public constructor(@JsonProperty({value: "id", required: true}) id: DID) {
                        super();

            this.type = DIDExport.DID_EXPORT;
            this.id = id;
        }

        public getId(): DID {
            return this.id;
        }

        public getDocument(): DIDDocument {
            return this.document.content;
        }

        public setDocument(doc: DIDDocument) {
            this.document = new DIDStore.DIDExport.Document(doc, doc.getMetadata().isEmpty() ? null : doc.getMetadata());
        }

        public getCredentials(): VerifiableCredential[] {
            if (this.credentials == null)
                return [];

            let vcs: VerifiableCredential[] = [];
            for (let cred of this.credentials)
                vcs.push(cred.content);

            return vcs;
        }

        public addCredential(credential: VerifiableCredential) {
            if (this.credentials == null)
                this.credentials = [];

            this.credentials.push(new DIDExport.Credential(credential,
                credential.getMetadata().isEmpty() ? null : credential.getMetadata()));
        }

        public getPrivateKeys(): DIDExport.PrivateKey[] {
            return this.privatekeys != null ? this.privatekeys : [];
        }

        public addPrivatekey(id: DIDURL, privatekey: string, storepass: string, exportpass: string) /* throws DIDStoreException */ {
            if (this.privatekeys == null)
                this.privatekeys = [];

            let sk = new DIDStore.DIDExport.PrivateKey(id);
            sk.setKey(privatekey, storepass, exportpass);
            this.privatekeys.push(sk);
        }

        private calculateFingerprint(exportpass: string): string {
            let hash = createHash('sha256');
            hash.update(exportpass);
            hash.update(this.type);
            hash.update(this.id.toString());
            hash.update(this.document.content.toString(true));
            if (this.document.metadata)
                hash.update(this.document.metadata.toString(true));
            if (this.credentials) {
                for (let vc of this.credentials) {
                    hash.update(vc.toString());
                    if (vc.metadata)
                        hash.update(vc.metadata.toString());
                }
            }

            for (let sk of this.privatekeys) {
                hash.update(sk.id.toString());
                hash.update(sk.key);
            }

            hash.update(this.created.toUTCString());
            let digest = hash.digest();
            return BASE64.fromHex(digest);
        }

        public seal(exportpass: string): DIDExport {
            let now = dayjs();
            now.set("milliseconds", 0);
            this.created = now.toDate();
            this.fingerprint = this.calculateFingerprint(exportpass);
            return this;
        }

        public verify(password: string): void {
            if (this.fingerprint !== this.calculateFingerprint(password))
                throw new MalformedExportDataException(
                        "Invalid export data, fingerprint mismatch.");
        }

        protected async sanitize(): Promise<void> {
            if (this.type == null || this.type !== DIDExport.DID_EXPORT)
                throw new MalformedExportDataException(
                        "Invalid export data, unknown type.");

            if (this.created == null)
                throw new MalformedExportDataException(
                        "Invalid export data, missing created time.");

            if (this.id == null)
                throw new MalformedExportDataException(
                        "Invalid export data, missing id.");

            if (this.document == null || this.document.content == null)
                throw new MalformedExportDataException(
                        "Invalid export data, missing document.");
            this.document.content.setMetadata(this.document.metadata);

            if (this.credentials != null) {
                for (let vc of this.credentials) {
                    if (vc == null || vc.content == null)
                        throw new MalformedExportDataException(
                                "Invalid export data, invalid credential.");

                    vc.content.setMetadata(vc.metadata);
                }
            }

            if (this.privatekeys != null) {
                for (let sk of this.privatekeys) {
                    if (sk == null || sk.id == null || sk.key == null || sk.key == "")
                        throw new MalformedExportDataException(
                                "Invalid export data, invalid privatekey.");
                }
            }

            if (this.fingerprint == null || this.fingerprint == "")
                throw new MalformedExportDataException(
                        "Invalid export data, missing fingerprint.");
        }
    }

    export namespace DIDExport {
        @JsonPropertyOrder({value: ["content", "metadata"] })
        export class Document {
            @JsonProperty({value: "content"})
            @JsonClassType({type: () => [DIDDocument]})
            public content: DIDDocument;
            @JsonProperty({value: "metadata"})
            @JsonClassType({type: () => [DIDMetadata]})
            public metadata: DIDMetadata;

            //@JsonCreator
            constructor(@JsonProperty({value: "content", required: true}) content: DIDDocument,
                    @JsonProperty({value: "metadata"}) metadata: DIDMetadata) {
                this.content = content;
                this.metadata = metadata;
            }
        }

        @JsonPropertyOrder({ value: ["content", "metadata"]})
        export class Credential {
            @JsonProperty({value:"content"})
            @JsonClassType({type: () => [VerifiableCredential]})
            public content: VerifiableCredential;
            @JsonProperty({value:"metadata"})
            @JsonClassType({type: () => [CredentialMetadata]})
            public metadata: CredentialMetadata;

            // Java: @JsonCreator
            constructor(@JsonProperty({value:"content", required: true}) content: VerifiableCredential,
                @JsonProperty({value:"metadata"}) metadata: CredentialMetadata) {
                this.content = content;
                this.metadata = metadata;
            }
        }

        @JsonPropertyOrder({ value: ["id", "key"]})
        export class PrivateKey {
            @JsonProperty({value: "id"})
            @JsonClassType({type: () => [DIDURL]})
            public id: DIDURL;
            @JsonProperty({value: "key"})
            public key: string;

            // Java: @JsonCreator
            constructor(@JsonProperty({value: "id", required: true}) id: DIDURL) {
                this.id = id;
            }

            public getId(): DIDURL {
                return this.id;
            }

            public setId(id: DIDURL) {
                this.id = id;
            }

            public getKey(exportpass: string, storepass: string): string {
                return DIDStore.reEncrypt(this.key, exportpass, storepass);
            }

            public setKey(key: string, storepass: string, exportpass: string) {
                this.key = DIDStore.reEncrypt(key, storepass, exportpass);
            }
        }
    }

    @JsonPropertyOrder({ value: [ "type", "mnemonic", "privatekey", "publickey",
        "index", "default",  "created", "fingerprint"]})
    @JsonInclude({value : JsonIncludeType.NON_NULL})
    export class RootIdentityExport extends DIDEntity<RootIdentityExport> {
        private static DID_EXPORT = "did.elastos.export/2.0";

        @JsonProperty({ value: "type"})
        private type: string;
        @JsonProperty({ value: "mnemonic"})
        private mnemonic: string;
        @JsonProperty({value: "privateKey"})
        private privatekey: string;
        @JsonProperty({ value: "publicKey"})
        private publickey: string;
        @JsonProperty({ value: "index"})
        @JsonClassType({type: () => [Number]})
        private index: number;
        @JsonProperty({value: "default"})
        @JsonClassType({type: () => [Boolean]})
        private default: boolean;
        @JsonProperty({value: "created"})
        @JsonClassType({type: () => [Date]})
        private created: Date;
        @JsonProperty({ value: "fingerprint"})
        private fingerprint: string;

        //@JsonCreator
        public constructor() {
            super();
            this.type = RootIdentityExport.DID_EXPORT;
        }

        public getMnemonic(exportpass: string, storepass: string): string {
            return this.mnemonic == null ? null : DIDStore.reEncrypt(this.mnemonic, exportpass, storepass);
        }

        public setMnemonic(mnemonic: string, storepass: string, exportpass: string): void {
            this.mnemonic = DIDStore.reEncrypt(mnemonic, storepass, exportpass);
        }

        public getPrivateKey(exportpass: string, storepass: string): string {
            return DIDStore.reEncrypt(this.privatekey, exportpass, storepass);
        }

        public setPirvateKey(privatekey: string, storepass: string, exportpass: string): void {
            this.privatekey = DIDStore.reEncrypt(privatekey, storepass, exportpass);
        }

        public getPublicKey(): string {
            return this.publickey;
        }

        public setPublicKey(publicKey: string): void {
            this.publickey = publicKey;
        }

        public getIndex(): number {
            return this.index;
        }

        public setIndex(index: number): void {
            this.index = index;
        }

        public isDefault(): boolean {
            return this.default == true ? true : false;
        }

        public setDefault(): void {
            this.default = true;
        }

        private calculateFingerprint(exportpass: string): string {
            let hash = createHash("sha256");
            hash.update(exportpass);
            hash.update(this.type);
            if (this.mnemonic)
                hash.update(this.mnemonic);
            hash.update(this.privatekey);
            hash.update(this.publickey);
            hash.update(this.index.toString());
            hash.update(this.default.toString());
            hash.update(this.created.toUTCString());

            let digest = hash.digest();
            return BASE64.fromHex(digest);
        }

        public seal(exportpass: string): RootIdentityExport {
            let now = dayjs();
            now.set("milliseconds", 0);
            this.created = now.toDate();
            this.fingerprint = this.calculateFingerprint(exportpass);
            return this;
        }

        public verify(password: string): void {
            if (this.fingerprint !== this.calculateFingerprint(password))
                throw new MalformedExportDataException(
                    "Invalid export data, fingerprint mismatch.");
        }

        protected async sanitize(): Promise<void> {
            if (this.type == null || this.type !== RootIdentityExport.DID_EXPORT)
            throw new MalformedExportDataException(
                    "Invalid export data, unknown type.");

            if (this.created == null)
                throw new MalformedExportDataException(
                        "Invalid export data, missing created time.");

            if (this.privatekey == null || this.privatekey == "")
                throw new MalformedExportDataException(
                        "Invalid export data, missing key.");

            if (this.fingerprint == null || this.fingerprint == "")
                throw new MalformedExportDataException(
                        "Invalid export data, missing fingerprint.");
        }
    }
}
function saveAs(content: Blob, zipFile: string) {
    throw new Error("Function not implemented.");
}

