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
import { Buffer } from "buffer";
import dayjs, { Dayjs } from "dayjs";
import { Constants } from "./constants";
import type { DIDTransactionAdapter } from "./didtransactionadapter";
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
    NotAttachedWithStoreException
} from "./exceptions/exceptions";
import { checkState, DIDDocument, DIDObject, DIDStore, Issuer } from "./internals";
import { checkArgument, checkEmpty, Collections, Features, CredentialBiography, CredentialBiographyStatus, CredentialMetadata, DID, DIDBackend, DIDEntity, DIDURL, IDChainRequest } from "./internals";
import type { JSONObject, JSONValue } from "./json";
import { sortJSONObject } from "./json";
import { Logger } from "./logger";
import { VerificationEventListener } from "./verificationEventListener";

const log = new Logger("VerifiableCredential");

/**
 * VerifiableCredential is a set of one or more claims made by the same entity.
 *
 * Credential might also include an identifier and metadata to
 * describe properties of the credential.
 */
export class VerifiableCredential extends DIDEntity<VerifiableCredential> implements DIDObject<string> {
    public static W3C_CREDENTIAL_CONTEXT = "https://www.w3.org/2018/credentials/v1";
    public static ELASTOS_CREDENTIAL_CONTEXT = "https://ns.elastos.org/credentials/v1";
    public static DEFAULT_CREDENTIAL_TYPE = "VerifiableCredential";

    public context?: string[];
    public id: DIDURL;
    public type: string[];
    public issuer: DID;
    public issuanceDate: Date;
    public expirationDate: Date;
    public subject: VerifiableCredential.Subject;
    public proof: VerifiableCredential.Proof;

    private metadata: CredentialMetadata;

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
        newVc.context = vc.context;
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
            throw new NotAttachedWithStoreException("Not attach with did store");
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
    public isExpired(): boolean {
        if (this.expirationDate != null)
            if (dayjs().isAfter(dayjs(this.expirationDate)))
                return true;

        return false;
    }

    /**
     * Check whether the Credential is genuine or not.
     *
     * @return whether the Credential object is genuine
     * @throws DIDResolveException if error occurs when resolve the DID documents
     */
    public async isGenuine(listener: VerificationEventListener = null): Promise<boolean> {
        if (!this.getId().getDid().equals(this.getSubject().getId())) {
            if (listener != null) {
                listener.failed(this, "VC {}: invalid id '{}', should under the scope of '{}'",
                    this.getId(), this.getId(), this.getSubject().getId());
                listener.failed(this, "VC {}: is not genuine", this.getId());
            }
            return false;
        }

        let issuerDoc = await this.issuer.resolve();
        if (issuerDoc == null) {
            if (listener != null) {
                listener.failed(this, "VC {}: Can not resolve the document for issuer '{}'",
                    this.getId(), this.getIssuer());
                listener.failed(this, "VC {}: is not genuine", this.getId());
            }
            return false;
        }

        if (!issuerDoc.isGenuine(listener)) {
            if (listener != null) {
                listener.failed(this, "VC {}: issuer '{}' is not genuine",
                    this.getId(), this.getIssuer());
                listener.failed(this, "VC {}: is not genuine", this.getId());
            }
            return false;
        }

        // Credential should signed by any authentication key.
        if (!issuerDoc.isAuthenticationKey(this.proof.getVerificationMethod())) {
            if (listener != null) {
                listener.failed(this, "VC {}: key '{}' for proof is not an authencation key of '{}'",
                    this.getId(), this.proof.getVerificationMethod(), this.proof.getVerificationMethod().getDid());
                listener.failed(this, "VC {}: is not genuine", this.getId());
            }
            return false;
        }

        // Unsupported public key type;
        if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
            if (listener != null) {
                listener.failed(this, "VC {}: key type '{}' for proof is not supported",
                    this.getId(), this.proof.getType());
                listener.failed(this, "VC {}: is not genuine", this.getId());
            }
            return false; // TODO: should throw an exception?
        }

