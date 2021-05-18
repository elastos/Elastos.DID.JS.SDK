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

import dayjs from "dayjs";
import { List as ImmutableList } from "immutable";
import {
    JsonInclude,
    JsonIncludeType,
    JsonProperty,
    JsonClassType,
    JsonCreator
} from "jackson-js";
import { Collections } from "./internals";
import { Constants } from "./constants";
import { ByteBuffer } from "./internals";
import { EcdsaSigner } from "./internals";
import { HDKey } from "./internals";
import { KeyPair } from "./crypto/keypair";
import { SHA256 } from "./internals";
import { DID } from "./internals";
import { DIDBackend } from "./internals";
import { DIDDocumentBuilder } from "./internals";
import { DIDDocumentConstants } from "./diddocumentconstants";
import { DIDDocumentMultiSignature } from "./internals";
import { DIDDocumentProof } from "./internals";
import { DIDDocumentPublicKey } from "./internals";
import { DIDDocumentPublicKeyReference } from "./internals";
import { DIDDocumentService } from "./internals";
import { DIDEntity } from "./internals";
import { DIDMetadata } from "./internals";
import { DIDStore } from "./internals";
import { DIDTransactionAdapter } from "./didtransactionadapter";
import { DIDURL } from "./internals";
import {
    AlreadySignedException,
    DIDAlreadyExistException,
    DIDDeactivatedException,
    DIDExpiredException,
    DIDNotFoundException,
    DIDNotGenuineException,
    DIDNotUpToDateException,
    InvalidKeyException,
    MalformedDocumentException,
    NoEffectiveControllerException,
    NotAttachedWithStoreException,
    NotControllerException,
    NotCustomizedDIDException,
    NotPrimitiveDIDException,
    UnknownInternalException
} from "./exceptions/exceptions";
import { Logger } from "./logger";
import { TransferTicket } from "./internals";
import { base64Decode, checkArgument } from "./internals";
import { VerifiableCredential } from "./internals";

