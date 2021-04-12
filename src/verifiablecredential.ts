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

import { List as ImmutableList, Map as ImmutableMap } from "immutable";
import { JsonPropertyOrder, JsonProperty, JsonFormat, JsonInclude, JsonCreator, JsonIncludeType, JsonGetter, JsonAnyGetter, JsonAnySetter, JsonFilter } from "jackson-js";
import { CredentialBiography } from "./backend/credentialbiography";
import { IDChainRequest, Operation } from "./backend/idchaindrequest";
import { Collections } from "./collections";
import { Constants } from "./constants";
import { CredentialMetadata } from "./credentialmetadata";
import { DID } from "./did";
import { DIDBackend } from "./didbackend";
import { DIDDocument } from "./diddocument";
import { DIDEntity } from "./didentity";
import { DIDObject } from "./didobject";
import { DIDStore } from "./didstore";
import { DIDTransactionAdapter } from "./didtransactionadapter";
import { DIDURL } from "./didurl";
import { AlreadySealedException, CredentialAlreadyExistException, CredentialExpiredException, CredentialNotGenuineException, CredentialRevokedException, DIDNotFoundException, IllegalArgumentException, InvalidKeyException, MalformedCredentialException, NotAttachedWithStoreException, UnknownInternalException } from "./exceptions/exceptions";
import { Issuer } from "./issuer";
import { Logger } from "./logger";
import { checkArgument } from "./utils";

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
	public /* protected */ static ID = "id";
	public /* protected */ static TYPE = "type";
	public /* protected */ static ISSUER = "issuer";
	public /* protected */ static ISSUANCE_DATE = "issuanceDate";
	public /* protected */ static EXPIRATION_DATE = "expirationDate";
	public /* protected */ static CREDENTIAL_SUBJECT = "credentialSubject";
	public /* protected */ static PROOF = "proof";
	public /* protected */ static VERIFICATION_METHOD = "verificationMethod";
	public /* protected */ static CREATED = "created";
	public /* protected */ static SIGNATURE = "signature";

	@JsonProperty({value:VerifiableCredential.ID})
	public /*private*/ id: DIDURL;
	@JsonProperty({value:VerifiableCredential.TYPE})
	// TODO: migrate from java - @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY})
	public /*private*/ type: string[];
	@JsonProperty({value:VerifiableCredential.ISSUER})
	public /*private*/ issuer: DID;
	@JsonProperty({value:VerifiableCredential.ISSUANCE_DATE})
	public /*private*/ issuanceDate: Date;
	@JsonProperty({value:VerifiableCredential.EXPIRATION_DATE})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	public /*private*/ expirationDate: Date;
	@JsonProperty({value:VerifiableCredential.CREDENTIAL_SUBJECT})
	public /*private*/ subject: VerifiableCredential.Subject;
	@JsonProperty({value:VerifiableCredential.PROOF})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	public /*private*/ proof: VerifiableCredential.Proof;

	public /*private*/ metadata: CredentialMetadata;

	constructor() {
		super();
	}

	/**
	 * Constructs a credential object, copy the contents from the given object.
	 *
	 * @param vc the source credential object
	 */
	static newWithVerifiableCredential(vc: VerifiableCredential, withProof: boolean) {
		let newVc = new VerifiableCredential();
		newVc.id = vc.id;
		newVc.type = vc.type;
		newVc.issuer = vc.issuer;
		newVc.issuanceDate = vc.issuanceDate;
		newVc.expirationDate = vc.expirationDate;
		newVc.subject = vc.subject;
		if (withProof)
			newVc.proof = vc.proof;
		return newVc;
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
		return ImmutableList(this.type);
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
	public /* protected */ sanitize() {
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

	/* protected static PropertyFilter getFilter() {
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
	} */

	/**
	 * Set meta data for Credential.
	 *
	 * @param metadata the meta data object
	 */
	protected setMetadata(metadata: CredentialMetadata) {
		this.metadata = metadata;
		this.getId().setMetadata(metadata);
	}

	/**
	 * Get meta data object from Credential.
	 *
	 * @return the Credential Meta data object
	 */
	public getMetadata(): CredentialMetadata {
		if (this.metadata == null) {
			/*
			// This will cause resolve recursively
			try {
				VerifiableCredential resolved = VerifiableCredential.resolve(getId(), getIssuer());
				metadata = resolved != null ? resolved.getMetadata() : new CredentialMetadata(getId());
			} catch (DIDResolveException e) {
				metadata = new CredentialMetadata(getId());
			}
			*/
			this.metadata = new CredentialMetadata(this.getId());
		}

		return this.metadata;
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

		let issuerDoc = this.issuer.resolve();
		if (issuerDoc == null)
			throw new DIDNotFoundException(this.issuer.toString());

		if (!issuerDoc.isGenuine())
			return false;

		// Credential should signed by any authentication key.
		if (!issuerDoc.isAuthenticationKey(this.proof.getVerificationMethod()))
			return false;

		// Unsupported public key type;
		if (!this.proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
			return false; // TODO: should throw an exception?

		let vc = new VerifiableCredential(this, false);
		let json = vc.serialize(true);
		if (!issuerDoc.verify(proof.getVerificationMethod(),
			this.proof.getSignature(), json.getBytes()))
			return false;

		if (!this.isSelfProclaimed()) {
			let controllerDoc = this.subject.id.resolve();
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
	public isGenuineAsync(): Promise<boolean> {
		return new Promise((resolve, reject)=>{
			try {
				resolve(this.isGenuine());
			} catch (e) {
				// DIDResolveException
				reject(e);
			}
		});
	}

	public isRevoked(): boolean {
		if (this.getMetadata().isRevoked())
			return true;

		let bio = DIDBackend.getInstance().resolveCredentialBiography(
			this.getId(), this.getIssuer());
		let revoked = bio.getStatus() == CredentialBiography.Status.REVOKED;

		if (revoked)
		this.getMetadata().setRevoked(revoked);

		return revoked;
	}

	public isRevokedAsync(): Promise<boolean> {
		return new Promise((resolve, reject)=>{
			try {
				resolve(this.isRevoked());
			} catch (e) {
				// DIDResolveException
				reject(e);
			}
		});
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
			expireDate.setTime(this.expirationDate);

			if (now.after(expireDate))
				return false;
		}

		let issuerDoc = issuer.resolve();
		if (issuerDoc == null)
			throw new DIDNotFoundException(this.issuer.toString());

		if (!issuerDoc.isValid())
			return false;

		// Credential should signed by any authentication key.
		if (!issuerDoc.isAuthenticationKey(this.proof.getVerificationMethod()))
			return false;

		// Unsupported public key type;
		if (!this.proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
			return false; // TODO: should throw an exception.

		let vc = new VerifiableCredential(this, false);
		let json = vc.serialize(true);
		if (!issuerDoc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), json.getBytes()))
			return false;


		if (!this.isSelfProclaimed()) {
			let controllerDoc = this.subject.id.resolve();
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
	public isValidAsync(): Promise<boolean> {
		return new Promise((resolve, reject) =>{
			try {
				resolve(this.isValid());
			} catch (e) {
				// DIDResolveException
				reject(e);
			}
		});
	}

	public wasDeclared(): boolean {
		let bio = DIDBackend.getInstance().resolveCredentialBiography(this.getId(), this.getIssuer());

		if (bio.getStatus() == CredentialBiography.Status.NOT_FOUND)
			return false;

		for (let tx of bio.getAllTransactions()) {
			if (tx.getRequest().getOperation().equals(Operation.DECLARE))
				return true;
		}

		return false;
	}

	public declare(signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");
		this.checkAttachedStore();

		if (!this.isGenuine()) {
			log.error("Publish failed because the credential is not genuine.");
			throw new CredentialNotGenuineException(this.getId().toString());
		}

		if (this.isExpired()) {
			log.error("Publish failed because the credential is expired.");
			throw new CredentialExpiredException(this.getId().toString());
		}

		if (this.isRevoked()) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(this.getId().toString());
		}

		if (this.wasDeclared()) {
			log.error("Publish failed because the credential already declared.");
			throw new CredentialAlreadyExistException(this.getId().toString());
		}

		let owner = this.getStore().loadDid(this.getSubject().getId());
		if (owner == null) {
			// Fail-back: resolve the owner's document
			owner = this.getSubject().getId().resolve();
			if (owner == null)
				throw new DIDNotFoundException(this.getSubject().getId().toString());

			owner.getMetadata().attachStore(this.getStore());
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

	/* public declare(signKey: DIDURL, storepass: string) {
		this.declare(signKey, storepass, null);
	}

	public declare(signKey: string, storepass: string, adapter: DIDTransactionAdapter) {
		declare(DIDURL.valueOf(getSubject().getId(), signKey), storepass, adapter);
	}

	public declare(signKey: string, storepass: string) {
		declare(DIDURL.valueOf(getSubject().getId(), signKey), storepass, null);
	}

	public declare(storepass: string, adapter: DIDTransactionAdapter) {
		declare((DIDURL)null, storepass, adapter);
	}

	public declare(storepass: string) {
		declare((DIDURL)null, storepass, null);
	} */

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

	/* public CompletableFuture<Void> declareAsync(signKey: DIDURL, storepass: string) {
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
		return this.declareAsync(signKey, storepass, null);
	}

	public CompletableFuture<Void> declareAsync(storepass: string,
			DIDTransactionAdapter adapter) {
		return this.declareAsync((DIDURL)null, storepass, adapter);
	}

	public CompletableFuture<Void> declareAsync(storepass: string) {
		return this.declareAsync((DIDURL)null, storepass, null);
	} */

	public revoke(signer: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");
		this.checkAttachedStore();

		let owner = this.getSubject().getId().resolve();
		if (owner == null) {
			log.error("Publish failed because the credential owner is not published.");
			throw new DIDNotFoundException(this.getSubject().getId().toString());
		}
		owner.getMetadata().attachStore(this.getStore());

		let issuer = this.getIssuer().resolve();
		if (issuer == null) {
			log.error("Publish failed because the credential issuer is not published.");
			throw new DIDNotFoundException(this.getIssuer().toString());
		}
		issuer.getMetadata().attachStore(this.getStore());

		if (this.isRevoked()) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(this.getId().toString());
		}

		if (signer == null) {
			let signerDid: DID = (signKey != null && signKey.getDid() != null) ?
					signKey.getDid() : this.getSubject().getId();

			signer = this.getStore().loadDid(signerDid);
			if (signer == null) {
				// Fail-back: resolve the owner's document
				signer = this.getSubject().getId().resolve();
				if (signer == null)
					throw new DIDNotFoundException(this.getSubject().getId().toString());

				signer.getMetadata().attachStore(this.getStore());
			}
		}

		if (!signer.getSubject().equals(this.getSubject().getId()) &&
				!signer.getSubject().equals(this.getIssuer()) &&
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

	/* public revoke(signer: DIDDocument, signKey: DIDURL, storepass: string) {
		revoke(signer, signKey, storepass, null);
	}

	public revoke(signer: DIDDocument, storepass: string, adapter: DIDTransactionAdapter) {
		revoke(signer, (DIDURL)null, storepass, adapter);
	}

	public revoke(signer: DIDDocument, storepass: string) {
		revoke(signer, (DIDURL)null, storepass, null);
	}

	public void revoke(signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
		revoke(null, signKey, storepass, adapter);
	}

	public void revoke(signKey: DIDURL, storepass: string) {
		revoke(null, signKey, storepass, null);
	}

	public void revoke(signer: DIDDocument, String signKey, storepass: string,
			DIDTransactionAdapter adapter) {
		revoke(signer, DIDURL.valueOf(getSubject().getId(), signKey), storepass, adapter);
	}

	public void revoke(signer: DIDDocument, String signKey, storepass: string) {
		revoke(signer, signKey, storepass, null);
	}

	public void revoke(signKey: string, storepass: string, adapter: DIDTransactionAdapter) {
		revoke(null, signKey, storepass, adapter);
	}

	public void revoke(signKey: string, storepass: string) {
		revoke(null, signKey, storepass, null);
	}

	public void revoke(storepass: string, adapter: DIDTransactionAdapter) {
		revoke(null, (DIDURL)null, storepass, adapter);
	}

	public void revoke(storepass: string) {
		revoke(null, (DIDURL)null, storepass, null);
	} */

	public revokeAsync(signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
		return new Promise((resolve, reject)=>{
			try {
				revoke(signKey, storepass, adapter);
				resolve();
			} catch (e) {
				// DIDException
				reject(e);
			}
		});
	}

	/* public CompletableFuture<Void> revokeAsync(signKey: DIDURL, storepass: string) {
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

	public CompletableFuture<Void> revokeAsync(storepass: string,
			DIDTransactionAdapter adapter) {
		return revokeAsync((DIDURL)null, storepass, adapter);
	}

	public CompletableFuture<Void> revokeAsync(storepass: string) {
		return revokeAsync((DIDURL)null, storepass, null);
	} */

	public static revoke(id: DIDURL, signer: DIDDocument, signKey: DIDURL,
			storepass: string, adapter: DIDTransactionAdapter) {
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
			let vc = bio.getTransaction(0).getRequest().getCredential();
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

	/* public static void revoke(id: DIDURL, DIDDocument issuer, signKey: DIDURL, storepass: string) {
		revoke(id, issuer, signKey, storepass, null);
	}

	public static void revoke(String id, DIDDocument issuer, String signKey,
			storepass: string, adapter: DIDTransactionAdapter) {
		revoke(DIDURL.valueOf(id), issuer, DIDURL.valueOf(issuer.getSubject(), signKey),
				storepass, adapter);
	}

	public static void revoke(String id, DIDDocument issuer, String signKey, storepass: string) {
		revoke(DIDURL.valueOf(id), issuer, DIDURL.valueOf(issuer.getSubject(), signKey),
				storepass, null);
	}

	public static void revoke(id: DIDURL, DIDDocument issuer, storepass: string, DIDTransactionAdapter adapter) {
		revoke(id, issuer, null, storepass, adapter);
	}

	public static void revoke(id: DIDURL, DIDDocument issuer, storepass: string) {
		revoke(id, issuer, null, storepass, null);
	}

	public static void revoke(String id, DIDDocument issuer, storepass: string,
			DIDTransactionAdapter adapter) throws DIDStoreException, DIDBackendException {
		revoke(DIDURL.valueOf(id), issuer, null, storepass, adapter);
	}

	public static void revoke(String id, DIDDocument issuer, storepass: string) {
		revoke(DIDURL.valueOf(id), issuer, null, storepass, null);
	} */

	public static revokeAsync(id: DIDURL, issuer: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
		return new Promise((resolve, reject)=>{
			try {
				revoke(id, issuer, signKey, storepass, adapter);
				resolve();
			} catch (e) {
				// DIDException
				reject(e);
			}
		});
	}

	/* public static CompletableFuture<Void> revokeAsync(id: DIDURL,
			DIDDocument issuer, signKey: DIDURL, storepass: string) {
		return revokeAsync(id, issuer, signKey, storepass, null);
	}

	public static CompletableFuture<Void> revokeAsync(String id, DIDDocument issuer,
			String signKey, storepass: string, adapter: DIDTransactionAdapter) {
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

	public static CompletableFuture<Void> revokeAsync(id: DIDURL, DIDDocument issuer,
			storepass: string, adapter: DIDTransactionAdapter) {
		return revokeAsync(id, issuer, null, storepass, adapter);
	}

	public static CompletableFuture<Void> revokeAsync(id: DIDURL,
			DIDDocument issuer, storepass: string) {
		return revokeAsync(id, issuer, null, storepass, null);
	}

	public static CompletableFuture<Void> revokeAsync(String id, DIDDocument issuer,
			storepass: string, adapter: DIDTransactionAdapter) {
		return revokeAsync(id, issuer, null, storepass, adapter);
	}

	public static CompletableFuture<Void> revokeAsync(String id, DIDDocument issuer, storepass: string) {
		return revokeAsync(id, issuer, null, storepass, null);
	} */

	public static VerifiableCredential resolve(id: DIDURL, DID issuer, boolean force) {
		if (id == null)
			throw new IllegalArgumentException();

		let vc = DIDBackend.getInstance().resolveCredential(id, issuer, force);
		if (vc != null)
			id.setMetadata(vc.getMetadata());

		return vc;
	}

	/* public static VerifiableCredential resolve(String id, String issuer, boolean force) {
		return resolve(DIDURL.valueOf(id), DID.valueOf(issuer), force);
	}

	public static VerifiableCredential resolve(id: DIDURL, DID issuer) {
		return resolve(id, issuer, false);
	}

	public static VerifiableCredential resolve(String id, String issuer)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), DID.valueOf(issuer), false);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	/* public static VerifiableCredential resolve(id: DIDURL, boolean force)
			throws DIDResolveException {
		return resolve(id, null, force);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed
	 */
	/* public static VerifiableCredential resolve(String id, boolean force)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), null, force);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	/* public static VerifiableCredential resolve(id: DIDURL)
			throws DIDResolveException {
		return resolve(id, null, false);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	/* public static VerifiableCredential resolve(String id)
			throws DIDResolveException {
		return resolve(DIDURL.valueOf(id), null, false);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	public static CompletableFuture<VerifiableCredential> resolveAsync(id: DIDURL, DID issuer, boolean force) {
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

	/* public static CompletableFuture<VerifiableCredential> resolveAsync(id: DIDURL, DID issuer) {
		return resolveAsync(id, issuer, false);
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(String id, String issuer) {
		return resolveAsync(id, issuer, false);
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(id: DIDURL, boolean force) {
		return resolveAsync(id, null, force);
	}

	public static CompletableFuture<VerifiableCredential> resolveAsync(String id, boolean force) {
		return resolveAsync(id, null, force);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	/* public static CompletableFuture<VerifiableCredential> resolveAsync(id: DIDURL) {
		return resolveAsync(id, null, false);
	} */

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @return the new CompletableStage, the result is the DIDDocument interface for
	 *             resolved DIDDocument if success; null otherwise.
	 */
	/* public static CompletableFuture<VerifiableCredential> resolveAsync(String id) {
		return resolveAsync(id, null, false);
	} */

	public static CredentialBiography resolveBiography(id: DIDURL, DID issuer) {
		checkArgument(id != null, "Invalid credential id");

		return DIDBackend.getInstance().resolveCredentialBiography(id, issuer);
	}

	/* public static CredentialBiography resolveBiography(id: DIDURL) {
		checkArgument(id != null, "Invalid credential id");

		return DIDBackend.getInstance().resolveCredentialBiography(id);
	} */

	/* public static CredentialBiography resolveBiography(String id, String issuer) {
		return resolveBiography(DIDURL.valueOf(id), DID.valueOf(issuer));
	}

	public static CredentialBiography resolveBiography(String id) {
		return resolveBiography(id, null);
	} */

	public static resolveBiographyAsync(id: DIDURL, issuer: DID): Promise<CredentialBiography> {
		return new Promise((resolve, reject)=>{
			try {
				resolve(this.resolveBiography(id, issuer));
			} catch (e) {
				// DIDResolveException
				reject(e);
			}
		});
	}

	/* public static CompletableFuture<CredentialBiography> resolveBiographyAsync(id: DIDURL) {
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
	} */

	public static List<DIDURL> list(did: DID, skip: number = 0, limit: number = 0) {
		checkArgument(did != null, "Invalid did");

		return DIDBackend.getInstance().listCredentials(did, skip, limit);
	}

	public static listAsync(did: DID, skip: number, limit: number): Promise<DIDURL[]> {
		return new Promise((resolve, reject) => {
			try {
				return this.list(did, skip, limit);
			} catch (e) {
				// DIDResolveException
				reject(e);
			}
		});
	}

	/**
	 * Parse a VerifiableCredential object from from a string JSON
	 * representation.
	 *
	 * @param content the string JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 */
	public static parse(content: string): VerifiableCredential {
		try {
			return parse(content, VerifiableCredential.class);
		} catch (e) {
			// DIDSyntaxException
			if (e instanceof MalformedCredentialException)
				throw e;
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
	/* public static VerifiableCredential parse(Reader src) {
		try {
			return parse(src, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	} */

	/**
	 * Parse a VerifiableCredential object from from a InputStream object.
	 *
	 * @param src InputStream object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public static VerifiableCredential parse(InputStream src) {
		try {
			return parse(src, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	} */

	/**
	 * Parse a VerifiableCredential object from from a File object.
	 *
	 * @param src File object used to read JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public static VerifiableCredential parse(File src) {
		try {
			return parse(src, VerifiableCredential.class);
		} catch (DIDSyntaxException e) {
			if (e instanceof MalformedCredentialException)
				throw (MalformedCredentialException)e;
			else
				throw new MalformedCredentialException(e);
		}
	} */
}


export namespace VerifiableCredential {
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
		public /*private*/ id: DID;
		public /*private*/ properties: Map<string, Object>;

		 /**
		  * Constructs the CredentialSubject object with given controller.
		  *
		  * @param id the controller of Credential Subject
		  */
		 @JsonCreator()
		 protected Subject(@JsonProperty({value: VerifiableCredential.ID}) id: DID) {
			 this.id = id;
			 this.properties = new Map<string, Object>();
		 }

		 /**
		  * Get the controller.
		  *
		  * @return the controller's DID
		  */
		 @JsonGetter({value: VerifiableCredential.ID})
		 public getId(): DID {
			 return this.id;
		 }

		 /**
		  * Set the controller.
		  *
		  * @param did the controller's DID
		  */
		 public /* protected */ setId(did: DID) {
			 this.id = did;
		 }

		 /**
		  * Helper getter method for properties serialization.
		  * NOTICE: Should keep the alphabetic serialization order.
		  *
		  * @return a String to Object map include all application defined
		  *         properties
		  */
		 @JsonAnyGetter()
		 @JsonPropertyOrder({alphabetic: true})
		 private _getProperties(): Map<string, Object> {
			 return this.properties;
		 }

		 /**
		  * Helper setter method for properties deserialization.
		  *
		  * @param name the property name
		  * @param value the property value
		  */
		 @JsonAnySetter()
		 public /* private */ setProperty(name: string, value: Map<String, Object>) {
			 if (name === VerifiableCredential.ID)
				 return;

			 this.properties.set(name, value);
		 }

		 /**
		  * Get the subject properties.
		  *
		  * @return the properties in String to Object map. It's a read-only map
		  */
		 public getProperties(): ImmutableMap<string, Object> {
			 // TODO: make it unmodifiable recursively
			  return ImmutableMap(this.properties);
		 }

		 /**
		  * Get the count of properties.
		  *
		  * @return the fields count
		  */
		 public getPropertyCount(): number {
			 return this.properties.size;
		 }

		 /**
		  * Get the specified property.
		  *
		  * @param name the property name
		  * @return the property value
		  */
		 public getProperty(name: string): Object {
			 return this.properties.get(name);
		 }

		 /**
		  * Get properties as a JSON string.
		  *
		  * @return the JSON string
		  */
		 public getPropertiesAsString(): string {
			 try {
				 return this.getObjectMapper().writeValueAsString(this.properties);
			 } catch (ignore) {
				 // JsonProcessingException
				 throw new UnknownInternalException(ignore);
			 }
		 }
	 }

	 /**
	  * The proof information for verifiable credential.
	  *
	  * The default proof type is ECDSAsecp256r1.
	  */
	 @JsonPropertyOrder({value: [VerifiableCredential.TYPE, VerifiableCredential.CREATED, VerifiableCredential.VERIFICATION_METHOD, VerifiableCredential.SIGNATURE ]})
	 @JsonFilter({value: "credentialProofFilter"})
	 export class Proof {
		 @JsonProperty({value: VerifiableCredential.TYPE})
		 public /* private */ type: string;
		 @JsonProperty({value: VerifiableCredential.CREATED})
		 @JsonInclude({value: JsonIncludeType.NON_NULL})
		 public /* private */ created: Date;
		 @JsonProperty({value: VerifiableCredential.VERIFICATION_METHOD})
		 public /* private */ verificationMethod: DIDURL;
		 @JsonProperty({value: VerifiableCredential.SIGNATURE})
		 public /* private */ signature: string;

		 /**
		  * Constructs the Proof object with the given values.
		  *
		  * @param type the verification method type
		  * @param method the verification method, normally it's a public key
		  * @param signature the signature encoded in base64 URL safe format
		  */
		 @JsonCreator()
		 protected constructor(
				 @JsonProperty({value: VerifiableCredential.VERIFICATION_METHOD, required: true}) method: DIDURL,
				 @JsonProperty({value: VerifiableCredential.SIGNATURE, required: true}) signature: string,
				 @JsonProperty({value: VerifiableCredential.CREATED}) created: Date = Calendar.getInstance(Constants.UTC).getTime(),
				 @JsonProperty({value: VerifiableCredential.TYPE}) type: string = Constants.DEFAULT_PUBLICKEY_TYPE
		) {
			 this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
			 this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
			 this.verificationMethod = method;
			 this.signature = signature;
		 }

		 /**
		  * Get the verification method type.
		  *
		  * @return the type string
		  */
		 public getType(): string {
			 return this.type;
		 }

		 /**
		  * Get the verification method, normally it's a public key id.
		  *
		  * @return the sign key
		  */
		 public getVerificationMethod(): DIDURL {
			 return this.verificationMethod;
		 }

		 /**
		  * Get the created timestamp.
		  *
		  * @return the created date
		  */
		 public getCreated(): Date {
			 return this.created;
		 }

		 /**
		  * Get the signature.
		  *
		  * @return the signature encoded in URL safe base64 string
		  */
		 public getSignature(): string {
			 return this.signature;
		 }

		 /* protected static PropertyFilter getFilter() {
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
		 } */
	 }

	 /**
	 * The builder object defines the APIs to create the Credential.
	 *
	 * The credential object is sealed object. After set the contents for new
	 * credential, should call seal {@link Builder#seal(String)} method to
	 * create the final credential object.
	 */
	export class Builder {
		private issuer: Issuer;
		private target: DID;
		private credential: VerifiableCredential;

		/**
		 * Create a credential builder for DID.
		 *
		 * @param target the owner of Credential
		 */
		protected constructor(issuer: Issuer, target: DID) {
			this.issuer = issuer;
			this.target = target;

			this.credential = new VerifiableCredential();
			this.credential.issuer = issuer.getDid();
			this.credential.subject = new Subject(target);
		}

		private checkNotSealed() {
			if (this.credential == null)
				throw new AlreadySealedException();
		}

		/**
		 * Set Credential id.
		 *
		 * @param id the Credential id
		 * @return the Builder object
		 */
		public id(id: DIDURL): Builder {
			this.checkNotSealed();
			checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.target)),
					"Invalid id");

			if (id.getDid() == null)
				id = DIDURL.valueOf(this.target, id);

			this.credential.id = id;
			return this;
		}

		/**
		 * Set Credential id.
		 *
		 * @param id the Credential id
		 * @return the Builder object
		 */
		public id(id: string): Builder {
			return id(DIDURL.valueOf(target, id));
		}

		/**
		 * Set Credential types.
		 *
		 * @param types the set of types
		 * @return the Builder object
		 */
		public type(...types: string[]): Builder {
			this.checkNotSealed();
			checkArgument(types != null && types.length > 0, "Invalid types");

			this.credential.type = Array.from(types);
			Collections.sort(this.credential.type);
			return this;
		}

		private getMaxExpires(): Calendar {
			Calendar cal = Calendar.getInstance(Constants.UTC);
			if (credential.getIssuanceDate() != null)
				cal.setTime(credential.getIssuanceDate());
			cal.add(Calendar.YEAR, Constants.MAX_VALID_YEARS);

			return cal;
		}

		private defaultExpirationDate(): Builder {
			this.checkNotSealed();

			this.credential.expirationDate = this.getMaxExpires().getTime();
			return this;
		}

		/**
		 * Set expires time for Credential.
		 *
		 * @param expirationDate the expires time
		 * @return the Builder object
		 */
		public expirationDate(expirationDate: Date): Builder {
			this.checkNotSealed();
			checkArgument(expirationDate != null, "Invalid expiration date");

			Calendar cal = Calendar.getInstance(Constants.UTC);
			cal.setTime(expirationDate);

			Calendar maxExpires = getMaxExpires();
			if (cal.after(maxExpires))
				cal = maxExpires;

			this.credential.expirationDate = cal.getTime();

			return this;
		}

		/**
		 * Set Credential's subject.
		 *
		 * @param properties the subject content
		 * @return the Builder object
		 */
		public properties(properties: Map<string, Object>): Builder {
			this.checkNotSealed();

			this.credential.subject.properties.clear();

			if (properties == null || properties.size() == 0)
				return this;

				this.credential.subject.properties.putAll(properties);
				this.credential.subject.properties.remove(ID);
			return this;
		}

		/**
		 * Set Credential's subject.
		 *
		 * @param json the subject subject with json format
		 * @return the Builder object
		 */
		/* public properties(json: string): Builder {
			this.checkNotSealed();
			checkArgument(json != null && json !== "", "Invalid json");

			let mapper = this.getObjectMapper();
			try {
				let props: Map<String, Object> = mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
				return this.properties(props);
			} catch (e) {
				// JsonProcessingException
				throw new IllegalArgumentException("Invalid json", e);
			}
		} */

		/**
		 * Set Credential's subject.
		 *
		 * @param name the property name
		 * @param value the property value
		 * @return the Builder object
		 */
		public property(name: string, value: Object): Builder {
			this.checkNotSealed();
			checkArgument(name != null && name !== "" && !name.equals(ID), "Invalid name");

			this.credential.subject.setProperty(name, value);
			return this;
		}

		private sanitize() {
			if (this.credential.id == null)
				throw new MalformedCredentialException("Missing credential id");

			if (this.credential.type == null || this.credential.type.isEmpty())
				throw new MalformedCredentialException("Missing credential type");

			Calendar cal = Calendar.getInstance(Constants.UTC);
			this.credential.issuanceDate = cal.getTime();

			if (!this.credential.hasExpirationDate())
				this.defaultExpirationDate();

			this.credential.proof = null;
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
		public seal(storepass: string): VerifiableCredential {
			this.checkNotSealed();
			checkArgument(storepass != null && storepass !== "", "Invalid storepass");

			this.sanitize();

			let json = this.credential.serialize(true);
			let sig = this.issuer.sign(storepass, json);
			let proof = new Proof(this.issuer.getSignKey(), sig);
			this.credential.proof = proof;

			// Invalidate builder
			let vc = this.credential;
			this.credential = null;

			return vc;
		}
	}
}