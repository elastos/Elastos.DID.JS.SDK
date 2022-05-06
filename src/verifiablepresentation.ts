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
import { ComparableMap } from "./comparablemap";
import { Constants } from "./constants";
import {
    AlreadySealedException,
    DIDNotFoundException,
    DIDObjectAlreadyExistException,
    IllegalUsage, InvalidKeyException,
    MalformedPresentationException
} from "./exceptions/exceptions";
import { DIDDocument, DIDStore, Features, Logger } from "./internals";
import { checkArgument, checkEmpty, Collections, DID, DIDEntity, DIDURL, VerifiableCredential } from "./internals";
import { JSONObject } from "./json";
import { VerificationEventListener } from "./verificationEventListener";

const log = new Logger("VerifiableCredential");
/**
 * A Presentation can be targeted to a specific verifier by using a Linked Data
 * Proof that includes a nonce and realm.
 *
 * This also helps prevent a verifier from reusing a verifiable presentation as
 * their own.
 */
// eslint-disable-next-line no-duplicate-imports
export class VerifiablePresentation extends DIDEntity<VerifiablePresentation> {
    /**
     * Default presentation type
     */
    public static DEFAULT_PRESENTATION_TYPE = "VerifiablePresentation";

    public context?: string[];
    public id: DIDURL;
    public type: string[];
    public holder: DID;
    public created: Date;
    public credentials: ComparableMap<DIDURL, VerifiableCredential>;
    public proof: VerifiablePresentation.Proof;

    /**
     * Constructs the simplest Presentation.
     */
    constructor(holder?: DID) {
        super();
        this.holder = holder;
        this.credentials = new ComparableMap<DIDURL, VerifiableCredential>();
    }

    /**
     * Copy constructor.
     *
     * @param vp the source VerifiablePresentation object.
     */
    static newFromPresentation(vp: VerifiablePresentation, withProof: boolean): VerifiablePresentation {
        let presentation = new VerifiablePresentation();
        presentation.context = vp.context;
        presentation.id = vp.id;
        presentation.type = vp.type;
        presentation.holder = vp.holder;
        presentation.created = vp.created;
        presentation.credentials = vp.credentials;
        if (withProof)
            presentation.proof = vp.proof;

        return presentation;
    }

    public getId(): DIDURL {
        return this.id ? this.id : null;
    }

    /**
     * Get the type of Presentation.
     *
     * @return the type string
     */
    public getType(): string[] {
        return this.type;
    }

    /**
     * Get the holder of the Presentation.
     *
     * @return the holder's DID
     */
    public getHolder(): DID {
        // NOTICE:
        //
        // DID 2 SDK should add the holder field as a mandatory field when
        // create the presentation, at the same time should treat the holder
        // field as an optional field when parse the presentation.
        //
        // This will ensure compatibility with the presentations that
        // created by the old SDK.
        return this.holder != null ? this.holder : this.proof.getVerificationMethod().getDid();
    }

    /**
     * Get the time created Presentation.
     *
     * @return the time created
     */
    public getCreated(): Date {
        return this.proof.getCreated() != null ? this.proof.getCreated() : this.created;
    }

    /**
     * Get the count of Credentials in the Presentation.
     *
     * @return the Credentials' count
     */
    public getCredentialCount(): number {
        return this.credentials.size;
    }

    /**
     * Get all Credentials in the Presentation.
     *
     * @return the Credential array
     */
    public getCredentials(): VerifiableCredential[] {
        return this.credentials.valuesAsSortedArray();
    }

    /**
     * Get the specified Credential.
     *
     * @param id the specified Credential id
     * @return the Credential object
     */
    public getCredential(id: DIDURL | string): VerifiableCredential {
        checkArgument(id != null, "Invalid credential id");

        if (typeof id === "string")
            id = DIDURL.from(id, this.getHolder())
        else if (id.getDid() == null)
            id = DIDURL.from(id, this.getHolder());

        return this.credentials.get(id);
    }

    /**
     * Get Presentation Proof object.
     *
     * @return the Presentation Proof object
     */
    public getProof(): VerifiablePresentation.Proof {
        return this.proof;
    }

