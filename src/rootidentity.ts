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

// NOTE: Ideally the nodejs build should use the native buffer, browser should use the polyfill.
// Buf haven't found a way to make this work for typescript files at the rollup build level.
import crypto from "crypto";
import {
    DIDAlreadyExistException,
    DIDDeactivatedException, DIDResolveException, DIDStoreException,
    IllegalArgumentException, MalformedMetadataException, RootIdentityAlreadyExistException,
    UnknownInternalException
} from "./exceptions/exceptions";
import { ByteBuffer, ConflictHandle, DIDStore, SHA256 } from "./internals";
import { AbstractMetadata, checkArgument, DefaultConflictHandle, DID, DIDDocument, DIDEntity, DIDURL, HDKey, Mnemonic } from "./internals";
import { JSONObject } from "./json";
import { Logger } from "./logger";

const log = new Logger("RootIdentity");

export class RootIdentity {
    private mnemonic: string;

    private rootPrivateKey: HDKey;
    private preDerivedPublicKey: HDKey;
    private index: number;

    private id: string;
    private metadata: RootIdentity.Metadata;

    private constructor() { }

    private static newFromMnemonic(mnemonic: string, passphrase: string): RootIdentity {
        let rootIdentity = new RootIdentity();
        rootIdentity.mnemonic = mnemonic;

        if (passphrase == null)
            passphrase = "";

        rootIdentity.rootPrivateKey = HDKey.newWithMnemonic(mnemonic, passphrase);
        rootIdentity.preDerivedPublicKey = rootIdentity.rootPrivateKey.deriveWithPath(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
        rootIdentity.index = 0;
        return rootIdentity;
    }

    private static newFromPrivateKey(rootPrivateKey: HDKey): RootIdentity {
        let rootIdentity = new RootIdentity();
        rootIdentity.rootPrivateKey = rootPrivateKey;
        rootIdentity.preDerivedPublicKey = rootPrivateKey.deriveWithPath(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
        rootIdentity.index = 0;
        return rootIdentity;
    }

    private static newFromPreDerivedPublicKey(preDerivedPublicKey: HDKey, index: number): RootIdentity {
        let rootIdentity = new RootIdentity();
        rootIdentity.preDerivedPublicKey = preDerivedPublicKey;
        rootIdentity.index = index;
        return rootIdentity;
    }

    public static getIdFromMnemonic(mnemonic: string, passphrase: string): string {
        let rootidentity = this.newFromMnemonic(mnemonic, passphrase);
        return rootidentity.getId();
    }

    /**
     * Initialize private identity by mnemonic.
     *
     * @param mnemonic the mnemonic string
     * @param passphrase the password for mnemonic to generate seed
     * @param storepass the password for DIDStore
     * @param force force = true, must create new private identity;
     *              force = false, must not create new private identity if there is private identity.
     * @throws DIDStoreException there is private identity if user need unforce mode.
     */
    public static createFromMnemonic(mnemonic: string, passphrase: string, store: DIDStore, storepass: string, overwrite = false): RootIdentity {
        checkArgument(mnemonic != null && mnemonic !== "", "Invalid mnemonic");
        checkArgument(store != null, "Invalid DID store");
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");

        try {
            checkArgument(Mnemonic.checkIsValid(mnemonic), "Invalid mnemonic.");
        } catch (e) { // MnemonicException
            throw new IllegalArgumentException(e);
        }

        if (passphrase == null)
            passphrase = "";

        let identity = RootIdentity.newFromMnemonic(mnemonic, passphrase);

        if (store.containsRootIdentity(identity.getId()) && !overwrite)
            throw new RootIdentityAlreadyExistException(identity.getId() + " already exist");

        identity.setMetadata(new RootIdentity.Metadata(identity.getId(), store));
        store.storeRootIdentity(identity, storepass);
        identity.wipe();

        return identity;
    }

    /**
     * Initialize private identity by extended private key.
     *
     * @param extentedPrivateKey the extented private key string
     * @param storepass the password for DIDStore
     * @param force force = true, must create new private identity;
     *              force = false, must not create new private identity if there is private identity.
     * @throws DIDStoreException there is private identity if user need unforce mode.
     */
    public static createFromPrivateKey(extentedPrivateKey: string, store: DIDStore, storepass: string, overwrite = false): RootIdentity {
        checkArgument(extentedPrivateKey != null && extentedPrivateKey !== "",
            "Invalid extended private key");
        checkArgument(store != null, "Invalid DID store");
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");

        let rootPrivateKey = HDKey.deserializeBase58(extentedPrivateKey);
        let identity = RootIdentity.newFromPrivateKey(rootPrivateKey);

        if (store.containsRootIdentity(identity.getId()) && !overwrite)
            throw new RootIdentityAlreadyExistException(identity.getId() + " already exist");

        identity.setMetadata(new RootIdentity.Metadata(identity.getId(), store));
        store.storeRootIdentity(identity, storepass);
        identity.wipe();

        return identity;
    }

    public static createFromPreDerivedPublicKey(preDerivedPublicKey: string, index: number): RootIdentity {
        let key = preDerivedPublicKey == null ? null : HDKey.deserializeBase58(preDerivedPublicKey);

        return RootIdentity.newFromPreDerivedPublicKey(key, index);
    }

    private wipe() {
        this.rootPrivateKey.wipe();

        this.mnemonic = null;
        this.rootPrivateKey = null;
    }

    protected getStore(): DIDStore {
        return this.metadata.getStore();
    }

    public setMetadata(metadata: RootIdentity.Metadata) {
        this.metadata = metadata;
    }

    public static getId(key: Buffer): string {
        checkArgument(key != null && key.length > 0, "Invalid key bytes");
        return crypto.createHash('md5').update(key.toString('hex'), "hex").digest("hex");
    }

    public getId(): string {
        if (this.id == null)
            this.id = RootIdentity.getId(this.preDerivedPublicKey.serializePublicKey());

        return this.id;
    }

    public getAlias(): string {
        return this.metadata.getAlias();
    }

    public setAlias(alias: string) {
        this.metadata.setAlias(alias);
    }

    public setAsDefault() {
        this.getStore().setDefaultRootIdentity(this);
    }

    public getDefaultDid(): DID {
        let did = this.metadata.getDefaultDid();
        if (did == null)
            return this.getDid(0);

        return did;
    }

    public setDefaultDid(did: DID | string) {
        if (did instanceof DID)
            this.metadata.setDefaultDid(did);
        else
            this.metadata.setDefaultDid(DID.from(did as string));
    }

    public setDefaultDidByIndex(index: number) {
        checkArgument(index >= 0, "Invalid index");

        this.metadata.setDefaultDid(this.getDid(index));
    }

    public getMnemonic(): string {
        return this.mnemonic;
    }

    /**
     * @Internal (tag for docs)
    */
    public getRootPrivateKey(): HDKey {
        return this.rootPrivateKey;
    }

    /**
     * @Internal (tag for docs)
    */
    public getPreDerivedPublicKey(): HDKey {
        return this.preDerivedPublicKey;
    }

    public getIndex(): number {
        return this.index;
    }

    protected setIndex(idx: number) {
        this.index = idx;
        this.getStore().storeRootIdentity(this);
    }

    protected incrementIndex(): number {
        let idx = ++this.index;
        this.getStore().storeRootIdentity(this);
        return idx;
    }

    /**
     * Get DID with specified index.
     *
     * @param index the index
     * @return the DID object
     */
    public getDid(index: number): DID {
        checkArgument(index >= 0, "Invalid index");
        let key = this.preDerivedPublicKey.deriveWithIndex(0).deriveWithIndex(index);
        return new DID(DID.METHOD, key.getAddress());
    }

    /**
     * Get DID with specified index.
     *
     * @param index the index
     * @return the DID object
     */
     public getDidFromIdentifier(identifier: string, securityCode: number = 0): DID {
        let key = this.preDerivedPublicKey.deriveWithPath(this.mapToDerivePath(identifier, securityCode, true));
        return new DID(DID.METHOD, key.getAddress());
    }

    public static async lazyCreateDidPrivateKey(id: DIDURL, store: DIDStore, storepass: string): Promise<Buffer> {
        let doc = await store.loadDid(id.getDid());
        if (doc == null) {
            log.error("INTERNAL - Missing document for DID: {}", id.getDid());
            throw new DIDStoreException("Missing document for DID: " + id.getDid());
        }

        let identity = doc.getMetadata().getRootIdentityId();
        if (identity == null)
            return null;

        let key = store.derive(identity, HDKey.DERIVE_PATH_PREFIX +
            doc.getMetadata().getIndex(), storepass);

        let pk = doc.getPublicKey(id);
        if (pk == null) {
            log.error("INTERNAL - Invalid public key: {}", id);
            throw new DIDStoreException("Invalid public key: " + id);
        }

        if (key.getPublicKeyBase58() !== pk.getPublicKeyBase58()) {
            log.error("INTERNAL - Invalid DID metadata: {}", id.getDid());
            throw new DIDStoreException("Invalid DID metadata: " + id.getDid());
        }

        let sk = key.serialize();
        store.storePrivateKey(id, sk, storepass);
        // JAVA: store.storePrivateKey(id, key.serialize(), storepass);
        // JAVA: let sk = key.serialize();
        return sk;
    }

    private mapToDerivePath(identifier: string, securityCode: number, m: boolean = false): string {
        let digest = SHA256.encodeToBuffer(Buffer.from(identifier, "utf-8"));
        let bb = ByteBuffer.wrap(digest);

        let path: string;
        if (m)
            path = "m/";
        else
            path = "";

        while (bb.hasRemaining()) {
            let idx = bb.readInt();
            path = path.concat((idx & 0x7FFFFFFF).toString()).concat("/");
        }

        path = path.concat((securityCode & 0x7FFFFFFF).toString());
        return path;
    }

    /**
     * Create a new DID with specified index and get this DID's Document content.
     *
     * @param index the index to create new did.
     * @param alias the alias string
     * @param storepass the password for DIDStore
     * @return the DIDDocument content related to the new DID
     * @throws DIDStoreException there is no private identity in DIDStore.
     */
     public async newDid(storepass: string, index: number = undefined, overwrite = false): Promise<DIDDocument> {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");

        let shouldIncrementIndexAfterCompletion = false;
        if (index === undefined) {
            index = this.getIndex();
            shouldIncrementIndexAfterCompletion = true;
        }

        checkArgument(index >= 0, "Invalid index");

        let did = this.getDid(index);
        let doc = await this.getStore().loadDid(did);
        if (doc != null) {
            if (await doc.isDeactivated())
                throw new DIDDeactivatedException(did.toString() + " is deactivated");

            if (!overwrite)
                throw new DIDAlreadyExistException("DID already exists in the store.");
        }

        try {
            doc = await did.resolve();
            if (doc != null) {
                if (await doc.isDeactivated())
                    throw new DIDDeactivatedException(did.toString() + " is deactivated");

                if (!overwrite)
                    throw new DIDAlreadyExistException("DID already published.");
            }
        } catch (e) {
            if (e instanceof DIDResolveException && !overwrite)
                throw e;
        }

        log.debug("Creating new DID {} at index {}...", did.toString(), index);

        let key = this.getStore().derive(this.getId(), HDKey.DERIVE_PATH_PREFIX + index, storepass);
        try {
            let id = DIDURL.from("#primary", did);
            this.getStore().storePrivateKey(id, key.serialize(), storepass);

            let db = DIDDocument.Builder.newFromDID(did, this.getStore());
            db.addAuthenticationKey(id, key.getPublicKeyBase58());
            doc = await db.seal(storepass);

            doc.getMetadata().setRootIdentityId(this.getId());
			doc.getMetadata().setIndex(index);
			doc.getMetadata().attachStore(this.getStore());

            await this.getStore().storeDid(doc);

            if (shouldIncrementIndexAfterCompletion)
                this.incrementIndex();

            return doc;
        } catch (e) {
            // MalformedDocumentException
            throw new UnknownInternalException(e);
        } finally {
            key.wipe();
        }
    }

    /**
         * Create a new DID with specified identifier and security code.
         *
         * @param securityCode user specified security code.
         * @param identifier application secified identifier.
         * @param alias the alias string
         * @param storepass the password for DIDStore
         * @return the DIDDocument content related to the new DID
         * @throws DIDStoreException there is no private identity in DIDStore.
         */
    public async newDidFromIdentifier(storepass: string, identifier: string, securityCode: number = 0, overwrite = false): Promise<DIDDocument> {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");
        checkArgument(identifier != null && identifier!== "", "Invalid identifier");

        let path = HDKey.PRE_DERIVED_PUBLICKEY_PATH + "/" + this.mapToDerivePath(identifier, securityCode);
        let key = this.getStore().derive(this.getId(), path, storepass);
        let did = new DID(DID.METHOD, key.getAddress());

        let doc = await this.getStore().loadDid(did);
        if (doc != null) {
            if (await doc.isDeactivated())
                throw new DIDDeactivatedException(did.toString() + " is deactivated");

            if (!overwrite)
                throw new DIDAlreadyExistException("DID already exists in the store.");
        }

        try {
            doc = await did.resolve();
            if (doc != null) {
                if (await doc.isDeactivated())
                    throw new DIDDeactivatedException(did.toString() + " is deactivated");

                if (!overwrite)
                    throw new DIDAlreadyExistException("DID already published.");
            }
        } catch (e) {
            if (e instanceof DIDResolveException && !overwrite)
                throw e;
        }

        log.debug("Creating new DID {} with iden {}...", did.toString(), securityCode);

        try {
            let id = DIDURL.from("#primary", did);
            this.getStore().storePrivateKey(id, key.serialize(), storepass);

            let db = DIDDocument.Builder.newFromDID(did, this.getStore());
            db.addAuthenticationKey(id, key.getPublicKeyBase58());
            doc = await db.seal(storepass);

            doc.getMetadata().setRootIdentityId(this.getId());
            doc.getMetadata().setExtra("application", identifier);
            doc.getMetadata().setExtra("securityCode", securityCode);
            doc.getMetadata().attachStore(this.getStore());

            await this.getStore().storeDid(doc);
            return doc;
        } catch (e) {
            // MalformedDocumentException
            throw new UnknownInternalException(e);
        } finally {
            key.wipe();
        }
    }

    public hasMnemonic(): boolean {
        return this.getStore().containsRootIdentityMnemonic(this.getId());
    }

    /**
     * Export mnemonic from DIDStore
     *
     * @param storepass the password for DIDStore
     * @return the mnemonic string
     * @throws DIDStoreException there is no mnemonic in DID Store.
     */
    public exportMnemonic(storepass: string): string {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");

        return this.getStore().exportRootIdentityMnemonic(this.getId(), storepass);
    }

    // Java: synchronize()
    public async synchronizeIndex(index: number, handle: ConflictHandle = null): Promise<boolean> {
        checkArgument(index >= 0, "Invalid index");

        if (handle == null)
            handle = DefaultConflictHandle.getInstance();

        let did = this.getDid(index);
        log.info("Synchronize {}/{}...", did.toString(), index);

        let resolvedDoc = await did.resolve(true);
        if (resolvedDoc == null) {
            log.info("Synchronize {}/{}...not exists", did.toString(), index);
            return false;
        }

        log.debug("Synchronize {}/{}..exists, got the on-chain copy.", did.toString(), index);
        let finalDoc = resolvedDoc;
        let localDoc = await this.getStore().loadDid(did);
        if (localDoc != null) {
            // Update metadata off-store, then store back
            localDoc.getMetadata().detachStore();

            if (localDoc.getSignature() === resolvedDoc.getSignature() ||
                (localDoc.getMetadata().getSignature() != null &&
                    localDoc.getProof().getSignature() ===
                    localDoc.getMetadata().getSignature())) {
                finalDoc.getMetadata().merge(localDoc.getMetadata());
            } else {
                log.debug("{} on-chain copy conflict with local copy.", did.toString());

                // Local copy was modified
                finalDoc = handle.merge(resolvedDoc, localDoc);
                if (finalDoc == null || !finalDoc.getSubject().equals(did)) {
                    log.error("Conflict handle merge the DIDDocument error.");
                    throw new DIDStoreException("deal with local modification error.");
                } else {
                    log.debug("Conflict handle return the final copy.");
                }
            }
        }

        let metadata = finalDoc.getMetadata();
        metadata.setPublished(resolvedDoc.getMetadata().getPublished());
        metadata.setSignature(resolvedDoc.getProof().getSignature());
        if (resolvedDoc.getMetadata().isDeactivated())
            metadata.setDeactivated(true);

        metadata.setRootIdentityId(this.getId());
        metadata.setIndex(index);
        if (localDoc != null)
            localDoc.getMetadata().attachStore(this.getStore())
        await this.getStore().storeDid(finalDoc);
        this.getStore().storeLazyPrivateKey(finalDoc.getDefaultPublicKeyId());

        return true;
    }

    /**
     * Synchronize DIDStore.
     *
     * @param handle the handle to ConflictHandle
     * @throws DIDResolveException synchronize did faile with resolve error.
     * @throws DIDStoreException there is no private identity in DIDStore.
     */
    public async synchronize(handle: ConflictHandle = null): Promise<void> {
        log.info("Synchronize root identity {}...", this.getId());

        let lastIndex = this.getIndex() - 1;
        let blanks = 0;
        let i = 0;

        while (i < lastIndex || blanks < 20) {
            let exists = await this.synchronizeIndex(i, handle);
            if (exists) {
                if (i > lastIndex)
                    lastIndex = i;

                blanks = 0;
            } else {
                if (i > lastIndex)
                    blanks++;
            }

            i++;
        }

        if (lastIndex >= this.getIndex())
            this.setIndex(lastIndex + 1);
    }
}

/* eslint-disable no-class-assign */
export namespace RootIdentity {
    export class Metadata extends AbstractMetadata {
        public static DEFAULT_DID = "defaultDid";

        private id: string;

        constructor(id: string = null, store: DIDStore | null = null) {
            super(store);
            this.id = id;
        }

        public setId(id: string) {
            this.id = id;
        }

        /**
         * Set transaction id for CredentialMetadata.
         *
         * @param txid the transaction id string
         */
        public setDefaultDid(did: DID) {
            this.put(Metadata.DEFAULT_DID, did.toString());
        }

        /**
         * Get the last transaction id.
         *
         * @return the transaction string
         */
        public getDefaultDid(): DID {
            return DID.from(this.get(Metadata.DEFAULT_DID) as string);
        }

        protected save() {
            if (this.attachedStore()) {
                try {
                    this.getStore().storeRootIdentityMetadata(this.id, this);
                } catch (e) {
                    if (e instanceof DIDStoreException)
                        log.error("INTERNAL - error store metadata for credential {}", this.id);
                    throw e;
                }
            }
        }

        public static parse(content: string | JSONObject, context: DID = null): Metadata {
            try {
                return DIDEntity.deserialize(content, Metadata, context);
            } catch (e) {
                // DIDSyntaxException
                if (e instanceof MalformedMetadataException)
                    throw e;
                else
                    throw new MalformedMetadataException(e);
            }
        }
    }
}
