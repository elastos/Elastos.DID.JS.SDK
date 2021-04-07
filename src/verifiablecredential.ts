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
import { JsonPropertyOrder, JsonProperty, JsonFormat, JsonInclude, JsonCreator, JsonIncludeType } from "jackson-js";
import { Collections } from "./collections";
import { CredentialMetadata } from "./credentialmetadata";
import { DID } from "./did";
import { DIDEntity } from "./didentity";
import { DIDObject } from "./didobject";
import { DIDStore } from "./didstore";
import { DIDURL } from "./didurl";
import { MalformedCredentialException, NotAttachedWithStoreException } from "./exceptions/exceptions";
import { Logger } from "./logger";

const log = new Logger("VerifiableCredential");

/**
 * VerifiableCredential is a set of one or more claims made by the same entity.
 *
 * Credential might also include an identifier and metadata to
 * describe properties of the credential.
 */
@JsonPropertyOrder({value:[
	VerifiableCredential.ID,
	VerifiableCredential.TYPE,
	VerifiableCredential.ISSUER,
	VerifiableCredential.ISSUANCE_DATE,
	VerifiableCredential.EXPIRATION_DATE,
	VerifiableCredential.CREDENTIAL_SUBJECT,
	VerifiableCredential.PROOF
]})
// TODO: convert from java - @JsonFilter("credentialFilter")
export class VerifiableCredential extends DIDEntity<VerifiableCredential> implements DIDObject<string> {
	protected static ID = "id";
	protected static TYPE = "type";
	protected static ISSUER = "issuer";
	protected static ISSUANCE_DATE = "issuanceDate";
	protected static EXPIRATION_DATE = "expirationDate";
	protected static CREDENTIAL_SUBJECT = "credentialSubject";
	protected static PROOF = "proof";
	protected static VERIFICATION_METHOD = "verificationMethod";
	protected static CREATED = "created";
	protected static SIGNATURE = "signature";

	@JsonProperty({value:VerifiableCredential.ID})
	private id: DIDURL;
	@JsonProperty({value:VerifiableCredential.TYPE})
	// TODO: migrate from java - @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY})
	private type: string[];
	@JsonProperty({value:VerifiableCredential.ISSUER})
	private issuer: DID;
	@JsonProperty({value:VerifiableCredential.ISSUANCE_DATE})
	private issuanceDate: Date;
	@JsonProperty({value:VerifiableCredential.EXPIRATION_DATE})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private expirationDate: Date;
	@JsonProperty({value:VerifiableCredential.CREDENTIAL_SUBJECT})
	private subject: VerifiableCredential.Subject;
	@JsonProperty({value:VerifiableCredential.PROOF})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private proof: VerifiableCredential.Proof;

	private metadata: CredentialMetadata;

	/**
	 * Default constructor.
	 */
	protected VerifiableCredential() {
	}

	/**
	 * Constructs a credential object, copy the contents from the given object.
	 *
	 * @param vc the source credential object
	 */
	private VerifiableCredential(vc: VerifiableCredential, withProof: boolean) {
		this.id = vc.id;
		this.type = vc.type;
		this.issuer = vc.issuer;
		this.issuanceDate = vc.issuanceDate;
		this.expirationDate = vc.expirationDate;
		this.subject = vc.subject;
		if (withProof)
			this.proof = vc.proof;
	}

	private checkAttachedStore() {
		if (!this.getMetadata().attachedStore())
			throw new NotAttachedWithStoreException();
	}

	/**
	 * Get the credential id.
	 *
	 * @return the identifier
	 */
	public getId(): DIDURL {
		return this.id;
	}

	/**
	 * Get the credential type.
	 *
	 * @return the type array
	 */
	public getType(): ImmutableList<string> {
		return Collections.unmodifiableList(this.type);
	}

	/**
	 * Get the credential issuer.
	 *
	 * @return the issuer's DID
	 */
	public getIssuer(): DID {
		return this.issuer;
	}

	/**
	 * Get the issuance time.
	 *
	 * @return the issuance time
	 */
	public getIssuanceDate(): Date {
		return this.issuanceDate;
	}

	/**
	 * Checks if there is an expiration time specified.
	 *
	 * @return whether the credential has expiration time
	 */
	protected hasExpirationDate(): boolean {
		return this.expirationDate != null;
	}

	/**
	 * Get the expires time.
	 *
	 * @return the expires time
	 */
	public getExpirationDate(): Date {
		if (this.expirationDate != null)
			return this.expirationDate;
		else {
			try {
				let controllerDoc = this.subject.id.resolve();
				if (controllerDoc != null)
					return controllerDoc.getExpires();
			} catch (e) {
				// DIDBackendException
				return null;
			}

			return null;
		}
	}

	/**
	 * Get last modified time.
	 *
	 * @return the last modified time, maybe null for old version vc
	 */
	public getLastModified(): Date {
		return this.proof.getCreated();
	}

	/**
	 * Get Credential subject content.
	 *
	 * @return the Credential Subject object
	 */
	public getSubject(): VerifiableCredential.Subject {
		return this.subject;
	}

	/**
	 * Get Credential proof object.
	 *
	 * @return the Credential Proof object
	 */
	public getProof(): VerifiableCredential.Proof {
		return this.proof;
	}

