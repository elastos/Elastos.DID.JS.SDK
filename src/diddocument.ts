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
import {
    JsonInclude,
    JsonIncludeType,
    JsonProperty,
    JsonClassType,
    JsonPropertyOrder,
    JsonIgnore,
    JsonCreator,
    JsonSerialize,
    JsonStringifier
} from "@elastosfoundation/jackson-js";
import { Collections, Serializer } from "./internals";
import { Constants } from "./constants";
import { ByteBuffer } from "./internals";
import { EcdsaSigner } from "./internals";
import { HDKey } from "./internals";
import type { KeyPair } from "./crypto/keypair";
import { SHA256 } from "./internals";
import { DID } from "./internals";
import { DIDBackend } from "./internals";
import { DIDDocumentBuilder } from "./internals";
import { DIDDocumentMultiSignature } from "./internals";
import { DIDDocumentProof } from "./internals";
import { DIDDocumentPublicKey } from "./internals";
import { DIDDocumentPublicKeyReference } from "./internals";
import { DIDDocumentService } from "./internals";
import { DIDEntity } from "./internals";
import { DIDMetadata } from "./internals";
import { VerificationEventListener } from "./internals";
import type { DIDStore } from "./internals";
import type { DIDTransactionAdapter } from "./didtransactionadapter";
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
    UnknownInternalException,
    DIDControllersChangedException
} from "./exceptions/exceptions";
import { Logger } from "./logger";
import { TransferTicket } from "./internals";
import { base64Decode, checkArgument } from "./internals";
import { VerifiableCredential } from "./internals";
import { ComparableMap } from "./comparablemap";
import { JsonStringifierTransformerContext } from "@elastosfoundation/jackson-js";
import { DateSerializer } from "./dateserializer"
import { FieldInfo, GenericSerializer, FieldType } from "./serializers"
import { isNullOrUndefined } from "util";


class DIDDocumentControllerSerializer {
    public static serialize(controllers: DID[], instance: DIDDocument): string {

        let jsonControllers = [];
        if (controllers) {
            jsonControllers = controllers.map((did: DID, index: number, array: DID[]) => {
                return did.serialize(true);
            });
        }

        return JSON.stringify(jsonControllers);
    }
    public static deserialize(jsonValue: string, fullJsonObj: any): DID[] {
        let jsonObj = JSON.parse(jsonValue);
        if (!(jsonObj instanceof Array)) {
            jsonObj = [jsonObj];
        }
        return jsonObj.map((value: any, index: number, array: any[]) => {
            return DID.deserialize(JSON.stringify(value));
        });
    }
}

