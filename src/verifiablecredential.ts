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

import dayjs, { Dayjs } from "dayjs";
import {
	JsonAnySetter, JsonAnyGetter, JsonClassType, JsonFilter, JsonGetter, JsonIgnore, JsonInclude,
	JsonIncludeType, JsonProperty, JsonPropertyOrder, JsonCreator
} from "@elastosfoundation/jackson-js";
import type {
	JsonStringifierTransformerContext,
} from "@elastosfoundation/jackson-js/dist/@types";
import { CredentialBiography, CredentialBiographyStatus } from "./internals";
import { IDChainRequest } from "./internals";
import { Collections } from "./internals";
import { Constants } from "./constants";
import { CredentialMetadata } from "./internals";
import { DID } from "./internals";
import { DIDBackend } from "./internals";
import type { DIDDocument } from "./internals";
import { DIDEntity } from "./internals";
import type { DIDObject } from "./internals";
import type { DIDStore } from "./internals";
import type { DIDTransactionAdapter } from "./didtransactionadapter";
import { DIDURL } from "./internals";
import {
	AlreadySealedException,
	CredentialAlreadyExistException,
	CredentialExpiredException,
	CredentialNotGenuineException,
	CredentialRevokedException,
	DIDNotFoundException,
	IllegalArgumentException,
	InvalidKeyException,
	MalformedCredentialException,
	NotAttachedWithStoreException,
	UnknownInternalException
} from "./exceptions/exceptions";
import { keyTypeFilter } from "./internals";
import type { Issuer } from "./internals";
import type {
	JSONObject,
	JSONValue
} from "./json";
import { sortJSONObject } from "./json";
import { Logger } from "./logger";
import { checkArgument } from "./internals";

const log = new Logger("VerifiableCredential");

function vcIssuerFilter(value: any, context?: JsonStringifierTransformerContext): boolean {
	let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

	if (!serializeContext || serializeContext.isNormalized())
		return false;

	return serializeContext.getDid() ? serializeContext.getDid().equals(value as DID) : false;
}

/**
 * VerifiableCredential is a set of one or more claims made by the same entity.
 *
 * Credential might also include an identifier and metadata to
 * describe properties of the credential.
 */
@JsonPropertyOrder({value:[
	"id",
	"type",
	"issuer",
	"issuanceDate",
	"expirationDate",
	"subject",
	"proof" ]})
@JsonInclude({value: JsonIncludeType.NON_EMPTY})
// TODO: convert from java - @JsonFilter("credentialFilter")
export class VerifiableCredential extends DIDEntity<VerifiableCredential> implements DIDObject<string> {
	public static ID = "id";
	public static TYPE = "type";
	public static ISSUER = "issuer";
	public static ISSUANCE_DATE = "issuanceDate";
	public static EXPIRATION_DATE = "expirationDate";
	public static CREDENTIAL_SUBJECT = "credentialSubject";
	public static PROOF = "proof";
	public static VERIFICATION_METHOD = "verificationMethod";
	public static CREATED = "created";
	public static SIGNATURE = "signature";

