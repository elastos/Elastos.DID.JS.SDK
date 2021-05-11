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
import { JsonClassType, JsonCreator, JsonProperty } from "jackson-js";
import { CredentialMetadata } from "./credentialmetadata";
import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDEntity } from "./didentity";
import { DIDMetadata } from "./didmetadata";
import { DIDStorage } from "./didstorage";
import { DIDURL } from "./didurl";
import { DIDStoreCryptoException, DIDStoreException, IllegalArgumentException, WrongPasswordException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { RootIdentity } from "./rootidentity";
import { checkArgument } from "./utils";
import { LRUCache } from "./lrucache";
import { Aes256cbc } from "./crypto/aes256cbc";
import { HDKey } from "./crypto/hdkey";
import { VerifiableCredential } from "./verifiablecredential";
import { Hashable } from "./hashable";
import { Comparable } from "./comparable";
import { FileSystemStorage } from "./filesystemstorage";
import { EcdsaSigner } from "./crypto/ecdsasigner";
import dayjs from "dayjs";
import { AdvancedString } from "./advancedstring";
import { ConflictHandle } from "./conflicthandle";
import { DefaultConflictHandle } from "./defaultconflicthandle";
import { DIDStoreMetadata } from "./didstoremetadata";
import { Buffer } from "./buffer";

/**
 * DIDStore is local store for all DIDs.
 */
 const log = new Logger("DIDStore");

 export class DIDStore {

	private static CACHE_INITIAL_CAPACITY = 16;
	private static CACHE_MAX_CAPACITY = 128;

	private static NULL = new Object();

	private static DID_EXPORT = "did.elastos.export/2.0";

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
		this.metadata = storage.loadMetadata();
		this.metadata.attachStore(this);

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
		public static open(context: string, initialCacheCapacity: number = DIDStore.CACHE_INITIAL_CAPACITY, maxCacheCapacity: number = DIDStore.CACHE_MAX_CAPACITY): DIDStore {
			checkArgument(context != null, "Invalid store context");
			checkArgument(maxCacheCapacity >= initialCacheCapacity, "Invalid cache capacity spec");

			let storage = new FileSystemStorage(context);
			return new DIDStore(initialCacheCapacity, maxCacheCapacity, storage);
		}

		public close() {
			// log.verbose("Cache statistics: {}", cache.stats().toString());
			this.cache.invalidateAll();
			this.cache = null;
			this.metadata = null;
			this.storage = null;
		}

		private static calcFingerprint(password: string): string {
			let passwordDigest = CryptoJS.MD5(password).toString();

			try {
				let cipher = Aes256cbc.encrypt(Buffer.from(passwordDigest, "utf-8"), password);
				let digest = CryptoJS.MD5(cipher.toString("utf-8"));
				return CryptoJS.enc.Hex.stringify(digest);
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
		public loadRootIdentity(id: string = undefined): RootIdentity {
			if (id === undefined) {
				id = this.metadata.getDefaultRootIdentity();
				if (id == null || id === "") {
					let ids = this.storage.listRootIdentities();
					if (ids.length != 1) {
						return null;
					} else {
						let identity = ids[0];
						this.metadata.setDefaultRootIdentity(identity.getId());
						return identity;
					}
				}
			}

			checkArgument(id != null && id !== "", "Invalid id");

			try {
				let value = this.cache.get(DIDStore.Key.forRootIdentity(id), ()=>{
					let identity = this.storage.loadRootIdentity(id);
					if (identity != null) {
						identity.setMetadata(this.loadRootIdentityMetadata(id));
						return {value: identity};
					} else {
						return {value: DIDStore.NULL};
					}
				});

				return value == DIDStore.NULL ? null : value;
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

				if (value != DIDStore.NULL) {
					let keyData = this.decrypt(value, storepass);
					return HDKey.deserialize(keyData);
				} else {
					return null;
				}
			} catch (e) {
				// ExecutionException
				throw new DIDStoreException("Load root identity private key failed: " + id, e);
			}
		}

		public derive(id: string, path: string, storepass: string): HDKey {
			checkArgument(id != null && id !== "", "Invalid identity");
			checkArgument(path != null && path !== "", "Invalid path");
			checkArgument(storepass != null && storepass !== "", "Invalid storepass");

			let rootPrivateKey = this.loadRootIdentityPrivateKey(id, storepass);
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

		public listRootIdentities(): RootIdentity[] {
			return this.storage.listRootIdentities();
			// TODO - Check if we need to clone the list or not like java probably does - return Collections.unmodifiableList(this.storage.listRootIdentities());
		}

		public containsRootIdentities(): boolean {
			return this.storage.containsRootIdenities();
		}

		public storeRootIdentityMetadata(id: string, metadata: RootIdentity.Metadata ) {
			checkArgument(id != null && id !== "", "Invalid id");
			checkArgument(metadata != null, "Invalid metadata");

			this.storage.storeRootIdentityMetadata(id, metadata);
		}

		protected loadRootIdentityMetadata(id: string): RootIdentity.Metadata {
			checkArgument(id != null && id !== "", "Invalid id");

			let metadata = this.storage.loadRootIdentityMetadata(id);
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
		public storeDid(doc: DIDDocument) {
			checkArgument(doc != null, "Invalid doc");

			this.storage.storeDid(doc);
			if (doc.getStore() != this) {
				let metadata = this.loadDidMetadata(doc.getSubject());
				doc.getMetadata().merge(metadata);
				this.storeDidMetadata(doc.getSubject(), doc.getMetadata());

				doc.getMetadata().attachStore(this);
			}

			for (let vc of doc.getCredentials())
				this.storeCredential(vc);

			this.cache.put(DIDStore.Key.forDidDocument(doc.getSubject()), doc);
		}

		/**
		 * Load the specified DID content(DIDDocument).
		 *
		 * @param did the specified DID
		 * @return the DIDDocument object
		 * @throws DIDStoreException DIDStore error.
		 */
		public loadDid(didOrString: DID | string): DIDDocument {
			checkArgument(didOrString != null, "Invalid did");

			let did: DID;
			if (!(didOrString instanceof DID))
				did = DID.valueOf(didOrString);
			else
				did = didOrString;

			try {
				let value = this.cache.get(DIDStore.Key.forDidDocument(did), () => {
					let doc = this.storage.loadDid(did);
					if (doc != null) {
						doc.setMetadata(this.loadDidMetadata(did));
						return {value: doc};
					} else {
						return {value: DIDStore.NULL};
					}
				});

				return value == DIDStore.NULL ? null : value;
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
				return this.loadDid(DID.valueOf(did)) != null;
		}

		/**
		 * Store DID Metadata.
		 *
		 * @param did the owner of Metadata
		 * @param metadata the meta data
		 * @throws DIDStoreException DIDStore error.
		 */
		protected storeDidMetadata(did: DID, metadata: DIDMetadata) {
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
		protected loadDidMetadata(did: DID): DIDMetadata {
			checkArgument(did != null, "Invalid did");

			try {
				let value = this.cache.get(DIDStore.Key.forDidMetadata(did), () => {
					let metadata = this.storage.loadDidMetadata(did);
					if (metadata != null) {
						metadata.setDid(did);
						metadata.attachStore(this);
					} else {
						metadata = new DIDMetadata(did, this);
					}

					return {value: metadata};
				});

				return value == DIDStore.NULL ? null : value;
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
				did = DID.valueOf(didOrString);

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
		public listDids(): ImmutableList<DID> {
			let dids = this.storage.listDids();
			for (let did of dids) {
				let metadata = this.loadDidMetadata(did);
				did.setMetadata(metadata);
			}

			return ImmutableList<DID>(dids);
		}

		public selectDids(filter: DIDStore.DIDFilter): ImmutableList<DID> {
			let dids = this.listDids();

			if (filter != null) {
				let dest: DID[] = []

				for (let did of dids) {
					if (filter.select(did))
						dest.push(did);
				}

				dids = ImmutableList<DID>(dest);
			}

			return ImmutableList<DID>(dids);
		}

		/**
		 * Store the specified Credential.
		 *
		 * @param credential the Credential object
		 * @throws DIDStoreException DIDStore error.
		 */
		public storeCredential(credential: VerifiableCredential) {
			checkArgument(credential != null, "Invalid credential");

			this.storage.storeCredential(credential);
			if (credential.getMetadata().getStore() != this) {
				let metadata = this.loadCredentialMetadata(credential.getId());
				credential.getMetadata().merge(metadata);
				this.storeCredentialMetadata(credential.getId(), credential.getMetadata());

				credential.getMetadata().attachStore(this);
			}

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
		public loadCredential(id: DIDURL | string): VerifiableCredential {
			checkArgument(id != null, "Invalid credential id");

			if (typeof id === "string")
				id = DIDURL.valueOf(id);

			try {
				let value = this.cache.get(DIDStore.Key.forCredential(id), ()=>{
					let vc = this.storage.loadCredential(id as DIDURL);
					if (vc != null) {
						vc.setMetadata(this.loadCredentialMetadata(id as DIDURL));
						return {value: vc};
					} else {
						return {value: DIDStore.NULL};
					}
				});

				return value == DIDStore.NULL ? null : value;
			} catch (e) {
				// ExecutionException
				throw new DIDStoreException("Load credential failed: " + id, e);
			}
		}

		/**
		 * Load the specified Credential.
		 *
		 * @param did the owner of Credential
		 * @param id the identifier of Credential
		 * @return the Credential object
		 * @throws DIDStoreException DIDStore error.
		 */
		/* public VerifiableCredential loadCredential(String id)
				throws DIDStoreException {
			return loadCredential(DIDURL.valueOf(id));
		} */

		/**
		 * Judge whether does DIDStore contain the specified credential.
		 *
		 * @param did the owner of Credential
		 * @param id the identifier of Credential
		 * @return the returned value is true if there is no credential owned the specific DID;
		 *         the returned value is false if there is credentials owned the specific DID.
		 * @throws DIDStoreException DIDStore error.
		 */
		public containsCredential(id: DIDURL | string): boolean {
			checkArgument(id != null, "Invalid credential id");
			return this.loadCredential(id) != null;
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
			return containsCredentials(DID.valueOf(did));
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
		 protected loadCredentialMetadata(id: DIDURL): CredentialMetadata {
			checkArgument(id != null, "Invalid credential id");

			try {
				let value = this.cache.get(DIDStore.Key.forCredentialMetadata(id), () => {
					let metadata = this.storage.loadCredentialMetadata(id);
					if (metadata != null) {
						metadata.setId(id);
						metadata.attachStore(this);
					} else {
						metadata = new CredentialMetadata(id, this);
					}

					return {value: metadata};
				});

				return value == DIDStore.NULL ? null : value;
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

			let id: DIDURL;
			if (idOrString instanceof DIDURL)
				id = idOrString;
			else
				id = DIDURL.valueOfUrl(idOrString);

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
		public listCredentials(didOrString: DID | string): ImmutableList<DIDURL> {
			checkArgument(didOrString != null, "Invalid did");

			let did: DID;
			if (didOrString instanceof DID)
				did = didOrString;
			else
				did = DID.valueOf(didOrString);

			let ids = this.storage.listCredentials(did);
			for (let id of ids) {
				let metadata = this.loadCredentialMetadata(id);
				id.setMetadata(metadata);
			}

			return ImmutableList(ids);
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
		public selectCredentials(didOrString: DID | string, filter: DIDStore.CredentialFilter): ImmutableList<DIDURL> {
			checkArgument(didOrString != null, "Invalid did");

			let did: DID;
			if (didOrString instanceof DID)
				did = didOrString;
			else
				did = DID.valueOf(didOrString);

			let vcs = this.listCredentials(did);

			if (filter != null) {
				let dest: DIDURL[] = [];
				for (let id of vcs) {
					if (filter.select(id))
						dest.push(id);
				}

				vcs = ImmutableList(dest);
			}

			return ImmutableList(vcs);
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

			let id: DIDURL;
			if (idOrString instanceof DIDURL)
				id = idOrString;
			else
				id = DIDURL.valueOfUrl(idOrString);

			checkArgument(privateKey != null && privateKey.length != 0, "Invalid private key");
			checkArgument(storepass != null && storepass !== "", "Invalid storepass");

			let encryptedKey = this.encrypt(privateKey, storepass);
			this.storage.storePrivateKey(id, encryptedKey);

			this.cache.put(DIDStore.Key.forDidPrivateKey(id), encryptedKey);
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
		 public loadPrivateKey(id: DIDURL, storepass?: string): Buffer {
			checkArgument(id != null, "Invalid private key id");

			let encryptedKey: string = null;
			if (storepass !== undefined) {
				let value = this.cache.get(DIDStore.Key.forDidPrivateKey(id), () => {
					let encryptedKey = this.storage.loadPrivateKey(id);
					return {
						value: encryptedKey != null ? encryptedKey : DIDStore.NULL
					};
				});

				encryptedKey = value == DIDStore.NULL ? null : value;
			}
			else {
				checkArgument(storepass && storepass != null, "Invalid storepass");
			}

			if (encryptedKey == null) {
				// fail-back to lazy private key generation
				return RootIdentity.lazyCreateDidPrivateKey(id, this, storepass);
			} else {
				return this.decrypt(encryptedKey, storepass);
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

			if (id instanceof DIDURL)
				return this.loadPrivateKey(id) != null;
			else
				return this.loadPrivateKey(DIDURL.valueOfUrl(id)) != null;
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
				return this.storage.containsPrivateKeys(DID.valueOf(did));
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

			let id: DIDURL;
			if (idOrString instanceof DIDURL)
				id = idOrString;
			else
				id = DIDURL.valueOfUrl(idOrString);

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
		public sign(id: DIDURL, storepass: string, digest: Buffer): string {
			checkArgument(id != null, "Invalid private key id");
			checkArgument(storepass != null && storepass !== "", "Invalid storepass");
			checkArgument(digest != null && digest.length > 0, "Invalid digest");

			let key = HDKey.deserialize(this.loadPrivateKey(id, storepass));
			let sig = EcdsaSigner.sign(key.getPrivateKeyBytes(), digest);
			key = null;

			// TODO: check this! not sure buffer.toString() is what we need here, beware the encodings...
			return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(sig.toString()));
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

		public synchronize(handle: ConflictHandle = null) {
			if (handle == null)
				handle = DefaultConflictHandle.getInstance();

			let identities = this.storage.listRootIdentities();
			for (let identity of identities) {
				identity.synchronize(handle);
			}

			let dids = this.storage.listDids();
			for (let did of dids) {
				let localDoc = this.storage.loadDid(did);
				if (localDoc.isCustomizedDid()) {
					let resolvedDoc = did.resolve();
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

					this.storage.storeDid(finalDoc);
				}

				let vcIds = this.storage.listCredentials(did);
				for (let vcId of vcIds) {
					let localVc = this.storage.loadCredential(vcId);

					let resolvedVc = VerifiableCredential.resolve(vcId, localVc.getIssuer());
					if (resolvedVc == null)
						continue;

					resolvedVc.getMetadata().merge(localVc.getMetadata());
					this.storage.storeCredential(resolvedVc);
				}
			}
		}

		public synchronizeAsync(handle: ConflictHandle = null): Promise<void> {
			return new Promise((resolve, reject)=>{
				try {
					this.synchronize(handle);
					resolve();
				}
				catch (e) {
					reject(e);
				}
			});
		}

		public exportDid(did: DID | string, password: string, storepass: string): DIDStore.DIDExport {
			if (typeof did === "string")
				did = DID.valueOf(did);

			// All objects should load directly from storage,
			// avoid affects the cached objects.
			let doc = this.storage.loadDid(did);
			if (doc == null)
				throw new DIDStoreException("Export DID " + did + " failed, not exist.");

			doc.setMetadata(this.storage.loadDidMetadata(did));

			log.debug("Exporting {}...", did.toString());

			let de = new DIDStore.DIDExport(DIDStore.DID_EXPORT, did);
			de.setDocument(doc);

			if (this.storage.containsCredentials(did)) {
				let ids = Array.from(this.listCredentials(did));
				ids.sort();
				for (let id of ids) {
					log.debug("Exporting credential {}...", id.toString());

					let vc = this.storage.loadCredential(id);
					vc.setMetadata(this.storage.loadCredentialMetadata(id));
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

			return de.seal(password);
		}

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(DID did, OutputStream out, String password,
	String storepass) throws DIDStoreException, IOException {
	checkArgument(did != null, "Invalid did");
	checkArgument(out != null, "Invalid output stream");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	exportDid(did, password, storepass).serialize(out, true);
} */

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(String did, OutputStream out, String password,
	String storepass) throws DIDStoreException, IOException {
	exportDid(DID.valueOf(did), out, password, storepass);
} */

		/**
		 * Export DID information into file with json format. The json content
		 *  include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(DID did, Writer out, String password,
	String storepass) throws DIDStoreException, IOException {
	checkArgument(did != null, "Invalid did");
	checkArgument(out != null, "Invalid output writer");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	exportDid(did, password, storepass).serialize(out, true);
} */

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID string
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(String did, Writer out, String password, String storepass)
throws DIDStoreException, IOException {
	exportDid(DID.valueOf(did), out, password, storepass);
} */

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID
		 * @param file the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(DID did, File file, String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(did != null, "Invalid did");
	checkArgument(file != null, "Invalid output file");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	exportDid(did, password, storepass).serialize(file, true);
} */

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID string
		 * @param file the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(String did, File file, String password, String storepass)
throws DIDStoreException, IOException {
	exportDid(DID.valueOf(did), file, password, storepass);
} */

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID
		 * @param file the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(DID did, String file, String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(did != null, "Invalid did");
	checkArgument(file != null && !file.isEmpty(), "Invalid output file name");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	exportDid(did, new File(file), password, storepass);
} */

		/**
		 * Export DID information into file with json format. The json content
		 * include document, credentials, private keys and meta.
		 *
		 * @param did the specified DID string
		 * @param file the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportDid(String did, String file, String password, String storepass)
throws DIDStoreException, IOException {
	exportDid(DID.valueOf(did), file, password, storepass);
}
*/
		private importDid(de: DIDStore.DIDExport, password: string, storepass: string) {
			/* TODO de.verify(password);

			// Save
			log.debug("Importing document...");
			DIDDocument doc = de.document.content;
			storage.storeDid(doc);
			storage.storeDidMetadata(doc.getSubject(), doc.getMetadata());

			List < VerifiableCredential > vcs =  de.getCredentials();
			for (VerifiableCredential vc : vcs) {
				log.debug("Importing credential {}...", vc.getId().toString());
				storage.storeCredential(vc);
				storage.storeCredentialMetadata(vc.getId(), vc.getMetadata());
			}

			List < DIDExport.PrivateKey > sks = de.getPrivateKeys();
			for (DIDExport.PrivateKey sk : sks) {
				log.debug("Importing private key {}...", sk.getId().toString());
				storage.storePrivateKey(sk.getId(), sk.getKey(password, storepass));
			}*/
		}

		/**
		 * Import DID information by input.
		 *
		 * @param in the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importDid(InputStream in, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(in != null, "Invalid input stream");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	DIDExport de;
	try {
		de = DIDExport.parse(in, DIDExport.class);
	} catch (DIDSyntaxException e) {
		throw (MalformedExportDataException)e;
	}
	importDid(de, password, storepass);
} */

		/**
		 * Import DID information by input.
		 *
		 * @param in the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importDid(Reader in, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(in != null, "Invalid input reader");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	DIDExport de;
	try {
		de = DIDExport.parse(in, DIDExport.class);
	} catch (DIDSyntaxException e) {
		throw (MalformedExportDataException)e;
	}
	importDid(de, password, storepass);
} */

		/**
		 * Import DID information by input.
		 *
		 * @param file the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importDid(File file, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(file != null, "Invalid input file");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	DIDExport de;
	try {
		de = DIDExport.parse(file, DIDExport.class);
	} catch (DIDSyntaxException e) {
		throw (MalformedExportDataException)e;
	}
	importDid(de, password, storepass);
} */

		/**
		 * Import DID information by input.
		 *
		 * @param file the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importDid(String file, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(file != null, "Invalid input file name");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invaid store password");

	importDid(new File(file), password, storepass);
} */

/* @JsonPropertyOrder({
	"type", "mnemonic", "privateKey", "publicKey",
	"index", "default", "created", "fingerprint" })
@JsonInclude(Include.NON_NULL)
static class RootIdentityExport extends DIDEntity<RootIdentityExport> {
	@JsonProperty("type")
	private String type;
	@JsonProperty("mnemonic")
	private String mnemonic;
	@JsonProperty("privateKey")
	private String privateKey;
	@JsonProperty("publicKey")
	private String publicKey;
	@JsonProperty("index")
	private int index;
	@JsonProperty("default")
	@JsonInclude(Include.NON_NULL)
	private Boolean isDefault;
	@JsonProperty("created")
	private Date created;
	@JsonProperty("fingerprint")
	private String fingerprint;

	@JsonCreator
	protected RootIdentityExport(@JsonProperty(value = "type", required = true) String type) {
		if (type == null)
			throw new IllegalArgumentException("Invalid export type");

		this.type = type;
	}

	public String getMnemonic(String exportpass, String storepass)
	throws DIDStoreException {
	return mnemonic == null ? null : reEncrypt(mnemonic, exportpass, storepass);
}

			public void setMnemonic(String mnemonic, String storepass, String exportpass)
throws DIDStoreException {
	this.mnemonic = reEncrypt(mnemonic, storepass, exportpass);
}

			public String getPrivateKey(String exportpass, String storepass)
throws DIDStoreException {
	return reEncrypt(privateKey, exportpass, storepass);
}

			public void setPrivateKey(String privateKey, String storepass, String exportpass)
throws DIDStoreException {
	this.privateKey = reEncrypt(privateKey, storepass, exportpass);
}

			public String getPublicKey() {
	return publicKey;
}

			public void setPubkey(String publicKey) {
	this.publicKey = publicKey;
}

			public int getIndex() {
	return index;
}

			public void setIndex(int index) {
	this.index = index;
}

			public boolean isDefault() {
	return isDefault == null ? false : isDefault;
}

			public void setDefault() {
	isDefault = Boolean.valueOf(true);
}

			private String calculateFingerprint(String exportpass) {
	SHA256Digest sha256 = new SHA256Digest();
	byte[] bytes = exportpass.getBytes();
	sha256.update(bytes, 0, bytes.length);

	bytes = type.getBytes();
	sha256.update(bytes, 0, bytes.length);

	if (mnemonic != null) {
		bytes = mnemonic.getBytes();
		sha256.update(bytes, 0, bytes.length);
	}

	bytes = privateKey.getBytes();
	sha256.update(bytes, 0, bytes.length);

	bytes = publicKey.getBytes();
	sha256.update(bytes, 0, bytes.length);

	bytes = Integer.toString(index).getBytes();
	sha256.update(bytes, 0, bytes.length);

	bytes = Boolean.toString(isDefault()).getBytes();
	sha256.update(bytes, 0, bytes.length);

	bytes = dateFormat.format(created).getBytes();
	sha256.update(bytes, 0, bytes.length);

	byte digest[] = new byte[32];
	sha256.doFinal(digest, 0);
	return Base64.encodeToString(digest,
		Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
}

			public RootIdentityExport seal(String exportpass) {
	Calendar now = Calendar.getInstance();
	now.set(Calendar.MILLISECOND, 0);
	this.created = now.getTime();
	this.fingerprint = calculateFingerprint(exportpass);
	return this;
}

			public void verify(String exportpass) throws MalformedExportDataException {
	if (!fingerprint.equals(calculateFingerprint(exportpass)))
		throw new MalformedExportDataException(
			"Invalid export data, fingerprint mismatch.");
}

@Override
protected void sanitize() throws MalformedExportDataException {
	if (type == null || !type.equals(DID_EXPORT))
		throw new MalformedExportDataException(
			"Invalid export data, unknown type.");

	if (created == null)
		throw new MalformedExportDataException(
			"Invalid export data, missing created time.");

	if (privateKey == null || privateKey.isEmpty())
		throw new MalformedExportDataException(
			"Invalid export data, missing key.");

	if (fingerprint == null || fingerprint.isEmpty())
		throw new MalformedExportDataException(
			"Invalid export data, missing fingerprint.");
}
		}

		private RootIdentityExport exportRootIdentity(String id,
	String password, String storepass)
throws DIDStoreException {
	RootIdentityExport rie = new RootIdentityExport(DID_EXPORT);

	// TODO: support multiple named root identities
	String mnemonic = storage.loadRootIdentityMnemonic(id);
	if (mnemonic != null)
		rie.setMnemonic(mnemonic, storepass, password);

	rie.setPrivateKey(storage.loadRootIdentityPrivateKey(id), storepass, password);

	RootIdentity identity = storage.loadRootIdentity(id);
	rie.setPubkey(identity.getPreDerivedPublicKey().serializePublicKeyBase58());
	rie.setIndex(identity.getIndex());

	if (identity.getId().equals(metadata.getDefaultRootIdentity()))
		rie.setDefault();

	return rie.seal(password);
} */

		/**
		 * Export private identity information into file with json format.
		 * The json content include mnemonic(encrypted), extended private key(encrypted),
		 * extended public key(if has it, dont't encrypted) and index.
		 *
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportRootIdentity(String id, OutputStream out,
	String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(id != null && !id.isEmpty(), "Invalid identity id");
	checkArgument(out != null, "Invalid output stream");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	exportRootIdentity(id, password, storepass).serialize(out);
} */

		/**
		 * Export private identity information into file with json format.
		 * The json content include mnemonic(encrypted), extended private key(encrypted),
		 * extended public key(if has it, dont't encrypted) and index.
		 *
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportRootIdentity(String id, Writer out,
	String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(id != null && !id.isEmpty(), "Invalid identity id");
	checkArgument(out != null, "Invalid output writer");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	exportRootIdentity(id, password, storepass).serialize(out);
} */

		/**
		 * Export private identity information into file with json format.
		 * The json content include mnemonic(encrypted), extended private key(encrypted),
		 * extended public key(if has it, dont't encrypted) and index.
		 *
		 * @param file the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportRootIdentity(String id, File file,
	String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(id != null && !id.isEmpty(), "Invalid identity id");
	checkArgument(file != null, "Invalid output file");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	exportRootIdentity(id, password, storepass).serialize(file);
} */

		/**
		 * Export private identity information into file with json format.
		 * The json content include mnemonic(encrypted), extended private key(encrypted),
		 * extended public key(if has it, dont't encrypted) and index.
		 *
		 * @param file the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportRootIdentity(String id, String file,
	String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(id != null && !id.isEmpty(), "Invalid identity id");
	checkArgument(file != null && !file.isEmpty(), "Invalid output file name");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	exportRootIdentity(id, new File(file), password, storepass);
}

		private void importRootIdentity(RootIdentityExport rie, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	rie.verify(password);

	// Save
	String encryptedMnemonic = rie.getMnemonic(password, storepass);
	String encryptedPrivateKey = (rie.getPrivateKey(password, storepass));
	String publicKey = rie.getPublicKey();
	HDKey pk = HDKey.deserializeBase58(publicKey);
	String id = RootIdentity.getId(pk.serializePublicKey());

	storage.storeRootIdentity(id, encryptedMnemonic, encryptedPrivateKey,
		publicKey, rie.getIndex());

	if (rie.isDefault() && metadata.getDefaultRootIdentity() == null)
		metadata.setDefaultRootIdentity(id);
} */


		/**
		 * Import private identity by input.
		 *
		 * @param in the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password to DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importRootIdentity(InputStream in, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException  {
	checkArgument(in != null, "Invalid input stream");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	try {
		RootIdentityExport rie = RootIdentityExport.parse(in, RootIdentityExport.class);
		importRootIdentity(rie, password, storepass);
	} catch (DIDSyntaxException e) {
		throw (MalformedExportDataException)e;
	}
} */

		/**
		 * Import private identity by input.
		 *
		 * @param in the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password to DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importRootIdentity(Reader in, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(in != null, "Invalid input reader");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	try {
		RootIdentityExport rie = RootIdentityExport.parse(in, RootIdentityExport.class);
		importRootIdentity(rie, password, storepass);
	} catch (DIDSyntaxException e) {
		throw (MalformedExportDataException)e;
	}
} */

		/**
		 * Import private identity by input.
		 *
		 * @param file the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password to DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importRootIdentity(File file, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(file != null, "Invalid input file");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	try {
		RootIdentityExport rie = RootIdentityExport.parse(file, RootIdentityExport.class);
		importRootIdentity(rie, password, storepass);
	} catch (DIDSyntaxException e) {
		throw (MalformedExportDataException)e;
	}
} */

		/**
		 * Import private identity by input.
		 *
		 * @param file the import input
		 * @param password the password to decrypt private key in input
		 * @param storepass the password to DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importRootIdentity(String file, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(file != null && !file.isEmpty(), "Invalid input file name");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	importRootIdentity(new File(file), password, storepass);
} */

		/**
		 * Export all store information.
		 *
		 * @param out the export output
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportStore(ZipOutputStream out, String password,
	String storepass) throws DIDStoreException, IOException {
	checkArgument(out != null, "Invalid zip output stream");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	ZipEntry ze;

	List < RootIdentity > ris = listRootIdentities();
	for (RootIdentity ri : ris) {
		ze = new ZipEntry("rootIdentity-" + ri.getId());
		out.putNextEntry(ze);
		exportRootIdentity(ri.getId(), out, password, storepass);
		out.closeEntry();
	}

	List < DID > dids = listDids();
	for (DID did : dids) {
		ze = new ZipEntry(did.getMethodSpecificId());
		out.putNextEntry(ze);
		exportDid(did, out, password, storepass);
		out.closeEntry();
	}
} */

		/**
		 * Export all store information to zip file.
		 *
		 * @param zipFile the export zip file
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportStore(File zipFile, String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(zipFile != null, "Invalid zip output file");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	ZipOutputStream out = new ZipOutputStream(new FileOutputStream(zipFile));
	exportStore(out, password, storepass);
	out.close();
} */

		/**
		 * Export all store information to zip file.
		 *
		 * @param zipFile the export zip file
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void exportStore(String zipFile, String password, String storepass)
throws DIDStoreException, IOException {
	checkArgument(zipFile != null && !zipFile.isEmpty(), "Invalid zip output file name");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	exportStore(new File(zipFile), password, storepass);
} */

		/**
		 * Import Store information from input.
		 *
		 * @param in the import input
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importStore(ZipInputStream in, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(in != null, "Invalid zip input stream");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	String fingerprint = metadata.getFingerprint();
	String currentFingerprint = calcFingerprint(storepass);

	if (fingerprint != null && !currentFingerprint.equals(fingerprint))
		throw new WrongPasswordException("Password mismatched with previous password.");

	ZipEntry ze;
	while ((ze = in.getNextEntry()) != null) {
		if (ze.getName().startsWith("rootIdentity"))
			importRootIdentity(in, password, storepass);
		else
			importDid(in, password, storepass);
				in.closeEntry();
	}

	if (fingerprint == null || fingerprint.isEmpty())
		metadata.setFingerprint(currentFingerprint);
} */

		/**
		 * Import Store information from zip file.
		 *
		 * @param zipFile the import zip file
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importStore(File zipFile, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(zipFile != null, "Invalid zip input file");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	ZipInputStream in = new ZipInputStream(new FileInputStream(zipFile));
	importStore(in, password, storepass);
			in.close();
} */

		/**
		 * Import Store information from zip file.
		 *
		 * @param zipFile the import zip file
		 * @param password the password to encrypt the private key in output
		 * @param storepass the password for DIDStore
		 * @throws MalformedExportDataException if the exported data is invalid
		 * @throws DIDStoreException DIDStore error
		 * @throws IOException write json string failed
		 */
		/* public void importStore(String zipFile, String password, String storepass)
throws MalformedExportDataException, DIDStoreException, IOException {
	checkArgument(zipFile != null && !zipFile.isEmpty(), "Invalid zip input file name");
	checkArgument(password != null && !password.isEmpty(), "Invalid password");
	checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

	importStore(new File(zipFile), password, storepass);
} */
}

export namespace DIDStore {
	export interface KeyObject extends Hashable, Comparable<KeyObject> {};

	export class Key {
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

		public equals(obj: Object): boolean {
			if (obj == this)
				return true;

			if (obj instanceof Key) {
				let key = obj as Key;
				return this.type == key.type ? this.id.equals(key.id) : false;
			}

			return false;
		}

		public static forRootIdentity(id: string): Key {
			return new Key(DIDStore.Key.TYPE_ROOT_IDENTITY, new AdvancedString(id));
		}

		public static forRootIdentityPrivateKey(id: string): Key {
			return new Key(DIDStore.Key.TYPE_ROOT_IDENTITY_PRIVATEKEY, new AdvancedString(id));
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

	//@JsonPropertyOrder({ "type", "id", "document", "credential", "privatekey",
	//						 "created", "fingerprint" })
	//	@JsonInclude(Include.NON_NULL)
	export class DIDExport extends DIDEntity<DIDExport> {
		//@JsonProperty("type")
		private type: string;
		//@JsonProperty("id")
		private id: DID;
		//@JsonProperty("document")
		private document: DIDExport.Document | null = null;
		//@JsonProperty("credential")
		private credentials: DIDExport.Credential[] = [];
		//@JsonProperty("privatekey")
		private privatekeys: DIDExport.PrivateKey[] = [];
		//@JsonProperty("created")
		private created: Date | null = null;
		//@JsonProperty("fingerprint")
		private fingerprint: String | null = null;

		//@JsonCreator
		public constructor(/* @JsonProperty(value = "type", required = true) */ type: string,
					/* @JsonProperty(value = "id", required = true) */ id: DID) {
						super();
			if (type == null)
				throw new IllegalArgumentException("Invalid export type");

			this.type = type;
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
			/*SHA256Digest sha256 = new SHA256Digest();
			byte[] bytes = exportpass.getBytes();
			sha256.update(bytes, 0, bytes.length);

			bytes = type.getBytes();
			sha256.update(bytes, 0, bytes.length);

			bytes = id.toString().getBytes();
			sha256.update(bytes, 0, bytes.length);

			bytes = document.content.toString(true).getBytes();
			sha256.update(bytes, 0, bytes.length);

			if (document.metadata != null) {
				bytes = document.metadata.toString(true).getBytes();
				sha256.update(bytes, 0, bytes.length);
			}

			if (credentials != null && credentials.size() > 0) {
				for (Credential cred : credentials) {
					bytes = cred.content.toString(true).getBytes();
					sha256.update(bytes, 0, bytes.length);

					if (cred.metadata != null) {
						bytes = cred.metadata.toString(true).getBytes();
						sha256.update(bytes, 0, bytes.length);
					}
				}
			}

			if (privatekeys != null && privatekeys.size() > 0) {
				for (PrivateKey sk : privatekeys) {
					bytes = sk.id.toString().getBytes();
					sha256.update(bytes, 0, bytes.length);

					bytes = sk.key.getBytes();
					sha256.update(bytes, 0, bytes.length);
				}
			}

			bytes = dateFormat.format(created).getBytes();
			sha256.update(bytes, 0, bytes.length);

			byte digest[] = new byte[32];
			sha256.doFinal(digest, 0);
			return Base64.encodeToString(digest,
				Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);*/

			return null; // TODO
		}

		public seal(exportpass: string): DIDExport {
			let now = dayjs();
			now.set("milliseconds", 0);
			this.created = now.toDate();
			this.fingerprint = this.calculateFingerprint(exportpass);
			return this;
		}

		/*public void verify(String exportpass) throws MalformedExportDataException {
			if (!fingerprint.equals(calculateFingerprint(exportpass)))
				throw new MalformedExportDataException(
					"Invalid export data, fingerprint mismatch.");
		}

		@Override
		protected void sanitize() throws MalformedExportDataException {
			if (type == null || !type.equals(DID_EXPORT))
				throw new MalformedExportDataException(
					"Invalid export data, unknown type.");

			if (created == null)
				throw new MalformedExportDataException(
					"Invalid export data, missing created time.");

			if (id == null)
				throw new MalformedExportDataException(
					"Invalid export data, missing id.");

			if (document == null || document.content == null)
				throw new MalformedExportDataException(
					"Invalid export data, missing document.");
			document.content.setMetadata(document.metadata);

			if (credentials != null) {
				for (Credential cred : credentials) {
					if (cred == null || cred.content == null)
						throw new MalformedExportDataException(
							"Invalid export data, invalid credential.");

					cred.content.setMetadata(cred.metadata);
				}
			}

			if (privatekeys != null) {
				for (PrivateKey sk : privatekeys) {
					if (sk == null || sk.id == null || sk.key == null || sk.key.isEmpty())
						throw new MalformedExportDataException(
							"Invalid export data, invalid privatekey.");
				}
			}

			if (fingerprint == null || fingerprint.isEmpty())
				throw new MalformedExportDataException(
					"Invalid export data, missing fingerprint.");
		} */
	}

	export namespace DIDExport {
		//@JsonPropertyOrder({ "content", "metadata" })
		export class Document {
			//@JsonProperty("content")
			public content: DIDDocument;
			//@JsonProperty("metadata")
			private metadata: DIDMetadata;

			//@JsonCreator
			constructor(/* @JsonProperty(value = "content", required = true) */ content: DIDDocument,
					/* @JsonProperty(value = "metadata") */ metadata: DIDMetadata) {
				this.content = content;
				this.metadata = metadata;
			}
		}

		//@JsonPropertyOrder({ "content", "metadata" })
		export class Credential {
			@JsonProperty({value:"content"}) @JsonClassType({type: () => [VerifiableCredential]})
			public content: VerifiableCredential;
			@JsonProperty({value:"metadata"}) @JsonClassType({type: () => [CredentialMetadata]})
			private metadata: CredentialMetadata;

			// Java: @JsonCreator
			constructor(@JsonProperty({value:"content", required: true}) content: VerifiableCredential,
				@JsonProperty({value:"metadata"}) metadata: CredentialMetadata) {
				this.content = content;
				this.metadata = metadata;
			}
		}

		//@JsonPropertyOrder({ "id", "key" })
		export class PrivateKey {
			@JsonProperty({value: "id"}) @JsonClassType({type: () => [DIDURL]})
			private id: DIDURL;
			@JsonProperty({value: "key"}) @JsonClassType({type: () => [String]})
			private key: string;

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
}