class DIDDocumentProofSerializer {
    public static serialize(proofs: DIDDocumentProof[], context: JsonStringifierTransformerContext): any {
        return proofs.length > 1 ? proofs : proofs[0];
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
// The values should be the real class field names, not the final JSON output field names.
// Or keep the class field names same with the JSON field namas.
 @JsonPropertyOrder({value: [
    "subject",
    "controllers",
    "multisig",
    "_publickeys",
    "_authentications",
    "_authorizations",
    "_credentials",
    "_services",
    "expires",
    "_proofs" ]})
 @JsonInclude({value: JsonIncludeType.NON_EMPTY})
 export class DIDDocument extends DIDEntity<DIDDocument> {
    
    private static log = new Logger("DIDDocument");
    private static ID = "id";
    private static PUBLICKEY = "publicKey";
    private static CONTROLLER = "controller";
    private static MULTI_SIGNATURE = "multisig";
    private static AUTHENTICATION = "authentication";
    private static AUTHORIZATION = "authorization";
    private static SERVICE = "service";
    private static VERIFIABLE_CREDENTIAL = "verifiableCredential";
    private static EXPIRES = "expires";
    private static PROOF = "proof";

    private static FIELDSMAP = new Map<string, FieldInfo>([
        [DIDDocument.ID, FieldInfo.forType(FieldType.TYPE).withTypeName("DID")],
        [DIDDocument.CONTROLLER, FieldInfo.forType(FieldType.METHOD).withDeserializerMethod(DIDDocumentControllerSerializer.deserialize).withSerializerMethod(DIDDocumentControllerSerializer.serialize)]
    ]);

    @JsonProperty({ value: DIDDocument.ID })
    @JsonClassType({type: () => [DID]})
    private subject: DID;

    @JsonProperty({ value: DIDDocument.CONTROLLER })
    @JsonSerialize({ using: DIDDocumentControllerSerializer.serialize})
    public controllers?: DID[];

    @JsonProperty({ value: DIDDocument.MULTI_SIGNATURE })
    @JsonClassType({type: () => [DIDDocumentMultiSignature]})
    public multisig?: DIDDocumentMultiSignature;

    @JsonProperty({ value: DIDDocument.PUBLICKEY })
    @JsonClassType({type: () => [Array, [DIDDocumentPublicKey]]})
    public _publickeys?: DIDDocumentPublicKey[];

    @JsonProperty({ value: DIDDocument.AUTHENTICATION })
    @JsonClassType({type: () => [Array, [DIDDocumentPublicKeyReference]]})
    public _authentications?: DIDDocumentPublicKeyReference[];

    @JsonProperty({ value: DIDDocument.AUTHORIZATION })
    @JsonClassType({type: () => [Array, [DIDDocumentPublicKeyReference]]})
    public _authorizations?: DIDDocumentPublicKeyReference[];

    @JsonProperty({ value: DIDDocument.VERIFIABLE_CREDENTIAL })
    @JsonClassType({type: () => [Array, [VerifiableCredential]]})
    public _credentials?: VerifiableCredential[];

    @JsonProperty({ value: DIDDocument.SERVICE })
    @JsonClassType({type: () => [Array, [DIDDocumentService]]})
    public _services?: DIDDocumentService[];

    @JsonProperty({ value: DIDDocument.EXPIRES })
    @JsonInclude({ value: JsonIncludeType.NON_NULL}) // Need to force to NON_NULL because it inherits from class NON_EMPTY and jackson seems to consider Date objects as "empty" in utils_1.isEmptyValue()...
    @JsonClassType({type: () => [Date]})
    public expires?: Date;

    @JsonProperty({ value: DIDDocument.PROOF })
    @JsonSerialize({ using: DIDDocumentProofSerializer.serialize})
    public _proofs?: DIDDocumentProof[];

    @JsonIgnore()
    public defaultPublicKey?: DIDDocumentPublicKey;

    // Internal properties for DIDDocumentBuilder
    @JsonIgnore()
    public controllerDocs?: ComparableMap<DID, DIDDocument>;
    @JsonIgnore()
    public publicKeys?: ComparableMap<DIDURL, DIDDocumentPublicKey>;
    @JsonIgnore()
    public authenticationKeys?: ComparableMap<DIDURL, DIDDocumentPublicKey>;
    @JsonIgnore()
    public authorizationKeys?: ComparableMap<DIDURL, DIDDocumentPublicKey>;
    @JsonIgnore()
    public credentials?: ComparableMap<DIDURL, VerifiableCredential>;
    @JsonIgnore()
    public services?: ComparableMap<DIDURL, DIDDocumentService>;
    @JsonIgnore()
    public proofs?: ComparableMap<DID, DIDDocumentProof>;
    @JsonIgnore()
    public effectiveController?: DID;

    @JsonIgnore()
    private metadata?: DIDMetadata;

    /**
     * Set the DIDDocument subject.
     *
     * @param subject the owner of DIDDocument
     */
    public constructor(subject?: DID) {
        super();
        this.subject = subject;
    }

    public static createFromValues(fieldValues: Map<string, any>): DIDDocument {
        let newInstance = new DIDDocument() {

        }
    }


    // Add custom deserialization fields to the method params here + assign.
    // Jackson does the rest automatically.
    @JsonCreator()
    public static jacksonCreator(@JsonProperty({value: "proof"}) _proofs?: any, @JsonProperty({value: "controllers"}) controllers?: any) {
        let doc = new DIDDocument(null);

        // Proofs
        if (_proofs) {
            if (_proofs instanceof Array)
                doc._proofs = _proofs.map((p) => DIDDocument.getDefaultObjectMapper().parse(JSON.stringify(p), {mainCreator: () => [DIDDocumentProof]}));
            else
                doc._proofs = [DIDDocument.getDefaultObjectMapper().parse(JSON.stringify(_proofs), {mainCreator: () => [DIDDocumentProof]})];
        }

        // Controllers
        if (controllers) {
            if (controllers instanceof Array)
                doc.controllers = controllers.map((p) => DIDDocument.getDefaultObjectMapper().parse(JSON.stringify(p), {mainCreator: () => [DID]}));
            else
                doc.controllers = [DIDDocument.getDefaultObjectMapper().parse(JSON.stringify(controllers), {mainCreator: () => [DID]})];
        }

        return doc;
    }

    public serialize(normalized = true): any {
        let jsonObj = {};
        
        if (this.controllers) {
            jsonObj[DIDDocument.CONTROLLER] = this.controllers.length > 1 ? this.controllers.map(c => {c.serialize(normalized)}) : this.controllers[0].serialize(normalized);
        }

        if (this._proofs) {
            jsonObj[DIDDocument.PROOF] = this._proofs.length > 1 ? this._proofs.map(p => {p.serialize(normalized)}) : this._proofs[0].serialize(normalized);
        }

        if (this.subject) {
            jsonObj[DIDDocument.ID] = this.subject.serialize(normalized);
        }

        if (this.multisig) {
            jsonObj[DIDDocument.MULTI_SIGNATURE] = this.multisig.serialize(normalized);
        }

        if (this._publickeys) {
            jsonObj[DIDDocument.PUBLICKEY] = this._publickeys.serialize(normalized);
        }

        if (this._authentications) {
            jsonObj[DIDDocument.AUTHENTICATION] = this._authentications.serialize(normalized);
        }

        if (this._authorizations) {
            jsonObj[DIDDocument.AUTHORIZATION] = this._authorizations.serialize(normalized);
        }
    
        if (this._credentials) {
            jsonObj[DIDDocument.VERIFIABLE_CREDENTIAL] = this._credentials.serialize(normalized);
        }
    
        if (this._services) {
            jsonObj[DIDDocument.SERVICE] = this._services.serialize(normalized);
        }
    
        if (this.expires) {
            jsonObj[DIDDocument.EXPIRES] = DateSerializer.serialize(this.expires);
        }

        return jsonObj;
    }

    public static deserialize(jsonObj: any): DIDDocument {
        let newObj = new DIDDocument();
        
        if (jsonObj[DIDDocument.CONTROLLER]) {
            newObj.setControllers(Array.isArray(jsonObj[DIDDocument.CONTROLLER]) ? jsonObj[DIDDocument.CONTROLLER].map(c => {DID.deserialize(c)}) : [ DID.deserialize(json[DIDDocument.CONTROLLER]) ]);
        }

        if (jsonObj[DIDDocument.PROOF]) {
            newObj.setProofs(Array.isArray(jsonObj[DIDDocument.PROOF]) ? jsonObj[DIDDocument.PROOF].map(p => {DIDDocumentProof.deserialize(p)}) : [ DIDDocumentProof.deserialize(jsonObj[DIDDocument.PROOF]) ]);
        }

        if (jsonObj[DIDDocument.ID]) {
            newObj.setSubject(DID.deserialize(jsonObj[DIDDocument.ID]));
        }

        if (jsonObj[DIDDocument.MULTI_SIGNATURE]) {
            newObj.setMultiSignature(DIDDocumentMultiSignature.deserialize(jsonObj[DIDDocument.MULTI_SIGNATURE]));
        }

        if (jsonObj[DIDDocument.PUBLICKEY] && jsonObj[DIDDocument.PUBLICKEY].length > 0) {
            newObj.setInternalPublicKeys(jsonObj[DIDDocument.PUBLICKEY].map(k => { DIDDocumentPublicKey.deserialize(k)}));
        }

        if (jsonObj[DIDDocument.AUTHENTICATION] && jsonObj[DIDDocument.AUTHENTICATION].length > 0) {
            newObj.setInternalAuthenticationKeys(jsonObj[DIDDocument.AUTHENTICATION].map(k => { DIDDocumentPublicKeyReference.deserialize(k)}));
        }

        if (jsonObj[DIDDocument.AUTHORIZATION] && jsonObj[DIDDocument.AUTHORIZATION].length > 0) {
            newObj.setInternalAuthorizationKeys(jsonObj[DIDDocument.AUTHORIZATION].map(k => { DIDDocumentPublicKeyReference.deserialize(k)}));
        }

        if (jsonObj[DIDDocument.VERIFIABLE_CREDENTIAL] && jsonObj[DIDDocument.VERIFIABLE_CREDENTIAL].length > 0) {
            newObj.setCredentials(jsonObj[DIDDocument.VERIFIABLE_CREDENTIAL].map(k => { VerifiableCredential.deserialize(k)}));
        }
    
        if (jsonObj[DIDDocument.SERVICE] && jsonObj[DIDDocument.SERVICE].length > 0) {
            newObj.setServices(jsonObj[DIDDocument.SERVICE].map(k => { DIDDocumentService.deserialize(k)}));
        }

        if (jsonObj[DIDDocument.EXPIRES]) {
            newObj.setExpires(DateSerializer.deserialize(jsonObj[DIDDocument.ID]));
        }

        return newObj;
    }

    // Use the delegating mode to receive the whole object as a single JS object.
    // This seems to be the only way to receive already deserialized fields such as _proofs without
    // jackson doing a double deserialization when trying to resolve the constructor
    // parameters.
    /* @JsonCreator({mode: JsonCreatorMode.PROPERTIES})
    public static jacksonCreator(deserializedData: any) {
        let doc = new DIDDocument(null);
        doc._proofs = deserializedData._proofs; // set only the manually deserialized fields here ?
        //Object.assign(doc, deserializedData);
        return doc;
    } */

    /**
     * Copy constructor.
     *
     * @param doc the document be copied
     */
    public static clone(doc: DIDDocument, withProof: boolean) {
        let newInstance: DIDDocument = new DIDDocument(doc.subject);
        newInstance.controllers = doc.controllers;
        newInstance.controllerDocs = doc.controllerDocs;
        newInstance.effectiveController = doc.effectiveController;
        newInstance.multisig = doc.multisig;
        newInstance.publicKeys = doc.publicKeys;
        newInstance._publickeys = doc._publickeys;
        newInstance.authenticationKeys = doc.authenticationKeys;
        newInstance._authentications = doc._authentications;
        newInstance.authorizationKeys = doc.authorizationKeys;
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

    public setSubject(subject: DID): void {
        this.subject = subject;
    }

    private canonicalId(id: DIDURL | string): DIDURL {
        if (id instanceof DIDURL) {
            if (id == null || id.getDid() != null)
                return id;

            return DIDURL.from(id, this.getSubject());
        } else {
            return DIDURL.from(id, this.getSubject());
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
    public getControllers(): DID[] {
        return this.controllers;
    }

    public setControllers(controllers: DID[]): void {
        this.controllers = controllers;
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

    public setMultiSignature(signature: DIDDocumentMultiSignature): void {
        this.multisig = signature;
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
    public getPublicKeys(): DIDDocumentPublicKey[] {
        let pks: DIDDocumentPublicKey[] = Array.from(this.publicKeys.values());

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(...doc.getAuthenticationKeys());
        }

        return pks;
    }

    public setInternalPublicKeys(publicKeys: DIDDocumentPublicKey[]): void {
        this._publickeys = publicKeys;
    }

    /**
     * Select public keys with the specified key id or key type.
     *
     * @param id the key id
     * @param type the type string
     * @return the matched PublicKey array
     */
    public selectPublicKeys(id: DIDURL | string, type: string): DIDDocumentPublicKey[] {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: DIDDocumentPublicKey[] = [];
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

        return pks;
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

    private async getKeyPairWithPass(id: DIDURL, storepass: string): Promise<KeyPair> {
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

        let key = HDKey.deserialize(await this.getMetadata().getStore().loadPrivateKey(
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
    public async derive(index: number, storepass: string): Promise<string> {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");
        this.checkAttachedStore();
        this.checkIsPrimitive();

        let key = HDKey.deserialize(await this.getMetadata().getStore().loadPrivateKey(
            this.getDefaultPublicKeyId(), storepass));

        return key.deriveWithIndex(index).serializeBase58();
    }

    // TODO: check with jingyu what is this "identifier" and if we have a better way (existing libs)
    // than using raw bytes manipulation here.
    private mapToDerivePath(identifier: string, securityCode: number): string {
        let digest = SHA256.encodeToBuffer(Buffer.from(identifier, "utf-8"));
        let path = "m/";
        let bb = ByteBuffer.wrap(digest);
        while (bb.hasRemaining()) {
            let idx = bb.readInt();
            if (idx >= 0)
                path = path.concat(idx.toString());
            else
                path = path.concat((idx & 0x7FFFFFFF).toString()).concat("'");

            path = path.concat("/");
        }

        if (securityCode >= 0)
            path = path.concat(securityCode.toString());
        else
            path = path.concat((securityCode & 0x7FFFFFFF).toString()).concat("'");

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
    public async deriveFromIdentifier(identifier: string, securityCode: number, storepass: string): Promise<string> {
        checkArgument(identifier && identifier != null, "Invalid identifier");
        this.checkAttachedStore();
        this.checkIsPrimitive();

        let key = HDKey.deserialize(await this.getMetadata().getStore().loadPrivateKey(
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
        let count = this.authenticationKeys.size;

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
    public getAuthenticationKeys(): DIDDocumentPublicKey[] {
        let pks: DIDDocumentPublicKey[] = Array.from(this.authenticationKeys.values());

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(...doc.getAuthenticationKeys());
        }

        return pks;
    }

    public setInternalAuthenticationKeys(keys: DIDDocumentPublicKeyReference[]): void {
        this._authentications = keys;
    }

    /**
     * Select the authentication key matched the key id or the type.
     *
     * @param id the key id
     * @param type the type of key
     * @return the matched authentication key array
     */
    public selectAuthenticationKeys(id: DIDURL | string, type: string): DIDDocumentPublicKey[] {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: DIDDocumentPublicKey[] = [];
        for (let pk of this.authenticationKeys.values()) {
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
        checkArgument(idOrString != null, "Invalid publicKey id");

        idOrString = this.canonicalId(idOrString);
        let pk = this.authenticationKeys.get(idOrString);
        if (pk != null)
            return pk;

        if (this.hasController()) {
            let doc = this.controllerDocs.get(idOrString.getDid());
            if (doc != null)
                return doc.getAuthenticationKey(idOrString);
        }

        return null;
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
        return this.authorizationKeys.size;
    }

    /**
     * Get the authorization key array.
     *
     * @return the  array
     */
    public getAuthorizationKeys(): DIDDocumentPublicKey[] {
        let pks: DIDDocumentPublicKey[] = Array.from(this.authorizationKeys.values());
        return pks;
    }

    public setInternalAuthorizationKeys(keys: DIDDocumentPublicKeyReference[]): void {
        this._authorizations = keys;
    }

    /**
     * Select the authorization key array matched the key id or the type.
     *
     * @param id the key id
     * @param type the type of key
     * @return the matched authorization key array
     */
    public selectAuthorizationKeys(idOrString: DIDURL | string, type: string): DIDDocumentPublicKey[] {
        checkArgument(idOrString != null || type != null, "Invalid select args");

        idOrString = this.canonicalId(idOrString);

        let pks: DIDDocumentPublicKey[] = [];
        for (let pk of this.authorizationKeys.values()) {
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
     * @param idOrString the key id
     * @return the authorization key object
     */
    public getAuthorizationKey(idOrString: DIDURL | string): DIDDocumentPublicKey {
        checkArgument(idOrString != null, "Invalid publicKey id");

        return this.authorizationKeys.get(this.canonicalId(idOrString));
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
    public getCredentials(): VerifiableCredential[] {
        return this._credentials;
    }

    public setCredentials(credentials: VerifiableCredential[]): void {
        this._credentials = credentials;
    }

    

    /**
     * Select the Credential array matched the given credential id or the type.
     *
     * @param id the credential id
     * @param type the type of credential
     * @return the matched Credential array
     */
    public selectCredentials(id: DIDURL | string, type: string): VerifiableCredential[] {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let vcs: VerifiableCredential[] = [];
        for (let vc of this.credentials.values()) {
            if (id != null && !vc.getId().equals(id))
                continue;

            if (type != null && vc.getType().indexOf(type) < 0)
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
    public getServices(): DIDDocumentService[] {
        return this._services;
    }

    public setServices(services: DIDDocumentService[]): void {
        this._services = services;
    }

    

    /**
     * Select Service array matched the given service id or the type.
     *
     * @param id the service id
     * @param type the type of service
     * @return the matched Service array
     */
    public selectServices(id: DIDURL | string, type: string): DIDDocumentService[] {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let svcs: DIDDocumentService[] = [];
        for (let svc of this.services.values()) {
            if (id != null && !svc.getId().equals(id))
                continue;

            if (type != null && svc.getType() !== type)
                continue;

            svcs.push(svc);
        }

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

    public setExpires(expires: Date): void {
        this.expires = expires;
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
    public getProofs(): DIDDocumentProof[] {
        return this._proofs;
    }

    public setProofs(proofs: DIDDocumentProof[]): void {
        this._proofs = proofs;
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
    protected async sanitize(): Promise<void> {
        await this.sanitizeControllers();
        this.sanitizePublickKey();
        await this.sanitizeCredential();
        this.sanitizeService();

        if (this.expires == null)
            throw new MalformedDocumentException("Missing document expires.");

        this.sanitizeProof();
    }

    private async sanitizeControllers() {
        if (this.controllers == null || this.controllers.length == 0) {
            this.controllers = [];
            this.controllerDocs = new ComparableMap();

            if (this.multisig != null)
                throw new MalformedDocumentException("Invalid multisig property");

            return;
        }

        this.controllerDocs = new ComparableMap<DID, DIDDocument>();
        try {
            for (let did of this.controllers) {
                let doc = await did.resolve();
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
        let pks = new ComparableMap<DIDURL, DIDDocumentPublicKey>();

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
            this.authenticationKeys = new ComparableMap<DIDURL, DIDDocumentPublicKey>();
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

                this.authenticationKeys.set(pk.getId(), pk);
            }

            Collections.sort(this._authentications);
        } else {
            this._authentications = [];
            this.authenticationKeys = new ComparableMap();
        }

        if (this._authorizations != null && this._authorizations.length > 0) {
            this.authorizationKeys = new ComparableMap<DIDURL, DIDDocumentPublicKey>();
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

                this.authorizationKeys.set(pk.getId(), pk);
            }

            Collections.sort(this._authorizations);
        } else {
            this._authorizations = [];
            this.authorizationKeys = new ComparableMap();
        }

        // for customized DID with controller, could be no public keys
        if (pks.size > 0) {
            this.publicKeys = pks;
            this._publickeys = pks.valuesAsSortedArray();
        } else {
            this.publicKeys = new ComparableMap();
            this._publickeys = [];
        }

        // Find default key
        for (let pk of this.publicKeys.values()) {
            if (pk.getController().equals(this.getSubject())) {
                let address = HDKey.toAddress(pk.getPublicKeyBytes());
                if (address === this.getSubject().getMethodSpecificId()) {
                    this.defaultPublicKey = pk;
                    if (!this.authenticationKeys.has(pk.getId())) {
                        if (this._authentications.length == 0) {
                            this._authentications = [];
                            this.authenticationKeys = new ComparableMap<DIDURL, DIDDocumentPublicKey>();
                        }

                        this._authentications.push(DIDDocumentPublicKeyReference.newWithKey(pk));
                        this.authenticationKeys.set(pk.getId(), pk);
                        Collections.sort(this._authentications);  
                    }
                    break;
                }
            }
        }

        if (this.controllers.length == 0 && this.defaultPublicKey == null)
            throw new MalformedDocumentException("Missing default public key.");
    }

    private async sanitizeCredential(): Promise<void> {
        if (this._credentials == null || this._credentials.length == 0) {
            this._credentials = [];
            this.credentials = new ComparableMap();
            return;
        }

        let vcs = new ComparableMap<DIDURL, VerifiableCredential>();
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
                await vc.sanitize();
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
            this.services = new ComparableMap();
            return;
        }

        let svcs = new ComparableMap<DIDURL, DIDDocumentService>();
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

        this.proofs = new ComparableMap<DID, DIDDocumentProof>();

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
    public isGenuine(listener : VerificationEventListener = null): boolean {
        // Proofs count should match with multisig
        let expectedProofs = this.multisig == null ? 1 : this.multisig.m();
        if (this.proofs.size != expectedProofs) {
            if (listener != null) {
                listener.failed(this, "{}: proof size not matched with multisig, {} expected, actual is {}",
                        this.getSubject(), this.multisig.m(), this.proofs.size);
                listener.failed(this, "{}: is not genuine", this.getSubject());
            }
            return false;
        }

        let doc = DIDDocument.clone(this, false);
        let json = doc.serialize(true);
        let digest = EcdsaSigner.sha256Digest(Buffer.from(json, 'utf-8'));

        // Document should signed(only) by default public key.
        if (!this.isCustomizedDid()) {
            let proof = this.getProof();

            // Unsupported public key type;
            if (proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
                if (listener != null) {
                    listener.failed(this, "{}: key type '{}' for proof is not supported",
                            this.getSubject(), proof.getType());
                    listener.failed(this, "{}: is not genuine", this.getSubject());
                }

                return false;
            }

            if (!proof.getCreator().equals(this.getDefaultPublicKeyId())) {
                if (listener != null) {
                    listener.failed(this, "{}: key '{}' for proof is not default key",
                            this.getSubject(), proof.getCreator());
                    listener.failed(this, "{}: is not genuine", this.getSubject());
                }
                return false;
            }

            let result =  this.verifyDigest(proof.getCreator(), proof.getSignature(), digest);
            if (listener != null) {
                if (result) {
                    listener.succeeded(this, "{}: is genuine", this.getSubject());
                } else {
                    listener.failed(this, "{}: can not verify the signature", this.getSubject());
                    listener.failed(this, "{}: is not genuine", this.getSubject());
                }
            }

            return result;
        } else {
            for (let proof of this._proofs) {
                // Unsupported public key type;
                if (proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
                    if (listener != null) {
                        listener.failed(this, "{}: key type '{}' for proof is not supported",
                                this.getSubject(), proof.getType());
                        listener.failed(this, "{}: is not genuine", this.getSubject());
                    }

                    return false;
                }

                let controllerDoc = this.getControllerDocument(proof.getCreator().getDid());
                if (controllerDoc == null) {
                    if (listener != null) {
                        listener.failed(this, "{}: can not resolve the document for controller '{}' to verify the proof",
                                this.getSubject(), proof.getCreator().getDid());
                        listener.failed(this, "{}: is not genuine", this.getSubject());
                    }
                    return false;
                }
                    
                if (!controllerDoc.isGenuine(listener)) {
                    if (listener != null) {
                        listener.failed(this, "{}: controller '{}' is not genuine, failed to verify the proof",
                                this.getSubject(), proof.getCreator().getDid());
                        listener.failed(this, "{}: is not genuine", this.getSubject());
                    }

                    return false;
                }

                if (!proof.getCreator().equals(controllerDoc.getDefaultPublicKeyId())) {
                    if (listener != null) {
                        listener.failed(this, "{}: key '{}' for proof is not default key of '{}'",
                                this.getSubject(), proof.getCreator(), proof.getCreator().getDid());
                        listener.failed(this, "{}: is not genuine", this.getSubject());
                    }
                    return false;
                }
                    
                if (!controllerDoc.verifyDigest(proof.getCreator(), proof.getSignature(), digest)) {
                    if (listener != null) {
                        listener.failed(this, "{}: proof '{}' is invalid, signature mismatch",
                                this.getSubject(), proof.getCreator());
                        listener.failed(this, "{}: is not genuine", this.getSubject());
                    }
                    return false;  
                }         
            }

            if (listener != null)
                listener.succeeded(this, "{}: is genuine", this.getSubject());

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
    public isValid(listener : VerificationEventListener = null): boolean {
        if (this.isDeactivated()) {
            if (listener != null) {
                listener.failed(this, "{}: is deactivated", this.getSubject());
                listener.failed(this, "{}: is invalid", this.getSubject());
            }
            return false;
        }

        if (this.isExpired()) {
            if (listener != null) {
                listener.failed(this, "{}: is expired", this.getSubject());
                listener.failed(this, "{}: is invalid", this.getSubject());
            }
            return false;
        }

        if (!this.isGenuine(listener)) {
            if (listener != null)
                listener.failed(this, "{}: is invalid", this.getSubject());
            return false;
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values()) {
                if (doc.isDeactivated()) {
                    if (listener != null) {
                        listener.failed(this, "{}: controller '{}' is deactivated",
                                this.getSubject(), doc.getSubject());
                        listener.failed(this, "{}: is invalid", this.getSubject());
                    }
                    return false;
                }
                
                if (!doc.isGenuine(listener)) {
                    if (listener != null) {
                        listener.failed(this, "{}: controller '{}' is not genuine",
                                this.getSubject(), doc.getSubject());
                        listener.failed(this, "{}: is invalid", this.getSubject());
                    }
                    return false;
                }
            }
        }

        if (listener != null)
            listener.succeeded(this, "{}: is valid", this.getSubject());

        return true;
    }

    public copy(): DIDDocument {
        let doc = new DIDDocument(this.subject);

        doc.controllers = Array.from(this.controllers);
        doc.controllerDocs = new ComparableMap<DID, DIDDocument>(this.controllerDocs);
        if (this.multisig != null)
            doc.multisig = DIDDocumentMultiSignature.newFromMultiSignature(this.multisig);
        doc.publicKeys = new ComparableMap<DIDURL, DIDDocumentPublicKey>(this.publicKeys);
        doc.authenticationKeys = new ComparableMap<DIDURL, DIDDocumentPublicKey>(this.authenticationKeys);
        doc.authorizationKeys = new ComparableMap<DIDURL, DIDDocumentPublicKey>(this.authorizationKeys);
        doc.defaultPublicKey = this.defaultPublicKey;
        doc.credentials = new ComparableMap<DIDURL, VerifiableCredential>(this.credentials);
        doc.services = new ComparableMap<DIDURL, DIDDocumentService>(this.services);
        doc.expires = this.expires;
        doc.proofs = new ComparableMap<DID, DIDDocumentProof>(this.proofs);

        let metadata: DIDMetadata = this.getMetadata().clone();
        doc.setMetadata(metadata);

        return doc;
    }

    public clone(): DIDDocument {
        let doc = new DIDDocument(this.subject);

        doc.controllers = this.controllers;
        doc.controllerDocs = this.controllerDocs;
        doc.multisig = this.multisig;
        doc.publicKeys = this.publicKeys;
        doc._publickeys = this._publickeys;
        doc.authenticationKeys = this.authenticationKeys;
        doc._authentications = this._authentications;
        doc.authorizationKeys = this.authorizationKeys;
        doc._authorizations = this._authorizations;
        doc.defaultPublicKey = this.defaultPublicKey;
        doc.credentials = this.credentials;
        doc._credentials = this._credentials;
        doc.services = this.services;
        doc._services = this._services;
        doc.expires = this.expires;
        doc.proofs = this.proofs;
        doc._proofs = this._proofs;
        doc.metadata = this.getMetadata().clone();

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
    public signWithId(id: DIDURL | string | null, storepass: string, ...data: Buffer[]): Promise<string> {
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

    public signWithStorePass(storepass: string, ...data: Buffer[]): Promise<string> {
        return this.signWithId(null, storepass, ...data);
    }

    public async signWithTicket(ticket: TransferTicket, storepass: string): Promise<TransferTicket> {
        checkArgument(ticket != null, "Invalid ticket");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        await ticket.seal(this, storepass);
        return ticket;
    }

    public async signWithDocument(doc: DIDDocument, storepass: string): Promise<DIDDocument> {
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
            return await builder.seal(storepass);
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
    public signDigest(id: DIDURL | string | null, storepass: string, digest: Buffer): Promise<string> {
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
        let sig = Buffer.from(base64Decode(signature), "hex");

        return EcdsaSigner.verify(binkey, sig, digest);
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

    public newCustomized(inputDID: DID | string, multisig: number, storepass: string, force?: boolean): Promise<DIDDocument> {
        return this.newCustomizedDidWithController(inputDID, [], 1, storepass, force);
    }

    public async newCustomizedDidWithController(inputDID: DID | string, inputControllers: Array<DID | string>, multisig: number, storepass: string, force?: boolean): Promise<DIDDocument> {
        checkArgument(inputDID && inputDID != null, "Invalid DID");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        let did = DID.from(inputDID);
        let controllers = [];

        if (inputControllers && inputControllers.length ) {
            inputControllers.forEach((ctrl) => {
                let controller: DID = DID.from(ctrl);
                if (!controller.equals(this.getSubject()) && !controllers.includes(ctrl))
                    controllers.push (controller);

            });
        }

        checkArgument(multisig >= 0 && multisig <= controllers.length + 1, "Invalid multisig");

        DIDDocument.log.info("Creating new DID {} with controller {}...", did, this.getSubject());

        let doc: DIDDocument = null;
        if (!force) {
            doc = await did.resolve(true);
            if (doc)
                throw new DIDAlreadyExistException(did.toString());
        }

        DIDDocument.log.info("Creating new DID {} with controller {}...", did, this.getSubject());

        let docBuilder = DIDDocumentBuilder.newFromDID(did, this.getStore(), this);
        for (let ctrl of controllers) {
            await docBuilder.addController(ctrl);
        }

        docBuilder.setMultiSignature(multisig);

        try {
            doc = await docBuilder.seal(storepass);
            await this.getStore().storeDid(doc);
            return doc;
        } catch (ignore) {
            throw new UnknownInternalException(ignore);
        }
    }

    public async createTransferTicket(to: DID, storepass: string, from?: DID): Promise<TransferTicket> {
        checkArgument(to && to != null, "Invalid to");
        checkArgument(storepass && storepass != null, "Invalid storepass");

        let source: DIDDocument = !from ? this : await from.resolve(true);

        if (from) {
            this.checkIsPrimitive();
            this.checkAttachedStore();
            if (!source)
                throw new DIDNotFoundException("DID not found: "+from.toString());
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

        let ticket:TransferTicket = await TransferTicket.newForDIDDocument(source, to);
        await ticket.seal(this, storepass);

        return ticket;
    }

    public async publishWithTicket(ticket: TransferTicket, inputSignKey: DIDURL | string | null, storepass: string, adapter: DIDTransactionAdapter = null) {
        checkArgument(await ticket.isValid(), "Invalid ticket");
        checkArgument(ticket.getSubject().equals(this.getSubject()), "Ticket mismatch with current DID");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkIsCustomized();
        checkArgument(this.proofs.has(ticket.getTo()), "Document not signed by: " + ticket.getTo());
        this.checkAttachedStore();

        let signKey: DIDURL = typeof inputSignKey === "string" ? this.canonicalId(inputSignKey) : inputSignKey;

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        let did = this.getSubject();
        let targetDoc = await did.resolve(true);
        if (targetDoc == null)
            throw new DIDNotFoundException("DID not found: " + did.toString());

        if (targetDoc.isDeactivated())
            throw new DIDDeactivatedException(did.toString());

        if (signKey == null) {
            signKey = this.getDefaultPublicKeyId();
            if (signKey == null)
                throw new InvalidKeyException("No sign key.");
        } else {
            if (this.getAuthenticationKey(signKey) == null)
                throw new InvalidKeyException(signKey.toString());
        }

        await DIDBackend.getInstance().transferDid(this, ticket, signKey, storepass, adapter);
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
    public async publish(storepass: string, inputSignKey: DIDURL | string = null, force = false, adapter: DIDTransactionAdapter = null): Promise<void> {
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
        let resolvedSignature: string = null;
        let resolvedDoc = await this.getSubject().resolve(true);
        if (resolvedDoc != null) {
            if (resolvedDoc.isDeactivated()) {
                this.getMetadata().setDeactivated(true);

                DIDDocument.log.error("Publish failed because DID is deactivated.");
                throw new DIDDeactivatedException(this.getSubject().toString());
            }

            if (this.isCustomizedDid()) {
                let curMultisig = this.getMultiSignature() == null ?
                        DIDDocumentMultiSignature.ONE_OF_ONE : this.getMultiSignature();
                let orgMultisig = resolvedDoc.getMultiSignature() == null ?
                        DIDDocumentMultiSignature.ONE_OF_ONE : resolvedDoc.getMultiSignature();

                if (!curMultisig.equals(orgMultisig))
                    throw new DIDControllersChangedException();

                let orgControllers = resolvedDoc.getControllers();
                let curControllers = this.getControllers();
                if (orgControllers.length != curControllers.length)
                    throw new DIDControllersChangedException();

                orgControllers.sort();
                curControllers.sort();

                for (let i = 0; i < orgControllers.length; i++)
                    if (!orgControllers[i].equals(curControllers[i]))
                        throw new DIDControllersChangedException();
            }

            resolvedSignature = resolvedDoc.getProof().getSignature();

            if (!force) {
                let localPrevSignature = this.getMetadata().getPreviousSignature();
                let localSignature = this.getMetadata().getSignature();

                if (localPrevSignature == null && localSignature == null) {
                    DIDDocument.log.error("Trying to publish over an existing document, but signatures information is missing. " +
                        "DID SDK doesn't know how to handle it, " +
                        "use force mode to ignore checks.");
                    throw new DIDNotUpToDateException(this.getSubject().toString());
                } else if (localPrevSignature == null || localSignature == null) {
                    let ls = localPrevSignature != null ? localPrevSignature : localSignature;
                    if (ls !== resolvedSignature) {
                        DIDDocument.log.error("Current copy not based on the latest on-chain copy, signature mismatch.");
                        throw new DIDNotUpToDateException(this.getSubject().toString());
                    }
                } else {
                    if (localSignature !== resolvedSignature &&
                        localPrevSignature !== resolvedSignature) {
                        DIDDocument.log.error("Current copy not based on the latest on-chain copy, signature mismatch.");
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
            await DIDBackend.getInstance().createDid(this, signKey, storepass, adapter);
        } else {
            DIDDocument.log.info("Try to publish[update] {}...", this.getSubject());
            await DIDBackend.getInstance().updateDid(this, lastTxid, signKey, storepass, adapter);
        }

        if (resolvedSignature != null)
            this.getMetadata().setPreviousSignature(resolvedSignature);
        this.getMetadata().setSignature(this.getProof().getSignature());
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
    public async deactivate(signKey: DIDURL = null, storepass: string, adapter: DIDTransactionAdapter = null) {
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        // Document should use the IDChain's copy
        let doc = await this.getSubject().resolve(true);
        if (doc == null)
            throw new DIDNotFoundException("DID not found: "+this.getSubject().toString());
        else if (doc.isDeactivated())
            throw new DIDDeactivatedException(this.getSubject().toString());
        else
            doc.getMetadata().attachStore(this.getStore());

        doc.effectiveController = this.effectiveController;
        
        if (signKey == null) {
            signKey = doc.getDefaultPublicKeyId();
        } else {
            if (!doc.isCustomizedDid()) {
                if(!signKey.equals(doc.getDefaultPublicKeyId()) &&
                        doc.getAuthenticationKey(signKey) == null)
                    throw new InvalidKeyException(signKey.toString());
            } else {
                let controllerdoc = this.getControllerDocument(signKey.getDid());
                if (controllerdoc == null || !signKey.equals(controllerdoc.getDefaultPublicKeyId()))
                    throw new InvalidKeyException(signKey.toString());
                }
        }

        await DIDBackend.getInstance().deactivateDid(doc, signKey, storepass, adapter);

        if (this.getSignature() !== doc.getSignature())
            await this.getStore().storeDid(doc);
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
    public async deactivateTargetDID(target: DID, signKey : DIDURL = null, storepass: string, adapter: DIDTransactionAdapter = null) {
        checkArgument(target != null, "Invalid target DID");
        checkArgument(storepass && storepass != null, "Invalid storepass");
        this.checkAttachedStore();

        if (signKey == null && this.getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        let targetDoc = await target.resolve(true);
        if (targetDoc == null)
            throw new DIDNotFoundException("DID not found: "+target.toString());
        else if (targetDoc.isDeactivated())
            throw new DIDDeactivatedException(target.toString());

        targetDoc.getMetadata().attachStore(this.getStore());

        if (!targetDoc.isCustomizedDid()) {
            if (targetDoc.getAuthorizationKeyCount() == 0)
                throw new InvalidKeyException("No authorization key from: " + target);

            let candidatePks: DIDDocumentPublicKey[] = null;
            if (signKey == null) {
                candidatePks = this.getAuthenticationKeys();
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

            await DIDBackend.getInstance().deactivateTargetDid(targetDoc, targetSignKey,
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

            await DIDBackend.getInstance().deactivateDid(targetDoc, signKey, storepass, adapter);

            if (this.getStore().containsDid(target))
                await this.getStore().storeDid(targetDoc);
        }
    }

    /**
     * Parse a DIDDocument object from from a string JSON representation.
     *
     * @param content the string JSON content for building the object.
     * @return the DIDDocument object.
     * @throws MalformedDocumentException if a parse error occurs.
     */
    public static parseContent(content: string): Promise<DIDDocument> {
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