	@JsonProperty({value:VerifiableCredential.ID})
	@JsonClassType({type: () => [DIDURL]})
	public id: DIDURL;
	@JsonProperty({value:VerifiableCredential.TYPE})
	public type: string[];
	@JsonProperty({value:VerifiableCredential.ISSUER})
	@JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: vcIssuerFilter})
	@JsonClassType({type: () => [DID]})
	public issuer: DID;
	@JsonProperty({value:VerifiableCredential.ISSUANCE_DATE})
	@JsonClassType({type: () => [Date]})
	public issuanceDate: Date;
	@JsonProperty({value:VerifiableCredential.EXPIRATION_DATE})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	@JsonClassType({type: () => [Date]})
	public expirationDate: Date;
	@JsonProperty({value:VerifiableCredential.CREDENTIAL_SUBJECT})
	@JsonClassType({type: () => [VerifiableCredential.Subject]})
	public subject: VerifiableCredential.Subject;
	@JsonProperty({value:VerifiableCredential.PROOF})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	@JsonClassType({type: () => [VerifiableCredential.Proof]})
	public proof: VerifiableCredential.Proof;

	@JsonIgnore()
	public metadata: CredentialMetadata;

	constructor() {
		super();
	}

	// Add custom deserialization fields to the method params here + assign.
    // Jackson does the rest automatically.
    @JsonCreator()
    public static jacksonCreator(@JsonProperty({value: VerifiableCredential.TYPE}) type?: any) {
        let vc = new VerifiableCredential();

        // Proofs
        if (type) {
            if (type instanceof Array)
				vc.type = type.map((p) => VerifiableCredential.getDefaultObjectMapper().parse(JSON.stringify(p), {mainCreator: () => [String]}));
            else
				vc.type = [VerifiableCredential.getDefaultObjectMapper().parse(JSON.stringify(type), {mainCreator: () => [String]})];
        }

		return vc;
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
	public getType(): string[] {
		return this.type;
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
	public hasExpirationDate(): boolean {
		return this.expirationDate != null;
	}

	/**
	 * Get the expires time.
	 *
	 * @return the expires time
	 */
	public async getExpirationDate(): Promise<Date> {
		if (this.expirationDate != null)
			return this.expirationDate;
		else {
			try {
				let controllerDoc = await this.subject.getId().resolve();
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
	public sanitize(): Promise<void> {
		if (this.id == null)
			throw new MalformedCredentialException("Missing credential id");

		if (this.type == null || this.type.length == 0)
			throw new MalformedCredentialException("Missing credential type");

		if (this.issuanceDate == null)
			throw new MalformedCredentialException("Missing credential issuance date");

		if (this.subject == null)
			throw new MalformedCredentialException("Missing credential subject");

		if (this.subject.getId() == null)
			throw new MalformedCredentialException("Missing credential subject id");

		if (this.proof == null)
			throw new MalformedCredentialException("Missing credential proof");

		Collections.sort(this.type);

		// Update id references
		if (this.issuer == null)
			this.issuer = this.subject.getId();

		if (this.id.getDid() == null)
			this.id.setDid(this.subject.getId());

		if (this.proof.verificationMethod.getDid() == null)
			this.proof.verificationMethod.setDid(this.issuer);

		return null; // Silence the promise warning, not a real return
	}

	/**
	 * Get current object's DID context.
	 *
	 * @return the DID object or null
	 */
	protected getSerializeContextDid(): DID {
		return this.getSubject().getId();
	}

	/**
	 * Set meta data for Credential.
	 *
	 * @param metadata the meta data object
	 */
	public setMetadata(metadata: CredentialMetadata) {
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
		return this.issuer.equals(this.subject.getId());
	}

	/**
	 * Check if the Credential is expired or not.
	 *
	 * @return whether the Credential object is expired
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public async isExpired(): Promise<boolean> {
		if (this.expirationDate != null) {
			if (dayjs().isAfter(dayjs(this.expirationDate)))
				return true;
		}

		let controllerDoc = await this.subject.getId().resolve();
		if (controllerDoc != null && controllerDoc.isExpired())
			return true;

		if (!this.isSelfProclaimed()) {
			let issuerDoc = await this.issuer.resolve();
			if (issuerDoc != null && issuerDoc.isExpired())
				return true;
		}

		return false;
	}

	/**
	 * Check whether the Credential is genuine or not.
	 *
	 * @return whether the Credential object is genuine
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public async isGenuine(): Promise<boolean> {
		if (!this.getId().getDid().equals(this.getSubject().getId()))
			return false;

		let issuerDoc = await this.issuer.resolve();
		if (issuerDoc == null)
			throw new DIDNotFoundException(this.issuer.toString());

		if (!issuerDoc.isGenuine())
			return false;

		// Credential should signed by any authentication key.
		if (!issuerDoc.isAuthenticationKey(this.proof.getVerificationMethod()))
			return false;

		// Unsupported public key type;
		if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE)
			return false; // TODO: should throw an exception?

		let vc = VerifiableCredential.newWithVerifiableCredential(this, false);
		let json = vc.serialize(true);
		if (!issuerDoc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), Buffer.from(json)))
			return false;

		if (!this.isSelfProclaimed()) {
			let controllerDoc = await this.subject.getId().resolve();
			if (controllerDoc != null && !controllerDoc.isGenuine())
				return false;
		}

		return true;
	}

	public async isRevoked(): Promise<boolean> {
		if (this.getMetadata().isRevoked())
			return true;

		let bio = await DIDBackend.getInstance().resolveCredentialBiography(
			this.getId(), this.getIssuer());
		let revoked = bio.getStatus().equals(CredentialBiographyStatus.REVOKED);

		if (revoked)
			this.getMetadata().setRevoked(revoked);

		return revoked;
	}

	/**
	 * Check whether the Credential is valid or not.
	 *
	 * @return whether the Credential object is valid
	 * @throws DIDResolveException if error occurs when resolve the DID documents
	 */
	public async isValid(): Promise<boolean> {
		if (this.expirationDate != null) {
			if (dayjs().isAfter(dayjs(this.expirationDate)))
				return false;
		}

		let issuerDoc = await this.issuer.resolve();
		if (issuerDoc == null)
			throw new DIDNotFoundException(this.issuer.toString());

		if (!issuerDoc.isValid())
			return false;

		// Credential should signed by any authentication key.
		if (!issuerDoc.isAuthenticationKey(this.proof.getVerificationMethod()))
			return false;

		// Unsupported public key type;
		if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE)
			return false; // TODO: should throw an exception.

		let vc = VerifiableCredential.newWithVerifiableCredential(this, false);
		let json = vc.serialize(true);
		if (!issuerDoc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), Buffer.from(json)))
			return false;

		if (!this.isSelfProclaimed()) {
			let controllerDoc = await this.subject.getId().resolve();
			if (controllerDoc != null && !controllerDoc.isValid())
				return false;
		}

		return true;
	}

	public async wasDeclared(): Promise<boolean> {
		let bio = await DIDBackend.getInstance().resolveCredentialBiography(this.getId(), this.getIssuer());

		if (bio.getStatus() == CredentialBiographyStatus.NOT_FOUND)
			return false;

		for (let tx of bio.getAllTransactions()) {
			if (tx.getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE))
				return true;
		}

		return false;
	}

	public async declare(signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter = null): Promise<void> {
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");
		this.checkAttachedStore();

		if (!await this.isGenuine()) {
			log.error("Publish failed because the credential is not genuine.");
			throw new CredentialNotGenuineException(this.getId().toString());
		}

		if (await this.isExpired()) {
			log.error("Publish failed because the credential is expired.");
			throw new CredentialExpiredException(this.getId().toString());
		}

		if (await this.isRevoked()) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(this.getId().toString());
		}

		if (await this.wasDeclared()) {
			log.error("Publish failed because the credential already declared.");
			throw new CredentialAlreadyExistException(this.getId().toString());
		}

		let owner = await this.getStore().loadDid(this.getSubject().getId());
		if (owner == null) {
			// Fail-back: resolve the owner's document
			owner = await this.getSubject().getId().resolve();
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

		await DIDBackend.getInstance().declareCredential(this, owner, signKey, storepass, adapter);
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

	public async revoke(signKey: DIDURL | string, signer: DIDDocument = null, storepass: string = null, adapter: DIDTransactionAdapter = null) {
		checkArgument(storepass != null && storepass !== "", "Invalid storepass");
		this.checkAttachedStore();

		let owner = await this.getSubject().getId().resolve();
		if (owner == null) {
			log.error("Publish failed because the credential owner is not published.");
			throw new DIDNotFoundException(this.getSubject().getId().toString());
		}
		owner.getMetadata().attachStore(this.getStore());

		let issuer = await this.getIssuer().resolve();
		if (issuer == null) {
			log.error("Publish failed because the credential issuer is not published.");
			throw new DIDNotFoundException(this.getIssuer().toString());
		}
		issuer.getMetadata().attachStore(this.getStore());

		if (await this.isRevoked()) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(this.getId().toString());
		}

		if (typeof signKey === "string")
			signKey = DIDURL.from(signKey, this.getSubject().getId());

		if (signer == null) {
			let signerDid: DID = (signKey != null && signKey.getDid() != null) ?
					signKey.getDid() : this.getSubject().getId();

			signer = await this.getStore().loadDid(signerDid);
			if (signer == null) {
				// Fail-back: resolve the owner's document
				signer = await this.getSubject().getId().resolve();
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

		await DIDBackend.getInstance().revokeCredential(this, signer, signKey, storepass, adapter);
	}

	public static async revoke(id: DIDURL, signer: DIDDocument, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter = null): Promise<void> {
		checkArgument(id != null, "Invalid credential id");
		checkArgument(signer != null, "Invalid issuer's document");
		checkArgument(storepass && storepass != null, "Invalid storepass");

		if (!signer.getMetadata().attachedStore())
			throw new NotAttachedWithStoreException(signer.getSubject().toString());

		let bio = await DIDBackend.getInstance().resolveCredentialBiography(id, signer.getSubject());
		if (bio.getStatus().equals(CredentialBiographyStatus.REVOKED)) {
			log.error("Publish failed because the credential is revoked.");
			throw new CredentialRevokedException(id.toString());
		}

		if (bio.getStatus().equals(CredentialBiographyStatus.VALID)) {
			let vc = bio.getTransaction(0).getRequest().getCredential();
			if (!signer.getSubject().equals(vc.getSubject().getId()) && signer.getSubject().equals(vc.getIssuer())) {
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

		await DIDBackend.getInstance().revokeCredential(id, signer, signKey, storepass, adapter);
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

	/**
	 * Resolve VerifiableCredential object.
	 *
	 * @param id the credential id
	 * @param force if true ignore local cache and try to resolve from ID chain
	 * @return the VerifiableCredential object
	 * @throws DIDResolveException throw this exception if resolving did failed.
	 */
	public static async resolve(id: DIDURL | string, issuer: DID | string  = null, force = false): Promise<VerifiableCredential> {
		if (id == null)
			throw new IllegalArgumentException();

		if (typeof id === "string")
			id = DIDURL.from(id);

		if (typeof issuer === "string")
			issuer = DID.from(issuer);

		let vc = await DIDBackend.getInstance().resolveCredential(id, issuer, force);
		if (vc != null)
			id.setMetadata(vc.getMetadata());

		return vc;
	}

	public static resolveBiography(id: DIDURL, issuer: DID): Promise<CredentialBiography> {
		checkArgument(id != null, "Invalid credential id");

		return DIDBackend.getInstance().resolveCredentialBiography(id, issuer);
	}

	/* public static CredentialBiography resolveBiography(id: DIDURL) {
		checkArgument(id != null, "Invalid credential id");

		return DIDBackend.getInstance().resolveCredentialBiography(id);
	} */

	/* public static CredentialBiography resolveBiography(String id, String issuer) {
		return resolveBiography(DIDURL.valueOf(id), DID.from(issuer));
	}

	public static CredentialBiography resolveBiography(String id) {
		return resolveBiography(id, null);
	} */

	public static list(did: DID, skip = 0, limit = 0): Promise<DIDURL[]> {
		checkArgument(did != null, "Invalid did");
		return DIDBackend.getInstance().listCredentials(did, skip, limit);
	}

	/**
	 * Parse a VerifiableCredential object from from a string JSON
	 * representation.
	 *
	 * @param content the string JSON content for building the object
	 * @return the VerifiableCredential object
	 * @throws DIDSyntaxException if a parse error occurs
	 */
	public static parseContent(content: string): Promise<VerifiableCredential> {
		try {
			return this.parse(content, VerifiableCredential);
		} catch (e) {
			// DIDSyntaxException
			if (e instanceof MalformedCredentialException)
				throw e;
			else
				throw new MalformedCredentialException(e);
		}
	}
}


export namespace VerifiableCredential {
	/**
     * The object keeps the credential subject contents.
     *
     * This id field is mandatory, should be the controller's DID.
     * All the other fields could be defined by the application.
     * In order to support the JSON serialization, all values should be
     * JSON serializable.
	 */
	 @JsonPropertyOrder({value: ["id"]})
	 export class Subject {
		@JsonProperty({value: VerifiableCredential.ID})
		@JsonClassType({type: () => [DID]})
		private id: DID;
		@JsonIgnore()
		private properties: JSONObject;

		 /**
		  * Constructs the CredentialSubject object with given controller.
		  *
		  * @param id the controller of Credential Subject
		  */
		 // Java: @JsonCreator()
		 constructor(@JsonProperty({value: VerifiableCredential.ID}) id: DID) {
			 this.id = id;
			 this.properties = {};
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
		 public setId(did: DID) {
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
		 @JsonClassType({type: () => [String, Object]})
		 //@JsonPropertyOrder({ alphabetic: true })
		 private getAllProperties(): JSONObject {
			 return sortJSONObject(this.properties);
		 }

		 /**
		  * Helper setter method for properties deserialization.
		  *
		  * @param name the property name
		  * @param value the property value
		  */
		 @JsonAnySetter()
		 public setProperty(name: string, value: JSONValue) {
			 if (name === VerifiableCredential.ID)
				 return;

			 this.properties[name] = value;
		 }

		 /**
		  * Get the subject properties.
		  *
		  * @return the properties in String to Object map. It's a read-only map
		  */
		 public getProperties(): JSONObject {
			return JSON.parse(JSON.stringify(this.properties));
		 }

		 public setProperties(newProperties: JSONObject): JSONObject {
			return this.properties = newProperties;
		 }

		 /**
		  * Get the count of properties.
		  *
		  * @return the fields count
		  */
		 public getPropertyCount(): number {
			 return Object.keys(this.properties).length;
		 }

		 /**
		  * Get the specified property.
		  *
		  * @param name the property name
		  * @return the property value
		  */
		 public getProperty(name: string): any {
			 return this.properties[name];
		 }

		 /**
		  * Get properties as a JSON string.
		  *
		  * @return the JSON string
		  */
		 public getPropertiesAsString(): string {
			 try {
				 return DIDEntity.getDefaultObjectMapper().stringify(this.properties);
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
	 @JsonPropertyOrder({value: ["type", "created", "verificationMethod", "signature"]})
	 export class Proof {
		 @JsonProperty({value: VerifiableCredential.TYPE})
		 @JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyTypeFilter})
		 @JsonClassType({type: ()=>[String]})
		 public type: string;
		 @JsonProperty({value: VerifiableCredential.CREATED})
		 @JsonInclude({value: JsonIncludeType.NON_EMPTY})
		 @JsonClassType({type: ()=>[Date]})
		 public created: Date;
		 @JsonProperty({value: VerifiableCredential.VERIFICATION_METHOD})
		 @JsonClassType({type: ()=>[DIDURL]})
		 public verificationMethod: DIDURL;
		 @JsonProperty({value: VerifiableCredential.SIGNATURE})
		 @JsonClassType({type: ()=>[String]})
		 public signature: string;

		 /**
		  * Constructs the Proof object with the given values.
		  *
		  * @param type the verification method type
		  * @param method the verification method, normally it's a public key
		  * @param signature the signature encoded in base64 URL safe format
		  */
		 // Java: @JsonCreator()
		 constructor(
				 @JsonProperty({value: VerifiableCredential.VERIFICATION_METHOD, required: true}) method: DIDURL,
				 @JsonProperty({value: VerifiableCredential.SIGNATURE, required: true}) signature: string,
				 @JsonProperty({value: VerifiableCredential.CREATED}) created: Date = new Date(),
				 @JsonProperty({value: VerifiableCredential.TYPE}) type: string = Constants.DEFAULT_PUBLICKEY_TYPE
		) {
			 this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
			 this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
			 if (this.created)
			 	this.created.setMilliseconds(0);
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
		constructor(issuer: Issuer, target: DID) {
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
		public id(id: DIDURL | string): Builder {
			this.checkNotSealed();

			checkArgument(id != null, "Invalid id");

			if (typeof id === "string")
				id = DIDURL.from(id);

			checkArgument(id.getDid() == null || id.getDid().equals(this.target), "Invalid id");

			if (id.getDid() == null)
				id = DIDURL.from(id, this.target);

			this.credential.id = id;
			return this;
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

		private getMaxExpires(): Date {
			let maxExpires: Dayjs;
			if (this.credential.getIssuanceDate() != null)
				maxExpires = dayjs(this.credential.getIssuanceDate());
			else
				maxExpires = dayjs();
			maxExpires = maxExpires.add(Constants.MAX_VALID_YEARS, "years");

			return maxExpires.toDate();
		}

		private defaultExpirationDate(): Builder {
			this.checkNotSealed();
			this.credential.expirationDate = this.getMaxExpires();
			if(this.credential.expirationDate)
				this.credential.expirationDate.setMilliseconds(0);
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

			let expDate = dayjs(expirationDate);
			let maxExpires = this.getMaxExpires();
			if (expDate.isAfter(maxExpires))
				expDate = dayjs(maxExpires);

			this.credential.expirationDate = expDate.toDate();
			if(this.credential.expirationDate)
				this.credential.expirationDate.setMilliseconds(0);

			return this;
		}

		/**
		 * Set Credential's subject.
		 *
		 * @param properties the subject content
		 * @return the Builder object
		 */
		public properties(newProperties: JSONObject | string): Builder {
			this.checkNotSealed();

			if (typeof newProperties === "string")
				newProperties = JSON.parse(newProperties);

			this.credential.subject.setProperties({});

			if (newProperties == null || Object.keys(newProperties).length == 0)
				return this;

			let properties = this.credential.subject.getProperties();
			for (let key in newProperties as JSONObject) {
				properties[key] = newProperties[key];
			}
			delete properties.id;
			this.credential.subject.setProperties(properties);
			return this;
		}

		/**
		 * Set Credential's subject.
		 *
		 * @param name the property name
		 * @param value the property value
		 * @return the Builder object
		 */
		public property(name: string, value: JSONValue): Builder {
			this.checkNotSealed();
			checkArgument(name != null && name !== "" && name !== VerifiableCredential.ID, "Invalid name");

			this.credential.subject.setProperty(name, value);
			return this;
		}

		private sanitize() {
			if (this.credential.id == null)
				throw new MalformedCredentialException("Missing credential id");

			if (this.credential.type == null || this.credential.type.length == 0)
				throw new MalformedCredentialException("Missing credential type");

			this.credential.issuanceDate = new Date();
			if(this.credential.issuanceDate)
				this.credential.issuanceDate.setMilliseconds(0);

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
		public async seal(storepass: string): Promise<VerifiableCredential> {
			this.checkNotSealed();
			checkArgument(storepass != null && storepass !== "", "Invalid storepass");

			this.sanitize();

			let json = this.credential.serialize(true);
			let sig = await this.issuer.sign(storepass, Buffer.from(json));
			let proof = new VerifiableCredential.Proof(this.issuer.getSignKey(), sig);
			this.credential.proof = proof;

			// Invalidate builder
			let vc = this.credential;
			this.credential = null;

			return vc;
		}
	}
}
