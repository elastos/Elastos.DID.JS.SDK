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
import { checkArgument } from "./utils";

const log = new Logger("RootIdentity");

export class RootIdentity {
	private mnemonic: string;

	private rootPrivateKey: HDKey;
	private preDerivedPublicKey: HDKey;
	private index: AtomicInteger;

	private id: string;
	private metadata: RootIdentity.Metadata;

	private RootIdentity(String mnemonic, String passphrase) {
		this.mnemonic = mnemonic;

		if (passphrase == null)
			passphrase = "";

		this.rootPrivateKey = new HDKey(mnemonic, passphrase);
		this.preDerivedPublicKey = rootPrivateKey.derive(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
		this.index = new AtomicInteger(0);
	}

	private RootIdentity(HDKey rootPrivateKey) {
		this.rootPrivateKey = rootPrivateKey;
		this.preDerivedPublicKey = rootPrivateKey.derive(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
		this.index = new AtomicInteger(0);
	}

	private RootIdentity(HDKey preDerivedPublicKey, int index) {
		this.preDerivedPublicKey = preDerivedPublicKey;
		this.index = new AtomicInteger(index);
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
	public static create(mnemonic: string, passphrase: string,
			overwrite: boolean, store: DIDStore, storepass: string): RootIdentity {
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

		let identity = new RootIdentity(mnemonic, passphrase);

		if (store.containsRootIdentity(identity.getId()) && !overwrite)
			throw new RootIdentityAlreadyExistException(identity.getId());

		identity.setMetadata(new RootIdentity.Metadata(identity.getId(), store));
		store.storeRootIdentity(identity, storepass);
		identity.wipe();

		return identity;
	}

	/**
	 * Initialize new private identity by mnemonic with unforce mode.
	 *
	 * @param mnemonic the mnemonic string
	 * @param passphrase the password for mnemonic to generate seed
	 * @param storepass the password for DIDStore
	 * @throws DIDStoreException there is private identity if user need unforce mode.
	 */
	public static create(mnemonic: string, passphrase: string,
			store: DIDStore, storepass: string): RootIdentity {
		return this.create(mnemonic, passphrase, false, store, storepass);
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
	public static create(extentedPrivateKey: string, overwrite: boolean, store: DIDStore, storepass: string): RootIdentity {
		checkArgument(extentedPrivateKey != null && extentedPrivateKey !== "",
				"Invalid extended private key");
		checkArgument(store != null, "Invalid DID store");
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");

		let rootPrivateKey = HDKey.deserializeBase58(extentedPrivateKey);
		let identity = new RootIdentity(rootPrivateKey);

		if (store.containsRootIdentity(identity.getId()) && !overwrite)
			throw new RootIdentityAlreadyExistException(identity.getId());

		identity.setMetadata(new RootIdentity.Metadata(identity.getId(), store));
		store.storeRootIdentity(identity, storepass);
		identity.wipe();

		return identity;
	}

	/**
	 * Initialize private identity by extended private key with unforce mode.
	 *
	 * @param extentedPrivateKey the extented private key string
	 * @param storepass the password for DIDStore
	 * @throws DIDStoreException there is private identity if user need unforce mode.
	 */
	public static create(extentedPrivateKey: string,
			store: DIDStore, storepass: String): RootIdentity {
		return this.create(extentedPrivateKey, false, store, storepass);
	}

	protected static create(preDerivedPublicKey: string, index: number): RootIdentity {
		let key = preDerivedPublicKey == null ? null : HDKey.deserializeBase58(preDerivedPublicKey);

		return new RootIdentity(key, index);
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
		return this.index.get();
	}

	protected setIndex(idx: number) {
		this.index.set(idx);
		this.getStore().storeRootIdentity(this);
	}

	protected incrementIndex(): number {
		let idx = this.index.incrementAndGet();
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
	public newDid(index: number, overwrite: boolean, storepass: string): DIDDocument {
		checkArgument(index >= 0, "Invalid index");
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");

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
			let id = new DIDURL(did, "#primary");
			this.getStore().storePrivateKey(id, key.serialize(), storepass);

			let db = new DIDDocument.Builder(did, this.getStore());
			db.addAuthenticationKey(id, key.getPublicKeyBase58());
			doc = db.seal(storepass);
			this.getStore().storeDid(doc);

			return doc;
		} catch (e) {
			// MalformedDocumentException
			throw new UnknownInternalException(e);
		} finally {
			key.wipe();
		}
	}

	public newDid(index: number, storepass: number): DIDDocument {
		return this.newDid(index, false, storepass);
	}

	/**
	 * Create a new DID without alias and get this DID's Document content.
	 *
	 * @param storepass the password for DIDStore
	 * @return the DIDDocument content related to the new DID
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public newDid(overwrite: boolean, storepass: string): DIDDocument {
		let doc = this.newDid(this.getIndex(), overwrite, storepass);
		this.incrementIndex();
		return doc;
	}

	/**
	 * Create a new DID without alias and get this DID's Document content.
	 *
	 * @param storepass the password for DIDStore
	 * @return the DIDDocument content related to the new DID
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public newDid(String storepass): DIDDocument {
		return this.newDid(false, storepass);
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

	public synchronize(index: number, handle: DIDStore.ConflictHandle): boolean {
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

	public synchronize(index: number): boolean {
		return this.synchronize(index, null);
	}

	public synchronizeAsync(index: number, handle: ConflictHandle): CompletableFuture<Void>  {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				synchronize(index, handle);
			} catch (DIDResolveException | DIDStoreException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public CompletableFuture<Void> synchronizeAsync(int index) {
		return synchronizeAsync(index, null);
	}

	/**
	 * Synchronize DIDStore.
	 *
	 * @param handle the handle to ConflictHandle
	 * @throws DIDResolveException synchronize did faile with resolve error.
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public synchronize(handle: ConflictHandle = null) {
		log.info("Synchronize root identity {}...", this.getId());

		let lastIndex = this.getIndex() - 1;
		let blanks = 0;
		let i = 0;

		while (i < lastIndex || blanks < 20) {
			let exists = this.synchronize(i, handle);
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
	public synchronizeAsync(ConflictHandle handle = null): CompletableFuture<Void> {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				synchronize(handle);
			} catch (DIDResolveException | DIDStoreException e) {
				throw new CompletionException(e);
			}
		});

		return future;
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