/**
 * The DIDDocument represents the DID information.
 *
 * This is the concrete serialization of the data model, according to a
 * particular syntax.
 *
 * DIDDocument is a set of data that describes the subject of a DID, including
 * public key, authentication(optional), authorization(optional), credential and
 * services. One document must be have one subject, and at least one public
 * key.
 */
 export class DIDDocument extends DIDEntity<DIDDocument> {

    private static log = new Logger("DIDDocument");

    private subject: DID;

    // TODO: Convert from java - @JsonFormat(with:{JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED} )
    @JsonProperty({ value: DIDDocumentConstants.CONTROLLER })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [DID]]})
    public controllers?: DID[];

    @JsonProperty({ value: DIDDocumentConstants.MULTI_SIGNATURE })
    @JsonInclude({ value: JsonIncludeType.NON_NULL })
    @JsonClassType({type: () => [DIDDocumentMultiSignature]})
    public multisig?: DIDDocumentMultiSignature;

    @JsonProperty({ value: DIDDocumentConstants.PUBLICKEY })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [DIDDocumentPublicKey]]})
    public _publickeys?: DIDDocumentPublicKey[];

    @JsonProperty({ value: DIDDocumentConstants.AUTHENTICATION })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [DIDDocumentPublicKeyReference]]})
    public _authentications?: DIDDocumentPublicKeyReference[];

    @JsonProperty({ value: DIDDocumentConstants.AUTHORIZATION })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [DIDDocumentPublicKeyReference]]})
    public _authorizations?: DIDDocumentPublicKeyReference[];

    @JsonProperty({ value: DIDDocumentConstants.VERIFIABLE_CREDENTIAL })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [VerifiableCredential]]})
    public _credentials?: VerifiableCredential[];

    @JsonProperty({ value: DIDDocumentConstants.SERVICE })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [DIDDocumentService]]})
    public _services?: DIDDocumentService[];

    @JsonProperty({ value: DIDDocumentConstants.EXPIRES })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public expires?: Date;

    @JsonProperty({ value: DIDDocumentConstants.PROOF })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    @JsonClassType({type: () => [Array, [DIDDocumentProof]]})
    // TODO - Convert from Java - @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED})
    public _proofs?: DIDDocumentProof[];

    public controllerDocs?: Map<DID, DIDDocument>;
    public publicKeys?: Map<DIDURL, DIDDocumentPublicKey>;
    public credentials?: Map<DIDURL, VerifiableCredential>;
    public services?: Map<DIDURL, DIDDocumentService>;
    public proofs?: Map<DID, DIDDocumentProof>;

    public effectiveController?: DID;
    public defaultPublicKey?: DIDDocumentPublicKey;

    public metadata?: DIDMetadata;

    /**
     * Set the DIDDocument subject.
     *
     * @param subject the owner of DIDDocument
     */
    public constructor(@JsonProperty({ value: DIDDocumentConstants.ID, required: true }) subject?: DID) {
        super();
        this.subject = subject;
    }

    /**
     * Copy constructor.
     *
     * @param doc the document be copied
     */
    public static clone(doc: DIDDocument, withProof: boolean) {
        let newInstance: DIDDocument = new DIDDocument();
        newInstance.subject = doc.subject;
        newInstance.controllers = doc.controllers;
        newInstance.controllerDocs = doc.controllerDocs;
        newInstance.effectiveController = doc.effectiveController;
        newInstance.multisig = doc.multisig;
        newInstance.publicKeys = doc.publicKeys;
        newInstance._publickeys = doc._publickeys;
        newInstance._authentications = doc._authentications;
        newInstance._authorizations = doc._authorizations;
        newInstance.defaultPublicKey = doc.defaultPublicKey;
        newInstance.credentials = doc.credentials;
        newInstance._credentials = doc._credentials;
        newInstance.services = doc.services;
        newInstance._services = doc._services;
        newInstance.expires = doc.expires;
        if (withProof) {
            newInstance.proofs = doc.proofs;
            newInstance._proofs = doc._proofs;
        }
        newInstance.metadata = doc.metadata;
        return newInstance;
    }

    /**
     * Get subject of DIDDocument
     *
     * @return the DID object
     */
    public getSubject(): DID {
        return this.subject;
    }

    private canonicalId(id: DIDURL | string): DIDURL {
        if (id instanceof DIDURL) {
            if (id == null || id.getDid() != null)
                return id;

            return DIDURL.valueOf(this.getSubject(), id);
        }
        else {
            return DIDURL.valueOf(this.getSubject(), id);
        }
    }

    public checkAttachedStore() {
        if (!this.getMetadata().attachedStore())
            throw new NotAttachedWithStoreException();
    }

    private checkIsPrimitive() {
        if (this.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());
    }

    public checkIsCustomized() {
        if (!this.isCustomizedDid())
            throw new NotCustomizedDIDException(this.getSubject().toString());
    }

    private checkHasEffectiveController() {
        if (this.getEffectiveController() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());
    }

    public isCustomizedDid(): boolean {
        return this.defaultPublicKey == null;
    }

    /**
     * Get contoller's DID.
     *
     * @return the Controllers DID list or empty list if no controller
     */
    public getControllers(): ImmutableList<DID> {
        return ImmutableList(this.controllers);
    }

    /**
     * Get controller count.
     *
     * @return the controller count
     */
    public getControllerCount(): number {
        return this.controllers.length;
    }

    /**
     * Get contoller's DID.
     *
     * @return the Controller's DID if only has one controller, other wise null
     */
    public getController(): DID {
        return this.controllers.length == 1 ? this.controllers[0] : null;
    }

    /**
     * Check if current DID has controller, or has specific controller
     *
     * @return true if has, otherwise false
     */
    public hasController(did: DID = null): boolean {
        if (did)
            return this.controllers.find((d) => d.equals(did)) !== undefined;
        else
            return this.controllers.length != 0;
    }

    /**
     * Get controller's DID document.
     *
     * @return the DIDDocument object or null if no controller
     */
    public getControllerDocument(did: DID): DIDDocument {
        return this.controllerDocs.get(did);
    }

    public getEffectiveController(): DID {
        return this.effectiveController;
    }

    public getEffectiveControllerDocument(): DIDDocument {
        return this.effectiveController == null ? null : this.getControllerDocument(this.effectiveController);
    }

    public setEffectiveController(controller: DID) {
        this.checkIsCustomized();

        if (controller == null) {
            this.effectiveController = controller;
            return;
        } else {
            if (!this.hasController(controller))
                throw new NotControllerException("Not contoller for target DID");

            this.effectiveController = controller;

            // attach to the store if necessary
            let doc = this.getControllerDocument(this.effectiveController);
            if (!doc.getMetadata().attachedStore())
                doc.getMetadata().attachStore(this.getMetadata().getStore());
        }
    }

    public isMultiSignature(): boolean {
        return this.multisig != null;
    }

    public getMultiSignature(): DIDDocumentMultiSignature {
        return this.multisig;
    }

    /**
     * Get the count of public keys.
     *
     * @return the count
     */
    public getPublicKeyCount(): number {
        let count = this.publicKeys.size;

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                count += doc.getAuthenticationKeyCount();
        }

        return count;
    }

    /**
     * Get the public keys array.
     *
     * @return the PublicKey array
     */
    public getPublicKeys(): ImmutableList<DIDDocumentPublicKey> {
        let pks: ImmutableList<DIDDocumentPublicKey> = ImmutableList(this.publicKeys.values());

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(...doc.getAuthenticationKeys());
        }

        return ImmutableList(pks);
    }

    /**
     * Select public keys with the specified key id or key type.
     *
     * @param id the key id
     * @param type the type string
     * @return the matched PublicKey array
     */
    public selectPublicKeys(id: DIDURL | string, type: string): ImmutableList<DIDDocumentPublicKey> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: ImmutableList<DIDDocumentPublicKey> = ImmutableList();
        for (let pk of this.publicKeys.values()) {
            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && pk.getType() !== type)
                continue;

            pks.push(pk);
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(...doc.selectAuthenticationKeys(id, type));
        }

        return ImmutableList(pks);

    }

    /**
     * Get public key matched specified key id.
     *
     * @param id the key id
     * @return the PublicKey object
     */
    public getPublicKey(id: DIDURL | string): DIDDocumentPublicKey {
        checkArgument(id != null, "Invalid publicKey id");

        id = this.canonicalId(id);
        let pk = this.publicKeys.get(id);
        if (pk == null && this.hasController()) {
            let doc = this.getControllerDocument(id.getDid());
            if (doc != null)
                pk = doc.getAuthenticationKey(id);
        }

        return pk;
    }

    /**
     * Check if the specified public key exists.
     *
     * @param id the key id
     * @return the key exists or not
     */
    public hasPublicKey(id: DIDURL | string): boolean {
        return this.getPublicKey(this.canonicalId(id)) != null;
    }

    /**
     * Check if the specified private key exists.
     *
     * @param id the key id
     * @return the key exists or not
     * @throws DIDStoreException there is no store
     */
    public hasPrivateKey(idOrString: DIDURL | string): boolean {
        if (typeof idOrString === "string")
            idOrString = this.canonicalId(idOrString);

        checkArgument(idOrString != null, "Invalid publicKey id");

        if (this.hasPublicKey(idOrString) && this.getMetadata().attachedStore())
            return this.getMetadata().getStore().containsPrivateKey(idOrString);
        else
            return false;
    }

    /**
     * Get default key id of did document.
     *
     * @return the default key id
     */
    public getDefaultPublicKeyId(): DIDURL {
        let pk = this.getDefaultPublicKey();
        return pk != null ? pk.getId() : null;
    }

    /**
     * Get default key of did document.
     *
     * @return the default key
     */
    public getDefaultPublicKey(): DIDDocumentPublicKey {
        if (this.defaultPublicKey != null)
            return this.defaultPublicKey;

        if (this.effectiveController != null)
            return this.getControllerDocument(this.effectiveController).getDefaultPublicKey();

        return null;
    }

    /**
     * Get KeyPair object according to the given key id.
     *
     * @param id the given key id
     * @return the KeyPair object
     * @throws InvalidKeyException there is no the matched key
     */
    public getKeyPair(inputId: DIDURL | string): KeyPair {
        let pk: DIDDocumentPublicKey;
        let id = typeof inputId === "string" ? this.canonicalId(inputId) : inputId;

        if (id == null) {
            pk = this.getDefaultPublicKey();
            if (pk == null)
                throw new NoEffectiveControllerException(this.getSubject().toString());
        } else {
            pk = this.getPublicKey(id);
            if (pk == null)
                throw new InvalidKeyException(id.toString());
        }

        let key = HDKey.deserialize(HDKey.paddingToExtendedPublicKey(pk.getPublicKeyBytes()));

        return key.getJCEKeyPair();
    }

    private getKeyPairWithPass(id: DIDURL, storepass: string): KeyPair {
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        if (id == null) {
            id = this.getDefaultPublicKeyId();
            if (id == null)
                throw new NoEffectiveControllerException(this.getSubject().toString());
        } else {
            if (!this.hasPublicKey(id))
                throw new InvalidKeyException(DIDDocumentConstants.ID.toString());
        }

        if (!this.getMetadata().getStore().containsPrivateKey(id))
            throw new InvalidKeyException("No private key: " + id);

        let key = HDKey.deserialize(this.getMetadata().getStore().loadPrivateKey(
                id, storepass));

        return key.getJCEKeyPair();
    }

    /**
     * Derive the index private key.
     *
     * @param index the index
     * @param storepass the password for DIDStore
     * @return the extended private key format. (the real private key is
     *         32 bytes long start from position 46)
     * @throws DIDStoreException there is no DID store to get root private key
     */
    public derive(index: number, storepass: string): string {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");
        this.checkAttachedStore();
        this.checkIsPrimitive();

        let key = HDKey.deserialize(this.getMetadata().getStore().loadPrivateKey(
            this.getDefaultPublicKeyId(), storepass));

        return key.deriveWithIndex(index).serializeBase58();
    }

    // TODO: check with jingyu what is this "identifier" and if we have a better way (existing libs)
    // than using raw bytes manipulation here.
    private mapToDerivePath(identifier: string, securityCode: number): string {
        let digest = SHA256.encodeToBuffer(Buffer.from(identifier, "utf-8"));
        let path = "";
        let bb = ByteBuffer.wrap(digest);
        while (bb.hasRemaining()) {
            let idx = bb.readInt();
            if (idx >= 0)
                path = path.concat(idx.toString());
            else
                path = path.concat((idx & 0x7FFFFFFF).toString()).concat("H");

            path = path.concat("/");
        }

        if (securityCode >= 0)
            path = path.concat(securityCode.toString());
        else
            path = path.concat((securityCode & 0x7FFFFFFF).toString()).concat('H');

        return path;
    }

    /**
     * Derive the extended private key according to identifier string and security code.
     *
     * @param identifier the identifier string
     * @param securityCode the security code
     * @param storepass the password for DID store
     * @return the extended derived private key
     * @throws DIDStoreException there is no DID store to get root private key
     */
    public deriveFromIdentifier(identifier: string, securityCode: number, storepass: string): string {
        checkArgument(identifier && identifier != null, "Invalid identifier");
        this.checkAttachedStore();
        this.checkIsPrimitive();

        let key = HDKey.deserialize(this.getMetadata().getStore().loadPrivateKey(
            this.getDefaultPublicKeyId(), storepass));

        let path = this.mapToDerivePath(identifier, securityCode);
        return key.deriveWithPath(path).serializeBase58();
    }

    /**
     * Get the count of authentication keys.
     *
     * @return the count of authentication key array
     */
    public getAuthenticationKeyCount(): number {
        let count = 0;

        for (let pk of this.publicKeys.values()) {
            if (pk.isAuthenticationKey())
                count++;
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                count += doc.getAuthenticationKeyCount();
        }

        return count;
    }

    /**
     * Get the authentication key array.
     *
     * @return the matched authentication key array
     */
    public getAuthenticationKeys(): ImmutableList<DIDDocumentPublicKey> {
        let pks: ImmutableList<DIDDocumentPublicKey> = ImmutableList();

        for (let pk of this.publicKeys.values()) {
            if (pk.isAuthenticationKey())
                pks.push(pk);
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(...doc.getAuthenticationKeys());
        }

        return pks;
    }

    /**
     * Select the authentication key matched the key id or the type.
     *
     * @param id the key id
     * @param type the type of key
     * @return the matched authentication key array
     */
    public selectAuthenticationKeys(id: DIDURL | string, type: string): ImmutableList<DIDDocumentPublicKey> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: ImmutableList<DIDDocumentPublicKey> = ImmutableList();
        for (let pk of this.publicKeys.values()) {
            if (!pk.isAuthenticationKey())
                continue;

            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && pk.getType() !== type)
                continue;

            pks.push(pk);
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(...doc.selectAuthenticationKeys(id, type));
        }

        return pks;
    }

    /**
     * Get authentication key with specified key id.
     *
     * @param id the key id
     * @return the matched authentication key object
     */
    public getAuthenticationKey(idOrString: DIDURL | string): DIDDocumentPublicKey {
        let pk = this.getPublicKey(this.canonicalId(idOrString));
        return (pk != null && pk.isAuthenticationKey()) ? pk : null;
    }

    /**
     * Judge whether the given key is authentication key or not.
     *
     * @param id the key id
     * @return the returned value is true if the key is an authentication key;
     *         the returned value is false if the key is not an authentication key.
     */
    public isAuthenticationKey(idOrString: DIDURL | string): boolean {
        return this.getAuthenticationKey(this.canonicalId(idOrString)) != null;
    }

    /**
     * Get the count of authorization key.
     *
     * @return the count
     */
    public getAuthorizationKeyCount(): number {
        let count = 0;

        for (let pk of this.publicKeys.values()) {
            if (pk.isAuthorizationKey())
                count++;
        }

        return count;
    }

    /**
     * Get the authorization key array.
     *
     * @return the  array
     */
    public getAuthorizationKeys(): ImmutableList<DIDDocumentPublicKey> {
        let pks: ImmutableList<DIDDocumentPublicKey> = ImmutableList();

        for (let pk of this.publicKeys.values()) {
            if (pk.isAuthorizationKey())
                pks.push(pk);
        }

        return pks;
    }

    /**
     * Select the authorization key array matched the key id or the type.
     *
     * @param id the key id
     * @param type the type of key
     * @return the matched authorization key array
     */
    public selectAuthorizationKeys(idOrString: DIDURL | string, type: string): ImmutableList<DIDDocumentPublicKey> {
        checkArgument(idOrString != null || type != null, "Invalid select args");

        idOrString = this.canonicalId(idOrString);

        let pks: ImmutableList<DIDDocumentPublicKey> = ImmutableList();
        for (let pk of this.publicKeys.values()) {
            if (!pk.isAuthorizationKey())
                continue;

            if (idOrString != null && !pk.getId().equals(idOrString))
                continue;

            if (type != null && pk.getType() !== type)
                continue;

            pks.push(pk);
        }

        return pks;
    }

    /**
     * Get authorization key matched the given key id.
     *
     * @param id the key id
     * @return the authorization key object
     */
    public getAuthorizationKey(id: DIDURL | string): DIDDocumentPublicKey {
        let pk = this.getPublicKey(id);
        return pk != null && pk.isAuthorizationKey() ? pk : null;
    }

    /**
     * Judge whether the public key matched the given key id is an authorization key.
     *
     * @param id the key id
     * @return the returned value is true if the matched key is an authorization key;
     *         the returned value is false if the matched key is not an authorization key.
     */
    public isAuthorizationKey(id: DIDURL | string): boolean {
        return this.getAuthorizationKey(id) != null;
    }

    /**
     * Get the count of Credential array.
     *
     * @return the count
     */
    public getCredentialCount(): number {
        return this.credentials.size;
    }

    /**
     * Get the Credential array.
     *
     * @return the Credential array
     */
    public getCredentials(): ImmutableList<VerifiableCredential> {
        return ImmutableList(this._credentials);
    }

    /**
     * Select the Credential array matched the given credential id or the type.
     *
     * @param id the credential id
     * @param type the type of credential
     * @return the matched Credential array
     */
    public selectCredentials(id: DIDURL | string, type: string): ImmutableList<VerifiableCredential> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let vcs: ImmutableList<VerifiableCredential> = ImmutableList();
        for (let vc of this.credentials.values()) {
            if (id != null && !vc.getId().equals(id))
                continue;

            if (type != null && !vc.getType().contains(type))
                continue;

            vcs.push(vc);
        }

        return vcs;
    }

    /**
     * Get the Credential matched the given credential id.
     *
     * @param id the credential id
     * @return the matched Credential object
     */
    public getCredential(id: DIDURL | string): VerifiableCredential {
        checkArgument(id != null, "Invalid Credential id");

        return this.credentials.get(this.canonicalId(id));
    }

    /**
     * Get the count of Service array.
     *
     * @return the count
     */
    public getServiceCount(): number {
        return this.services.size;
    }

    /**
     * Get the Service array.
     *
     * @return the Service array
     */
    public getServices(): ImmutableList<DIDDocumentService> {
        return ImmutableList(this._services);
    }

    /**
     * Select Service array matched the given service id or the type.
     *
     * @param id the service id
     * @param type the type of service
     * @return the matched Service array
     */
    public selectServices(id: DIDURL | string, type: string): ImmutableList<DIDDocumentService> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let svcs: ImmutableList<DIDDocumentService> = ImmutableList();
        for (let svc of this.services.values()) {
            if (id != null && !svc.getId().equals(id))
                continue;

            if (type != null && svc.getType() !== type)
                continue;

            svcs.push(svc);
        };

        return svcs;
    }

    /**
     * Get the Service matched the given service id.
     *
     * @param id the service id
     * @return the matched Service object
     */
    public getService(id: DIDURL | string): DIDDocumentService {
        checkArgument(id != null, "Invalid service id");
        return this.services.get(this.canonicalId(id));
    }

    /**
     * Get expires time of did document.
     *
     * @return the expires time
     */
    public getExpires(): Date {
        return this.expires;
    }

    /**
     * Get last modified time.
     *
     * @return the last modified time
     */
    public getLastModified(): Date {
        return this.getProof().getCreated();
    }

    /**
     * Get last modified time.
     *
     * @return the last modified time
     */
    public getSignature(): string {
        return this.getProof().getSignature();
    }

    /**
     * Get Proof object from did document.
     *
     * @return the Proof object
     */
    public getProof(): DIDDocumentProof {
        return this._proofs[0];
    }

    /**
     * Get all Proof objects.
     *
     * @return list of the Proof objects
     */
    public getProofs(): ImmutableList<DIDDocumentProof> {
        return ImmutableList(this._proofs);
    }

    /**
     * Get current object's DID context.
     *
     * @return the DID object or null
     */
    protected getSerializeContextDid(): DID {
        return this.getSubject();
    }

    /**
     * Sanitize routine before sealing or after deserialization.
     *
     * @param withProof check the proof object or not
     * @throws MalformedDocumentException if the document object is invalid
     */
    protected sanitize() {
        this.sanitizeControllers();
        this.sanitizePublickKey();
        this.sanitizeCredential();
        this.sanitizeService();

        if (this.expires == null)
            throw new MalformedDocumentException("Missing document expires.");

        this.sanitizeProof();
    }

    private sanitizeControllers() {
        if (this.controllers == null || this.controllers.length == 0) {
            this.controllers = [];
            this.controllerDocs = new Map();

            if (this.multisig != null)
                throw new MalformedDocumentException("Invalid multisig property");

            return;
        }

        this.controllerDocs = new Map<DID, DIDDocument>();
        try {
            for (let did of this.controllers) {
                let doc = did.resolve();
                if (doc == null)
                    throw new MalformedDocumentException("Can not resolve controller: " + did);

                this.controllerDocs.set(did, doc);
            }
        } catch (e) {
            // DIDResolveException
            throw new MalformedDocumentException("Can not resolve the controller's DID");
        }

        if (this.controllers.length == 1) {
            if (this.multisig != null)
                throw new MalformedDocumentException("Invalid multisig property");
        } else {
            if (this.multisig == null)
                throw new MalformedDocumentException("Missing multisig property");

            if (this.multisig.n() != this.controllers.length)
                throw new MalformedDocumentException("Invalid multisig property");
        }

        Collections.sort(this.controllers);

        if (this.controllers.length == 1)
            this.effectiveController = this.controllers[0];
    }

    private sanitizePublickKey() {
        let pks = new Map<DIDURL, DIDDocumentPublicKey>();

        if (this._publickeys != null && this._publickeys.length > 0) {
            for (let pk of this._publickeys) {
                if (pk.getId().getDid() == null) {
                    pk.getId().setDid(this.getSubject());
                } else {
                    if (!pk.getId().getDid().equals(this.getSubject()))
                        throw new MalformedDocumentException("Invalid public key id: " + pk.getId());
                }

                if (pks.has(pk.getId()))
                    throw new MalformedDocumentException("Public key already exists: " + pk.getId());

                if (!pk.getPublicKeyBase58())
                    throw new MalformedDocumentException("Invalid public key base58 value.");

                if (pk.getType() == null)
                    pk.type = Constants.DEFAULT_PUBLICKEY_TYPE;

                if (pk.getController() == null)
                    pk.controller = this.getSubject();

                pks.set(pk.getId(), pk);
            }
        }

        if (this._authentications != null && this._authentications.length > 0) {
            let pk: DIDDocumentPublicKey;

            for (let keyRef of this._authentications) {
                if (keyRef.isVirtual()) {
                    if (keyRef.getId().getDid() == null) {
                        keyRef.getId().setDid(this.getSubject());
                    } else {
                        if (!keyRef.getId().getDid().equals(this.getSubject()))
                            throw new MalformedDocumentException("Invalid publicKey id: " + keyRef.getId());
                    }

                    pk = pks.get(keyRef.getId());
                    if (pk == null)
                        throw new MalformedDocumentException("Not exists publicKey reference: " + keyRef.getId());

                    keyRef.update(pk);
                } else {
                    pk = keyRef.getPublicKey();

                    if (keyRef.getId().getDid() == null) {
                        keyRef.getId().setDid(this.getSubject());
                    } else {
                        if (!keyRef.getId().getDid().equals(this.getSubject()))
                            throw new MalformedDocumentException("Invalid publicKey id: " + keyRef.getId());
                    }

                    if (pks.has(pk.getId()))
                        throw new MalformedDocumentException("Public key already exists: " + pk.getId());

                    if (!pk.getPublicKeyBase58())
                        throw new MalformedDocumentException("Invalid public key base58 value.");

                    if (pk.getType() == null)
                        pk.type = Constants.DEFAULT_PUBLICKEY_TYPE;

                    if (pk.getController() == null)
                        pk.controller = this.getSubject();

                    pks.set(pk.getId(), pk);
                }

                pk.setAuthenticationKey(true);
            }

            Collections.sort(this._authentications);
        } else {
            this._authentications = [];
        }

        if (this._authorizations != null && this._authorizations.length > 0) {
            let pk: DIDDocumentPublicKey;

            for (let keyRef of this._authorizations) {
                if (keyRef.isVirtual()) {
                    if (keyRef.getId().getDid() == null) {
                        keyRef.getId().setDid(this.getSubject());
                    } else {
                        if (!keyRef.getId().getDid().equals(this.getSubject()))
                            throw new MalformedDocumentException("Invalid publicKey id: " + keyRef.getId());
                    }

                    pk = pks.get(keyRef.getId());
                    if (pk == null)
                        throw new MalformedDocumentException("Not exists publicKey reference: " + keyRef.getId());

                    keyRef.update(pk);
                } else {
                    pk = keyRef.getPublicKey();

                    if (keyRef.getId().getDid() == null) {
                        keyRef.getId().setDid(this.getSubject());
                    } else {
                        if (!keyRef.getId().getDid().equals(this.getSubject()))
                            throw new MalformedDocumentException("Invalid publicKey id: " + keyRef.getId());
                    }

                    if (pks.has(pk.getId()))
                        throw new MalformedDocumentException("Public key already exists: " + pk.getId());

                    if (!pk.getPublicKeyBase58())
                        throw new MalformedDocumentException("Invalid public key base58 value.");

                    if (pk.getType() == null)
                        pk.type = Constants.DEFAULT_PUBLICKEY_TYPE;

                    if (pk.getController() == null)
                        throw new MalformedDocumentException("Public key missing controller: " + pk.getId());
                    else {
                        if (pk.getController().equals(this.getSubject()))
                            throw new MalformedDocumentException("Authorization key with wrong controller: " + pk.getId());
                    }

                    pks.set(pk.getId(), pk);
                }

                pk.setAuthorizationKey(true);
            }

            Collections.sort(this._authorizations);
        } else {
            this._authorizations = [];
        }

        // for customized DID with controller, could be no public keys
        if (pks.size > 0) {
            this.publicKeys = pks;
            this._publickeys = Array.from(pks.values());
        } else {
            this.publicKeys = new Map();
            this._publickeys = [];
        }

        // Find default key
        for (let pk of this.publicKeys.values()) {
            if (pk.getController().equals(this.getSubject())) {
                let address = HDKey.toAddress(pk.getPublicKeyBytes());
                if (address === this.getSubject().getMethodSpecificId()) {
                    this.defaultPublicKey = pk;
                    if (!pk.isAuthenticationKey()) {
                        pk.setAuthenticationKey(true);
                        if (this._authentications.length == 0) {
                            this._authentications = [];
                            this._authentications.push(DIDDocumentPublicKeyReference.newWithKey(pk));
                        } else {
                            this._authentications.push(DIDDocumentPublicKeyReference.newWithKey(pk));
                            Collections.sort(this._authentications);
                        }
                    }

                    break;
                }
            }
        }

        if (this.controllers.length == 0 && this.defaultPublicKey == null)
            throw new MalformedDocumentException("Missing default public key.");
    }

    private sanitizeCredential() {
        if (this._credentials == null || this._credentials.length == 0) {
            this._credentials = [];
            this.credentials = new Map();
            return;
        }

        let vcs = new Map<DIDURL, VerifiableCredential>();
        for (let vc of this._credentials) {
            if (vc.getId() == null)
                throw new MalformedDocumentException("Missing credential id.");

            if (vc.getId().getDid() == null) {
                vc.getId().setDid(this.getSubject());
            } else {
                if (!vc.getId().getDid().equals(this.getSubject()))
                    throw new MalformedDocumentException("Invalid crdential id: " + vc.getId());
            }

            if (vcs.has(vc.getId()))
                throw new MalformedDocumentException("Credential already exists: " + vc.getId());

            if (vc.getSubject().getId() == null)
                vc.getSubject().setId(this.getSubject());

            try {
                vc.sanitize();
            } catch (e) {
                // DIDSyntaxException
                throw new MalformedDocumentException("Invalid credential: " + vc.getId(), e);
            }

            vcs.set(vc.getId(), vc);
        }

        this.credentials = vcs;
        this._credentials = Array.from(this.credentials.values());
    }

    private sanitizeService() {
        if (this._services == null || this._services.length == 0) {
            this._services = [];
            this.services = new Map();
            return;
        }

        let svcs = new Map<DIDURL, DIDDocumentService>();
        for (let svc of this._services) {
            if (svc.getId().getDid() == null) {
                svc.getId().setDid(this.getSubject());
            } else {
                if (!svc.getId().getDid().equals(this.getSubject()))
                    throw new MalformedDocumentException("Invalid crdential id: " + svc.getId());
            }

            if (!svc.getType())
                throw new MalformedDocumentException("Invalid service type.");

            if (!svc.getServiceEndpoint() || svc.getServiceEndpoint() == null)
                throw new MalformedDocumentException("Missing service endpoint.");

            if (svcs.has(svc.getId()))
                throw new MalformedDocumentException("Service already exists: " + svc.getId());

            svcs.set(svc.getId(), svc);
        }

        this.services = svcs;
        this._services = Array.from(svcs.values());
    }

    private sanitizeProof() {
        if (this._proofs == null || this._proofs.length == 0)
            throw new MalformedDocumentException("Missing document proof");

        this.proofs = new Map<DID, DIDDocumentProof>();

        for (let proof of this._proofs) {
            if (proof.getCreator() == null) {
                if (this.defaultPublicKey != null)
                    proof.creator = this.defaultPublicKey.getId();
                else if (this.controllers.length == 1)
                    proof.creator = this.controllerDocs.get(this.controllers[0]).getDefaultPublicKeyId();
                else
                    throw new MalformedDocumentException("Missing creator key");
            } else {
                if (proof.getCreator().getDid() == null) {
                    if (this.defaultPublicKey != null)
                        proof.getCreator().setDid(this.getSubject());
                    else if (this.controllers.length == 1)
                        proof.getCreator().setDid(this.controllers[0]);
                    else
                        throw new MalformedDocumentException("Invalid creator key");
                }
            }

            if (this.proofs.has(proof.getCreator().getDid()))
                throw new MalformedDocumentException("Aleady exist proof from " + proof.getCreator().getDid());

            this.proofs.set(proof.getCreator().getDid(), proof);
        }

        this._proofs = Array.from(this.proofs.values());
        Collections.sort(this._proofs);
    }

    /**
     * Set DID Metadata object for did document.
     *
     * @param metadata the DIDMetadataImpl object
     */
    public setMetadata(metadata: DIDMetadata) {
        this.metadata = metadata;
        this.subject.setMetadata(metadata);
    }

    /**
     * Get DID Metadata object from did document.
     *
     * @return the DIDMetadata object
     */
    public getMetadata(): DIDMetadata {
        if (this.metadata == null) {
            this.metadata = new DIDMetadata(this.getSubject());
        }

        return this.metadata;
    }

    public getStore(): DIDStore {
        return this.getMetadata().getStore();
    }

    /**
     * Judge whether the did document is expired or not.
     *
     * @return the returned value is true if the did document is expired;
     *         the returned value is false if the did document is not expired.
     */
    public isExpired(): boolean {
        return dayjs().isAfter(dayjs(this.expires));
    }

    /**
     * Judge whether the did document is tampered or not.
     *
     * @return the returned value is true if the did document is genuine;
     *         the returned value is false if the did document is not genuine.
     */
    public isGenuine(): boolean {
        // Proofs count should match with multisig
        let expectedProofs = this.multisig == null ? 1 : this.multisig.m();
        if (this.proofs.size != expectedProofs)
            return false;

        let doc = DIDDocument.clone(this, false);
        let json = doc.serialize(true);
        let digest = EcdsaSigner.sha256Digest(Buffer.from(json, 'utf-8'));

        // Document should signed(only) by default public key.
        if (!this.isCustomizedDid()) {
            let proof = this.getProof();

            // Unsupported public key type;
            if (proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE)
                return false;

            if (!proof.getCreator().equals(this.getDefaultPublicKeyId()))
                return false;

            return this.verifyDigest(proof.getCreator(), proof.getSignature(), digest);
        } else {
            for (let proof of this._proofs) {
                // Unsupported public key type;
                if (proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE)
                    return false;

                let controllerDoc = this.getControllerDocument(proof.getCreator().getDid());
                if (controllerDoc == null)
                    return false;

                if (!controllerDoc.isGenuine())
                    return false;

                if (!proof.getCreator().equals(controllerDoc.getDefaultPublicKeyId()))
                    return false;

                if (!controllerDoc.verifyDigest(proof.getCreator(), proof.getSignature(), digest))
                    return false;
            }

            return true;
        }
    }

    /**
     * Judge whether the did document is deactivated or not.
     *
     * @return the returned value is true if the did document is genuine;
     *         the returned value is false if the did document is not genuine.
     */
    public isDeactivated(): boolean {
        return this.getMetadata().isDeactivated();
    }

    /**
     * Check whether the ticket is qualified.
     * Qualified check will only check the number of signatures meet the
     * requirement.
     *
     * @return true is the ticket is qualified else false
     */
    public isQualified(): boolean {
        if (this._proofs == null || this._proofs.length == 0)
            return false;

        return this._proofs.length == (this.multisig == null ? 1 : this.multisig.m());
    }

    /**
     * Judge whether the did document is valid or not.
     *
     * @return the returned value is true if the did document is valid;
     *         the returned value is false if the did document is not valid.
     */
    public isValid(): boolean {
        if (this.isDeactivated() || this.isExpired() || !this.isGenuine())
            return false;

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values()) {
                if (doc.isDeactivated() || !doc.isGenuine())
                    return false;
            }
        }

        return true;
    }

    public copy(): DIDDocument {
        let doc = new DIDDocument(this.subject);

        doc.controllers = Array.from(this.controllers);
        doc.controllerDocs = new Map<DID, DIDDocument>(this.controllerDocs);
        if (this.multisig != null)
            doc.multisig = DIDDocumentMultiSignature.newFromMultiSignature(this.multisig);
        doc.publicKeys = new Map<DIDURL, DIDDocumentPublicKey>(this.publicKeys);
        doc.defaultPublicKey = this.defaultPublicKey;
        doc.credentials = new Map<DIDURL, VerifiableCredential>(this.credentials);
        doc.services = new Map<DIDURL, DIDDocumentService>(this.services);
        doc.expires = this.expires;
        doc.proofs = new Map<DID, DIDDocumentProof>(this.proofs);

        let metadata: DIDMetadata = this.getMetadata().clone();
        doc.setMetadata(metadata);

        return doc;
    }

    /**
     * Sign the data by the specified key.
     *
     * @param id the key id
     * @param storepass the password for DIDStore
     * @param data the data be signed
     * @return the signature string
     * @throws InvalidKeyException if the sign key is invalid
     * @throws DIDStoreException there is no DIDStore to get private key
     */
    public signWithId(id: DIDURL | string | null, storepass: string, ...data: Buffer[]): string {
        checkArgument(storepass && storepass != null, "Invalid storepass");
        checkArgument(data != null && data.length > 0, "Invalid input data");
        this.checkAttachedStore();

        let signId: any;

        if (typeof id === "string")
            signId = this.canonicalId(id);
        else
            signId = id;

        let digest = SHA256.encodeToBuffer(...data);
        return this.signDigest(signId, storepass, digest);
    }

	public signWithStorePass(storepass: string, ...data: Buffer[]): string {
		return this.signWithId(null, storepass, ...data);
	}

    public signWithTicket(ticket: TransferTicket, storepass: string): TransferTicket {
        checkArgument(ticket != null, "Invalid ticket");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        ticket.seal(this, storepass);
        return ticket;
    }

    public signWithDocument(doc: DIDDocument, storepass: string): DIDDocument {
        checkArgument(doc != null, "Invalid document");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        if (!doc.isCustomizedDid())
            throw new NotCustomizedDIDException(doc.getSubject().toString());

        if (!doc.hasController(this.getSubject()))
            throw new NotControllerException();

        if (this.isCustomizedDid()) {
            if (this.getEffectiveController() == null)
                throw new NoEffectiveControllerException(this.getSubject().toString());
        } else {
            if (!doc.hasController(this.getSubject()))
                throw new NotControllerException(this.getSubject().toString());
        }

        if (doc.proofs.has(this.getSubject()))
            throw new AlreadySignedException(this.getSubject().toString());

        let builder = DIDDocumentBuilder.newFromDocument(doc).edit(this);
        try {
            return builder.seal(storepass);
        } catch (ignore) {
            // MalformedDocumentException
            throw new UnknownInternalException(ignore);
        }
    }

    /**
     * Sign the digest data by the specified key.
     *
     * @param id the key id
     * @param storepass the password for DIDStore
     * @param digest the digest data to be signed
     * @return the signature string
     * @throws InvalidKeyException if the sign key is invalid
     * @throws DIDStoreException there is no DIDStore to get private key
     */
    public signDigest(id: DIDURL | string | null, storepass: string, digest: Buffer): string {
        checkArgument(storepass && storepass != null, "Invalid storepass");
        checkArgument(digest != null && digest.length > 0, "Invalid digest");
        this.checkAttachedStore();

        if (typeof id === "string")
            id = this.canonicalId(id);

        let pk = id != null ? this.getPublicKey(id) : this.getDefaultPublicKey();
        if (pk == null) {
            if (id != null)
                throw new InvalidKeyException(id.toString());
            else
                throw new NoEffectiveControllerException(this.getSubject().toString());
        }

        return this.getMetadata().getStore().sign(pk.getId(), storepass, digest);
    }

    /**
     * Verify the signature string by data and the sign key.
     *
     * @param id the key id
     * @param signature the signature string
     * @param data the data to be signed
     * @return the returned value is true if verifing data is successfully;
     *         the returned value is false if verifing data is not successfully.
     */
    public verify(id: DIDURL | string | null, signature: string, ...data: Buffer[]): boolean {
        checkArgument(signature && signature != null, "Invalid signature");
        checkArgument(data != null && data.length > 0, "Invalid digest");

        let digest = EcdsaSigner.sha256Digest(...data);
        return this.verifyDigest(id, signature, digest);
    }

    /**
     * Verify the digest by the specified key.
     *
     * @param id the key id
     * @param signature the signature string
     * @param digest the digest data be signed
     * @return the returned value is true if verifing digest is successfully;
     *         the returned value is false if verifing digest is not successfully.
     */
    public verifyDigest(id: DIDURL | string | null, signature: string, digest: Buffer): boolean {
        checkArgument(signature && signature != null, "Invalid signature");
        checkArgument(digest != null && digest.length > 0, "Invalid digest");

        if (typeof id === "string")
            id = this.canonicalId(id);

        let pk = id != null ? this.getPublicKey(id) : this.getDefaultPublicKey();
        if (pk == null) {
            if (id != null)
                throw new InvalidKeyException(id.toString());
            else
                throw new InvalidKeyException("No explicit publicKey");
        }

        let binkey = pk.getPublicKeyBytes();
        let sig = base64Decode(signature);

        return EcdsaSigner.verify(binkey, Buffer.from(sig), digest);
    }

    /* public JwtBuilder jwtBuilder() {
        JwtBuilder builder = new JwtBuilder(this.getSubject().toString(), new KeyProvider() {

            @Override
            public java.security.PublicKey getPublicKey(id: string) {
                return getKeyPair(canonicalId(id)).getPublic();
            }

            @Override
            public PrivateKey getPrivateKey(id: string, storepass: string) {
                return getKeyPair(canonicalId(id), storepass).getPrivate();
            }
        });

        return builder.setIssuer(this.getSubject().toString());
    } */

    /* public JwtParserBuilder jwtParserBuilder() {
        JwtParserBuilder jpb = new JwtParserBuilder(new KeyProvider() {

            @Override
            public java.security.PublicKey getPublicKey(id: string) {
                return getKeyPair(canonicalId(id)).getPublic();
            }

            @Override
            public PrivateKey getPrivateKey(id: string, storepass: string) {
                return null;
            }
        });

        jpb.requireIssuer(this.getSubject().toString());
        return jpb;
    } */

    public newCustomized(inputDID: DID | string, multisig: number, storepass: string, force?: boolean): DIDDocument {
        return this.newCustomizedDidWithController(inputDID, [], 1, storepass, force);
    }

    public newCustomizedDidWithController(inputDID: DID | string, inputControllers: Array<DID | string>, multisig: number, storepass: string, force?: boolean): DIDDocument {
        checkArgument(inputDID && inputDID != null, "Invalid DID");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        let did = inputDID instanceof DID ? inputDID : DID.valueOf(inputDID);
        let controllers = [];

        if (inputControllers && inputControllers.length ) {
            inputControllers.forEach(function (ctrl) {
                let controller: DID = typeof ctrl === "string" ? new DID(ctrl) : ctrl;
                if (!controller.equals(this.getSubject()) && !controllers.includes(ctrl))
                    controllers.push (controller);

            });
        }

        checkArgument(multisig >= 0 && multisig <= controllers.length + 1, "Invalid multisig");

        DIDDocument.log.info("Creating new DID {} with controller {}...", did, this.getSubject());

        let doc: DIDDocument = null;
        if (!force) {
            doc = did.resolve(true);
            if (doc)
                throw new DIDAlreadyExistException(did.toString());
        }

        DIDDocument.log.info("Creating new DID {} with controller {}...", did, this.getSubject());

        let docBuilder = DIDDocumentBuilder.newFromDID(did, this.getStore(), this);
        controllers.forEach(function (ctrl) {
            docBuilder.addController(ctrl);
        });

        docBuilder.setMultiSignature(multisig);

        try {
            doc = docBuilder.seal(storepass);
            this.getStore().storeDid(doc);
            return doc;
        } catch (ignore) {
            throw new UnknownInternalException(ignore);
        }
    }

    public createTransferTicket(to: DID, storepass: string, from?: DID): TransferTicket {
        checkArgument(to && to != null, "Invalid to");
        checkArgument(storepass && storepass != null, "Invalid storepass");

        let source:DIDDocument = !from ? this : from.resolve(true);

        if (from) {
            this.checkIsPrimitive();
            this.checkAttachedStore();
            if (!source)
                throw new DIDNotFoundException(from.toString());
            if (source.isDeactivated())
    			throw new DIDDeactivatedException(from.toString());

            if (!source.isCustomizedDid())
                throw new NotCustomizedDIDException(from.toString());

            if (!source.hasController(this.getSubject()))
                throw new NotControllerException(this.getSubject().toString());

        } else {
            this.checkIsCustomized();
            this.checkAttachedStore();
            this.checkHasEffectiveController();
        }

		let ticket:TransferTicket = TransferTicket.newForDIDDocument(source, to);
		ticket.seal(this, storepass);

		return ticket;
    }

    public publishWithTicket(ticket: TransferTicket, inputSignKey: DIDURL | string | null, storepass: string, adapter: DIDTransactionAdapter = null) {
        checkArgument(ticket.isValid(), "Invalid ticket");
        checkArgument(ticket.getSubject().equals(this.getSubject()), "Ticket mismatch with current DID");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkIsCustomized();
        checkArgument(this.proofs.has(ticket.getTo()), "Document not signed by: " + ticket.getTo());
        this.checkAttachedStore();

        let signKey: DIDURL = typeof inputSignKey === "string" ? this.canonicalId(inputSignKey) : inputSignKey;

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        let did = this.getSubject();
        let targetDoc = did.resolve(true);
        if (targetDoc == null)
            throw new DIDNotFoundException(did.toString());

        if (targetDoc.isDeactivated())
            throw new DIDDeactivatedException(did.toString());

        if (signKey == null) {
            signKey = this.getDefaultPublicKeyId();
        } else {
            if (this.getAuthenticationKey(signKey) == null)
                throw new InvalidKeyException(signKey.toString());
        }

        DIDBackend.getInstance().transferDid(this, ticket, signKey, storepass, adapter);
    }

    public publishWithTicketAsync(ticket: TransferTicket, signKey: DIDURL | string, storepass: string, adapter: DIDTransactionAdapter = null): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.publishWithTicket(ticket, signKey, storepass, adapter);
                resolve();
            } catch (e) {
                // DIDException
                reject(e);
            }
        });
    }

    /**
     * Publish DID Document to the ID chain.
     *
     * @param signKey the key to sign
     * @param force force = true, must be publish whether the local document is lastest one or not;
     *              force = false, must not be publish if the local document is not the lastest one,
     *              and must resolve at first.
     *
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     * @throws InvalidKeyException there is no an authentication key.
     */
    public publish(storepass: string, inputSignKey: DIDURL | string = null, force: boolean = false, adapter: DIDTransactionAdapter = null) {
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        let signKey: DIDURL = typeof inputSignKey === "string" ? this.canonicalId(inputSignKey) : inputSignKey;

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

            DIDDocument.log.info("Publishing DID {}, force={}...", this.getSubject(), force);

        if (!this.isGenuine()) {
            DIDDocument.log.error("Publish failed because document is not genuine.");
            throw new DIDNotGenuineException(this.getSubject().toString());
        }

        if (this.isDeactivated()) {
            DIDDocument.log.error("Publish failed because DID is deactivated.");
            throw new DIDDeactivatedException(this.getSubject().toString());
        }

        if (this.isExpired() && !force) {
            DIDDocument.log.error("Publish failed because document is expired.");
            DIDDocument.log.info("You can publish the expired document using force mode.");
            throw new DIDExpiredException(this.getSubject().toString());
        }

        let lastTxid: string = null;
        let reolvedSignautre: string = null;
        let resolvedDoc = this.getSubject().resolve(true);
        if (resolvedDoc != null) {
            if (resolvedDoc.isDeactivated()) {
                this.getMetadata().setDeactivated(true);

                DIDDocument.log.error("Publish failed because DID is deactivated.");
                throw new DIDDeactivatedException(this.getSubject().toString());
            }

            reolvedSignautre = resolvedDoc.getProof().getSignature();

            if (!force) {
                let localPrevSignature = this.getMetadata().getPreviousSignature();
                let localSignature = this.getMetadata().getSignature();

                if (localPrevSignature == null && localSignature == null) {
                    DIDDocument.log.error("Missing signatures information, " +
                        "DID SDK dosen't know how to handle it, " +
                        "use force mode to ignore checks.");
                    throw new DIDNotUpToDateException(this.getSubject().toString());
                } else if (localPrevSignature == null || localSignature == null) {
                    let ls = localPrevSignature != null ? localPrevSignature : localSignature;
                    if (ls !== reolvedSignautre) {
                        DIDDocument.log.error("Current copy not based on the lastest on-chain copy, signature mismatch.");
                        throw new DIDNotUpToDateException(this.getSubject().toString());
                    }
                } else {
                    if (localSignature !== reolvedSignautre &&
                        localPrevSignature !== reolvedSignautre) {
                        DIDDocument.log.error("Current copy not based on the lastest on-chain copy, signature mismatch.");
                        throw new DIDNotUpToDateException(this.getSubject().toString());
                    }
                }
            }

            lastTxid = resolvedDoc.getMetadata().getTransactionId();
        }

        if (signKey == null) {
            signKey = this.getDefaultPublicKeyId();
        } else {
            if (this.getAuthenticationKey(signKey) == null)
                throw new InvalidKeyException(signKey.toString());
        }

        if (!lastTxid || lastTxid == null) {
            DIDDocument.log.info("Try to publish[create] {}...", this.getSubject());
            DIDBackend.getInstance().createDid(this, signKey, storepass, adapter);
        } else {
            DIDDocument.log.info("Try to publish[update] {}...", this.getSubject());
            DIDBackend.getInstance().updateDid(this, lastTxid, signKey, storepass, adapter);
        }

        this.getMetadata().setPreviousSignature(reolvedSignautre);
        this.getMetadata().setSignature(this.getProof().getSignature());
    }

    /**
     * Publish DID content(DIDDocument) to chain with asynchronous mode.
     *
     * @param signKey the key to sign
     * @param force force = true, must be publish whether the local document is lastest one or not;
     *              force = false, must not be publish if the local document is not the lastest one,
     *              and must resolve at first.
     * @param storepass the password for DIDStore
     * @return the new CompletableStage, no result.
     */
    public publishAsync(signKey: DIDURL | string, force: boolean = false, storepass: string = null, adapter: DIDTransactionAdapter = null): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.publish(storepass, signKey, force, adapter);
                resolve();
            } catch (e) {
                // DIDException
                reject(e);
            }
        });
    }

    /**
     * Deactivate self use authentication key.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @throws InvalidKeyException there is no an authentication key
     * @throws DIDStoreException deactivate did failed because of did store error
     * @throws DIDBackendException deactivate did failed because of did backend error
     */
    public deactivate(signKey: DIDURL, storepass: string = null, adapter: DIDTransactionAdapter = null) {
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        // Document should use the IDChain's copy
        let doc = this.getSubject().resolve(true);
        if (doc == null)
            throw new DIDNotFoundException(this.getSubject().toString());
        else if (doc.isDeactivated())
            throw new DIDDeactivatedException(this.getSubject().toString());
        else
            doc.getMetadata().attachStore(this.getStore());

        if (signKey == null) {
            signKey = doc.getDefaultPublicKeyId();
        } else {
            if (!doc.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString());
        }

        DIDBackend.getInstance().deactivateDid(doc, signKey, storepass, adapter);

        if (this.getSignature() !== doc.getSignature())
            this.getStore().storeDid(doc);
    }

    /**
     * Deactivate self use authentication key with asynchronous mode.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @return the new CompletableStage, no result.
     */
    public deactivateAsync(signKey: DIDURL, storepass: string = null, adapter: DIDTransactionAdapter = null): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.deactivate(signKey, storepass, adapter);
                resolve();
            } catch (e) {
                //DIDException
                reject(e);
            }
        });
    }

    /**
     * Deactivate target DID by authorizor's DID.
     *
     * @param target the target DID
     * @param signKey the authorizor's key to sign
     * @param storepass the password for DIDStore
     * @throws InvalidKeyException there is no an authentication key.
     * @throws DIDStoreException deactivate did failed because of did store error.
     * @throws DIDBackendException deactivate did failed because of did backend error.
     */
    // NOTE: Was deactivate() in java
    public deactivateTargetDID(target: DID, signKey: DIDURL, storepass: string = null, adapter: DIDTransactionAdapter = null) {
        checkArgument(target != null, "Invalid target DID");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        let targetDoc = target.resolve(true);
        if (targetDoc == null)
            throw new DIDNotFoundException(target.toString());
        else if (targetDoc.isDeactivated())
            throw new DIDDeactivatedException(target.toString());

        targetDoc.getMetadata().attachStore(this.getStore());

        if (!targetDoc.isCustomizedDid()) {
            if (targetDoc.getAuthorizationKeyCount() == 0)
                throw new InvalidKeyException("No authorization key from: " + target);

            let candidatePks: DIDDocumentPublicKey[] = null;
            if (signKey == null) {
                candidatePks = this.getAuthenticationKeys().toArray();
            } else {
                let pk = this.getAuthenticationKey(signKey);
                if (pk == null)
                    throw new InvalidKeyException(signKey.toString());
                candidatePks = [];
                candidatePks.push(pk);
            }

            // Lookup the authorization key id in the target doc
            let realSignKey: DIDURL = null;
            let targetSignKey: DIDURL = null;
            lookup: for (let candidatePk of candidatePks) {
                for (let pk of targetDoc.getAuthorizationKeys()) {
                    if (!pk.getController().equals(this.getSubject()))
                        continue;

                    if (pk.getPublicKeyBase58() === candidatePk.getPublicKeyBase58()) {
                        realSignKey = candidatePk.getId();
                        targetSignKey = pk.getId();
                        break lookup;
                    }
                }
            }

            if (realSignKey == null || targetSignKey == null)
                throw new InvalidKeyException("No matched authorization key.");

            DIDBackend.getInstance().deactivateTargetDid(targetDoc, targetSignKey,
                this, realSignKey, storepass, adapter);
        } else {
            if (!targetDoc.hasController(this.getSubject()))
                throw new NotControllerException(this.getSubject().toString());

            if (signKey == null) {
                signKey = this.getDefaultPublicKeyId();
            } else {
                if (!signKey.equals(this.getDefaultPublicKeyId()))
                    throw new InvalidKeyException(signKey.toString());
            }

            DIDBackend.getInstance().deactivateDid(targetDoc, signKey, storepass, adapter);

            if (this.getStore().containsDid(target))
                this.getStore().storeDid(targetDoc);
        }
    }

    /**
     * Deactivate target DID by authorizor's DID with asynchronous mode.
     *
     * @param target the target DID
     * @param signKey the authorizor's key to sign
     * @param storepass the password for DIDStore
     * @return the new CompletableStage, no result.
     */
    // NOTE: Was deactivateAsync() in java
    public deactivateTargetDIDAsync(target: DID, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.deactivateTargetDID(target, signKey, storepass, adapter);
                resolve();
            } catch (e) {
                // DIDException
                reject(e);
            }
        });
    }

    /**
     * Parse a DIDDocument object from from a string JSON representation.
     *
     * @param content the string JSON content for building the object.
     * @return the DIDDocument object.
     * @throws MalformedDocumentException if a parse error occurs.
     */
    public static parseContent(content: string): DIDDocument {
        try {
            return DIDEntity.parse(content, DIDDocument);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedDocumentException)
                throw e;
            else
                throw new MalformedDocumentException(e);
        }
    }
}
