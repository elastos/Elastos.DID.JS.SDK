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

import { JsonClassType, JsonInclude, JsonIncludeType, JsonProperty, JsonPropertyOrder, JsonSerialize, JsonDeserialize, JsonCreator, JsonIgnore } from "@elastosfoundation/jackson-js";
import { Collections } from "./internals";
import { Constants } from "./constants";
import { DID } from "./internals";
import type { DIDDocument } from "./internals";
import { DIDEntity } from "./internals";
import type { DIDStore } from "./internals";
import { DIDURL } from "./internals";
import { ParentException, AlreadySealedException, DIDNotFoundException, DIDObjectAlreadyExistException, IllegalUsage, InvalidKeyException, MalformedPresentationException } from "./exceptions/exceptions";
import { checkArgument } from "./internals";
import { VerifiableCredential } from "./internals";
import type {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import {
    Serializer,
    Deserializer
} from "./internals";
import { ComparableMap } from "./comparablemap";
import { VerificationEventListener } from "./verificationEventListener";

class NormalizedURLDeserializer extends Deserializer {
    public static deserialize(value: string, context: JsonParserTransformerContext): DIDURL {
        try {
            return new DIDURL(value);
        } catch (e) {
            throw new ParentException("Invalid public key");
        }
    }
}

class PresentationTypeSerializer extends Serializer {
    public static serialize(type: string[], context: JsonStringifierTransformerContext): any {
        return type.length > 1 ? type : type[0];
    }
}

/**
 * A Presentation can be targeted to a specific verifier by using a Linked Data
 * Proof that includes a nonce and realm.
 *
 * This also helps prevent a verifier from reusing a verifiable presentation as
 * their own.
 */
@JsonPropertyOrder({value: [
    "id",
    "type",
    "holder",
    "created",
    "_credentials",
    "proof" ]})
export class VerifiablePresentation extends DIDEntity<VerifiablePresentation> {
    /**
     * Default presentation type
     */
    public static DEFAULT_PRESENTATION_TYPE = "VerifiablePresentation";

    public static ID = "id";
    public static TYPE = "type";
    public static HOLDER = "holder";
    public static VERIFIABLE_CREDENTIAL = "verifiableCredential";
    public static CREATED = "created";
    public static PROOF = "proof";
    public static NONCE = "nonce";
    public static REALM = "realm";
    public static VERIFICATION_METHOD = "verificationMethod";
    public static SIGNATURE = "signature";

    @JsonProperty({value: VerifiablePresentation.ID})
    @JsonInclude({value: JsonIncludeType.NON_NULL})
    @JsonClassType({type: () => [DIDURL]})
    public id: DIDURL = null;
    @JsonProperty({value: VerifiablePresentation.TYPE})
    @JsonSerialize({using: PresentationTypeSerializer.serialize})
    public type: string[];
    @JsonProperty({value: VerifiablePresentation.HOLDER})
    @JsonInclude({value: JsonIncludeType.NON_NULL})
    @JsonClassType({type: () => [DID]})
    public holder: DID;
    @JsonProperty({value: VerifiablePresentation.CREATED})
    @JsonClassType({type: () => [Date]})
    public created: Date;
    @JsonProperty({value: VerifiablePresentation.VERIFIABLE_CREDENTIAL})
    @JsonClassType({type: () => [Array, [VerifiableCredential]]})
    public _credentials: VerifiableCredential[];
    @JsonProperty({value: VerifiablePresentation.PROOF})
    @JsonInclude({value: JsonIncludeType.NON_NULL})
    @JsonClassType({type: () => [VerifiablePresentation.Proof]})
    public proof: VerifiablePresentation.Proof;

    @JsonIgnore()
    public credentials: ComparableMap<DIDURL, VerifiableCredential>;

    /**
     * Constructs the simplest Presentation.
     */
    constructor(holder?: DID) {
        super();
        this.holder = holder;
        this.credentials = new ComparableMap<DIDURL, VerifiableCredential>();
    }

    // Add custom deserialization fields to the method params here + assign.
    // Jackson does the rest automatically.
    @JsonCreator()
    public static jacksonCreator(@JsonProperty({value: VerifiablePresentation.TYPE}) type?: any) {
        let vp = new VerifiablePresentation(null);

        // Proofs
        if (type) {
            if (type instanceof Array)
                vp.type = type.map((p) => VerifiablePresentation.getDefaultObjectMapper().parse(JSON.stringify(p), {mainCreator: () => [String]}));
            else
                vp.type = [VerifiablePresentation.getDefaultObjectMapper().parse(JSON.stringify(type), {mainCreator: () => [String]})];
        }

        return vp;
    }

    /**
     * Copy constructor.
     *
     * @param vp the source VerifiablePresentation object.
     */
     static newFromPresentation(vp: VerifiablePresentation, withProof: boolean): VerifiablePresentation {
        let presentation = new VerifiablePresentation();
        presentation.id = vp.id;
        presentation.type = vp.type;
        presentation.holder = vp.holder;
        presentation.created = vp.created;
        presentation.credentials = vp.credentials;
        presentation._credentials = vp._credentials;
        if (withProof)
            presentation.proof = vp.proof;

        return presentation;
    }

    public getId(): DIDURL {
        return this.id;
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
        return this.created;
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
        return this._credentials;
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
     * Sanitize routine before sealing or after deserialization.
     *
     * @param withProof check the proof object or not
     * @throws MalformedPresentationException if the presentation object is invalid
     */
    protected async sanitize(): Promise<void> {
        if (this.type == null || this.type.length == 0)
            throw new MalformedPresentationException("Missing presentation type");

        if (this.created == null)
            throw new MalformedPresentationException("Missing presentation create timestamp");

        if (this._credentials != null && this._credentials.length > 0) {
            for (let vc of this._credentials) {
                try {
                    await vc.sanitize();
                } catch (e) {
                    // MalformedCredentialException
                    throw new MalformedPresentationException("credential invalid: " + vc.getId(), e);
                }

                if (this.credentials.has(vc.getId()))
                    throw new MalformedPresentationException("Duplicated credential id: " + vc.getId());

                    this.credentials.set(vc.getId(), vc);
            }
        }

        if (this.proof == null)
            throw new MalformedPresentationException("Missing presentation proof");

        if (this.holder == null) {
            if (this.id != null && this.id.getDid() == null)
                throw new MalformedPresentationException("Invalid presentation id");

            if (this.proof.getVerificationMethod().getDid() == null)
                throw new MalformedPresentationException("Invalid verification method");
        } else {
            if (this.id != null && this.id.getDid() == null)
                this.id.setDid(this.holder);

            if (this.proof.getVerificationMethod().getDid() == null)
                this.proof.getVerificationMethod().setDid(this.holder);
        }

        Collections.sort(this.type);
        this._credentials = Array.from(this.credentials.values());
    }

    /**
     * Check whether the Presentation is genuine or not.
     *
     * @return whether the Credential object is genuine
     * @throws DIDResolveException if error occurs when resolve the DID documents
     */
    public async isGenuine(listener : VerificationEventListener = null): Promise<boolean> {
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

        let result =  holderDoc.verify(this.proof.getVerificationMethod(),
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
    public async isValid(listener : VerificationEventListener = null): Promise<boolean> {
        let  holderDoc = await this.getHolder().resolve();
        if (holderDoc == null) {
            if (listener != null) {
                listener.failed(this, "VP {}: can not resolve the holder's document", this.getId());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
            return false;
        }

        // Check the validity of holder' document.
        if (!holderDoc.isValid(listener)) {
            if (listener != null) {
                listener.failed(this, "VP {}: holder's document is invalid", this.getId());
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

        let vp = VerifiablePresentation.newFromPresentation(this, false);
        let json = vp.serialize(true);

        let result = holderDoc.verify(this.proof.getVerificationMethod(),
            this.proof.getSignature(), Buffer.from(json),
            Buffer.from(this.proof.getRealm()), Buffer.from(this.proof.getNonce()));
        if (listener != null) {
            if (result) {
                listener.succeeded(this, "VP {}: is valid", this.getId());
            } else {
                listener.failed(this, "VP {}: proof is invalid, signature mismatch", this.getId());
                listener.failed(this, "VP {}: is invalid", this.getId());
            }
        }

        return result;
    }

    /**
     * Parse a VerifiablePresentation object from from a string JSON
     * representation.
     *
     * @param content the string JSON content for building the object
     * @return the VerifiablePresentation object
     * @throws DIDSyntaxException if a parse error occurs
     */
    public static parseContent(content: string): Promise<VerifiablePresentation> {
        try {
            return this.parse(content, VerifiablePresentation);
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
            throw new DIDNotFoundException(did.toString());

        if (signKey == null) {
            signKey = holder.getDefaultPublicKeyId();
        } else {
            if (!holder.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString());
        }

        if (!holder.hasPrivateKey(signKey))
            throw new InvalidKeyException("No private key: " + signKey);

        return new VerifiablePresentation.Builder(holder, signKey);
    }
}

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
        }

        private checkNotSealed() {
            if (this.presentation == null)
                throw new AlreadySealedException();
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

        /**
         * Set Credential types.
         *
         * @param types the set of types
         * @return the Builder object
         */
        public type(...types: string[]): Builder {
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
                    throw new IllegalUsage(vc.getId().toString());

                if (this.presentation.credentials.has(vc.getId()))
                    throw new DIDObjectAlreadyExistException(vc.getId().toString());

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
        public async seal(storepass: string): Promise<VerifiablePresentation>  {
            this.checkNotSealed();
            checkArgument(storepass && storepass != null, "Invalid storepass");

            if (this.presentation.type == null || this.presentation.type.length == 0) {
                this.presentation.type = [];
                this.presentation.type.push(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE);
            } else {
                Collections.sort(this.presentation.type);
            }

            this.presentation.created = new Date();
            if (this.presentation.created)
                this.presentation.created.setMilliseconds(0);

            this.presentation._credentials = Array.from(this.presentation.credentials.values());

            let json = this.presentation.serialize(true);
            let sig = await this.holder.signWithId(this.signKey, storepass, Buffer.from(json),
                    Buffer.from(this._realm), Buffer.from(this._nonce));
            let proof = new Proof(this.signKey, this._realm, this._nonce, sig);
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
     @JsonPropertyOrder({value: [
         "type",
         "verificationMethod",
         "realm",
         "nonce",
         "signature" ]})
     export class Proof {
         @JsonProperty({value: VerifiablePresentation.TYPE})
         private type: string;
         @JsonProperty({value: VerifiablePresentation.VERIFICATION_METHOD})
         @JsonDeserialize({using: NormalizedURLDeserializer.deserialize})
         private verificationMethod: DIDURL;
         @JsonProperty({value: VerifiablePresentation.REALM})
         private realm: string;
         @JsonProperty({value: VerifiablePresentation.NONCE})
         private nonce: string;
         @JsonProperty({value: VerifiablePresentation.SIGNATURE})
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
         // TODO java: @JsonCreator
         constructor(
                 @JsonProperty({value: VerifiablePresentation.VERIFICATION_METHOD, required: true}) method: DIDURL,
                 @JsonProperty({value: VerifiablePresentation.REALM, required: true}) realm: string,
                 @JsonProperty({value: VerifiablePresentation.NONCE, required: true}) nonce: string,
                 @JsonProperty({value: VerifiablePresentation.SIGNATURE, required: true}) signature: string,
                 @JsonProperty({value: VerifiablePresentation.TYPE}) type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
             this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
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
     }
}