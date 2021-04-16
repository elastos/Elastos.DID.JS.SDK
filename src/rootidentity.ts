import { MD5 } from "crypto-js";
import { AbstractMetadata } from "./abstractmetadata";
import { HDKey } from "./crypto/hdkey";
import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDStore } from "./DIDStore";
import { DIDURL } from "./didurl";
import { DIDAlreadyExistException, DIDDeactivatedException, DIDStoreException, IllegalArgumentException, RootIdentityAlreadyExistException, UnknownInternalException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { Mnemonic } from "./mnemonic";
import { checkArgument, promisify } from "./utils";

const log = new Logger("RootIdentity");

export class RootIdentity {
	private mnemonic: string;

	private rootPrivateKey: HDKey;
	private preDerivedPublicKey: HDKey;
	private index: number;

	private id: string;
	private metadata: RootIdentity.Metadata;

	private constructor() {}

	public /* private */ static newFromMnemonic(mnemonic: string, passphrase: string): RootIdentity {
		let rootIdentity = new RootIdentity();
		rootIdentity.mnemonic = mnemonic;

		if (passphrase == null)
			passphrase = "";

		rootIdentity.rootPrivateKey = HDKey.newWithMnemonic(mnemonic, passphrase);
		rootIdentity.preDerivedPublicKey = rootIdentity.rootPrivateKey.derive(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
		rootIdentity.index = 0;
		return rootIdentity;
	}

	private static newFromPrivateKey(rootPrivateKey: HDKey): RootIdentity {
		let rootIdentity = new RootIdentity();
		rootIdentity.rootPrivateKey = rootPrivateKey;
		rootIdentity.preDerivedPublicKey = rootPrivateKey.derive(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
		rootIdentity.index = 0;
		return rootIdentity;
	}

	private static newFromPreDerivedPublicKey(preDerivedPublicKey: HDKey, index: number): RootIdentity {
		let rootIdentity = new RootIdentity();
		rootIdentity.preDerivedPublicKey = preDerivedPublicKey;
		rootIdentity.index = index;
		return rootIdentity;
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
	public static createFromMnemonic(mnemonic: string, passphrase: string, store: DIDStore, storepass: string, overwrite: boolean = false): RootIdentity {
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
			throw new RootIdentityAlreadyExistException(identity.getId());

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
	public static createFromPrivateKey(extentedPrivateKey: string, store: DIDStore, storepass: string, overwrite: boolean = false): RootIdentity {
		checkArgument(extentedPrivateKey != null && extentedPrivateKey !== "",
				"Invalid extended private key");
		checkArgument(store != null, "Invalid DID store");
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");

		let rootPrivateKey = HDKey.deserializeBase58(extentedPrivateKey);
		let identity = RootIdentity.newFromPrivateKey(rootPrivateKey);

		if (store.containsRootIdentity(identity.getId()) && !overwrite)
			throw new RootIdentityAlreadyExistException(identity.getId());

		identity.setMetadata(new RootIdentity.Metadata(identity.getId(), store));
		store.storeRootIdentity(identity, storepass);
		identity.wipe();

		return identity;
	}

	protected static createFromPreDerivedPublicKey(preDerivedPublicKey: string, index: number): RootIdentity {
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

	public /*protected*/ setMetadata(metadata: RootIdentity.Metadata) {
		this.metadata = metadata;
	}

	protected static getId(key: string): string {
		checkArgument(key != null && key.length > 0, "Invalid key bytes");
		return MD5(key).toString(CryptoJS.enc.Hex);
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
		return this.metadata.getDefaultDid();
	}

	public setDefaultDid(did: DID | String) {
		if (did instanceof DID)
			this.metadata.setDefaultDid(did);
		else
			this.metadata.setDefaultDid(DID.valueOf(did as string));
	}

	public setDefaultDidByIndex(index: number) {
		checkArgument(index >=0, "Invalid index");

		this.metadata.setDefaultDid(this.getDid(index));
	}

	public /*protected*/ getMnemonic(): string {
		return this.mnemonic;
	}

	public /*protected*/ getRootPrivateKey(): HDKey {
		return this.rootPrivateKey;
	}

	public /*protected*/ getPreDerivedPublicKey(): HDKey {
		return this.preDerivedPublicKey;
	}

	public /*protected*/ getIndex(): number {
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

		let key = this.preDerivedPublicKey.derive("0/" + index);
		let did = new DID(DID.METHOD, key.getAddress());
		return did;
	}

	public /*protected*/ static lazyCreateDidPrivateKey(id: DIDURL, store: DIDStore, storepass: string): string {
		let doc = store.loadDid(id.getDid());
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

		if (!key.getPublicKeyBase58().equals(pk.getPublicKeyBase58())) {
			log.error("INTERNAL - Invalid DID metadata: {}", id.getDid());
			throw new DIDStoreException("Invalid DID metadata: " + id.getDid());
		}

		store.storePrivateKey(id, key.privateExtendedKey, storepass);
		let sk = key.privateExtendedKey;
		// JAVA: store.storePrivateKey(id, key.serialize(), storepass);
		// JAVA: let sk = key.serialize();
		return sk;
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
	public newDid(storepass: string, index: number = undefined, overwrite: boolean = false): DIDDocument {
		checkArgument(index >= 0, "Invalid index");
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");

		let shouldIncrementIndexAfterCompletion = false;
		if (index === undefined) {
			index = this.getIndex();
			shouldIncrementIndexAfterCompletion = true;
		}

		let did = this.getDid(index);
		let doc = this.getStore().loadDid(did);
		if (doc != null) {
			if (doc.isDeactivated())
				throw new DIDDeactivatedException(did.toString());

			if (!overwrite)
				throw new DIDAlreadyExistException("DID already exists in the store.");
		}

		doc = did.resolve();
		if (doc != null) {
			if (doc.isDeactivated())
				throw new DIDDeactivatedException(did.toString());

			throw new DIDAlreadyExistException("DID already published.");
		}


		log.debug("Creating new DID {} at index {}...", did.toString(), index);

		let key = this.getStore().derive(this.getId(), HDKey.DERIVE_PATH_PREFIX + index, storepass);
		try {
			let id = DIDURL.valueOf(did, "#primary");
			this.getStore().storePrivateKey(id, key.serialize(), storepass);

			let db = DIDDocument.Builder.newFromDID(did, this.getStore());
			db.addAuthenticationKey(id, key.getPublicKeyBase58());
			doc = db.seal(storepass);
			this.getStore().storeDid(doc);

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
	public synchronizeIndex(index: number, handle: DIDStore.ConflictHandle = null): boolean {
		checkArgument(index >= 0, "Invalid index");

		if (handle == null)
			handle = DIDStore.defaultConflictHandle;

		let did = this.getDid(index);
		log.info("Synchronize {}/{}...", did.toString(), index);

		let resolvedDoc = did.resolve(true);
		if (resolvedDoc == null) {
			log.info("Synchronize {}/{}...not exists", did.toString(), index);
			return false;
		}

		log.debug("Synchronize {}/{}..exists, got the on-chain copy.", did.toString(), index);
		let finalDoc = resolvedDoc;
		let localDoc = this.getStore().loadDid(did);
		if (localDoc != null) {
			// Update metadata off-store, then store back
			localDoc.getMetadata().detachStore();

			if (localDoc.getSignature().equals(resolvedDoc.getSignature()) ||
					(localDoc.getMetadata().getSignature() != null &&
					localDoc.getProof().getSignature().equals(
							localDoc.getMetadata().getSignature()))) {
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
		}

		let metadata = finalDoc.getMetadata();
		metadata.setRootIdentityId(this.getId());
		metadata.setIndex(index);

		this.getStore().storeDid(finalDoc);
		return true;
	}

	public synchronizeIndexAsync(index: number, handle: DIDStore.ConflictHandle = null): Promise<boolean>  {
		return promisify(()=>this.synchronizeIndex(index, handle));
	}

	/**
	 * Synchronize DIDStore.
	 *
	 * @param handle the handle to ConflictHandle
	 * @throws DIDResolveException synchronize did faile with resolve error.
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public synchronize(handle: DIDStore.ConflictHandle = null) {
		log.info("Synchronize root identity {}...", this.getId());

		let lastIndex = this.getIndex() - 1;
		let blanks = 0;
		let i = 0;

		while (i < lastIndex || blanks < 20) {
			let exists = this.synchronizeIndex(i, handle);
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

    /**
     * Synchronize DIDStore with asynchronous mode.
     *
	 * @param handle the handle to ConflictHandle
	 * @param storepass the password for DIDStore
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *         resolved DIDDocument if success; null otherwise.
     */
	public synchronizeAsync(handle: DIDStore.ConflictHandle = null): Promise<void> {
		return promisify(()=>this.synchronize(handle));
	}
}

export namespace RootIdentity {
	export class Metadata extends AbstractMetadata {
		public static DEFAULT_DID = "defaultDid";

		private id: string;

		constructor(id: string, store: DIDStore | null = null) {
			super(store);
			this.id = id;
		}

		public /*protected*/ setId(id: string) {
			this.id = id;
		}

		/**
		 * Set transaction id for CredentialMetadata.
		 *
		 * @param txid the transaction id string
		 */
		public /*protected*/ setDefaultDid(did: DID) {
			this.put(Metadata.DEFAULT_DID, did.toString());
		}

		/**
		 * Get the last transaction id.
		 *
		 * @return the transaction string
		 */
		public getDefaultDid(): DID {
			return DID.valueOf(this.get(Metadata.DEFAULT_DID));
		}

		protected save() {
			if (this.attachedStore()) {
				try {
					this.getStore()?.storeRootIdentityMetadata(this.id, this);
				} catch (e) {
					if (e instanceof DIDStoreException)
						log.error("INTERNAL - error store metadata for credential {}", this.id);
				}
			}
		}
	};
}