        let vc = VerifiableCredential.newWithVerifiableCredential(this, false);
        let json = vc.serialize(true);
        if (!issuerDoc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), Buffer.from(json))) {
            if (listener != null) {
                listener.failed(this, "VC {}: proof is invalid, signature mismatch", this.getId());
                listener.failed(this, "VC {}: is not genuine", this.getId());
            }
            return false;
        }

        if (!this.isSelfProclaimed()) {
            let controllerDoc = await this.subject.getId().resolve();
            if (controllerDoc != null && !controllerDoc.isGenuine(listener)) {
                if (listener != null) {
                    listener.failed(this, "VC {}: holder's document is not genuine", this.getId());
                    listener.failed(this, "VC {}: is not genuine", this.getId());
                }
                return false;
            }
        }
        if (listener != null)
            listener.succeeded(this, "VC {}: is genuine", this.getId());

        return true;
    }

    	// internal method for DIDDocument.Builder.addCredential,
 	// check the self-proclaimed credential that it's owner still not published
 	public isGenuineInternal(owner : DIDDocument) : boolean {
        checkState(this.isSelfProclaimed(), "The credential should be self-proclaimed");
        checkArgument(this.getSubject().getId().equals(owner.getSubject()), "Invalid owner document");

        if (!this.getId().getDid().equals(this.getSubject().getId()))
            return false;

        // Credential should signed by any authentication key.
        if (!owner.isAuthenticationKey(this.proof.getVerificationMethod()))
            return false;

        // Unsupported public key type;
        if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE)
            return false;

        let vc = VerifiableCredential.newWithVerifiableCredential(this, false);
        let json = vc.serialize(true);
        if (!owner.verify(this.proof.getVerificationMethod(),
                this.proof.getSignature(), Buffer.from(json)))
            return false;

        return true;
    }

    public async isRevoked(): Promise<boolean> {
        if (this.getMetadata().isRevoked())
            return true;

        let bio = await DIDBackend.getInstance().resolveCredentialBiography(
            this.getId(), this.getIssuer());
        if (bio == null)
            return false;

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
    public async isValid(listener: VerificationEventListener = null): Promise<boolean> {
        if (await this.isRevoked()) {
            if (listener != null) {
                listener.failed(this, "VC {}: is revoked", this.getId());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false;
        }

        if (this.isExpired()) {
            if (listener != null) {
                listener.failed(this, "VC {}: is expired", this.getId());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false;
        }

        let issuerDoc = await this.issuer.resolve();
        if (issuerDoc == null) {
            if (listener != null) {
                listener.failed(this, "VC {}: can not resolve the document for issuer '{}'",
                    this.getId(), this.getIssuer());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false;
        }

        if (await issuerDoc.isDeactivated()) {
            if (listener != null) {
                listener.failed(this, "VC {}: issuer '{}' is deactivated", this.getId(), this.getIssuer());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false;
        }

        if (!issuerDoc.isGenuine()) {
            if (listener != null) {
                listener.failed(this, "VC {}: issuer '{}' is not genuine", this.getId(), this.getIssuer());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false;
        }

        // Credential should signed by any authentication key.
        if (!issuerDoc.isAuthenticationKey(this.proof.getVerificationMethod())) {
            if (listener != null) {
                listener.failed(this, "VC {}: key '{}' for proof is not an authencation key of '{}'",
                    this.getId(), this.proof.getVerificationMethod(), this.proof.getVerificationMethod().getDid());
                listener.failed(this, "VC {}: is invalid", this.getSubject());
            }
            return false;
        }

        // Unsupported public key type;
        if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
            if (listener != null) {
                listener.failed(this, "VC {}: key type '{}' for proof is not supported",
                    this.getId(), this.proof.getType());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false; // TODO: should throw an exception.
        }

        let vc = VerifiableCredential.newWithVerifiableCredential(this, false);
        let json = vc.serialize(true);
        if (!issuerDoc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), Buffer.from(json))) {
            if (listener != null) {
                listener.failed(this, "VC {}: proof is invalid, signature mismatch", this.getId());
                listener.failed(this, "VC {}: is invalid", this.getId());
            }
            return false;
        }

        if (listener != null)
            listener.succeeded(this, "VC {}: is valid", this.getId());
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
            throw new CredentialNotGenuineException(this.getId().toString() + " isn't genuine");
        }

        if (await this.isExpired()) {
            log.error("Publish failed because the credential is expired.");
            throw new CredentialExpiredException(this.getId().toString() + " is expired");
        }

        if (await this.isRevoked()) {
            log.error("Publish failed because the credential is revoked.");
            throw new CredentialRevokedException(this.getId().toString() + " is revoked");
        }

        if (await this.wasDeclared()) {
            log.error("Publish failed because the credential already declared.");
            throw new CredentialAlreadyExistException(this.getId().toString() + " is already declared");
        }

        let owner = await this.getStore().loadDid(this.getSubject().getId());
        if (owner == null) {
            // Fail-back: resolve the owner's document
            owner = await this.getSubject().getId().resolve();
            if (owner == null)
                throw new DIDNotFoundException(this.getSubject().getId().toString() + " isn't found in the chain");

            owner.getMetadata().attachStore(this.getStore());
        }

        if (signKey == null && owner.getDefaultPublicKeyId() == null)
            throw new InvalidKeyException("Unknown sign key");

        if (signKey != null) {
            if (!owner.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString() + " isn't the authentication key");
        } else {
            signKey = owner.getDefaultPublicKeyId();
        }

        await DIDBackend.getInstance().declareCredential(this, owner, signKey, storepass, adapter);
    }

    public async revoke(signKey: DIDURL | string, signer: DIDDocument = null, storepass: string = null, adapter: DIDTransactionAdapter = null) {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");
        this.checkAttachedStore();

        if (signer != null && signer.getMetadata().attachedStore())
            this.getMetadata().attachStore(signer.getStore());

        let owner = await this.getSubject().getId().resolve();
        if (owner == null) {
            log.error("Publish failed because the credential owner is not published.");
            throw new DIDNotFoundException(this.getSubject().getId().toString()+ " isn't found in the chain");
        }
        owner.getMetadata().attachStore(this.getStore());

        let issuer = await this.getIssuer().resolve();
        if (issuer == null) {
            log.error("Publish failed because the credential issuer is not published.");
            throw new DIDNotFoundException(this.getIssuer().toString() + " isn't found in the chain");
        }
        issuer.getMetadata().attachStore(this.getStore());

        if (await this.isRevoked()) {
            log.error("Publish failed because the credential is revoked.");
            throw new CredentialRevokedException(this.getId().toString()+ " is revoked");
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
                    throw new DIDNotFoundException(this.getSubject().getId().toString() + " isn't found in the chain");

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
                throw new InvalidKeyException(signKey.toString() + " isn't the authencation key");
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
            throw new NotAttachedWithStoreException(signer.getSubject().toString() + " not attach with did store");

        let bio = await DIDBackend.getInstance().resolveCredentialBiography(id, signer.getSubject());
        if (bio.getStatus().equals(CredentialBiographyStatus.REVOKED)) {
            log.error("Publish failed because the credential is revoked.");
            throw new CredentialRevokedException(id.toString()+ " is revoked");
        }

        if (bio.getStatus().equals(CredentialBiographyStatus.VALID)) {
            let vc = bio.getTransaction(0).getRequest().getCredential();
            if (!signer.getSubject().equals(vc.getSubject().getId()) && !signer.getSubject().equals(vc.getIssuer())) {
                log.error("Publish failed because the invalid signer or signkey.");
                throw new InvalidKeyException("Not owner or issuer: " + signer.getSubject());
            }
        }

        if (signKey == null && signer.getDefaultPublicKeyId() == null)
            throw new InvalidKeyException("Unknown sign key");

        if (signKey != null) {
            if (!signer.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString()+ " isn't the authencation key");
        } else {
            signKey = signer.getDefaultPublicKeyId();
        }

        await DIDBackend.getInstance().revokeCredential(id, signer, signKey, storepass, adapter);
    }

    /**
     * Resolve VerifiableCredential object.
     *
     * @param id the credential id
     * @param force if true ignore local cache and try to resolve from ID chain
     * @return the VerifiableCredential object
     * @throws DIDResolveException throw this exception if resolving did failed.
     */
    public static async resolve(id: DIDURL | string, issuer: DID | string = null, force = false): Promise<VerifiableCredential> {
        if (id == null)
            throw new IllegalArgumentException("No credential id");

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

    public static list(did: DID, skip = 0, limit = 0): Promise<DIDURL[]> {
        checkArgument(did != null, "Invalid did");
        return DIDBackend.getInstance().listCredentials(did, skip, limit);
    }

    public toJSON(key: string = null): JSONObject {
        let context: DID = key ? new DID(key) : null;

        let json: JSONObject = {};
        if (this.context != null && this.context.length > 0)
            json["@context"] = Array.from(this.context);

        json.id = this.id.toString(context);
        json.type = this.type;
        if (!context || !this.issuer.equals(context))
            json.issuer = this.issuer.toString();
        if (this.issuanceDate)
            json.issuanceDate = this.dateToString(this.issuanceDate);
        if (this.expirationDate)
            json.expirationDate = this.dateToString(this.expirationDate);
        json.credentialSubject = this.subject.toJSON(key);

        if (this.proof)
            json.proof = this.proof.toJSON(key);

        return json;
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        if (!json.credentialSubject)
            throw new MalformedCredentialException("Missing property: subject");

        let subject = json.credentialSubject as JSONObject;
        let holder = this.getDid("credentialSubject.id", subject.id,
            { mandatory: false, nullable: false, defaultValue: context });
        if (!holder)
            throw new MalformedCredentialException("Missing property: subject.id");

        this.context = this.getContext("@context", json["@context"], {mandatory: false, nullable: false, defaultValue: [] });
        this.id = this.getDidUrl("id", json.id, { mandatory: true, nullable: false, context: holder });
        this.type = this.getStrings("type", json.type, { mandatory: true, nullable: false });
        this.issuer = this.getDid("issuer", json.issuer, { mandatory: false, nullable: false, defaultValue: holder });
        this.issuanceDate = this.getDate("issuanceDate", json.issuanceDate, { mandatory: true, nullable: false });
        this.expirationDate = this.getDate("expirationDate", json.expirationDate, { mandatory: true, nullable: true });
        this.subject = VerifiableCredential.Subject.deserialize(subject, VerifiableCredential.Subject, holder);

        if (!json.proof)
            throw new MalformedCredentialException("Missing property: proof");

        let proof = json.proof as JSONObject;
        this.proof = VerifiableCredential.Proof.deserialize(proof, VerifiableCredential.Proof, this.issuer);
    }

    /**
     * Parse a VerifiableCredential object from from a string JSON
     * representation.
     *
     * @param content the string JSON content for building the object
     * @return the VerifiableCredential object
     * @throws DIDSyntaxException if a parse error occurs
     */
    public static parse(content: string | JSONObject, context: DID = null): VerifiableCredential {
        try {
            return DIDEntity.deserialize(content, VerifiableCredential, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedCredentialException)
                throw e;
            else
                throw new MalformedCredentialException(e);
        }
    }
}

/* eslint-disable no-class-assign */
export namespace VerifiableCredential {
    /**
     * The object keeps the credential subject contents.
     *
     * This id field is mandatory, should be the controller's DID.
     * All the other fields could be defined by the application.
     * In order to support the JSON serialization, all values should be
     * JSON serializable.
     */
    export class Subject extends DIDEntity<Subject> {
        private id: DID;
        private properties: JSONObject;

        /**
         * Constructs the CredentialSubject object with given controller.
         *
         * @param id the controller of Credential Subject
         * @param properties the credential properties
         */
        constructor(id: DID = null, properties: JSONObject = {}) {
            super();
            this.id = id;
            this.properties = sortJSONObject(JSON.parse(JSON.stringify(properties)));
        }

        /**
         * Get the controller.
         *
         * @return the controller's DID
         */
        public getId(): DID {
            return this.id;
        }

        /**
         * Get the subject properties.
         *
         * @return the properties in String to Object map. It's a read-only map
         */
        public getProperties(): JSONObject {
            return JSON.parse(JSON.stringify(this.properties));
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
            return JSON.stringify(this.properties);
        }

        public toJSON(key: string = null): JSONObject {
            let context: DID = key ? new DID(key) : null;

            let json: JSONObject = {};
            //if (!context || !this.id.equals(context))
            json.id = this.id.toString();

            json = { ...json, ...this.properties };
            return json;
        }

        protected fromJSON(json: JSONObject, context: DID = null): void {
            this.id = this.getDid("subject.id", json.id,
                { mandatory: false, defaultValue: context });
            let props = JSON.parse(JSON.stringify(json));
            delete props.id; // or props['id']?
            this.properties = sortJSONObject(props);
        }
    }

    /**
     * The proof information for verifiable credential.
     *
     * The default proof type is ECDSAsecp256r1.
     */
    export class Proof extends DIDEntity<Proof> {
        private type: string;
        private created: Date;
        private verificationMethod: DIDURL;
        private signature: string;

        /**
         * Constructs the Proof object with the given values.
         *
         * @param type the verification method type
         * @param method the verification method, normally it's a public key
         * @param signature the signature encoded in base64 URL safe format
         */
        constructor(method: DIDURL = null, signature: string = null,
            created: Date = new Date(), type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
            super();
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

        public toJSON(key: string = null): JSONObject {
            let context: DID = key ? new DID(key) : null;

            let json: JSONObject = {};
            if (!context || this.type !== Constants.DEFAULT_PUBLICKEY_TYPE)
                json.type = this.type;
            if (this.created)
                json.created = this.dateToString(this.created);

            json.verificationMethod = this.verificationMethod.toJSON(key);
            json.signature = this.signature;

            return json;
        }

        protected fromJSON(json: JSONObject, context: DID = null): void {
            this.type = this.getString("proof.type", json.type,
                { mandatory: false, defaultValue: Constants.DEFAULT_PUBLICKEY_TYPE });
            this.created = this.getDate("proof.created", json.created,
                { mandatory: false });
            this.verificationMethod = this.getDidUrl("proof.verificationMethod", json.verificationMethod,
                { mandatory: true, nullable: false, context: context });
            this.signature = this.getString("proof.signature", json.signature,
                { mandatory: true, nullable: false });
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
        private subjectProperties: JSONObject;
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

            this.setDefaultType();
        }

        private checkNotSealed() {
            if (this.credential == null)
                throw new AlreadySealedException(this.id.toString() + " is already sealed");
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
                id = DIDURL.from(id, this.target);

            checkArgument(id.getDid() == null || id.getDid().equals(this.target), "Invalid id");

            if (id.getDid() == null)
                id = DIDURL.from(id, this.target);

            this.credential.id = id;
            return this;
        }

        public setDefaultType(): void{
            this.checkNotSealed();

            if (Features.isEnabledJsonLdContext()) {
                if (this.credential.context == null)
                    this.credential.context = [];

                if (!this.credential.context.includes(VerifiableCredential.W3C_CREDENTIAL_CONTEXT))
                    this.credential.context.push(VerifiableCredential.W3C_CREDENTIAL_CONTEXT);

                if (!this.credential.context.includes(VerifiableCredential.ELASTOS_CREDENTIAL_CONTEXT))
                    this.credential.context.push(VerifiableCredential.ELASTOS_CREDENTIAL_CONTEXT);
            }

            if (this.credential.type == null)
                this.credential.type = [];

            if (!this.credential.type.includes(VerifiableCredential.DEFAULT_CREDENTIAL_TYPE))
                this.credential.type.push(VerifiableCredential.DEFAULT_CREDENTIAL_TYPE);
        }

        /**
         * Add a new credential type.
         *
         * @param type the type name
         * @param context the JSON-LD context for type, or null if not
         * 		  enabled the JSON-LD feature
         * @return the Builder instance for method chaining
         */
        public typeWithContext(type: string, context: string): Builder {
            this.checkNotSealed();
            checkEmpty(type , "Invalid type: " + type);

            if (Features.isEnabledJsonLdContext()) {
                checkEmpty(context, "Invalid context: " + context);

                if (this.credential.context == null)
                    this.credential.context = [];

                if (!this.credential.context.includes(context))
                    this.credential.context.push(context);
            } else {
                log.warn("JSON-LD context support not enabled");
            }

            if (this.credential.type == null)
                this.credential.type = [];

            if (!this.credential.type.includes(type))
                this.credential.type.push(type);

            return this;
        }

        /**
         * Add a new credential type.
         *
         * If enabled the JSON-LD feature, the type should be a full type URI:
         *   [scheme:]scheme-specific-part#fragment,
         * [scheme:]scheme-specific-part should be the context URL,
         * the fragment should be the type name.
         *
         * Otherwise, the context URL part and # symbol could be omitted or
         * ignored.
         *
         * @param type the type name
         * @return the Builder instance for method chaining
         */
         public type(type: string): Builder {
            this.checkNotSealed();
            checkEmpty(type, "Invalid type: " + type);

            if (type.indexOf('#') < 0)
                return this.typeWithContext(type, null);
            else {
                let context_type = type.split("#", 2);
                return this.typeWithContext(context_type[1], context_type[0]);
            }
        }

        /**
         * Add new credential type.
         *
         * If enabled the JSON-LD feature, the type should be a full type URI:
         *   [scheme:]scheme-specific-part#fragment,
         * [scheme:]scheme-specific-part should be the context URL,
         * the fragment should be the type name.
         *
         * Otherwise, the context URL part and # symbol could be omitted or
         * ignored.
         *
         * @param types the type names
         * @return the Builder instance for method chaining
         */
        public types(...types: string[]): Builder {
            if (types == null || types.length == 0)
                return this;

            this.checkNotSealed();
            for (let t of types) {
                this.type(t);
            }

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
            if (this.credential.expirationDate)
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
            if (this.credential.expirationDate)
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

            let props = typeof newProperties === "string" ?
                JSON.parse(newProperties) :
                JSON.parse(JSON.stringify(newProperties));

            delete props.id;

            if (newProperties == null || Object.keys(newProperties).length == 0) {
                this.subjectProperties = {};
                return this;
            }

            this.subjectProperties = props;
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
            checkArgument(name != null && name !== "" && name !== "id", "Invalid name");

            if (!this.subjectProperties)
                this.subjectProperties = {};

            this.subjectProperties[name] = value;
            return this;
        }

        private sanitize() {
            if (this.credential.context == null || this.credential.context.length == 0)
                this.credential.context = [];

            if (this.credential.id == null)
                throw new MalformedCredentialException("Missing credential id");

            if (this.credential.type == null || this.credential.type.length == 0)
                throw new MalformedCredentialException("Missing credential type");

            Collections.sort(this.credential.type);

            this.credential.issuanceDate = new Date();
            if (this.credential.issuanceDate)
                this.credential.issuanceDate.setMilliseconds(0);

            if (!this.credential.hasExpirationDate())
                this.defaultExpirationDate();

            this.subjectProperties = sortJSONObject(this.subjectProperties);

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

            this.credential.subject = new VerifiableCredential.Subject(this.target, this.subjectProperties);
            let json = this.credential.serialize(true);
            let sig = await this.issuer.sign(storepass, Buffer.from(json));
            this.credential.proof = new VerifiableCredential.Proof(this.issuer.getSignKey(), sig);

            // Invalidate builder
            let vc = this.credential;
            this.credential = null;

            return vc;
        }
    }
}
