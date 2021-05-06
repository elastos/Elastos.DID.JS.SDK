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

import {
    JsonClassType,
    JsonProperty,
    JsonInclude,
    JsonIncludeType,
    JsonPropertyOrder,
    JsonValue,
    JsonSerialize,
    JsonDeserialize,
    JsonAnyGetter,
    JsonAnySetter
} from "jackson-js";
import {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "jackson-js/dist/@types";
import { DIDEntity } from "./didentity";
import { DID } from "./did";
import { DIDURL } from "./didurl";
import { DIDObject } from "./didobject";
import { Logger } from "./logger";
import { checkArgument } from "./utils";
import {
    List as ImmutableList,
    Map as ImmutableMap
} from "immutable";
import { VerifiableCredential } from "./verifiablecredential";
import {
    ParentException,
    MalformedDocumentException,
    NotCustomizedDIDException,
    NotAttachedWithStoreException,
    NotPrimitiveDIDException,
    NoEffectiveControllerException,
    InvalidKeyException,
    NotControllerException,
    DIDNotFoundException,
    DIDDeactivatedException,
    DIDNotGenuineException,
    DIDExpiredException,
    DIDNotUpToDateException,
    IllegalArgumentException,
    AlreadySealedException,
    DIDObjectAlreadyExistException,
    IllegalUsage,
    UnknownInternalException,
    DIDObjectNotExistException,
    AlreadySignedException,
    CanNotRemoveEffectiveController,
    DIDObjectHasReference,
    DIDAlreadyExistException
} from "./exceptions/exceptions";
import { DIDMetadata } from "./didmetadata";
import dayjs from "dayjs";
import { Collections } from "./collections";
import { Constants } from "./constants";
import { Comparable } from "./comparable";
import { DIDStore } from "./didstore";
import { DIDBackend } from "./didbackend";
import { DIDTransactionAdapter } from "./didtransactionadapter";
import { Base58 } from "./crypto/base58";
import { Issuer } from "./issuer";
import { TransferTicket } from "./transferticket";
import { HDKey } from "./crypto/hdkey";
import { EcdsaSigner } from "./crypto/ecdsasigner";
import { SHA256 } from "./crypto/sha256";
import { KeyPair } from "./crypto/keypair";
import { ByteBuffer } from "./crypto/bytebuffer";
import {
    PropertySerializerFilter,
    Serializer,
    Deserializer
} from "./serializers";
import { TypeSerializerFilter } from "./filters";
import { JSONObject, JSONValue } from "./json";

const log = new Logger("DIDDocument");

export class PublicKeySerializerFilter extends PropertySerializerFilter<DID> {
    public static include (controller: DID, context: JsonStringifierTransformerContext): boolean {
        let serializeContext =  this.context(context);

        return serializeContext.isNormalized() || (!(serializeContext && controller && controller.equals(serializeContext.getDid())));
    }
}

export class PublicKeyReferenceSerializer extends Serializer {
    public static serialize(keyRef: DIDDocument.PublicKeyReference, context: JsonStringifierTransformerContext): string | null {

        return keyRef ? this.mapper(context).stringify(keyRef.getId()) : null;
    }
}

export class PublicKeyReferenceDeserializer extends Deserializer {
    public static deserialize(value: string, context: JsonParserTransformerContext): DIDDocument.PublicKeyReference {
        try {
            if (value && value.includes("{")) {
                let jsonObj = JSON.parse(value);
                return DIDDocument.PublicKeyReference.newWithKey(this.mapper(context).parse<DIDDocument.PublicKey>(jsonObj.key, {mainCreator: () => [DIDDocument.PublicKey]}));
            }
            return DIDDocument.PublicKeyReference.newWithURL(DIDURL.newWithUrl(value));
        } catch (e) {
            throw new ParentException("Invalid public key");
        }
    }
}

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
    public static ID: string = "id";
    public static PUBLICKEY: string = "publicKey";
    public static TYPE: string = "type";
    public static CONTROLLER: string = "controller";
    public static MULTI_SIGNATURE: string = "multisig";
    public static PUBLICKEY_BASE58: string = "publicKeyBase58";
    public static AUTHENTICATION: string = "authentication";
    public static AUTHORIZATION: string = "authorization";
    public static SERVICE: string = "service";
    public static VERIFIABLE_CREDENTIAL: string = "verifiableCredential";
    public static SERVICE_ENDPOINT: string = "serviceEndpoint";
    public static EXPIRES: string = "expires";
    public static PROOF: string = "proof";
    public static CREATOR: string = "creator";
    public static CREATED: string = "created";
    public static SIGNATURE_VALUE: string = "signatureValue";

    private subject: DID;

    // TODO: Convert from java - @JsonFormat(with:{JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED} )
    @JsonProperty({ value: DIDDocument.CONTROLLER })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public controllers?: DID[];

    @JsonProperty({ value: DIDDocument.MULTI_SIGNATURE })
    @JsonInclude({ value: JsonIncludeType.NON_NULL })
    public multisig?: DIDDocument.MultiSignature;

    @JsonProperty({ value: DIDDocument.PUBLICKEY })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public _publickeys?: DIDDocument.PublicKey[];

    @JsonProperty({ value: DIDDocument.AUTHENTICATION })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public _authentications?: DIDDocument.PublicKeyReference[];

    @JsonProperty({ value: DIDDocument.AUTHORIZATION })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public _authorizations?: DIDDocument.PublicKeyReference[];

    @JsonProperty({ value: DIDDocument.VERIFIABLE_CREDENTIAL })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public _credentials?: VerifiableCredential[];

    @JsonProperty({ value: DIDDocument.SERVICE })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public _services?: DIDDocument.Service[];

    @JsonProperty({ value: DIDDocument.EXPIRES })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    public expires?: Date;

    @JsonProperty({ value: DIDDocument.PROOF })
    @JsonInclude({ value: JsonIncludeType.NON_EMPTY })
    // TODO - Convert from Java - @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED})
    public _proofs?: DIDDocument.Proof[];

    public controllerDocs?: Map<DID, DIDDocument>;
    public publicKeys?: Map<DIDURL, DIDDocument.PublicKey>;
    public credentials?: Map<DIDURL, VerifiableCredential>;
    public services?: Map<DIDURL, DIDDocument.Service>;
    public proofs?: Map<DID, DIDDocument.Proof>;

    public effectiveController?: DID;
    public defaultPublicKey?: DIDDocument.PublicKey;

    public metadata?: DIDMetadata;

    /**
     * Set the DIDDocument subject.
     *
     * @param subject the owner of DIDDocument
     */
    // Java: @JsonCreator()
    public constructor(@JsonProperty({ value: DIDDocument.ID, required: true }) subject?: DID) {
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
     * Get subject of DIDDocument.
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

    private checkAttachedStore() {
        if (!this.getMetadata().attachedStore())
            throw new NotAttachedWithStoreException();
    }

    private checkIsPrimitive() {
        if (this.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());
    }

    private checkIsCustomized() {
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

    protected getEffectiveControllerDocument(): DIDDocument {
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

    public getMultiSignature(): DIDDocument.MultiSignature {
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
    public getPublicKeys(): ImmutableList<DIDDocument.PublicKey> {
        let pks: ImmutableList<DIDDocument.PublicKey> = ImmutableList(this.publicKeys.values());

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
    public selectPublicKeys(id: DIDURL | string, type: string): ImmutableList<DIDDocument.PublicKey> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: ImmutableList<DIDDocument.PublicKey> = ImmutableList();
        for (let pk of this.publicKeys.values()) {
            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && !pk.getType().equals(type))
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
    public getPublicKey(id: DIDURL | string): DIDDocument.PublicKey {
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
    public getDefaultPublicKey(): DIDDocument.PublicKey {
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
        let pk: DIDDocument.PublicKey;
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
                throw new InvalidKeyException(DIDDocument.ID.toString());
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
        checkArgument(identifier != null && !identifier.isEmpty(), "Invalid identifier");
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
    public getAuthenticationKeys(): ImmutableList<DIDDocument.PublicKey> {
        let pks: ImmutableList<DIDDocument.PublicKey> = ImmutableList();

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
    public selectAuthenticationKeys(id: DIDURL | string, type: string): ImmutableList<DIDDocument.PublicKey> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: ImmutableList<DIDDocument.PublicKey> = ImmutableList();
        for (let pk of this.publicKeys.values()) {
            if (!pk.isAuthenticationKey())
                continue;

            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && !pk.getType().equals(type))
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
    public getAuthenticationKey(idOrString: DIDURL | string): DIDDocument.PublicKey {
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
    public getAuthorizationKeys(): ImmutableList<DIDDocument.PublicKey> {
        let pks: ImmutableList<DIDDocument.PublicKey> = ImmutableList();

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
    public selectAuthorizationKeys(idOrString: DIDURL | string, type: string): ImmutableList<DIDDocument.PublicKey> {
        checkArgument(idOrString != null || type != null, "Invalid select args");

        idOrString = this.canonicalId(idOrString);

        let pks: ImmutableList<DIDDocument.PublicKey> = ImmutableList();
        for (let pk of this.publicKeys.values()) {
            if (!pk.isAuthorizationKey())
                continue;

            if (idOrString != null && !pk.getId().equals(idOrString))
                continue;

            if (type != null && !pk.getType().equals(type))
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
    public getAuthorizationKey(id: DIDURL | string): DIDDocument.PublicKey {
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
    public getServices(): ImmutableList<DIDDocument.Service> {
        return ImmutableList(this._services);
    }

    /**
     * Select Service array matched the given service id or the type.
     *
     * @param id the service id
     * @param type the type of service
     * @return the matched Service array
     */
    public selectServices(id: DIDURL | string, type: string): ImmutableList<DIDDocument.Service> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let svcs: ImmutableList<DIDDocument.Service> = ImmutableList();
        for (let svc of this.services.values()) {
            if (id != null && !svc.getId().equals(id))
                continue;

            if (type != null && !svc.getType().equals(type))
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
    public getService(id: DIDURL | string): DIDDocument.Service {
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
    public getProof(): DIDDocument.Proof {
        return this._proofs[0];
    }

    /**
     * Get all Proof objects.
     *
     * @return list of the Proof objects
     */
    public getProofs(): ImmutableList<DIDDocument.Proof> {
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
        let pks = new Map<DIDURL, DIDDocument.PublicKey>();

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

                if (pk.getPublicKeyBase58().isEmpty())
                    throw new MalformedDocumentException("Invalid public key base58 value.");

                if (pk.getType() == null)
                    pk.type = Constants.DEFAULT_PUBLICKEY_TYPE;

                if (pk.getController() == null)
                    pk.controller = this.getSubject();

                pks.set(pk.getId(), pk);
            }
        }

        if (this._authentications != null && this._authentications.length > 0) {
            let pk: DIDDocument.PublicKey;

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

                    if (pk.getPublicKeyBase58().isEmpty())
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
            let pk: DIDDocument.PublicKey;

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

                    if (pk.getPublicKeyBase58().isEmpty())
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
                if (address.equals(this.getSubject().getMethodSpecificId())) {
                    this.defaultPublicKey = pk;
                    if (!pk.isAuthenticationKey()) {
                        pk.setAuthenticationKey(true);
                        if (this._authentications.length == 0) {
                            this._authentications = [];
                            this._authentications.push(DIDDocument.PublicKeyReference.newWithKey(pk));
                        } else {
                            this._authentications.push(DIDDocument.PublicKeyReference.newWithKey(pk));
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

        let svcs = new Map<DIDURL, DIDDocument.Service>();
        for (let svc of this._services) {
            if (svc.getId().getDid() == null) {
                svc.getId().setDid(this.getSubject());
            } else {
                if (!svc.getId().getDid().equals(this.getSubject()))
                    throw new MalformedDocumentException("Invalid crdential id: " + svc.getId());
            }

            if (svc.getType().isEmpty())
                throw new MalformedDocumentException("Invalid service type.");

            if (svc.getServiceEndpoint() == null || svc.getServiceEndpoint().isEmpty())
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

        this.proofs = new Map<DID, DIDDocument.Proof>();

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
            if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
                return false;

            if (!proof.getCreator().equals(this.getDefaultPublicKeyId()))
                return false;

            return this.verifyDigest(proof.getCreator(), proof.getSignature(), digest);
        } else {
            for (let proof of this._proofs) {
                // Unsupported public key type;
                if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
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
            doc.multisig = DIDDocument.MultiSignature.newFromMultiSignature(this.multisig);
        doc.publicKeys = new Map<DIDURL, DIDDocument.PublicKey>(this.publicKeys);
        doc.defaultPublicKey = this.defaultPublicKey;
        doc.credentials = new Map<DIDURL, VerifiableCredential>(this.credentials);
        doc.services = new Map<DIDURL, DIDDocument.Service>(this.services);
        doc.expires = this.expires;
        doc.proofs = new Map<DID, DIDDocument.Proof>(this.proofs);

        let metadata: DIDMetadata = this.getMetadata().clone();
        doc.setMetadata(metadata);

        return doc;
    }

    public edit(controller?: DIDDocument): DIDDocument.Builder {
        if (controller !== undefined) {
            this.checkIsCustomized();

            if (!this.getMetadata().attachedStore() && !controller.getMetadata().attachedStore())
                throw new NotAttachedWithStoreException();

            if (!controller.getMetadata().attachedStore())
                controller.getMetadata().attachStore(this.getMetadata().getStore());

            if (!this.hasController(controller.getSubject()))
                throw new NotControllerException(controller.getSubject().toString());

            return DIDDocument.Builder.newFromDocument(this, controller);
        }
        else {
            if (!this.isCustomizedDid()) {
                this.checkAttachedStore();

                return DIDDocument.Builder.newFromDocument(this);
            } else {
                if (this.getEffectiveController() == null)
                    throw new NoEffectiveControllerException();

                return this.edit(this.getEffectiveControllerDocument());
            }
        }
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        this.checkAttachedStore();

        ticket.seal(this, storepass);
        return ticket;
    }

    public signWithDocument(doc: DIDDocument, storepass: string): DIDDocument {
        checkArgument(doc != null, "Invalid document");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
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

        let builder = doc.edit(this);
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
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
        checkArgument(signature != null && !signature.isEmpty(), "Invalid signature");
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
        checkArgument(signature != null && !signature.isEmpty(), "Invalid signature");
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
        let sig = signature.base64Decode();

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
        let controllers: Array<DID | string> = [];

        if (inputControllers && inputControllers.length ) {
            inputControllers.forEach(function (ctrl) {
                let controller: DID = typeof ctrl === "string" ? new DID(ctrl) : ctrl;
                if (!controller.equals(this.getSubject()) && !controllers.contains(ctrl))
                    controllers.push (controller);

            });
        }

        checkArgument(multisig >= 0 && multisig <= controllers.length + 1, "Invalid multisig");

        log.info("Creating new DID {} with controller {}...", did, this.getSubject());

        let doc: DIDDocument = null;
        if (!force) {
            doc = did.resolve(true);
            if (doc)
                throw new DIDAlreadyExistException(did.toString());
        }

        log.info("Creating new DID {} with controller {}...", did, this.getSubject());

        let docBuilder = DIDDocument.Builder.newFromDID(did, this.getStore(), this);
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        this.checkAttachedStore();

        let signKey: DIDURL = typeof inputSignKey === "string" ? this.canonicalId(inputSignKey) : inputSignKey;

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        log.info("Publishing DID {}, force={}...", this.getSubject(), force);

        if (!this.isGenuine()) {
            log.error("Publish failed because document is not genuine.");
            throw new DIDNotGenuineException(this.getSubject().toString());
        }

        if (this.isDeactivated()) {
            log.error("Publish failed because DID is deactivated.");
            throw new DIDDeactivatedException(this.getSubject().toString());
        }

        if (this.isExpired() && !force) {
            log.error("Publish failed because document is expired.");
            log.info("You can publish the expired document using force mode.");
            throw new DIDExpiredException(this.getSubject().toString());
        }

        let lastTxid: string = null;
        let reolvedSignautre: string = null;
        let resolvedDoc = this.getSubject().resolve(true);
        if (resolvedDoc != null) {
            if (resolvedDoc.isDeactivated()) {
                this.getMetadata().setDeactivated(true);

                log.error("Publish failed because DID is deactivated.");
                throw new DIDDeactivatedException(this.getSubject().toString());
            }

            reolvedSignautre = resolvedDoc.getProof().getSignature();

            if (!force) {
                let localPrevSignature = this.getMetadata().getPreviousSignature();
                let localSignature = this.getMetadata().getSignature();

                if (localPrevSignature == null && localSignature == null) {
                    log.error("Missing signatures information, " +
                        "DID SDK dosen't know how to handle it, " +
                        "use force mode to ignore checks.");
                    throw new DIDNotUpToDateException(this.getSubject().toString());
                } else if (localPrevSignature == null || localSignature == null) {
                    let ls = localPrevSignature != null ? localPrevSignature : localSignature;
                    if (!ls.equals(reolvedSignautre)) {
                        log.error("Current copy not based on the lastest on-chain copy, signature mismatch.");
                        throw new DIDNotUpToDateException(this.getSubject().toString());
                    }
                } else {
                    if (!localSignature.equals(reolvedSignautre) &&
                        !localPrevSignature.equals(reolvedSignautre)) {
                        log.error("Current copy not based on the lastest on-chain copy, signature mismatch.");
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

        if (lastTxid == null || lastTxid.isEmpty()) {
            log.info("Try to publish[create] {}...", this.getSubject());
            DIDBackend.getInstance().createDid(this, signKey, storepass, adapter);
        } else {
            log.info("Try to publish[update] {}...", this.getSubject());
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
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

        if (!this.getSignature().equals(doc.getSignature()))
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
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
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

            let candidatePks: DIDDocument.PublicKey[] = null;
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

                    if (pk.getPublicKeyBase58().equals(candidatePk.getPublicKeyBase58())) {
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

export namespace DIDDocument {
    export class MultiSignature {
        private mv: number;
        private nv: number;

        public constructor(m: number, n: number) {
            this.apply(m, n);
        }

        public static newFromMultiSignature(ms: MultiSignature): MultiSignature {
            return new MultiSignature(ms.m(), ms.n());
        }

        protected apply(m: number, n: number) {
            checkArgument(n > 1, "Invalid multisig spec: n should > 1");
            checkArgument(m > 0 && m <= n, "Invalid multisig spec: m should > 0 and <= n");

            this.mv = m;
            this.nv = n;
        }

        public m(): number {
            return this.mv;
        }

        public n(): number {
            return this.nv;
        }

        public equals(multisig: MultiSignature): boolean {
            if (this == multisig)
                return true;

            return this.mv == multisig.mv && this.nv == multisig.nv;
        }

        @JsonValue()
        public toString(): string {
            return this.mv.toString() + ":" + this.nv.toString();
        }
    }

    /**
     * Publickey is used for digital signatures, encryption and
     * other cryptographic operations, which are the basis for purposes such as
     * authentication or establishing secure communication with service endpoints.
     */
    @JsonPropertyOrder({
        value: [
            DIDDocument.ID, DIDDocument.TYPE, DIDDocument.CONTROLLER, DIDDocument.PUBLICKEY_BASE58
        ]
    })
    export class PublicKey implements DIDObject<string>, Comparable<PublicKey> {
        @JsonProperty({ value: DIDDocument.ID })
        public id: DIDURL;
        @JsonSerialize({using: TypeSerializerFilter.filter})
        @JsonProperty({ value: DIDDocument.TYPE })
        public type: string;
        @JsonSerialize({using: PublicKeySerializerFilter.filter})
        @JsonProperty({ value: DIDDocument.CONTROLLER })
        public controller: DID;
        @JsonProperty({ value: DIDDocument.PUBLICKEY_BASE58 })
        public keyBase58: string;
        private authenticationKey: boolean;
        private authorizationKey: boolean;

        /**
         * Constructs Publickey with the given value.
         *
         * @param id the Id for PublicKey
         * @param type the type string of PublicKey, default type is "ECDSAsecp256r1"
         * @param controller the DID who holds private key
         * @param keyBase58 the string from encoded base58 of public key
         */
        // Java: @JsonCreator
        constructor(@JsonProperty({ value: DIDDocument.ID, required: true }) id: DIDURL,
            @JsonProperty({ value: DIDDocument.TYPE }) type: string,
            @JsonProperty({ value: DIDDocument.CONTROLLER }) controller: DID,
            @JsonProperty({ value: DIDDocument.PUBLICKEY_BASE58, required: true }) keyBase58: string) {
            this.id = id;
            this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
            this.controller = controller;
            this.keyBase58 = keyBase58;
        }

        /**
         * Get the PublicKey id.
         *
         * @return the identifier
         */
        public getId(): DIDURL {
            return this.id;
        }

        /**
         * Get the PublicKey type.
         *
         * @return the type string
         */
        public getType(): string {
            return this.type;
        }

        /**
         * Get the controller of Publickey.
         *
         * @return the controller
         */
        public getController(): DID {
            return this.controller;
        }

        /**
         * Get public key base58 string.
         *
         * @return the key base58 string
         */
        public getPublicKeyBase58(): string {
            return this.keyBase58;
        }

        /**
         * Get public key bytes.
         *
         * @return the key bytes
         */
        public getPublicKeyBytes(): Buffer {
            return Base58.decode(this.keyBase58);
        }

        /**
         * Check if the key is an authentication key or not.
         *
         * @return if the key is an authentication key or not
         */
        public isAuthenticationKey(): boolean {
            return this.authenticationKey;
        }

        public setAuthenticationKey(authenticationKey: boolean) {
            this.authenticationKey = authenticationKey;
        }

        /**
         * Check if the key is an authorization key or not.
         *
         * @return if the key is an authorization key or not
         */
        public isAuthorizationKey(): boolean {
            return this.authorizationKey;
        }

        public setAuthorizationKey(authorizationKey: boolean) {
            this.authorizationKey = authorizationKey;
        }

        public equals(ref: PublicKey): boolean {
            if (this == ref)
                return true;

            return (this.getId().equals(ref.getId()) &&
                this.getType().equals(ref.getType()) &&
                this.getController().equals(ref.getController()) &&
                this.getPublicKeyBase58().equals(ref.getPublicKeyBase58()))
        }

        public compareTo(key: PublicKey): number {
            let rc: number = this.id.compareTo(key.id);

            if (rc != 0)
                return rc;
            else
                rc = this.keyBase58.compareTo(key.keyBase58);

            if (rc != 0)
                return rc;
            else
                rc = this.type.compareTo(key.type);

            if (rc != 0)
                return rc;
            else
                return this.controller.compareTo(key.controller);
        }
    }

    @JsonSerialize({ using: PublicKeyReferenceSerializer.serialize })
    @JsonDeserialize({ using: PublicKeyReferenceDeserializer.deserialize })
    export class PublicKeyReference implements Comparable<PublicKeyReference> {
        private id: DIDURL;
        private key?: PublicKey;

        private constructor(id: DIDURL) {
            this.id = id;
        }

        static newWithURL(id: DIDURL): PublicKeyReference {
            let instance: PublicKeyReference = new PublicKeyReference(id);
            return instance;
        }

        static newWithKey(key: PublicKey): PublicKeyReference {
            let instance: PublicKeyReference = new PublicKeyReference(key.getId());
            instance.key = key;
            return instance;
        }

        public isVirtual(): boolean {
            return this.key == undefined;
        }

        public getId(): DIDURL {
            return this.id;
        }

        public getPublicKey(): PublicKey {
            return this.key;
        }

        public update(key: PublicKey): void {
            checkArgument(key != null && key.getId().equals(this.id), "Invalid key to update the public key reference");

            this.id = key.getId();
            this.key = key;
        }

        public equals(other: PublicKeyReference): boolean {
            return false;
        }

        public compareTo(ref?: PublicKeyReference): number {
            if (this.key && ref.key) {
                return this.key.compareTo(ref.key);
            }
            return this.id.compareTo(ref.id);
        }
    }

    /**
     * A Service may represent any type of service the subject
     * wishes to advertise, including decentralized identity management services
     * for further discovery, authentication, authorization, or interaction.
     */
    @JsonPropertyOrder({
        value: [
            DIDDocument.ID, DIDDocument.TYPE, DIDDocument.SERVICE_ENDPOINT
        ]
    })
    export class Service implements DIDObject<string> {
        @JsonProperty({ value: DIDDocument.ID })
        private id: DIDURL;
        @JsonProperty({ value: DIDDocument.TYPE }) @JsonClassType({ type: () => [String] })
        private type: string;
        @JsonProperty({ value: DIDDocument.SERVICE_ENDPOINT }) @JsonClassType({ type: () => [String] })
        private endpoint: string;
        private properties: JSONObject;

        /**
         * Constructs Service with the given value.
         *
         * @param id the id for Service
         * @param type the type of Service
         * @param endpoint the address of service point
         */
        constructor(@JsonProperty({ value: DIDDocument.ID, required: true }) id: DIDURL,
            @JsonProperty({ value: DIDDocument.TYPE, required: true }) type: string,
            @JsonProperty({ value: DIDDocument.SERVICE_ENDPOINT, required: true }) endpoint: string,
            properties?: JSONObject) {
            this.id = id;
            this.type = type;
            this.endpoint = endpoint;
            this.properties = properties ? properties : {};

            if (properties.size > 0) {
                delete this.properties[DIDDocument.ID];
                delete this.properties[DIDDocument.TYPE];
                delete this.properties[DIDDocument.SERVICE_ENDPOINT];
            }
        }

        /**
         * Get the service id.
         *
         * @return the identifier
         */
        public getId(): DIDURL {
            return this.id;
        }

        /**
         * Get the service type.
         *
         * @return the type string
         */
        public getType(): string {
            return this.type;
        }

        /**
         * Get service point string.
         *
         * @return the service point string
         */
        public getServiceEndpoint(): string {
            return this.endpoint;
        }

        /**
         * Helper getter method for properties serialization.
         * NOTICE: Should keep the alphabetic serialization order.
         *
         * @return a String to object map include all application defined
         *         properties
         */
        @JsonPropertyOrder({ alphabetic: true })
        private _getProperties(): JSONObject {
            return this.properties;
        }

        /**
         * Helper setter method for properties deserialization.
         *
         * @param name the property name
         * @param value the property value
         */
        @JsonAnySetter()
        private setProperty(name: string, value: JSONValue) {
            if (name.equals(DIDDocument.ID) || name.equals(DIDDocument.TYPE) || name.equals(DIDDocument.SERVICE_ENDPOINT))
                return;

            if (this.properties == null)
                this.properties = {};

            this.properties[name] = value;
        }

        public getProperties(): ImmutableMap<string, JSONValue> { // TODO: JSONObject instead of immutablemap?
            // TODO: make it unmodifiable recursively
            return ImmutableMap(this.properties != null ? this.properties : {});
        }
    }

    /**
     * The Proof represents the proof content of DID Document.
     */
    @JsonPropertyOrder({
        value: [
            DIDDocument.TYPE, DIDDocument.CREATED, DIDDocument.CREATOR, DIDDocument.SIGNATURE_VALUE
        ]
    })
    export class Proof implements Comparable<Proof> {
        @JsonSerialize({using: TypeSerializerFilter.serialize})
        @JsonProperty({ value: DIDDocument.TYPE })
        private type: string;
        @JsonInclude({ value: JsonIncludeType.NON_NULL })
        @JsonProperty({ value: DIDDocument.CREATED })
        private created: Date;
        @JsonInclude({ value: JsonIncludeType.NON_NULL })
        @JsonProperty({ value: DIDDocument.CREATOR })
        public creator: DIDURL;
        @JsonProperty({ value: DIDDocument.SIGNATURE_VALUE })
        private signature: string;

        /**
         * Constructs the proof of DIDDocument with the given value.
         *
         * @param type the type of Proof
         * @param created the time to create DIDDocument
         * @param creator the key to sign
         * @param signature the signature string
         */
        // Java: @JsonCreator
        constructor(@JsonProperty({ value: DIDDocument.CREATOR }) creator: DIDURL,
            @JsonProperty({ value: DIDDocument.SIGNATURE_VALUE, required: true }) signature: string,
            @JsonProperty({ value: DIDDocument.TYPE }) type?: string,
            @JsonProperty({ value: DIDDocument.CREATED, required: true }) created?: Date) {

            this.type = type ? type : Constants.DEFAULT_PUBLICKEY_TYPE;

            if (created === undefined)
                this.created = new Date();
            else if (created !== null)
                this.created = new Date(created);
            else
                this.created = null;

            this.creator = creator;
            this.signature = signature;
        }

        equals(obj: Proof): boolean {
            return this.compareTo(obj) == 0;
        }

        /**
         * Get Proof type.
         *
         * @return the type string
         */
        public getType(): string {
            return this.type;
        }

        /**
         * Get the time to create DIDDocument.
         *
         * @return the time
         */
        public getCreated(): Date {
            return this.created;
        }

        /**
         * Get the key id to sign.
         *
         * @return the key id
         */
        public getCreator(): DIDURL {
            return this.creator;
        }

        /**
         * Get signature string.
         *
         * @return the signature string
         */
        public getSignature(): string {
            return this.signature;
        }

        public compareTo(proof: Proof): number {
            let rc: number = this.created.getTime() - proof.created.getTime();
            if (rc == 0)
                rc = this.creator.compareTo(proof.creator);
            return rc;
        }
    }

    /**
    * Builder object to create or modify the DIDDocument.
    */
    export class Builder {
        private document: DIDDocument;
        private controllerDoc: DIDDocument;

        private constructor() { }

        /**
         * Constructs DID Document Builder with given customizedDid and DIDStore.
         *
         * @param did the specified DID
         * @param store the DIDStore object
         */
        public static newFromDID(did: DID, store: DIDStore, controller?: DIDDocument) {
            let builder = new Builder();
            builder.document = new DIDDocument(did);

            if (controller !== undefined) {
                builder.document.controllers = [];
                builder.document.controllerDocs = new Map();

                builder.document.controllers.push(controller.getSubject());
                builder.document.controllerDocs.set(controller.getSubject(), controller);
                builder.document.effectiveController = controller.getSubject();

                builder.document.setMetadata(new DIDMetadata(did, store));

                builder.controllerDoc = controller;
            }
            else {
                let metadata: DIDMetadata = new DIDMetadata(did, store);
                builder.document.setMetadata(metadata);
            }
            return builder;
        }

        /**
         * Constructs DID Document Builder with given DID Document.
         *
         * @param doc the DID Document object
         */
        public static newFromDocument(doc: DIDDocument, controller?: DIDDocument): Builder {
            let builder = new Builder();
            builder.document = doc.copy();
            if (controller !== undefined) {
                builder.document.effectiveController = controller.getSubject();
                builder.controllerDoc = controller;
            }
            return builder;
        }

        private canonicalId(id: DIDURL | string): DIDURL {
            if (typeof id === "string") {
                return DIDURL.valueOf(this.getSubject(), id);
            }
            else {
                if (id == null || id.getDid() != null)
                    return id;

                return DIDURL.valueOf(this.getSubject(), id);
            }
        }

        private invalidateProof() {
            if (this.document.proofs != null && this.document.proofs.size != 0)
                this.document.proofs.clear();
        }

        private checkNotSealed() {
            if (document == null)
                throw new AlreadySealedException();
        }

        private checkIsCustomized() {
            if (!this.document.isCustomizedDid())
                throw new NotCustomizedDIDException(this.document.getSubject().toString());
        }

        /**
         * Get document subject from did document builder.
         *
         * @return the owner of did document builder
         */
        public getSubject(): DID {
            this.checkNotSealed();
            return this.document.getSubject();
        }

        /**
         * Add a new controller to the customized DID document.
         *
         * @param controller the new controller's DID
         * @return the Builder object
         * @throws DIDResolveException if failed resolve the new controller's DID
         */
        public addController(controller: DID | string): Builder {
            checkArgument(controller != null, "Invalid controller");

            if (typeof controller === "string")
                controller = DID.valueOf(controller);

            this.checkNotSealed();
            this.checkIsCustomized();
            checkArgument(!this.document.controllers.contains(controller), "Controller already exists");
            let controllerDoc = controller.resolve(true);
            if (controllerDoc == null)
                throw new DIDNotFoundException(controller.toString());

            if (controllerDoc.isDeactivated())
                throw new DIDDeactivatedException(controller.toString());

            if (controllerDoc.isExpired())
                throw new DIDExpiredException(controller.toString());

            if (!controllerDoc.isGenuine())
                throw new DIDNotGenuineException(controller.toString());

            if (controllerDoc.isCustomizedDid())
                throw new NotPrimitiveDIDException(controller.toString());

            this.document.controllers.push(controller);
            this.document.controllerDocs.set(controller, controllerDoc);

            this.document.multisig = null; // invalidate multisig
            this.invalidateProof();
            return this;
        }

        /**
         * Remove controller from the customized DID document.
         *
         * @param controller the controller's DID to be remove
         * @return the Builder object
         */
        public removeController(controller: DID | string): Builder {
            checkArgument(controller != null, "Invalid controller");

            if (typeof controller === "string")
                controller = DID.valueOf(controller);

            this.checkNotSealed();
            this.checkIsCustomized();
            // checkArgument(document.controllers.contains(controller), "Controller not exists");

            if (controller.equals(this.controllerDoc.getSubject()))
                throw new CanNotRemoveEffectiveController(controller.toString());

            if (this.document.controllers.remove(controller)) {
                this.document.controllerDocs.delete(controller);
                this.invalidateProof();
            }

            return this;
        }

        /**
         * Set multiple signature for multi-controllers DID document.
         *
         * @param m the required signature count
         * @return the Builder object
         */
        public setMultiSignature(m: number): Builder {
            this.checkNotSealed();
            this.checkIsCustomized();
            checkArgument(m >= 1, "Invalid signature count");

            let n = this.document.controllers.length;
            checkArgument(m <= n, "Signature count exceeds the upper limit");

            let multisig: DIDDocument.MultiSignature = null;
            if (n > 1)
                multisig = new DIDDocument.MultiSignature(m, n);

            if (this.document.multisig == null && multisig == null)
                return this;

            if (this.document.multisig != null && multisig != null &&
                this.document.multisig.equals(multisig))
                return this;

            this.document.multisig = new DIDDocument.MultiSignature(m, n);

            this.invalidateProof();
            return this;
        }

        private addPublicKey(key: DIDDocument.PublicKey) {
            if (this.document.publicKeys == null) {
                this.document.publicKeys = new Map<DIDURL, DIDDocument.PublicKey>();
            } else {
                // Check the existence, both id and keyBase58
                for (let pk of this.document.publicKeys.values()) {
                    if (pk.getId().equals(key.getId()))
                        throw new DIDObjectAlreadyExistException("PublicKey id '"
                            + key.getId() + "' already exist.");

                    if (pk.getPublicKeyBase58().equals(key.getPublicKeyBase58()))
                        throw new DIDObjectAlreadyExistException("PublicKey '"
                            + key.getPublicKeyBase58() + "' already exist.");
                }
            }

            this.document.publicKeys.set(key.getId(), key);
            if (this.document.defaultPublicKey == null) {
                let address = HDKey.toAddress(key.getPublicKeyBytes());
                if (address.equals(this.getSubject().getMethodSpecificId())) {
                    this.document.defaultPublicKey = key;
                    key.setAuthenticationKey(true);
                }
            }

            this.invalidateProof();
        }

        /**
         * Add PublicKey to did document builder.
         *
         * @param id the key id
         * @param controller the owner of public key
         * @param pk the public key base58 string
         * @return the DID Document Builder object
         */
        // Java: addPublicKey()
        public createAndAddPublicKey(id: DIDURL | string, type: string, pk: string, controller?: DID | string): Builder {
            this.checkNotSealed();

            if (typeof id === "string")
                id = DIDURL.newWithUrl(id);

            if (controller === undefined)
                controller = null as DID;
            else if (typeof controller === "string")
                controller = DID.valueOf(controller);

            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())), "Invalid publicKey id");
            checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

            if (controller == null)
                controller = this.getSubject();

            this.addPublicKey(new DIDDocument.PublicKey(this.canonicalId(id), type, controller, pk));
            return this;
        }

        /**
         * Remove PublicKey with the specified key id.
         *
         * @param id the key id
         * @param force the owner of public key
         * @return the DID Document Builder object
         */
        public removePublicKey(id: DIDURL | string, force: boolean = false): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid publicKey id");

            if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            id = this.canonicalId(id);
            let pk = this.document.publicKeys.get(id);
            if (pk == null)
                throw new DIDObjectNotExistException(id.toString());

            // Can not remove default public key
            if (this.document.defaultPublicKey != null && this.document.defaultPublicKey.getId().equals(id))
                throw new DIDObjectHasReference(id.toString() + "is default key");

            if (!force) {
                if (pk.isAuthenticationKey() || pk.isAuthorizationKey())
                    throw new DIDObjectHasReference(id.toString());
            }

            if (this.document.publicKeys.delete(id) != null) {
                try {
                    // TODO: should delete the loosed private key when store the document
                    if (this.document.getMetadata().attachedStore())
                        this.document.getMetadata().getStore().deletePrivateKey(id);
                } catch (ignore) {
                    // DIDStoreException
                    log.error("INTERNAL - Remove private key", ignore);
                }

                this.invalidateProof();
            }

            return this;
        }

        // Java: addAuthenticationKey()
        public addExistingAuthenticationKey(id: DIDURL): Builder {
            checkArgument(id != null, "Invalid publicKey id");

            if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            id = this.canonicalId(id);
            let key: DIDDocument.PublicKey = this.document.publicKeys.get(id);
            if (key == null)
                throw new DIDObjectNotExistException(id.toString());

            // Check the controller is current DID subject
            if (!key.getController().equals(this.getSubject()))
                throw new IllegalUsage(id.toString());

            if (!key.isAuthenticationKey()) {
                key.setAuthenticationKey(true);
                this.invalidateProof();
            }

            return this;
        }

        /**
         * Add the exist Public Key matched the key id to be Authentication key.
         *
         * @param id the key id
         * @return the DID Document Builder object
         */
        public addAuthenticationKey(id: DIDURL | string, pk: string): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid publicKey id");

            if (typeof id === "string")
                id = this.canonicalId(id);

            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
            checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

            let key: DIDDocument.PublicKey = new DIDDocument.PublicKey(this.canonicalId(id), null, this.getSubject(), pk);
            key.setAuthenticationKey(true);
            this.addPublicKey(key);

            return this;
        }

        /**
         * Remove Authentication Key matched the given id.
         *
         * @param id the key id
         * @return the DID Document Builder
         */
        public removeAuthenticationKey(id: DIDURL): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid publicKey id");

            if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            id = this.canonicalId(id);
            let key = this.document.publicKeys.get(id);
            if (key == null || !key.isAuthenticationKey())
                throw new DIDObjectNotExistException(id.toString());

            // Can not remove default public key
            if (this.document.defaultPublicKey != null && this.document.defaultPublicKey.getId().equals(id))
                throw new DIDObjectHasReference(
                    "Cannot remove the default PublicKey from authentication.");

            if (key.isAuthenticationKey()) {
                key.setAuthenticationKey(false);
                this.invalidateProof();
            } else {
                throw new DIDObjectNotExistException(id.toString());
            }

            return this;
        }

        /**
         * Remove Authentication Key matched the given id.
         *
         * @param id the key id string
         * @return the DID Document Builder
         */
        /* public removeAuthenticationKey(id: string): Builder {
            return removeAuthenticationKey(canonicalId(id));
        } */

        /**
         * Add the exist Public Key matched the key id to be Authorization key.
         *
         * @param id the key id
         * @return the DID Document Builder
         */
        // Java: addAuthorizationKey
        public addExistingAuthorizationKey(id: DIDURL): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid publicKey id");

            if (this.document.isCustomizedDid())
                throw new NotPrimitiveDIDException(this.getSubject().toString());

            if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            id = this.canonicalId(id);
            let key: DIDDocument.PublicKey = this.document.publicKeys.get(id);
            if (key == null)
                throw new DIDObjectNotExistException(id.toString());

            // Can not authorize to self
            if (key.getController().equals(this.getSubject()))
                throw new IllegalUsage(id.toString());

            if (!key.isAuthorizationKey()) {
                key.setAuthorizationKey(true);
                this.invalidateProof();
            }

            return this;
        }

        /**
         * Add the exist Public Key matched the key id to be Authorization Key.
         *
         * @param id the key id string
         * @return the DID Document Builder
         */
        /* public addAuthorizationKey(id: string): Builder {
            return addAuthorizationKey(canonicalId(id));
        } */

        /**
         * Add the PublicKey named key id to be Authorization Key.
         * It is failed if the key id exist but the public key base58 string is not same as the given pk string.
         *
         * @param id the key id
         * @param controller the owner of public key
         * @param pk the public key base58 string
         * @return the DID Document Builder
         */
        public addAuthorizationKey(id: DIDURL | string, controller: DID | string, pk: string): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid publicKey id");

            if (typeof id === "string")
                id = this.canonicalId(id);

            if (typeof controller === "string")
                controller = DID.valueOf(controller);

            checkArgument(id.getDid() == null || id.getDid().equals(this.getSubject()),
                "Invalid publicKey id");
            checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

            if (this.document.isCustomizedDid())
                throw new NotPrimitiveDIDException(this.getSubject().toString());

            // Can not authorize to self
            if (controller.equals(this.getSubject()))
                throw new IllegalUsage("Key's controller is self.");

            let key: DIDDocument.PublicKey = new DIDDocument.PublicKey(this.canonicalId(id), null, controller, pk);
            key.setAuthorizationKey(true);
            this.addPublicKey(key);

            return this;
        }

        /**
         * Add the specified key to be an Authorization key.
         * This specified key is the key of specified controller.
         * Authentication is the mechanism by which the controller(s) of a DID can
         * cryptographically prove that they are associated with that DID.
         * A DID Document must include authentication key.
         *
         * @param id the key id
         * @param controller the owner of 'key'
         * @param key the key of controller to be an Authorization key.
         * @return the DID Document Builder
         * @throws DIDResolveException resolve controller failed.
         * @throws InvalidKeyException the key is not an authentication key.
         */
        public authorizationDid(id: DIDURL, controller: DID, key: DIDURL): Builder {
            this.checkNotSealed();
            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
            checkArgument(controller != null && !controller.equals(this.getSubject()), "Invalid controller");

            if (this.document.isCustomizedDid())
                throw new NotPrimitiveDIDException(this.getSubject().toString());

            let controllerDoc = controller.resolve();
            if (controllerDoc == null)
                throw new DIDNotFoundException(id.toString());

            if (controllerDoc.isDeactivated())
                throw new DIDDeactivatedException(controller.toString());

            if (controllerDoc.isExpired())
                throw new DIDExpiredException(controller.toString());

            if (!controllerDoc.isGenuine())
                throw new DIDNotGenuineException(controller.toString());

            if (controllerDoc.isCustomizedDid())
                throw new NotPrimitiveDIDException(controller.toString());

            if (key == null)
                key = controllerDoc.getDefaultPublicKeyId();

            // Check the key should be a authentication key.
            let targetPk = controllerDoc.getAuthenticationKey(key);
            if (targetPk == null)
                throw new DIDObjectNotExistException(key.toString());

            let pk = new DIDDocument.PublicKey(this.canonicalId(id), targetPk.getType(),
                controller, targetPk.getPublicKeyBase58());
            pk.setAuthorizationKey(true);
            this.addPublicKey(pk);

            return this;
        }

        /**
         * Remove the Authorization Key matched the given id.
         *
         * @param id the key id
         * @return the DID Document Builder
         */
        public removeAuthorizationKey(inputId: DIDURL | string): Builder {
            this.checkNotSealed();
            checkArgument(inputId != null, "Invalid publicKey id");

            let id = typeof inputId === "string" ? this.canonicalId(inputId) : inputId;

            if (this.document.publicKeys == null || this.document.publicKeys.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            id = this.canonicalId(id);
            let key: DIDDocument.PublicKey = this.document.publicKeys.get(id);
            if (key == null)
                throw new DIDObjectNotExistException(id.toString());

            if (key.isAuthorizationKey()) {
                key.setAuthorizationKey(false);
                this.invalidateProof();
            } else {
                throw new DIDObjectNotExistException(id.toString());
            }

            return this;
        }

        /**
         * Add Credentail to DID Document Builder.
         *
         * @param vc the Verifiable Credential object
         * @return the DID Document Builder
         */
        public addCredential(vc: VerifiableCredential): Builder {
            this.checkNotSealed();
            checkArgument(vc != null, "Invalid credential");

            // Check the credential belongs to current DID.
            if (!vc.getSubject().getId().equals(this.getSubject()))
                throw new IllegalUsage(vc.getSubject().getId().toString());

            if (this.document.credentials == null) {
                this.document.credentials = new Map<DIDURL, VerifiableCredential>();
            } else {
                if (this.document.credentials.has(vc.getId()))
                    throw new DIDObjectAlreadyExistException(vc.getId().toString());
            }

            this.document.credentials.set(vc.getId(), vc);
            this.invalidateProof();

            return this;
        }

        /**
         * Add Credential with the given values.
         *
         * @param id the Credential id
         * @param types the Credential types set
         * @param subject the Credential subject(key/value)
         * @param expirationDate the Credential expires time
         * @param storepass the password for DIDStore
         * @return the DID Document Builder
         * @throws DIDStoreException there is no DID store to attach.
         * @throws InvalidKeyException there is no authentication key.
         */
        // TODO: Use our new "Json" type instead of a map
        // Java: addCredential()
        public createAndAddCredential(id: DIDURL, types: string[] = null, subject: JSONObject = null, expirationDate: Date = null, storepass: string): Builder {
            this.checkNotSealed();
            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
            checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

            let issuer = new Issuer(this.document);
            let cb = issuer.issueFor(this.document.getSubject());
            if (types == null)
                types = ["SelfProclaimedCredential"];

            if (expirationDate == null)
                expirationDate = this.document.getExpires();

            try {
                let vc = cb.id(this.canonicalId(id))
                    .type(...types)
                    .properties(subject)
                    .expirationDate(expirationDate)
                    .seal(storepass);

                this.addCredential(vc);
            } catch (ignore) {
                // MalformedCredentialException
                throw new UnknownInternalException(ignore);
            }

            return this;
        }

        /**
         * Add Credential with the given values.
         * Credential subject supports json string.
         *
         * @param id the Credential id
         * @param types the Credential types
         * @param json the Credential subject(json string)
         * @param expirationDate the Credential expires time
         * @param storepass the password for DIDStore
         * @return the DID Document Builder
         * @throws DIDStoreException there is no DID store to attach.
         * @throws InvalidKeyException there is no authentication key.
         */
        // NOTE: compared to java, almost all addCredential overrides have been removed for clarity.
        // Callers must use DIDURL.valueOf(string) for the id, and a json object (not a map nor a Map).
        // TODO: also remove this "json subject" version + use json objec tinstead of subject map
        /* public addCredential(id: DIDURL, types: string[], json: string, expirationDate: Date, storepass: string): Builder {
            this.checkNotSealed();
            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                    "Invalid publicKey id");
            checkArgument(json != null && !json.isEmpty(), "Invalid json");
            checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

            let issuer = new Issuer(this.document);
            let cb = issuer.issueFor(this.document.getSubject());
            if (types == null)
                types = ["SelfProclaimedCredential"];

            if (expirationDate == null)
                expirationDate = this.document.expires;

            try {
                let vc = cb.id(this.canonicalId(id))
                        .type(types)
                        .properties(json)
                        .expirationDate(expirationDate)
                        .seal(storepass);

                this.addCredential(vc);
            } catch (ignore) {
                // MalformedCredentialException
                throw new UnknownInternalException(ignore);
            }

            return this;
        } */

        /**
         * Remove Credential with the specified id.
         *
         * @param id the Credential id
         * @return the DID Document Builder
         */
        public removeCredential(id: DIDURL): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid credential id");

            if (this.document.credentials == null || this.document.credentials.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            if (this.document.credentials.delete(this.canonicalId(id)) != null)
                this.invalidateProof();
            else
                throw new DIDObjectNotExistException(id.toString());

            return this;
        }

        /**
         * Add Service.
         *
         * @param id the specified Service id
         * @param type the Service type
         * @param endpoint the service point's adderss
         * @return the DID Document Builder
         */
        public addService(id: DIDURL | string, type: string, endpoint: string, properties?: JSONObject): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid publicKey id");

            if (typeof id === "string")
                id = this.canonicalId(id);

            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
            checkArgument(type != null && !type.isEmpty(), "Invalid type");
            checkArgument(endpoint != null && !endpoint.isEmpty(), "Invalid endpoint");

            let svc = new DIDDocument.Service(this.canonicalId(id), type, endpoint, properties);
            if (this.document.services == null)
                this.document.services = new Map<DIDURL, DIDDocument.Service>();
            else {
                if (this.document.services.has(svc.getId()))
                    throw new DIDObjectAlreadyExistException("Service '"
                        + svc.getId() + "' already exist.");
            }

            this.document.services.set(svc.getId(), svc);
            this.invalidateProof();

            return this;
        }

        /**
         * Add Service.
         *
         * @param id the specified Service id string
         * @param type the Service type
         * @param endpoint the service point's adderss
         * @return the DID Document Builder
         */
        /* public addService(id: string, type: string, endpoint: string): Builder {
            return addService(canonicalId(id), type, endpoint, null);
        } */

        /**
         * Remove the Service with the specified id.
         *
         * @param id the Service id
         * @return the DID Document Builder
         */
        public removeService(id: DIDURL): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid credential id");

            if (this.document.services == null || this.document.services.size == 0)
                throw new DIDObjectNotExistException(id.toString());

            if (this.document.services.delete(this.canonicalId(id)) != null)
                this.invalidateProof();
            else
                throw new DIDObjectNotExistException(id.toString());

            return this;
        }

        private getMaxExpires(): Date {
            return dayjs().add(Constants.MAX_VALID_YEARS, 'years').toDate();
        }

        /**
         * Set the current time to be expires time for DID Document Builder.
         *
         * @return the DID Document Builder
         */
        public setDefaultExpires(): Builder {
            this.checkNotSealed();

            this.document.expires = this.getMaxExpires();
            this.invalidateProof();

            return this;
        }

        /**
         * Set the specified time to be expires time for DID Document Builder.
         *
         * @param expires the specified time
         * @return the DID Document Builder
         */
        public setExpires(expires: Date): Builder {
            this.checkNotSealed();
            checkArgument(expires != null, "Invalid expires");

            if (dayjs(expires).isAfter(this.getMaxExpires()))
                throw new IllegalArgumentException("Invalid expires, out of range.");

            this.document.expires = expires;
            this.invalidateProof();

            return this;
        }

        /**
         * Remove the proof that created by the specific controller.
         *
         * @param controller the controller's DID
         * @return the DID Document Builder
         */
        public removeProof(controller: DID): Builder {
            this.checkNotSealed();
            checkArgument(controller != null, "Invalid controller");

            if (this.document.proofs == null || this.document.proofs.size == 0)
                return this;

            if (this.document.proofs.delete(controller) == null)
                throw new DIDObjectNotExistException("No proof signed by: " + controller);

            return this;
        }

        private sanitize() {
            if (this.document.isCustomizedDid()) {
                if (this.document.controllers == null || this.document.controllers.length == 0)
                    throw new MalformedDocumentException("Missing controllers");

                if (this.document.controllers.length > 1) {
                    if (this.document.multisig == null)
                        throw new MalformedDocumentException("Missing multisig");

                    if (this.document.multisig.n() != this.document.controllers.length)
                        throw new MalformedDocumentException("Invalid multisig, not matched with controllers");
                } else {
                    if (this.document.multisig != null)
                        throw new MalformedDocumentException("Invalid multisig");
                }
            }

            let sigs = this.document.multisig == null ? 1 : this.document.multisig.m();
            if (this.document.proofs != null && this.document.proofs.size == sigs)
                throw new AlreadySealedException(this.getSubject().toString());

            if (this.document.controllers == null || this.document.controllers.length == 0) {
                this.document.controllers = [];
                this.document.controllerDocs = new Map();
            } else {
                Collections.sort(this.document.controllers);
            }

            if (this.document.publicKeys == null || this.document.publicKeys.size == 0) {
                this.document.publicKeys = new Map();
                this.document._publickeys = [];
                this.document._authentications = [];
                this.document._authorizations = [];
            } else {
                this.document._publickeys = Array.from(this.document.publicKeys.values());

                this.document._authentications = [];
                this.document._authorizations = [];

                for (let pk of this.document.publicKeys.values()) {
                    if (pk.isAuthenticationKey())
                        this.document._authentications.push(DIDDocument.PublicKeyReference.newWithKey(pk));

                    if (pk.isAuthorizationKey())
                        this.document._authorizations.push(DIDDocument.PublicKeyReference.newWithKey(pk));
                }

                if (this.document._authentications.length == 0)
                    this.document._authentications = [];

                if (this.document._authentications.length == 0)
                    this.document._authorizations = [];
            }

            if (this.document.credentials == null || this.document.credentials.size == 0) {
                this.document.credentials = new Map();
                this.document._credentials = [];
            } else {
                this.document._credentials = Array.from(this.document.credentials.values());
            }

            if (this.document.services == null || this.document.services.size == 0) {
                this.document.services = new Map();
                this.document._services = [];
            } else {
                this.document._services = Array.from(this.document.services.values());
            }

            if (this.document.proofs == null || this.document.proofs.size == 0) {
                if (this.document.getExpires() == null)
                    this.setDefaultExpires();
            }

            if (this.document.proofs == null)
                this.document.proofs = new Map<DID, DIDDocument.Proof>();

            this.document._proofs = null;
        }

        /**
         * Seal the document object, attach the generated proof to the
         * document.
         *
         * @param storepass the password for DIDStore
         * @return the DIDDocument object
         * @throws InvalidKeyException if no valid sign key to seal the document
         * @throws MalformedDocumentException if the DIDDocument is malformed
         * @throws DIDStoreException if an error occurs when access DID store
         */
        public seal(storepass: string): DIDDocument {
            this.checkNotSealed();
            checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

            this.sanitize();

            let signerDoc = this.document.isCustomizedDid() ? this.controllerDoc : this.document;
            let signKey = signerDoc.getDefaultPublicKeyId();

            if (this.document.proofs.has(signerDoc.getSubject()))
                throw new AlreadySignedException(signerDoc.getSubject().toString());

            let json = this.document.serialize(true);
            let sig = this.document.signWithId(signKey, storepass, json.getBytes());
            let proof = new DIDDocument.Proof(signKey, sig);
            this.document.proofs.set(proof.getCreator().getDid(), proof);
            this.document._proofs = Array.from(this.document.proofs.values());
            Collections.sort(this.document._proofs);

            // Invalidate builder
            let doc: DIDDocument = this.document;
            this.document = null;

            return doc;
        }
    }
}