	/**
	 * Sanitize routine before sealing or after deserialization.
	 *
	 * @param withProof check the proof object or not
	 * @throws MalformedCredentialException if the credential object is invalid
	 */
	protected sanitize() {
		if (this.id == null)
			throw new MalformedCredentialException("Missing credential id");

		if (this.type == null || this.type.length == 0)
			throw new MalformedCredentialException("Missing credential type");

		if (this.issuanceDate == null)
			throw new MalformedCredentialException("Missing credential issuance date");

		if (this.subject == null)
			throw new MalformedCredentialException("Missing credential subject");

		if (this.subject.id == null)
			throw new MalformedCredentialException("Missing credential subject id");

		if (this.proof == null)
			throw new MalformedCredentialException("Missing credential proof");

		Collections.sort(this.type);

		// Update id references
		if (this.issuer == null)
			this.issuer = this.subject.id;

		if (this.id.getDid() == null)
			this.id.setDid(this.subject.id);

		if (this.proof.verificationMethod.getDid() == null)
			this.proof.verificationMethod.setDid(this.issuer);
	}

	/**
	 * Get current object's DID context.
	 *
	 * @return the DID object or null
	 */
	protected getSerializeContextDid(): DID {
		return this.getSubject().getId();
	}

	protected static PropertyFilter getFilter() {
		return new DIDPropertyFilter() {
			@Override
			protected boolean include(PropertyWriter writer, Object pojo, SerializeContext context) {
				if (context.isNormalized())
					return true;

				VerifiableCredential vc = (VerifiableCredential)pojo;
				switch (writer.getName()) {
				case ISSUER:
					return !(vc.getIssuer().equals(context.getDid()));

				default:
					return true;
				}
			}
		};
	}

	/**
	 * Set meta data for Credential.
	 *
	 * @param metadata the meta data object
	 */
	protected void setMetadata(CredentialMetadata metadata) {
		this.metadata = metadata;
		this.getId().setMetadata(metadata);
	}

	/**
	 * Get meta data object from Credential.
	 *
	 * @return the Credential Meta data object
	 */
	public synchronized CredentialMetadata getMetadata() {
		if (metadata == null) {
			/*
			// This will cause resolve recursively
			try {
				VerifiableCredential resolved = VerifiableCredential.resolve(getId(), getIssuer());
				metadata = resolved != null ? resolved.getMetadata() : new CredentialMetadata(getId());
			} catch (DIDResolveException e) {
				metadata = new CredentialMetadata(getId());
			}
			*/
			metadata = new CredentialMetadata(getId());
		}

		return metadata;
	}

	private getStore(): DIDStore {
		return this.metadata.getStore();
	}

	/**
	 * Check if the Credential is self proclaimed or not.
	 *
	 * @return whether the credential is self proclaimed
	 */
	public isSelfProclaimed(): boolean {
		return this.issuer.equals(this.subject.id);
	}

	/**
	 * Check if the Credential is expired or not.
	 *
	 * @return whether the Credential object is expired
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public isExpired(): boolean {
		if (this.expirationDate != null) {
			Calendar now = Calendar.getInstance(Constants.UTC);

			Calendar expireDate  = Calendar.getInstance(Constants.UTC);
			expireDate.setTime(this.expirationDate);

			if (now.after(expireDate))
				return true;
		}

		let controllerDoc = this.subject.id.resolve();
		if (controllerDoc != null && controllerDoc.isExpired())
			return true;

		if (!this.isSelfProclaimed()) {
			let issuerDoc = this.issuer.resolve();
			if (issuerDoc != null && issuerDoc.isExpired())
				return true;
		}

		return false;
	}

	/**
	 * Check if the Credential is expired or not in asynchronous mode.
	 *
	 * @return the new CompletableStage if success; null otherwise.
	 *         The boolean result is expired or not
	 */
	public isExpiredAsync(): Promise<boolean> {
		return new Promise((resolve, reject)=>{
			try {
				resolve(isExpired());
			} catch (e) {
				// DIDResolveException
				reject(e);
			}
		});
	}