    /**
     * Check whether the Presentation is genuine or not.
     *
     * @return whether the Credential object is genuine
     * @throws DIDResolveException if error occurs when resolve the DID documents
     */
    public async isGenuine(listener: VerificationEventListener = null): Promise<boolean> {
        let holderDoc = await this.getHolder().resolve();
        if (holderDoc == null) {
            if (listener != null) {
                listener.failed(this, "VP {}: can not resolve the holder's document", this.getId());
                listener.failed(this, "VP {}: is not genuine", this.getId());
            }
            return false;
        }

        // Check the integrity of holder' document.
        if (!holderDoc.isGenuine(listener)) {
            if (listener != null) {
                listener.failed(this, "VP {}: holder's document is not genuine", this.getId());
                listener.failed(this, "VP {}: is not genuine", this.getId());
            }
            return false;
        }

        // Unsupported public key type;
        if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
            if (listener != null) {
                listener.failed(this, "VP {}: key type '{}' for proof is not supported",
                    this.getId(), this.proof.getType());
                listener.failed(this, "VP {}: is not genuine", this.getId());
            }
            return false;
        }

        // Credential should signed by authentication key.
        if (!holderDoc.isAuthenticationKey(this.proof.getVerificationMethod())) {
            if (listener != null) {
                listener.failed(this, "VP {}: Key '{}' for proof is not an authencation key of '{}'",
                    this.getId(), this.proof.getVerificationMethod(), this.proof.getVerificationMethod().getDid());
                listener.failed(this, "VP {}: is not genuine", this.getId());
            }
            return false;
        }

        // All credentials should owned by holder
        for (let vc of this.credentials.values()) {
            if (!vc.getSubject().getId().equals(this.getHolder())) {
                if (listener != null) {
                    listener.failed(this, "VP {}: credential '{}' not owned by the holder '{}'",
                        this.getId(), vc.getId(), this.getHolder());
                    listener.failed(this, "VP {}: is not genuine", this.getId());
                }
                return false;
            }

            if (!await vc.isGenuine(listener)) {
                if (listener != null) {
                    listener.failed(this, "VP {}: credential '{}' is not genuine",
                        this.getId(), vc.getId());
                    listener.failed(this, "VP {}: is not genuine", this.getId());
                }
                return false;
            }
        }

        let vp = VerifiablePresentation.newFromPresentation(this, false);
        let json = vp.serialize(true);

