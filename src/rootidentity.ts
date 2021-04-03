import { AbstractMetadata } from "./abstractmetadata";
import { DID } from "./did";
import { DIDStore } from "./DIDStore";
import { DIDStoreException, IllegalArgumentException } from "./exceptions/exceptions";
import { Logger } from "./logger";
import { checkArgument } from "./utils";

const log = new Logger("RootIdentity");

export namespace RootIdentity {
	export class Metadata extends AbstractMetadata<Metadata> {
		public static DEFAULT_DID = "defaultDid";

		private id: string;

		protected constructor(id: string, store: DIDStore | null = null) {
			super(store);
			this.id = id;
		}

		protected setId(id: string) {
			this.id = id;
		}

		/**
		 * Set transaction id for CredentialMetadata.
		 *
		 * @param txid the transaction id string
		 */
		protected setDefaultDid(did: DID) {
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
	}
}

export class RootIdentity {
	private mnemonic: string;
	private rootPrivateKey: HDKey;
	private preDerivedPublicKey: HDKey;
	private index: AtomicInteger;

	private id: string;
	private metadata: Metadata;

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
	public static RootIdentity create(String mnemonic, String passphrase,
			DIDStore store, String storepass) throws DIDStoreException {
		return create(mnemonic, passphrase, false, store, storepass);
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
	public static RootIdentity create(String extentedPrivateKey, boolean overwrite,
			DIDStore store, String storepass) throws DIDStoreException {
		checkArgument(extentedPrivateKey != null && !extentedPrivateKey.isEmpty(),
				"Invalid extended private key");
		checkArgument(store != null, "Invalid DID store");
		checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

		HDKey rootPrivateKey = HDKey.deserialize(Base58.decode(extentedPrivateKey));
		RootIdentity identity = new RootIdentity(rootPrivateKey);

		if (store.containsRootIdentity(identity.getId()) && !overwrite)
			throw new RootIdentityAlreadyExistException(identity.getId());

		identity.setMetadata(new Metadata(identity.getId(), store));
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
	public static RootIdentity create(String extentedPrivateKey,
			DIDStore store, String storepass) throws DIDStoreException {
		return create(extentedPrivateKey, false, store, storepass);
	}

	protected static RootIdentity create(String preDerivedPublicKey, int index) {
		HDKey key = preDerivedPublicKey == null ? null : HDKey.deserializeBase58(preDerivedPublicKey);

		return new RootIdentity(key, index);
	}

	private void wipe() {
		rootPrivateKey.wipe();

		mnemonic = null;
		rootPrivateKey = null;
	}

	protected DIDStore getStore() {
		return metadata.getStore();
	}

	protected void setMetadata(Metadata metadata) {
		this.metadata = metadata;
	}

	protected static String getId(byte[] key) {
		checkArgument(key != null && key.length > 0, "Invalid key bytes");

		MD5Digest md5 = new MD5Digest();
		byte[] digest = new byte[md5.getDigestSize()];
		md5.update(key, 0, key.length);
		md5.doFinal(digest, 0);

		return Hex.toHexString(digest);
	}

	public synchronized String getId() {
		if (id == null)
			id = getId(preDerivedPublicKey.serializePublicKey());

		return id;
	}

	public String getAlias() {
		return metadata.getAlias();
	}

	public void setAlias(String alias) {
		metadata.setAlias(alias);
	}

	public void setAsDefault() throws DIDStoreException {
		getStore().setDefaultRootIdentity(this);
	}

	public DID getDefaultDid() {
		return metadata.getDefaultDid();
	}

	public void setDefaultDid(DID did) {
		metadata.setDefaultDid(did);
	}

	public void setDefaultDid(String did) {
		metadata.setDefaultDid(DID.valueOf(did));
	}

	public void setDefaultDid(int index) {
		checkArgument(index >=0, "Invalid index");

		metadata.setDefaultDid(getDid(index));
	}

	protected String getMnemonic() {
		return mnemonic;
	}

	protected HDKey getRootPrivateKey() {
		return rootPrivateKey;
	}

	protected HDKey getPreDerivedPublicKey() {
		return preDerivedPublicKey;
	}

	protected int getIndex() {
		return index.get();
	}

	protected void setIndex(int idx) throws DIDStoreException {
		index.set(idx);
		getStore().storeRootIdentity(this);
	}

	protected int incrementIndex() throws DIDStoreException {
		int idx = index.incrementAndGet();
		getStore().storeRootIdentity(this);
		return idx;
	}

	/**
	 * Get DID with specified index.
	 *
	 * @param index the index
	 * @return the DID object
	 */
	public DID getDid(int index) {
		checkArgument(index >= 0, "Invalid index");

		HDKey key = preDerivedPublicKey.derive("0/" + index);
		DID did = new DID(DID.METHOD, key.getAddress());
		return did;
	}

	protected static byte[] lazyCreateDidPrivateKey(DIDURL id, DIDStore store, String storepass)
			throws DIDStoreException {
		DIDDocument doc = store.loadDid(id.getDid());
		if (doc == null) {
			log.error("INTERNAL - Missing document for DID: {}", id.getDid());
			throw new DIDStoreException("Missing document for DID: " + id.getDid());
		}

		String identity = doc.getMetadata().getRootIdentityId();
		if (identity == null)
			return null;

		HDKey key = store.derive(identity, HDKey.DERIVE_PATH_PREFIX +
				doc.getMetadata().getIndex(), storepass);

		DIDDocument.PublicKey pk = doc.getPublicKey(id);
		if (pk == null) {
			log.error("INTERNAL - Invalid public key: {}", id);
			throw new DIDStoreException("Invalid public key: " + id);
		}

		if (!key.getPublicKeyBase58().equals(pk.getPublicKeyBase58())) {
			log.error("INTERNAL - Invalid DID metadata: {}", id.getDid());
			throw new DIDStoreException("Invalid DID metadata: " + id.getDid());
		}

		store.storePrivateKey(id, key.serialize(), storepass);
		byte[] sk = key.serialize();
		key.wipe();
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
	public DIDDocument newDid(int index, boolean overwrite, String storepass)
			throws DIDResolveException, DIDStoreException {
		checkArgument(index >= 0, "Invalid index");
		checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

		DID did = getDid(index);
		DIDDocument doc = getStore().loadDid(did);
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

		HDKey key = getStore().derive(getId(), HDKey.DERIVE_PATH_PREFIX + index, storepass);
		try {
			DIDURL id = new DIDURL(did, "#primary");
			getStore().storePrivateKey(id, key.serialize(), storepass);

			DIDDocument.Builder db = new DIDDocument.Builder(did, getStore());
			db.addAuthenticationKey(id, key.getPublicKeyBase58());
			doc = db.seal(storepass);
			getStore().storeDid(doc);

			return doc;
		} catch (MalformedDocumentException ignore) {
			throw new UnknownInternalException(ignore);
		} finally {
			key.wipe();
		}
	}

	public DIDDocument newDid(int index, String storepass)
			throws DIDResolveException, DIDStoreException {
		return newDid(index, false, storepass);
	}

	/**
	 * Create a new DID without alias and get this DID's Document content.
	 *
	 * @param storepass the password for DIDStore
	 * @return the DIDDocument content related to the new DID
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public synchronized DIDDocument newDid(boolean overwrite, String storepass)
			throws DIDResolveException, DIDStoreException {
		DIDDocument doc = newDid(getIndex(), overwrite, storepass);
		incrementIndex();
		return doc;
	}

	/**
	 * Create a new DID without alias and get this DID's Document content.
	 *
	 * @param storepass the password for DIDStore
	 * @return the DIDDocument content related to the new DID
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public DIDDocument newDid(String storepass)
			throws DIDResolveException, DIDStoreException {
		return newDid(false, storepass);
	}

	public boolean hasMnemonic() throws DIDStoreException {
		return getStore().containsRootIdentityMnemonic(getId());
	}

	/**
	 * Export mnemonic from DIDStore
	 *
	 * @param storepass the password for DIDStore
 	 * @return the mnemonic string
	 * @throws DIDStoreException there is no mnemonic in DID Store.
	 */
	public String exportMnemonic(String storepass) throws DIDStoreException {
		checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

		return getStore().exportRootIdentityMnemonic(getId(), storepass);
	}

	public boolean synchronize(int index, ConflictHandle handle)
			throws DIDResolveException, DIDStoreException {
		checkArgument(index >= 0, "Invalid index");

		if (handle == null)
			handle = DIDStore.defaultConflictHandle;

		DID did = getDid(index);
		log.info("Synchronize {}/{}...", did.toString(), index);

		DIDDocument resolvedDoc = did.resolve(true);
		if (resolvedDoc == null) {
			log.info("Synchronize {}/{}...not exists", did.toString(), index);
			return false;
		}

		log.debug("Synchronize {}/{}..exists, got the on-chain copy.", did.toString(), index);
		DIDDocument finalDoc = resolvedDoc;
		DIDDocument localDoc = getStore().loadDid(did);
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

		DIDMetadata metadata = finalDoc.getMetadata();
		metadata.setRootIdentityId(getId());
		metadata.setIndex(index);

		getStore().storeDid(finalDoc);
		return true;
	}

	public synchronize(index: number): boolean
			throws DIDResolveException, DIDStoreException {
		return synchronize(index, null);
	}

	public CompletableFuture<Void> synchronizeAsync(int index, ConflictHandle handle) {
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
	public void synchronize(ConflictHandle handle)
			throws DIDResolveException, DIDStoreException {
		log.info("Synchronize root identity {}...", getId());

		int lastIndex = getIndex() - 1;
		int blanks = 0;
		int i = 0;

		while (i < lastIndex || blanks < 20) {
			boolean exists = synchronize(i, handle);
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

		if (lastIndex >= getIndex())
			setIndex(lastIndex + 1);
	}

	/**
	 * Synchronize DIDStore.
	 * ConflictHandle uses default method.
	 *
	 * @param storepass the password for DIDStore
	 * @throws DIDResolveException synchronize did faile with resolve error.
	 * @throws DIDStoreException there is no private identity in DIDStore.
	 */
	public void synchronize()
			throws DIDResolveException, DIDStoreException {
		synchronize(null);
	}

    /**
     * Synchronize DIDStore with asynchronous mode.
     *
	 * @param handle the handle to ConflictHandle
	 * @param storepass the password for DIDStore
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *         resolved DIDDocument if success; null otherwise.
     */
	public CompletableFuture<Void> synchronizeAsync(ConflictHandle handle) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				synchronize(handle);
			} catch (DIDResolveException | DIDStoreException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

    /**
     * Synchronize DIDStore with asynchronous mode.
     * ConflictHandle uses default method.
     *
	 * @param storepass the password for DIDStore
	 * @return the new CompletableStage, no result.
     */
	public CompletableFuture<Void> synchronizeAsync() {
		return synchronizeAsync(null);
	}
}