	/**
	 * Check whether the Credential is genuine or not.
	 *
	 * @return whether the Credential object is genuine
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public isGenuine(): boolean {
		if (!this.getId().getDid().equals(this.getSubject().getId()))
			return false;

		let issuerDoc = issuer.resolve();
		if (issuerDoc == null)
			throw new DIDNotFoundException(issuer.toString());

		if (!issuerDoc.isGenuine())
			return false;

		// Credential should signed by any authentication key.
		if (!issuerDoc.isAuthenticationKey(proof.getVerificationMethod()))
			return false;

		// Unsupported public key type;
		if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
			return false; // TODO: should throw an exception?

		let vc = new VerifiableCredential(this, false);
		let json = vc.serialize(true);
		if (!issuerDoc.verify(proof.getVerificationMethod(),
				proof.getSignature(), json.getBytes()))
			return false;

		if (!isSelfProclaimed()) {
			let controllerDoc = subject.id.resolve();
			if (controllerDoc != null && !controllerDoc.isGenuine())
				return false;
		}

		return true;
	}

	/**
	 * Check whether the Credential is genuine or not in asynchronous mode.
	 *
	 * @return the new CompletableStage if success; null otherwise.
	 *         The boolean result is genuine or not
	 */
	public CompletableFuture<Boolean> isGenuineAsync() {
		CompletableFuture<Boolean> future = CompletableFuture.supplyAsync(() -> {
			try {
				return isGenuine();
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public isRevoked(): boolean {
		if (this.getMetadata().isRevoked())
			return true;

		let bio = DIDBackend.getInstance().resolveCredentialBiography(
				getId(), getIssuer());
		let revoked = bio.getStatus() == CredentialBiography.Status.REVOKED;

		if (revoked)
			getMetadata().setRevoked(revoked);

		return revoked;
	}

	public CompletableFuture<Boolean> isRevokedAsync() {
		CompletableFuture<Boolean> future = CompletableFuture.supplyAsync(() -> {
			try {
				return isRevoked();
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	/**
	 * Check whether the Credential is valid or not.
	 *
	 * @return whether the Credential object is valid
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public isValid(): boolean {
		if (expirationDate != null) {
			Calendar now = Calendar.getInstance(Constants.UTC);

			Calendar expireDate  = Calendar.getInstance(Constants.UTC);
			expireDate.setTime(expirationDate);

			if (now.after(expireDate))
				return false;
		}

		DIDDocument issuerDoc = issuer.resolve();
		if (issuerDoc == null)
			throw new DIDNotFoundException(issuer.toString());

		if (!issuerDoc.isValid())
			return false;

		// Credential should signed by any authentication key.
		if (!issuerDoc.isAuthenticationKey(proof.getVerificationMethod()))
			return false;

		// Unsupported public key type;
		if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
			return false; // TODO: should throw an exception.

		VerifiableCredential vc = new VerifiableCredential(this, false);
		String json = vc.serialize(true);
		if (!issuerDoc.verify(proof.getVerificationMethod(),
				proof.getSignature(), json.getBytes()))
			return false;


		if (!isSelfProclaimed()) {
			DIDDocument controllerDoc = subject.id.resolve();
			if (controllerDoc != null && !controllerDoc.isValid())
				return false;
		}

		return true;

	}

	/**
	 * Check whether the Credential is valid in asynchronous mode.
	 *
	 * @return the new CompletableStage if success; null otherwise.
	 * 	       The boolean result is valid or not
	 */
	public CompletableFuture<Boolean> isValidAsync() {
		CompletableFuture<Boolean> future = CompletableFuture.supplyAsync(() -> {
			try {
				return isValid();
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public boolean wasDeclared() throws DIDResolveException {
		CredentialBiography bio = DIDBackend.getInstance().resolveCredentialBiography(
				getId(), getIssuer());

		if (bio.getStatus() == CredentialBiography.Status.NOT_FOUND)
			return false;

		for (CredentialTransaction tx : bio.getAllTransactions()) {
			if (tx.getRequest().getOperation() == IDChainRequest.Operation.DECLARE)
				return true;
		}

		return false;
	}

	public void declare(signKey: DIDURL, storepass: string, DIDTransactionAdapter adapter)
			throws DIDStoreException, DIDBackendException {
		checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
		checkAttachedStore();

		if (!isGenuine()) {
			log.error("Publish failed because the credential is not genuine.");
			throw new CredentialNotGenuineException(getId().toString());
		}

		if (isExpired()) {
			log.error("Publish failed because the credential is expired.");
			throw new CredentialExpiredException(getId().toString());
		}

		if (isRevoked()) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(getId().toString());
		}

		if (wasDeclared()) {
			log.error("Publish failed because the credential already declared.");
			throw new CredentialAlreadyExistException(getId().toString());
		}

		DIDDocument owner = getStore().loadDid(getSubject().getId());
		if (owner == null) {
			// Fail-back: resolve the owner's document
			owner = getSubject().getId().resolve();
			if (owner == null)
				throw new DIDNotFoundException(getSubject().getId().toString());

			owner.getMetadata().attachStore(getStore());
		}

		if (signKey == null && owner.getDefaultPublicKeyId() == null)
			throw new InvalidKeyException("Unknown sign key");

		if (signKey != null) {
			if (!owner.isAuthenticationKey(signKey))
				throw new InvalidKeyException(signKey.toString());
		} else {
			signKey = owner.getDefaultPublicKeyId();
		}

		DIDBackend.getInstance().declareCredential(this, owner, signKey, storepass, adapter);
	}

	public declare(signKey: DIDURL, storepass: string) {
		declare(signKey, storepass, null);
	}

	public void declare(signKey: string, storepass: string, DIDTransactionAdapter adapter) {
		declare(DIDURL.valueOf(getSubject().getId(), signKey), storepass, adapter);
	}

	public void declare(signKey: string, storepass: string) {
		declare(DIDURL.valueOf(getSubject().getId(), signKey), storepass, null);
	}

	public void declare(String storepass, DIDTransactionAdapter adapter) {
		declare((DIDURL)null, storepass, adapter);
	}

	public void declare(String storepass)
			throws DIDStoreException, DIDBackendException {
		declare((DIDURL)null, storepass, null);
	}

	public CompletableFuture<Void> declareAsync(signKey: DIDURL, storepass: string,
			DIDTransactionAdapter adapter) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				declare(signKey, storepass, adapter);
			} catch (DIDException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public CompletableFuture<Void> declareAsync(signKey: DIDURL, storepass: string) {
		return declareAsync(signKey, storepass, null);
	}

	public CompletableFuture<Void> declareAsync(signKey: string, storepass: string,
			DIDTransactionAdapter adapter) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				declare(signKey, storepass, adapter);
			} catch (DIDException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public CompletableFuture<Void> declareAsync(signKey: string, storepass: string) {
		return declareAsync(signKey, storepass, null);
	}

	public CompletableFuture<Void> declareAsync(String storepass,
			DIDTransactionAdapter adapter) {
		return declareAsync((DIDURL)null, storepass, adapter);
	}

	public CompletableFuture<Void> declareAsync(String storepass) {
		return declareAsync((DIDURL)null, storepass, null);
	}

	public void revoke(DIDDocument signer, DIDURL signKey, storepass: string,
			DIDTransactionAdapter adapter) throws DIDStoreException, DIDBackendException {
		checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
		checkAttachedStore();

		DIDDocument owner = getSubject().getId().resolve();
		if (owner == null) {
			log.error("Publish failed because the credential owner is not published.");
			throw new DIDNotFoundException(getSubject().getId().toString());
		}
		owner.getMetadata().attachStore(getStore());

		DIDDocument issuer = getIssuer().resolve();
		if (issuer == null) {
			log.error("Publish failed because the credential issuer is not published.");
			throw new DIDNotFoundException(getIssuer().toString());
		}
		issuer.getMetadata().attachStore(getStore());

		if (isRevoked()) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(getId().toString());
		}

		if (signer == null) {
			DID signerDid = (signKey != null && signKey.getDid() != null) ?
					signKey.getDid() : getSubject().getId();

			signer = getStore().loadDid(signerDid);
			if (signer == null) {
				// Fail-back: resolve the owner's document
				signer = getSubject().getId().resolve();
				if (signer == null)
					throw new DIDNotFoundException(getSubject().getId().toString());

				signer.getMetadata().attachStore(getStore());
			}
		}

		if (!signer.getSubject().equals(getSubject().getId()) &&
				!signer.getSubject().equals(getIssuer()) &&
				!owner.hasController(signer.getSubject()) &&
				!issuer.hasController(signer.getSubject())) {
			log.error("Publish failed because the invalid signer or signkey.");
			throw new InvalidKeyException("Not owner or issuer: " + signer.getSubject());
		}

		if (signKey == null && signer.getDefaultPublicKeyId() == null)
			throw new InvalidKeyException("Unknown sign key");

		if (signKey != null) {
			if (!signer.isAuthenticationKey(signKey))
				throw new InvalidKeyException(signKey.toString());
		} else {
			signKey = signer.getDefaultPublicKeyId();
		}

		DIDBackend.getInstance().revokeCredential(this, signer, signKey, storepass, adapter);
	}

	public void revoke(DIDDocument signer, DIDURL signKey, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(signer, signKey, storepass, null);
	}

	public void revoke(DIDDocument signer, storepass: string, DIDTransactionAdapter adapter)
			throws DIDStoreException, DIDBackendException {
		revoke(signer, (DIDURL)null, storepass, adapter);
	}

	public void revoke(DIDDocument signer, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(signer, (DIDURL)null, storepass, null);
	}

	public void revoke(signKey: DIDURL, storepass: string, DIDTransactionAdapter adapter)
			throws DIDStoreException, DIDBackendException {
		revoke(null, signKey, storepass, adapter);
	}

	public void revoke(signKey: DIDURL, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(null, signKey, storepass, null);
	}

	public void revoke(DIDDocument signer, String signKey, storepass: string,
			DIDTransactionAdapter adapter) throws DIDStoreException, DIDBackendException {
		revoke(signer, DIDURL.valueOf(getSubject().getId(), signKey), storepass, adapter);
	}

	public void revoke(DIDDocument signer, String signKey, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(signer, signKey, storepass, null);
	}

	public void revoke(signKey: string, storepass: string, DIDTransactionAdapter adapter)
			throws DIDStoreException, DIDBackendException {
		revoke(null, signKey, storepass, adapter);
	}

	public void revoke(signKey: string, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(null, signKey, storepass, null);
	}

	public void revoke(String storepass, DIDTransactionAdapter adapter)
			throws DIDStoreException, DIDBackendException {
		revoke(null, (DIDURL)null, storepass, adapter);
	}

	public void revoke(String storepass) throws DIDStoreException, DIDBackendException {
		revoke(null, (DIDURL)null, storepass, null);
	}

	public CompletableFuture<Void> revokeAsync(signKey: DIDURL, storepass: string,
			DIDTransactionAdapter adapter) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				revoke(signKey, storepass, adapter);
			} catch (DIDException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public CompletableFuture<Void> revokeAsync(signKey: DIDURL, storepass: string) {
		return revokeAsync(signKey, storepass, null);
	}

	public CompletableFuture<Void> revokeAsync(signKey: string, storepass: string,
			DIDTransactionAdapter adapter) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				revoke(signKey, storepass, adapter);
			} catch (DIDException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public CompletableFuture<Void> revokeAsync(signKey: string, storepass: string) {
		return revokeAsync(signKey, storepass, null);
	}

	public CompletableFuture<Void> revokeAsync(String storepass,
			DIDTransactionAdapter adapter) {
		return revokeAsync((DIDURL)null, storepass, adapter);
	}

	public CompletableFuture<Void> revokeAsync(String storepass) {
		return revokeAsync((DIDURL)null, storepass, null);
	}

	public static void revoke(DIDURL id, DIDDocument signer, DIDURL signKey,
			String storepass, DIDTransactionAdapter adapter)
			throws DIDStoreException, DIDBackendException {
		checkArgument(id != null, "Invalid credential id");
		checkArgument(signer != null, "Invalid issuer's document");
		checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
		if (!signer.getMetadata().attachedStore())
			throw new NotAttachedWithStoreException(signer.getSubject().toString());

		CredentialBiography bio = DIDBackend.getInstance().resolveCredentialBiography(id, signer.getSubject());
		if (bio.getStatus() == CredentialBiography.Status.REVOKED) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(id.toString());
		}

		if (bio.getStatus() == CredentialBiography.Status.VALID) {
			VerifiableCredential vc = bio.getTransaction(0).getRequest().getCredential();
			if (!signer.getSubject().equals(vc.getSubject().getId()) &&
					signer.getSubject().equals(vc.getIssuer())) {
				log.error("Publish failed because the invalid signer or signkey.");
				throw new InvalidKeyException("Not owner or issuer: " + signer.getSubject());
			}
		}

		if (signKey == null && signer.getDefaultPublicKeyId() == null)
			throw new InvalidKeyException("Unknown sign key");

		if (signKey != null) {
			if (!signer.isAuthenticationKey(signKey))
				throw new InvalidKeyException(signKey.toString());
		} else {
			signKey = signer.getDefaultPublicKeyId();
		}

		DIDBackend.getInstance().revokeCredential(id, signer, signKey, storepass, adapter);
	}

	public static void revoke(DIDURL id, DIDDocument issuer, DIDURL signKey, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(id, issuer, signKey, storepass, null);
	}

	public static void revoke(String id, DIDDocument issuer, String signKey,
			String storepass, DIDTransactionAdapter adapter)
					throws DIDStoreException, DIDBackendException {
		revoke(DIDURL.valueOf(id), issuer, DIDURL.valueOf(issuer.getSubject(), signKey),
				storepass, adapter);
	}

	public static void revoke(String id, DIDDocument issuer, String signKey, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(DIDURL.valueOf(id), issuer, DIDURL.valueOf(issuer.getSubject(), signKey),
				storepass, null);
	}

	public static void revoke(DIDURL id, DIDDocument issuer, storepass: string,
			DIDTransactionAdapter adapter) throws DIDStoreException, DIDBackendException {
		revoke(id, issuer, null, storepass, adapter);
	}

	public static void revoke(DIDURL id, DIDDocument issuer, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(id, issuer, null, storepass, null);
	}

	public static void revoke(String id, DIDDocument issuer, storepass: string,
			DIDTransactionAdapter adapter) throws DIDStoreException, DIDBackendException {
		revoke(DIDURL.valueOf(id), issuer, null, storepass, adapter);
	}

	public static void revoke(String id, DIDDocument issuer, storepass: string)
			throws DIDStoreException, DIDBackendException {
		revoke(DIDURL.valueOf(id), issuer, null, storepass, null);
	}

	public static CompletableFuture<Void> revokeAsync(DIDURL id, DIDDocument issuer,
			DIDURL signKey, storepass: string, DIDTransactionAdapter adapter) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				revoke(id, issuer, signKey, storepass, adapter);
			} catch (DIDException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<Void> revokeAsync(DIDURL id,
			DIDDocument issuer, DIDURL signKey, storepass: string) {
		return revokeAsync(id, issuer, signKey, storepass, null);
	}

	public static CompletableFuture<Void> revokeAsync(String id, DIDDocument issuer,
			String signKey, storepass: string, DIDTransactionAdapter adapter) {
		CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
			try {
				revoke(id, issuer, signKey, storepass, adapter);
			} catch (DIDException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<Void> revokeAsync(String id,
			DIDDocument issuer, String signKey, storepass: string) {
		return revokeAsync(id, issuer, signKey, storepass, null);
	}

	public static CompletableFuture<Void> revokeAsync(DIDURL id, DIDDocument issuer,
			String storepass, DIDTransactionAdapter adapter) {
		return revokeAsync(id, issuer, null, storepass, adapter);
	}

	public static CompletableFuture<Void> revokeAsync(DIDURL id,
			DIDDocument issuer, storepass: string) {
		return revokeAsync(id, issuer, null, storepass, null);
	}

	public static CompletableFuture<Void> revokeAsync(String id, DIDDocument issuer,
			String storepass, DIDTransactionAdapter adapter) {
		return revokeAsync(id, issuer, null, storepass, adapter);
	}

	public static CompletableFuture<Void> revokeAsync(String id,
			DIDDocument issuer, storepass: string) {
		return revokeAsync(id, issuer, null, storepass, null);
	}

	public static VerifiableCredential resolve(DIDURL id, DID issuer, boolean force)
			throws DIDResolveException {
		if (id == null)
			throw new IllegalArgumentException();

		VerifiableCredential vc = DIDBackend.getInstance().resolveCredential(
				id, issuer, force);
		if (vc != null)
			id.setMetadata(vc.getMetadata());

		return vc;
	}

	public static VerifiableCredential resolve(String id, String issuer, boolean force)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), DID.valueOf(issuer), force);
	}

	public static VerifiableCredential resolve(DIDURL id, DID issuer)
			throws DIDResolveException {
		return resolve(id, issuer, false);
	}

	public static VerifiableCredential resolve(String id, String issuer)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), DID.valueOf(issuer), false);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	public static VerifiableCredential resolve(DIDURL id, boolean force)
			throws DIDResolveException {
		return resolve(id, null, force);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed
	 */
	public static VerifiableCredential resolve(String id, boolean force)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), null, force);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	public static VerifiableCredential resolve(DIDURL id)
			throws DIDResolveException {
		return resolve(id, null, false);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	public static VerifiableCredential resolve(String id)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), null, false);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	public static CompletableFuture<VerifiableCredential> resolveAsync(DIDURL id, DID issuer, boolean force) {
		CompletableFuture<VerifiableCredential> future = CompletableFuture.supplyAsync(() -> {
			try {
				return resolve(id, issuer, force);
			} catch (DIDBackendException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	public static CompletableFuture<VerifiableCredential> resolveAsync(String id, String issuer, boolean force) {
		CompletableFuture<VerifiableCredential> future = CompletableFuture.supplyAsync(() -> {
			try {
				return resolve(id, issuer, force);
			} catch (DIDBackendException | MalformedDIDURLException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(DIDURL id, DID issuer) {
		return resolveAsync(id, issuer, false);
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(String id, String issuer) {
		return resolveAsync(id, issuer, false);
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(DIDURL id, boolean force) {
		return resolveAsync(id, null, force);
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(String id, boolean force) {
		return resolveAsync(id, null, force);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	public static CompletableFuture<VerifiableCredential> resolveAsync(DIDURL id) {
		return resolveAsync(id, null, false);
	}

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	public static CompletableFuture<VerifiableCredential> resolveAsync(String id) {
		return resolveAsync(id, null, false);
	}

	public static CredentialBiography resolveBiography(DIDURL id, DID issuer)
			throws DIDResolveException {
		checkArgument(id != null, "Invalid credential id");

		return DIDBackend.getInstance().resolveCredentialBiography(id, issuer);
	}

	public static CredentialBiography resolveBiography(DIDURL id)
			throws DIDResolveException {
		checkArgument(id != null, "Invalid credential id");

		return DIDBackend.getInstance().resolveCredentialBiography(id);
	}

	public static CredentialBiography resolveBiography(String id, String issuer)
			throws DIDResolveException {
		return resolveBiography(DIDURL.valueOf(id), DID.valueOf(issuer));
	}

	public static CredentialBiography resolveBiography(String id)
			throws DIDResolveException {
		return resolveBiography(id, null);
	}

	public static CompletableFuture<CredentialBiography> resolveBiographyAsync(DIDURL id, DID issuer) {
		CompletableFuture<CredentialBiography> future = CompletableFuture.supplyAsync(() -> {
			try {
				return resolveBiography(id, issuer);
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<CredentialBiography> resolveBiographyAsync(DIDURL id) {
		CompletableFuture<CredentialBiography> future = CompletableFuture.supplyAsync(() -> {
			try {
				return resolveBiography(id);
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<CredentialBiography> resolveBiographyAsync(String id, String issuer) {
		CompletableFuture<CredentialBiography> future = CompletableFuture.supplyAsync(() -> {
			try {
				return resolveBiography(id, issuer);
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<CredentialBiography> resolveBiographyAsync(String id) {
		CompletableFuture<CredentialBiography> future = CompletableFuture.supplyAsync(() -> {
			try {
				return resolveBiography(id);
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static List<DIDURL> list(DID did, int skip, int limit)
			throws DIDResolveException {
		checkArgument(did != null, "Invalid did");

		return DIDBackend.getInstance().listCredentials(did, skip, limit);
	}

	public static List<DIDURL> list(DID did, int limit)
			throws DIDResolveException {
		checkArgument(did != null, "Invalid did");

		return DIDBackend.getInstance().listCredentials(did, 0, limit);
	}

	public static List<DIDURL> list(DID did)
			throws DIDResolveException {
		checkArgument(did != null, "Invalid did");

		return DIDBackend.getInstance().listCredentials(did, 0, 0);
	}

	public static CompletableFuture<List<DIDURL>> listAsync(DID did, int skip, int limit) {
		CompletableFuture<List<DIDURL>> future = CompletableFuture.supplyAsync(() -> {
			try {
				return list(did, skip, limit);
			} catch (DIDResolveException e) {
				throw new CompletionException(e);
			}
		});

		return future;
	}

	public static CompletableFuture<List<DIDURL>> listAsync(DID did, int limit) {
		return listAsync(did, 0, limit);
	}

	public static CompletableFuture<List<DIDURL>> listAsync(DID did) {
		return listAsync(did, 0, 0);
	}

	/**
	 * Parse a VerifiableCredential object from from a string JSON
	 * representation.
	 *
	 * @param content the string JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 */
	public static VerifiableCredential parse(String content)
			throws MalformedCredentialException {
		try {
			return parse(content, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	}

	/**
	 * Parse a VerifiableCredential object from from a Reader object.
	 *
	 * @param src Reader object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static VerifiableCredential parse(Reader src)
			throws MalformedCredentialException, IOException {
		try {
			return parse(src, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	}

	/**
	 * Parse a VerifiableCredential object from from a InputStream object.
	 *
	 * @param src InputStream object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static VerifiableCredential parse(InputStream src)
			throws MalformedCredentialException, IOException {
		try {
			return parse(src, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	}

	/**
	 * Parse a VerifiableCredential object from from a File object.
	 *
	 * @param src File object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	public static VerifiableCredential parse(File src)
			throws MalformedCredentialException, IOException {
		try {
			return parse(src, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	}

	/**
	 * Parse a VerifiableCredential object from from a string JSON
	 * representation.
	 *
	 * @param content the string JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @deprecated use {@link #parse(String)} instead
	 */
	@Deprecated
	public static VerifiableCredential fromJson(String content)
			throws MalformedCredentialException {
		return parse(content);
	}

	/**
	 * Parse a VerifiableCredential object from from a Reader object.
	 *
	 * @param src Reader object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 * @deprecated use {@link #parse(Reader)} instead
	 */
	@Deprecated
	public static VerifiableCredential fromJson(Reader src)
			throws MalformedCredentialException, IOException {
		return parse(src);
	}

	/**
	 * Parse a VerifiableCredential object from from a InputStream object.
	 *
	 * @param src InputStream object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 * @deprecated use {@link #parse(InputStream)} instead
	 */
	@Deprecated
	public static VerifiableCredential fromJson(InputStream src)
			throws MalformedCredentialException, IOException {
		return parse(src);
	}

	/**
	 * Parse a VerifiableCredential object from from a File object.
	 *
	 * @param src File object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 * @deprecated use {@link #parse(File)} instead
	 */
	@Deprecated
	public static VerifiableCredential fromJson(File src)
			throws MalformedCredentialException, IOException {
		return parse(src);
	}

	/**
	 * The builder object defines the APIs to create the Credential.
	 *
	 * The credential object is sealed object. After set the contents for new
	 * credential, should call seal {@link Builder#seal(String)} method to
	 * create the final credential object.
	 */
	public static class Builder {
		private Issuer issuer;
		private DID target;
		private VerifiableCredential credential;

		/**
		 * Create a credential builder for DID.
		 *
		 * @param target the owner of Credential
		 */
		protected Builder(Issuer issuer, DID target) {
			this.issuer = issuer;
			this.target = target;

			credential = new VerifiableCredential();
			credential.issuer = issuer.getDid();
			credential.subject = new Subject(target);
		}

		private void checkNotSealed() throws AlreadySealedException {
			if (credential == null)
				throw new AlreadySealedException();
		}

		/**
		 * Set Credential id.
		 *
		 * @param id the Credential id
		 * @return the Builder object
		 */
		public Builder id(DIDURL id) {
			checkNotSealed();
			checkArgument(id != null && (id.getDid() == null || id.getDid().equals(target)),
					"Invalid id");

			if (id.getDid() == null)
				id = new DIDURL(target, id);

			credential.id = id;
			return this;
		}

		/**
		 * Set Credential id.
		 *
		 * @param id the Credential id
		 * @return the Builder object
		 */
		public Builder id(String id) {
			return id(DIDURL.valueOf(target, id));
		}

		/**
		 * Set Credential types.
		 *
		 * @param types the set of types
		 * @return the Builder object
		 */
		public Builder type(String ... types) {
			checkNotSealed();
			checkArgument(types != null && types.length > 0, "Invalid types");

			credential.type = new ArrayList<String>(Arrays.asList(types));
			Collections.sort(credential.type);
			return this;
		}

		private Calendar getMaxExpires() {
			Calendar cal = Calendar.getInstance(Constants.UTC);
			if (credential.getIssuanceDate() != null)
				cal.setTime(credential.getIssuanceDate());
			cal.add(Calendar.YEAR, Constants.MAX_VALID_YEARS);

			return cal;
		}

		private Builder defaultExpirationDate() {
			checkNotSealed();

			credential.expirationDate = getMaxExpires().getTime();
			return this;
		}

		/**
		 * Set expires time for Credential.
		 *
		 * @param expirationDate the expires time
		 * @return the Builder object
		 */
		public Builder expirationDate(Date expirationDate) {
			checkNotSealed();
			checkArgument(expirationDate != null, "Invalid expiration date");

			Calendar cal = Calendar.getInstance(Constants.UTC);
			cal.setTime(expirationDate);

			Calendar maxExpires = getMaxExpires();
			if (cal.after(maxExpires))
				cal = maxExpires;

			credential.expirationDate = cal.getTime();

			return this;
		}

		/**
		 * Set Credential's subject.
		 *
		 * @param properties the subject content
		 * @return the Builder object
		 */
		public Builder properties(Map<String, Object> properties) {
			checkNotSealed();

			credential.subject.properties.clear();

			if (properties == null || properties.size() == 0)
				return this;

			credential.subject.properties.putAll(properties);
			credential.subject.properties.remove(ID);
			return this;
		}

		/**
		 * Set Credential's subject.
		 *
		 * @param json the subject subject with json format
		 * @return the Builder object
		 */
		public Builder properties(String json) {
			checkNotSealed();
			checkArgument(json != null && !json.isEmpty(), "Invalid json");

			ObjectMapper mapper = getObjectMapper();
			try {
				Map<String, Object> props = mapper.readValue(json,
						new TypeReference<Map<String, Object>>() {});
				return properties(props);
			} catch (JsonProcessingException e) {
				throw new IllegalArgumentException("Invalid json", e);
			}

		}

		/**
		 * Set Credential's subject.
		 *
		 * @param name the property name
		 * @param value the property value
		 * @return the Builder object
		 */
		public Builder propertie(String name, Object value) {
			checkNotSealed();
			checkArgument(name != null && !name.isEmpty() && !name.equals(ID), "Invalid name");

			credential.subject.setProperty(name, value);
			return this;
		}

		private void sanitize() {
			if (credential.id == null)
				throw new MalformedCredentialException("Missing credential id");

			if (credential.type == null || credential.type.isEmpty())
				throw new MalformedCredentialException("Missing credential type");

			Calendar cal = Calendar.getInstance(Constants.UTC);
			credential.issuanceDate = cal.getTime();

			if (!credential.hasExpirationDate())
				defaultExpirationDate();

			credential.proof = null;
		}

		/**
		 * Seal the credential object, attach the generated proof to the
		 * credential.
		 *
		 * @param storepass the password for DIDStore
		 * @return the Credential object
		 * @throws MalformedCredentialException if the Credential is malformed
		 * @throws DIDStoreException if an error occurs when access DID store
		 */
		public VerifiableCredential seal(String storepass)
				throws MalformedCredentialException, DIDStoreException {
			checkNotSealed();
			checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

			sanitize();

			String json = credential.serialize(true);
			String sig = issuer.sign(storepass, json.getBytes());
			Proof proof = new Proof(issuer.getSignKey(), sig);
			credential.proof = proof;

			// Invalidate builder
			VerifiableCredential vc = credential;
			this.credential = null;

			return vc;
		}
	}
}


namespace VerifiableCredential {
	/**
     * The object keeps the credential subject contents.
     *
     * This id field is mandatory, should be the contoller's DID.
     * All the other fields could be defined by the application.
     * In order to support the JSON serialization, all values should be
     * JSON serializable.
	 */
	 @JsonPropertyOrder({value: [VerifiableCredential.ID]})
	 export class Subject {
		 private DID id;
		 private TreeMap<String, Object> properties;

		 /**
		  * Constructs the CredentialSubject object with given controller.
		  *
		  * @param id the controller of Credential Subject
		  */
		 @JsonCreator
		 protected Subject(@JsonProperty(value = ID) DID id) {
			 this.id = id;
			 this.properties = new TreeMap<String, Object>();
		 }

		 /**
		  * Get the controller.
		  *
		  * @return the controller's DID
		  */
		 @JsonGetter(ID)
		 public DID getId() {
			 return id;
		 }

		 /**
		  * Set the controller.
		  *
		  * @param did the controller's DID
		  */
		 protected void setId(DID did) {
			 this.id = did;
		 }

		 /**
		  * Helper getter method for properties serialization.
		  * NOTICE: Should keep the alphabetic serialization order.
		  *
		  * @return a String to Object map include all application defined
		  *         properties
		  */
		 @JsonAnyGetter
		 @JsonPropertyOrder(alphabetic = true)
		 private Map<String, Object> _getProperties() {
			 return properties;
		 }

		 /**
		  * Helper setter method for properties deserialization.
		  *
		  * @param name the property name
		  * @param value the property value
		  */
		 @JsonAnySetter
		 private void setProperty(String name, Object value) {
			 if (name.equals(ID))
				 return;

			 properties.put(name, value);
		 }

		 /**
		  * Get the subject properties.
		  *
		  * @return the properties in String to Object map. It's a read-only map
		  */
		 public Map<String, Object> getProperties() {
			 // TODO: make it unmodifiable recursively
			  return Collections.unmodifiableMap(properties);
		 }

		 /**
		  * Get the count of properties.
		  *
		  * @return the fields count
		  */
		 public int getPropertyCount() {
			 return properties.size();
		 }

		 /**
		  * Get the specified property.
		  *
		  * @param name the property name
		  * @return the property value
		  */
		 public Object getProperty(String name) {
			 return properties.get(name);
		 }

		 /**
		  * Get properties as a JSON string.
		  *
		  * @return the JSON string
		  */
		 public String getPropertiesAsString() {
			 try {
				 return getObjectMapper().writeValueAsString(properties);
			 } catch (JsonProcessingException ignore) {
				 throw new UnknownInternalException(ignore);
			 }
		 }
	 }

	 /**
	  * The proof information for verifiable credential.
	  *
	  * The default proof type is ECDSAsecp256r1.
	  */
	 @JsonPropertyOrder({ TYPE, CREATED, VERIFICATION_METHOD, SIGNATURE })
	 @JsonFilter("credentialProofFilter")
	 static public class Proof {
		 @JsonProperty(TYPE)
		 private String type;
		 @JsonProperty(CREATED)
		 @JsonInclude(Include.NON_NULL)
		 private Date created;
		 @JsonProperty(VERIFICATION_METHOD)
		 private DIDURL verificationMethod;
		 @JsonProperty(SIGNATURE)
		 private String signature;

		 /**
		  * Constructs the Proof object with the given values.
		  *
		  * @param type the verification method type
		  * @param method the verification method, normally it's a public key
		  * @param signature the signature encoded in base64 URL safe format
		  */
		 @JsonCreator
		 protected Proof(@JsonProperty(value = TYPE) String type,
				 @JsonProperty(value = VERIFICATION_METHOD, required = true) DIDURL method,
				 @JsonProperty(value = CREATED) Date created,
				 @JsonProperty(value = SIGNATURE, required = true) String signature) {
			 this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
			 this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
			 this.verificationMethod = method;
			 this.signature = signature;
		 }

		 protected Proof(DIDURL method, String signature) {
			 this(Constants.DEFAULT_PUBLICKEY_TYPE, method,
					 Calendar.getInstance(Constants.UTC).getTime(), signature);
		 }

		 /**
		  * Get the verification method type.
		  *
		  * @return the type string
		  */
		 public String getType() {
			 return type;
		 }

		 /**
		  * Get the verification method, normally it's a public key id.
		  *
		  * @return the sign key
		  */
		 public DIDURL getVerificationMethod() {
			 return verificationMethod;
		 }

		 /**
		  * Get the created timestamp.
		  *
		  * @return the created date
		  */
		 public Date getCreated() {
			 return created;
		 }

		 /**
		  * Get the signature.
		  *
		  * @return the signature encoded in URL safe base64 string
		  */
		 public String getSignature() {
			 return signature;
		 }

		 protected static PropertyFilter getFilter() {
			 return new DIDPropertyFilter() {
				 @Override
				 protected boolean include(PropertyWriter writer, Object pojo, SerializeContext context) {
					 if (context.isNormalized())
						 return true;

					 Proof proof = (Proof)pojo;
					 switch (writer.getName()) {
					 case TYPE:
						 return !(proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE));

					 default:
						 return true;
					 }
				 }
			 };
		 }

	 }
}