        let result = holderDoc.verify(this.proof.getVerificationMethod(),
            this.proof.getSignature(), Buffer.from(json),
            Buffer.from(this.proof.getRealm()), Buffer.from(this.proof.getNonce()));
        if (listener != null) {
            if (result) {
                listener.succeeded(this, "VP {}: is genuine", this.getId());
            } else {
                listener.failed(this, "VP {}: proof is invalid, signature mismatch", this.getId());
                listener.failed(this, "VP {}: is not genuine", this.getId());
            }
        }
        return result;
    }

    /**
     * Check whether the presentation is valid or not.
     *
     * @return whether the Credential object is valid
     * @throws DIDResolveException if error occurs when resolve the DID documents
     */
    public async isValid(listener: VerificationEventListener = null): Promise<boolean> {
        let holderDoc = await this.getHolder().resolve();
        if (holderDoc == null) {
            if (listener != null) {
                listener.failed(this, "VP {}: can not resolve the holder's document", this.getId());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        // Check the validity of holder' document.
        if (await holderDoc.isDeactivated()) {
            if (listener != null) {
                listener.failed(this, "VP {}: holder's document is deactivate", this.getId());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        if (!holderDoc.isGenuine(listener)) {
            if (listener != null) {
                listener.failed(this, "VP {}: holder's document is genuine", this.getId());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        // Unsupported public key type;
        if (this.proof.getType() !== Constants.DEFAULT_PUBLICKEY_TYPE) {
            if (listener != null) {
                listener.failed(this, "VP {}: Key type '{}' for proof is not supported",
                    this.getId(), this.proof.getType());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        // Credential should signed by authentication key.
        if (!holderDoc.isAuthenticationKey(this.proof.getVerificationMethod())) {
            if (listener != null) {
                listener.failed(this, "VP {}: Key '{}' for proof is not an authencation key of '{}'",
                    this.getId(), this.proof.getVerificationMethod(), this.proof.getVerificationMethod().getDid());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        let vp = VerifiablePresentation.newFromPresentation(this, false);
        let json = vp.serialize(true);

        if (!holderDoc.verify(this.proof.getVerificationMethod(),
                this.proof.getSignature(), Buffer.from(json),
                Buffer.from(this.proof.getRealm()), Buffer.from(this.proof.getNonce()))) {
            if (listener != null) {
                listener.failed(this, "VP {}: proof is invalid, signature mismatch", this.getId());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        // All credentials should owned by holder
        for (let vc of this.credentials.values()) {
            if (!vc.getSubject().getId().equals(this.getHolder())) {
                if (listener != null) {
                    listener.failed(this, "VP {}: credential '{}' not owned by the holder '{}'",
                        this.getId(), vc.getId(), this.getHolder());
                    listener.failed(this, "VP {}: is not genuine", this.getId());
                }
                return false;
            }

            if (!await vc.isValid(listener)) {
                if (listener != null) {
                    listener.failed(this, "VP {}: credential '{}' is invalid",
                        this.getId(), vc.getId());
                    listener.failed(this, "VP {}: is invalid", this.getId());
                }
                return false;
            }
        }

        if (listener != null)
            listener.succeeded(this, "VP %s: is valid", this.getId());

        return true;
    }

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        if (this.context != null && this.context.length > 0)
            json["@context"] = Array.from(this.context);

        if (this.id)
            json.id = this.id.toString();
        json.type = this.type.length == 1 ? this.type[0] : this.type;
        if (this.holder)
            json.holder = this.holder.toString();
        if (this.created)
            json.created = this.dateToString(this.created);

        json.verifiableCredential = Array.from(this.credentials.valuesAsSortedArray(),
            (vc) => vc.toJSON());

        if (this.proof)
            json.proof = this.proof.toJSON();

        return json;
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        this.context = this.getContext("@context", json["@context"], {mandatory: false, nullable: false, defaultValue: [] });
        this.holder = this.getDid("holder", json.holder, { mandatory: false, nullable: false, defaultValue: null });
        this.id = this.getDidUrl("id", json.id, { mandatory: false, nullable: false, context: this.holder, defaultValue: null });
        this.type = this.getStrings("type", json.type,
            { mandatory: true, nullable: false, defaultValue: [VerifiablePresentation.DEFAULT_PRESENTATION_TYPE] });
        this.created = this.getDate("created", json.created, { mandatory: false, nullable: true });

        if (!json.proof)
            throw new MalformedPresentationException("Missing property: proof");

        let proof = json.proof as JSONObject;
        this.proof = VerifiablePresentation.Proof.deserialize(proof, VerifiablePresentation.Proof, this.holder);
        if (this.created == null && this.proof.getCreated() == null)
            throw new MalformedPresentationException("Missing presentation create timestamp");

        this.credentials = new ComparableMap<DIDURL, VerifiableCredential>();

        if (json.verifiableCredential) {
            if (!Array.isArray(json.verifiableCredential))
                throw new MalformedPresentationException("Invalid property: verifiableCredential, type error.");

            for (let obj of json.verifiableCredential) {
                let vc: VerifiableCredential;
                let vcJson = obj as JSONObject;

                try {
                    vc = VerifiableCredential.deserialize(vcJson, VerifiableCredential, this.holder);
                } catch (e) {
                    // MalformedCredentialException
                    throw new MalformedPresentationException("credential invalid: " + vcJson.id, e);
                }

                if (this.credentials.has(vc.getId()))
                    throw new MalformedPresentationException("Duplicated credential id: " + vc.getId());

                this.credentials.set(vc.getId(), vc);
            }
        }
    }

    /**
     * Parse a VerifiablePresentation object from from a string JSON
     * representation.
     *
     * @param content the string JSON content for building the object
     * @return the VerifiablePresentation object
     * @throws DIDSyntaxException if a parse error occurs
     */
    public static parse(content: JSONObject | string): VerifiablePresentation {
        try {
            return DIDEntity.deserialize(content, VerifiablePresentation);
        } catch (e) {
            if (e instanceof MalformedPresentationException)
                throw e;
            else
                throw new MalformedPresentationException(e);
        }
    }

    /**
     * Get the Builder object to create presentation for DID.
     *
     * @param did the owner of Presentation.
     * @param signKey the key to sign
     * @param store the specified DIDStore
     * @return the presentation Builder object
     * @throws DIDStoreException can not load DID
     * @throws InvalidKeyException if the signKey is invalid
     */
    public static async createFor(did: DID | string, signKey: DIDURL | string | null, store: DIDStore): Promise<VerifiablePresentation.Builder> {
        checkArgument(did != null, "Invalid did");
        checkArgument(store != null, "Invalid store");

        if (typeof did === "string")
            did = DID.from(did);

        if (typeof signKey === "string")
            signKey = DIDURL.from(signKey, did);

        let holder = await store.loadDid(did);
        if (holder == null)
            throw new DIDNotFoundException(did.toString() + " isn't found in the chain");

        if (signKey == null) {
            signKey = holder.getDefaultPublicKeyId();
        } else {
            if (!holder.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString()+ " isn't the authencation key");
        }

        if (!holder.hasPrivateKey(signKey))
            throw new InvalidKeyException("No private key: " + signKey);

        return new VerifiablePresentation.Builder(holder, signKey);
    }
}

/* eslint-disable no-class-assign */
export namespace VerifiablePresentation {
    /**
     * Presentation Builder object to create presentation.
     */
    export class Builder {
        private holder: DIDDocument;
        private signKey: DIDURL;
        private _realm: string;
        private _nonce: string;
        private presentation: VerifiablePresentation;

        /**
         * Create a Builder object with issuer information.
         *
         * @param holder the Presentation's holder
         * @param signKey the key to sign Presentation
         */
        constructor(holder: DIDDocument, signKey: DIDURL) {
            this.holder = holder;
            this.signKey = signKey;
            this.presentation = new VerifiablePresentation(holder.getSubject());
            this.setDefaultType();
        }

        private checkNotSealed() {
            if (this.presentation == null)
                throw new AlreadySealedException("Presentation " + this.id.toString() + " is already sealed");
        }

        public id(id: DIDURL | string): Builder {
            this.checkNotSealed();
            checkArgument(id != null, "Invalid id");

            if (typeof id === "string")
                id = DIDURL.from(id, this.holder.getSubject());

            checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.holder.getSubject())), "Invalid id");

            this.presentation.id = DIDURL.from(id, this.holder.getSubject());
            return this;
        }

        private setDefaultType(): void {
            this.checkNotSealed();

            if (Features.isEnabledJsonLdContext()) {
                if (this.presentation.context == null)
                    this.presentation.context = [];

                if (!this.presentation.context.includes(VerifiableCredential.W3C_CREDENTIAL_CONTEXT))
                    this.presentation.context.push(VerifiableCredential.W3C_CREDENTIAL_CONTEXT);

                if (!this.presentation.context.includes(VerifiableCredential.ELASTOS_CREDENTIAL_CONTEXT))
                    this.presentation.context.push(VerifiableCredential.ELASTOS_CREDENTIAL_CONTEXT);
            }

            if (this.presentation.type == null)
                this.presentation.type = [];

            if (!this.presentation.type.includes(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE))
                this.presentation.type.push(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE);
        }

        /**
         * Add a new presentation type.
         *
         * @param type the type name
         * @param context the JSON-LD context for type, or null if not
         * 		  enabled the JSON-LD feature
         * @return the Builder instance for method chaining
         */
        public typeWithContext(type : string, context : string): Builder {
            this.checkNotSealed();
            checkEmpty(type, "Invalid type: " + type);

            if (Features.isEnabledJsonLdContext()) {
                checkEmpty(context, "Invalid context: " + context);

                if (this.presentation.context == null)
                    this.presentation.context = [];

                if (!this.presentation.context.includes(context))
                    this.presentation.context.push(context);
            } else {
               log.warn("JSON-LD context support not enabled");
            }

            if (this.presentation.type == null)
                this.presentation.type = [];

            if (!this.presentation.type.includes(type))
                this.presentation.type.push(type);

            return this;
        }

        /**
         * Add a new presentation type.
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
         * Set Credential types.
         *
         * @param types the set of types
         * @return the Builder object
         */
        public types(types: string[]): Builder {
            this.checkNotSealed();
            checkArgument(types != null && types.length > 0, "Invalid types");

            this.presentation.type = Array.from(types);
            return this;
        }

        /**
         * Add Credentials to Presentation.
         *
         * @param credentials the credentials array
         * @return the Presentation Builder object
         */
        public credentials(...credentials: VerifiableCredential[]): Builder {
            this.checkNotSealed();

            for (let vc of credentials) {
                if (!vc.getSubject().getId().equals(this.holder.getSubject()))
                    throw new IllegalUsage("Credential " + vc.getId().toString() + " doesn't belong to the holder of presentation");

                if (this.presentation.credentials.has(vc.getId()))
                    throw new DIDObjectAlreadyExistException(vc.getId().toString() + " already exist in the presentation");

                // TODO: integrity check?
                // if (!vc.isValid())
                //  throw new IllegalArgumentException("Credential '" +
                //          vc.getId() + "' is invalid");

                this.presentation.credentials.set(vc.getId(), vc);
            }

            return this;
        }

        /**
         * Set realm for Presentation.
         *
         * @param realm the realm string
         * @return the Presentation Builder object
         */
        public realm(realm: string): Builder {
            this.checkNotSealed();
            checkArgument(realm && realm != null, "Invalid realm");

            this._realm = realm;
            return this;
        }

        /**
         * Set nonce for Presentation.
         *
         * @param nonce the nonce string
         * @return the Presentation Builder object
         */
        public nonce(nonce: string): Builder {
            this.checkNotSealed();
            checkArgument(nonce && nonce != null, "Invalid nonce");

            this._nonce = nonce;
            return this;
        }

        /**
         * Seal the presentation object, attach the generated proof to the
         * presentation.
         *
         * @param storepass the password for DIDStore
         * @return the Presentation object
         * @throws MalformedPresentationException if the presentation is invalid
         * @throws DIDStoreException if an error occurs when access DID store
         */
        public async seal(storepass: string): Promise<VerifiablePresentation> {
            this.checkNotSealed();
            checkArgument(storepass && storepass != null, "Invalid storepass");

            if (this.presentation.type == null || this.presentation.type.length == 0)
                throw new MalformedPresentationException("Missing presentation type");

            Collections.sort(this.presentation.type);

            this.presentation.created = new Date();
            if (this.presentation.created)
                this.presentation.created.setMilliseconds(0);

            let json = this.presentation.serialize(true);
            let sig = await this.holder.signWithId(this.signKey, storepass, Buffer.from(json),
                Buffer.from(this._realm), Buffer.from(this._nonce));
            let proof = new Proof(this.presentation.created, this.signKey, this._realm, this._nonce, sig);
            this.presentation.proof = proof;

            // Invalidate builder
            let vp: VerifiablePresentation = this.presentation;
            this.presentation = null;

            return vp;
        }
    }

    /**
     * The proof information for verifiable presentation.
     *
     * The default proof type is ECDSAsecp256r1.
     */
    export class Proof extends DIDEntity<Proof> {
        private type: string;
        private created: Date;
        private verificationMethod: DIDURL;
        private realm: string;
        private nonce: string;
        private signature: string;

        /**
         * Create the proof object with the given values.
         *
         * @param type the type string
         * @param method the sign key
         * @param realm where is presentation use
         * @param nonce the nonce string
         * @param signature the signature string
         */
        constructor(created: Date = null, method: DIDURL = null, realm: string = null, nonce: string = null,
            signature: string = null, type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
            super();
            this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
            if (created == null) {
                this.created = new Date();
                if (this.created)
                    this.created.setMilliseconds(0);
            } else {
                this.created = created;
            }
            this.verificationMethod = method;
            this.realm = realm;
            this.nonce = nonce;
            this.signature = signature;
        }

        /**
         * Get presentation type.
         *
         * @return the type string
         */
        public getType(): string {
            return this.type;
        }

        public getCreated(): Date {
            return this.created;
        }

        /**
         * Get key to sign Presentation.
         *
         * @return the sign key
         */
        public getVerificationMethod(): DIDURL {
            return this.verificationMethod;
        }

        /**
         * Get realm string of Presentation.
         *
         * @return the realm string
         */
        public getRealm(): string {
            return this.realm;
        }

        /**
         * Get nonce string of Presentation.
         *
         * @return the nonce string
         */
        public getNonce(): string {
            return this.nonce;
        }

        /**
         * Get signature string of Presentation.
         *
         * @return the signature string
         */
        public getSignature(): string {
            return this.signature;
        }

        public toJSON(key: string = null): JSONObject {
            let context: DID = key ? new DID(key) : null;
            let json: JSONObject = {};

            json.type = this.type;
            if (this.created)
                json.created = this.dateToString(this.created);

            json.verificationMethod = this.verificationMethod.toString();
            json.realm = this.realm;
            json.nonce = this.nonce;
            json.signature = this.signature;
            return json;
        }

        protected fromJSON(json: JSONObject, context: DID = null): void {
            this.type = this.getString("proof.type", json.type,
                { mandatory: false, defaultValue: Constants.DEFAULT_PUBLICKEY_TYPE });
            this.created = this.getDate("created", json.created,
                { mandatory: false, nullable: true });
            this.verificationMethod = this.getDidUrl("proof.verificationMethod", json.verificationMethod,
                { mandatory: true, nullable: false, context: context });
            this.realm = this.getString("proof.realm", json.realm,
                { mandatory: true, nullable: false });
            this.nonce = this.getString("proof.nonce", json.nonce,
                { mandatory: true, nullable: false });
            this.signature = this.getString("proof.signature", json.signature,
                { mandatory: true, nullable: false });
        }
    }
}