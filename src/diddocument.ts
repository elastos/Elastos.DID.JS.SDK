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

import { JsonClassType, JsonCreator, JsonProperty, JsonFormat, JsonFormatShape, JsonInclude, JsonIncludeType } from "jackson-js";
import { DIDEntity } from "./didentity";
import { DID } from "./did";
import { DIDURL } from "./didurl";
import { DIDObject } from "./didobject";
import { Logger } from "./logger";
import { checkArgument } from "./utils";
import { List as ImmutableList } from "immutable";
import { VerifiableCredential } from "./verifiablecredential";
import {
    MalformedDocumentException,
    NotCustomizedDIDException,
    NotAttachedWithStoreException,
    NotPrimitiveDIDException,
    NoEffectiveControllerException,
    InvalidKeyException
} from "./exceptions/exceptions";

const log = new Logger("DIDDocument");

export namespace DIDDocument {
    export class MultiSignature {
        private int m;
        private int n;

        public MultiSignature(int m, int n) {
            apply(m, n);
        }

        private MultiSignature(MultiSignature ms) {
            apply(ms.m, ms.n);
        }

        @JsonCreator
        public MultiSignature(String mOfN) {
            if (mOfN == null || mOfN.isEmpty())
                throw new IllegalArgumentException("Invalid multisig spec");

            String[] mn = mOfN.split(":");
            if (mn == null || mn.length != 2)
                throw new IllegalArgumentException("Invalid multisig spec");

            apply(Integer.valueOf(mn[0]), Integer.valueOf(mn[1]));
        }

        protected apply(int m, int n) {
            checkArgument(n > 1, "Invalid multisig spec: n should > 1");
            checkArgument(m > 0 && m <= n,  "Invalid multisig spec: m should > 0 and <= n");

            this.m = m;
            this.n = n;
        }

        public int m() {
            return m;
        }

        public int n() {
            return n;
        }

        @Override
        public boolean equals(object obj) {
            if (this == obj)
                return true;

            if (obj instanceof MultiSignature) {
                MultiSignature multisig = (MultiSignature)obj;
                return m == multisig.m && n == multisig.n;
            }

            return false;
        }

        @Override
        @JsonValue
        public String toString() {
            return String.format("%d:%d", m, n);
        }
    }

    /**
     * Publickey is used for digital signatures, encryption and
     * other cryptographic operations, which are the basis for purposes such as
     * authentication or establishing secure communication with service endpoints.
     */
    @JsonPropertyOrder({ ID, TYPE, CONTROLLER, PUBLICKEY_BASE58 })
    @JsonFilter("publicKeyFilter")
    export class PublicKey implements DIDobject, Comparable<PublicKey> {
        @JsonProperty(ID)
        private DIDURL id;
        @JsonProperty(TYPE)
        private type: string;
        @JsonProperty(CONTROLLER)
        private DID controller;
        @JsonProperty(PUBLICKEY_BASE58)
        private String keyBase58;
        private boolean authenticationKey;
        private boolean authorizationKey;

        /**
         * Constructs Publickey with the given value.
         *
         * @param id the Id for PublicKey
         * @param type the type string of PublicKey, default type is "ECDSAsecp256r1"
         * @param controller the DID who holds private key
         * @param keyBase58 the string from encoded base58 of public key
         */
        @JsonCreator
        protected PublicKey(@JsonProperty(value = ID, required = true) DIDURL id,
                @JsonProperty(value = TYPE) type: string,
                @JsonProperty(value = CONTROLLER) controller: DID,
                @JsonProperty(value = PUBLICKEY_BASE58, required = true) String keyBase58) {
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
        @Override
        public DIDURL getId() {
            return id;
        }

        /**
         * Get the PublicKey type.
         *
         * @return the type string
         */
        @Override
        public String getType() {
            return type;
        }

        /**
         * Get the controller of Publickey.
         *
         * @return the controller
         */
        public DID getController() {
            return controller;
        }

        /**
         * Get public key base58 string.
         *
         * @return the key base58 string
         */
        public String getPublicKeyBase58() {
            return keyBase58;
        }

        /**
         * Get public key bytes.
         *
         * @return the key bytes
         */
        public byte[] getPublicKeyBytes() {
            return Base58.decode(keyBase58);
        }

        /**
         * Check if the key is an authentication key or not.
         *
         * @return if the key is an authentication key or not
         */
        public boolean isAuthenticationKey() {
            return authenticationKey;
        }

        private setAuthenticationKey(boolean authenticationKey) {
            this.authenticationKey = authenticationKey;
        }

        /**
         * Check if the key is an authorization key or not.
         *
         * @return if the key is an authorization key or not
         */
        public boolean isAuthorizationKey() {
            return authorizationKey;
        }

        private setAuthorizationKey(boolean authorizationKey) {
            this.authorizationKey = authorizationKey;
        }

        @Override
        public boolean equals(object obj) {
            if (this == obj)
                return true;

            if (obj instanceof PublicKey) {
                PublicKey ref = (PublicKey)obj;

                if (getId().equals(ref.getId()) &&
                        getType().equals(ref.getType()) &&
                        getController().equals(ref.getController()) &&
                        getPublicKeyBase58().equals(ref.getPublicKeyBase58()))
                    return true;
            }

            return false;
        }

        @Override
        public int compareTo(key: PublicKey) {
            int rc = id.compareTo(key.id);

            if (rc != 0)
                return rc;
            else
                rc = keyBase58.compareTo(key.keyBase58);

            if (rc != 0)
                return rc;
            else
                rc = type.compareTo(key.type);

            if (rc != 0)
                return rc;
            else
                return controller.compareTo(key.controller);
        }

        protected static PropertyFilter getFilter() {
            return new DIDPropertyFilter() {
                @Override
                protected boolean include(PropertyWriter writer, object pojo, SerializeContext context) {
                    if (context.isNormalized())
                        return true;

                    PublicKey pk = (PublicKey)pojo;
                    switch (writer.getName()) {
                    case TYPE:
                        return !(pk.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE));

                    case CONTROLLER:
                        return !(pk.getController().equals(context.getDid()));

                    default:
                        return true;
                    }
                }
            };
        }
    }

    @JsonSerialize(using = PublicKeyReference.Serializer.class)
    @JsonDeserialize(using = PublicKeyReference.Deserializer.class)
    export class PublicKeyReference implements Comparable<PublicKeyReference> {
        private DIDURL id;
        private PublicKey key;

        protected PublicKeyReference(id: DIDURL) {
            this.id = id;
            this.key = null;
        }

        protected PublicKeyReference(key: PublicKey) {
            this.id = key.getId();
            this.key = key;
        }

        public boolean isVirtual() {
            return key == null;
        }

        public DIDURL getId() {
            return id;
        }

        public PublicKey getPublicKey() {
            return key;
        }

        protected update(key: PublicKey) {
            checkArgument(key != null && key.getId().equals(id));

            this.id = key.getId();
            this.key = key;
        }

        @Override
        public int compareTo(PublicKeyReference ref) {
            if (key != null && ref.key != null)
                return key.compareTo(ref.key);
            else
                return id.compareTo(ref.id);
        }

        static class Serializer extends StdSerializer<PublicKeyReference> {
            private static final long serialVersionUID = -6934608221544406405L;

            public Serializer() {
                this(null);
            }

            public Serializer(Class<PublicKeyReference> t) {
                super(t);
            }

            @Override
            public serialize(PublicKeyReference keyRef, JsonGenerator gen,
                    SerializerProvider provider) {
                gen.writeobject(keyRef.getId());
            }
        }

        static class Deserializer extends StdDeserializer<PublicKeyReference> {
            private static final long serialVersionUID = -4252894239212420927L;

            public Deserializer() {
                this(null);
            }

            public Deserializer(Class<?> t) {
                super(t);
            }

            @Override
            public PublicKeyReference deserialize(JsonParser p, DeserializationContext ctxt) {
                JsonToken token = p.getCurrentToken();
                if (token.equals(JsonToken.VALUE_STRING)) {
                    DIDURL id = p.readValueAs(DIDURL.class);
                    return new PublicKeyReference(id);
                } else if (token.equals(JsonToken.START_OBJECT)) {
                    let key: PublicKey =p.readValueAs(PublicKey.class);
                    return new PublicKeyReference(key);
                } else
                    throw ctxt.weirdStringException(p.getText(),
                            PublicKey.class, "Invalid public key");
            }

        }
    }

    /**
     * A Service may represent any type of service the subject
     * wishes to advertise, including decentralized identity management services
     * for further discovery, authentication, authorization, or interaction.
     */
    @JsonPropertyOrder({ value: [ID, TYPE, SERVICE_ENDPOINT]})
    export class Service implements DIDobject {
        @JsonProperty(ID)
        private id: DIDURL;
        @JsonProperty(TYPE) @JsonClassType({type: () => [String]})
        private type: string;
        @JsonProperty(SERVICE_ENDPOINT) @JsonClassType({type: () => [String]})
        private endpoint: string;
        private properties: Map<String, object>;

        protected Service(id: DIDURL, type: string, endpoint: string,
                properties: Map<String, object>) {
            this.id = id;
            this.type = type;
            this.endpoint = endpoint;

            if (properties && properties.size > 0) {
                this.properties = new Map<String, object>(properties);
                this.properties.delete(ID);
                this.properties.delete(TYPE);
                this.properties.delete(SERVICE_ENDPOINT);
            }
        }

        /**
         * Constructs Service with the given value.
         *
         * @param id the id for Service
         * @param type the type of Service
         * @param endpoint the address of service point
         */
        @JsonCreator
        protected Service(@JsonProperty(value = ID, required = true) id: DIDURL,
                @JsonProperty(value = TYPE, required = true) type: string,
                @JsonProperty(value = SERVICE_ENDPOINT, required = true) endpoint: string) {
            this(id, type, endpoint, null);
        }

        /**
         * Get the service id.
         *
         * @return the identifier
         */
        @Override
        public getId(): DIDURL {
            return id;
        }

        /**
         * Get the service type.
         *
         * @return the type string
         */
        @Override
        public getType(): string {
            return type;
        }

        /**
         * Get service point string.
         *
         * @return the service point string
         */
        public getServiceEndpoint():string {
            return endpoint;
        }

        /**
         * Helper getter method for properties serialization.
         * NOTICE: Should keep the alphabetic serialization order.
         *
         * @return a String to object map include all application defined
         *         properties
         */
        @JsonAnyGetter
        @JsonPropertyOrder(alphabetic = true)
        private getProperties(): Map<String, object> {
            return properties;
        }

        /**
         * Helper setter method for properties deserialization.
         *
         * @param name the property name
         * @param value the property value
         */
        @JsonAnySetter
        private setProperty(name: string, value: object ) {
            if (name.equals(ID) || name.equals(TYPE) || name.equals(SERVICE_ENDPOINT))
                return;

            if (properties == null)
                properties = new TreeMap<String, object>();

            properties.put(name, value);
        }

        public Map<String, object> getProperties() {
            // TODO: make it unmodifiable recursively
             return Collections.unmodifiableMap(properties != null ?
                     properties : Collections.emptyMap());
        }
    }

    /**
     * The Proof represents the proof content of DID Document.
     */
    @JsonPropertyOrder({ TYPE, CREATED, CREATOR, SIGNATURE_VALUE })
    @JsonFilter("didDocumentProofFilter")
    export class Proof implements Comparable<Proof> {
        @JsonProperty(TYPE)
        private type: string;
        @JsonInclude({value: JsonIncludeType.NON_NULL})
        @JsonProperty(CREATED)
        private Date created;
        @JsonInclude({value: JsonIncludeType.NON_NULL})
        @JsonProperty(CREATOR)
        private DIDURL creator;
        @JsonProperty(SIGNATURE_VALUE)
        private signature: string;

        /**
         * Constructs the proof of DIDDocument with the given value.
         *
         * @param type the type of Proof
         * @param created the time to create DIDDocument
         * @param creator the key to sign
         * @param signature the signature string
         */
        @JsonCreator
        protected Proof(@JsonProperty(value = TYPE) type: string,
                @JsonProperty(value = CREATED, required = true) Date created,
                @JsonProperty(value = CREATOR) DIDURL creator,
                @JsonProperty(value = SIGNATURE_VALUE, required = true) signature: string) {
            this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
            this.created = created == null ? null : new Date(created.getTime() / 1000 * 1000);
            this.creator = creator;
            this.signature = signature;
        }

        /**
         * Constructs the proof of DIDDocument with the key id and signature string.
         *
         * @param creator the key to sign
         * @param signature the signature string
         */
        protected Proof(DIDURL creator, signature: string) {
            this(null, Calendar.getInstance(Constants.UTC).getTime(), creator, signature);
        }

        /**
         * Get Proof type.
         *
         * @return the type string
         */
        public String getType() {
            return type;
        }

        /**
         * Get the time to create DIDDocument.
         *
         * @return the time
         */
        public Date getCreated() {
            return created;
        }

        /**
         * Get the key id to sign.
         *
         * @return the key id
         */
        public DIDURL getCreator() {
            return creator;
        }

        /**
         * Get signature string.
         *
         * @return the signature string
         */
        public String getSignature() {
            return signature;
        }

        @Override
        public int compareTo(Proof proof) {
            int rc = (int)(this.created.getTime() - proof.created.getTime());
            if (rc == 0)
                rc = this.creator.compareTo(proof.creator);
            return rc;
        }

        protected static PropertyFilter getFilter() {
            return new DIDPropertyFilter() {
                @Override
                protected boolean include(PropertyWriter writer, object pojo, SerializeContext context) {
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



/*
import { StaticConfiguration } from "./staticconfiguration";
import { Util, Signer, DIDUtil, Cache } from "./core";
import { DIDElement, JSONobject, Service, Subject, Proof, DocumentPublicKey, VerifiableCredential, VerifiablePresentation } from "./domain";
import { DID } from "./did"

export class DIDDocument extends JSONobject {

    public verifiableCredential: VerifiableCredential[];
    public verifiablePresentation: VerifiablePresentation[];
    public service: Service[];
    public proof?: Proof;
    public readonly id: any;
    public readonly publicKey: DocumentPublicKey[];
    public readonly authentication: any;
    public readonly expires: string;
    private didElement: DIDElement;

    public constructor (didElement: DIDElement) {
        super();
        this.id = didElement.did;
        this.publicKey = this.getPublicKeyProperty(didElement);
        this.authentication = [`${didElement.did}#primary`];
        this.expires = this.getExpiration().toISOString().split('.')[0]+"Z";
        this.verifiableCredential = [];
        this.verifiablePresentation = [];
        this.service = [];
    }

    public clone(): DIDDocument {
        let clonedDocument = new DIDDocument(this.didElement);

        if (this.proof) {
            clonedDocument.proof = this.proof;
        }
        if (this.verifiableCredential) {
            clonedDocument.verifiableCredential = this.verifiableCredential;
        }
        if (this.verifiablePresentation) {
            clonedDocument.verifiablePresentation = this.verifiablePresentation;
        }
        if (this.service) {
            clonedDocument.service = this.service;
        }
        return clonedDocument;
    }



    public addVerfiableCredential (vc: VerifiableCredential) {
        if (this.proof)
        {
            console.error("You can't modify this document because is already sealed");
            return;
        }

        if (!this.verifiableCredential) this.verifiableCredential = [];
        this.verifiableCredential.push(vc);
    }

    public addService (service: Service) {
        if (this.proof)
        {
            console.error("You can't modify this document because is already sealed");
            return;
        }
        if (!this.service) this.service = [];

        let serviceIndex = -1;
        this.service.forEach((element, index) => {
            if (element.id.toLowerCase() === service.id.toLowerCase())
            {
              serviceIndex = index
            }
        });

        if (serviceIndex >= 0){
            this.service[serviceIndex] = service
        }
        else {
            this.service.push(service);
        }
    }


    public createVerifiableCredential (didElement: DIDElement, issuer: DID, subjectName: string, subjectTypes: string[], subjectValue: any) {
        let issuanceDate = new Date();
        let vcTypes = subjectTypes
        vcTypes.push(issuer === didElement.did ? "SelfProclaimedCredential" : "VerifiableCredential")

        let subject = new Subject(didElement.did);
        subject.name = subjectName;
        subject.value = subjectValue;
        let vc = new VerifiableCredential(
            didElement.did,
            vcTypes,
            issuer,
            issuanceDate.toISOString().split('.')[0]+"Z",
            this.getExpiration(issuanceDate).toISOString().split('.')[0]+"Z",
            subject);

        this.sign(didElement, vc);

        return vc;
    }

    public createService (didElement, did: DID, type, endpoint) {
        return new Service(`${did}#${type.toLowerCase()}`, type, endpoint);
    }

    public createVerifiableCredentialVP (appDid: DID, userDid: DID, appName: string) {
        let issuanceDate = new Date();
        let vcTypes = ["AppIdCredential"];
        let subject = new Subject(appDid.did);
        subject.appDid = appName;
        subject.appInstanceDid = appDid.did;

        let vc = new VerifiableCredential(
            `${appDid.did}#app-id-credential`,
            vcTypes,
            userDid.did,
            issuanceDate.toISOString().split('.')[0]+"Z",
            this.getExpiration(issuanceDate).toISOString().split('.')[0]+"Z",
            subject);

        this.sign(userDid, vc);

        return vc
    }

    public createVerifiablePresentation (didElement: DIDElement, type: String, verifiableCredential: VerifiableCredential, realm: string, nonce: string) {
        let createDate = new Date();
        let vp = new VerifiablePresentation(type, createDate.toISOString().split('.')[0]+"Z", [verifiableCredential]);

        this.signVp(didElement, vp, realm, nonce);

        return vp;
    }

    public sealDocument (didElement: DIDElement) {
        if (this.proof)
        {
            console.error("You can't modify this document because is already sealed");
            return;
        }

        let proof = new Proof("ECDSAsecp256r1");
        proof.created = new Date().toISOString().split('.')[0]+"Z";
        proof.creator = `${didElement.did}#primary`;

        let dataToSign = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase();
        let signature = Signer.signData(dataToSign, didElement.privateKey);
        proof.signatureValue = signature;
        this.proof = proof;
    }

    public isValid (diddocument, didElement) {

        let document = JSON.parse(JSON.stringify(diddocument));
        delete document.proof;
        let dataToValidate = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase();

        return Signer.verifyData(dataToValidate, diddocument["proof"]["signatureValue"], didElement.publicKey);
    }

    public async getMostRecentDIDDocument (did, options: Map<string, any> = new Map()) {
        let elastosRPCHost = StaticConfiguration.ELASTOS_RPC_ADDRESS.mainchain;
        let useCache =  true;

        if (options && "elastosRPCHost" in options) elastosRPCHost = options["elastosRPCHost"];
        if (options && "useCache" in options) useCache = options["useCache"];
        if (!did) throw new Error("Invalid DID");

        let searchDid = did.replace("did:elastos:", "");

        if (useCache){
            let found = this.searchDIDDocumentOnCache(searchDid);
            if (found) return found;
        }


        let document = await this.searchDIDDocumentOnBlockchain(searchDid, elastosRPCHost);
        if (!document) return undefined;
        if (useCache) this.setDIDDocumentOnCache(searchDid, document);

        return document;
    }

    private sign (didElement, document) {
        let proof = new Proof("ECDSAsecp256r1");
        proof.verificationMethod = `${didElement.did}#primary`;

        let dataToSign = Buffer.from(JSON.stringify(document, null, ""), "utf8").toString("hex").toUpperCase()
        let signature = Signer.signData(dataToSign, didElement.privateKey);
        proof.signature = signature;
        document.proof = proof;
    }

    private signVp (didElement, document, realm, nonce) {
        let proof = new Proof("ECDSAsecp256r1");
        proof.verificationMethod = `${didElement.did}#primary`;
        proof.realm = realm;
        proof.nonce = nonce;

        let json = JSON.stringify(document, null, "");

        let dataToSign = Buffer.from(json + realm + nonce, "utf8").toString("hex").toUpperCase()
        let signature = Signer.signData(dataToSign, didElement.privateKey);
        proof.signature = signature;
        document.proof = proof;
    }

    private getExpiration (date: Date = new Date(), yearsToAdd: number = 5) {
        let newDate: Date = new Date(date.getTime());
        newDate.setFullYear(date.getFullYear() + yearsToAdd)

        return newDate;
    }

    private getPublicKeyProperty (didElement) {
        return [new DocumentPublicKey(
            `${didElement.did}#primary`,
            "ECDSAsecp256r1",
            didElement.did,
            didElement.publicKeyBase58)];
    }

    private setDIDDocumentOnCache (did, diddocument) {
        console.log("Enter on setDIDDocumentOnCache", did, diddocument);
        let storage = window.localStorage; //?? localStorage
        let cache = storage.key["elastos_cache"];
        if (!cache){
            cache = {};
        }

        this.clearExpiredCacheItems(cache);

        cache[did] = {
            "expiration": Util.getTimestamp() + (5 * 60),  //Five minutes cache
            "document": diddocument
        }

        console.log("store cache", cache);
        storage.setItem("elastos_cache", JSON.stringify(cache));
    }

    private clearExpiredCacheItems (cache) {
        var keys = object.keys(cache);
        let timestamp = Util.getTimestamp();
        for (var i = 0; i < keys.length; i++) {
            if (timestamp > keys[i]["expiration"]) delete keys[i];
        }
    }

    private async searchDIDDocumentOnBlockchain (did, rpcHost) {

        let responseJson = await DIDUtil.rpcResolveDID(did, rpcHost);

        if (!responseJson ||
            !responseJson["result"] ||
            !responseJson["result"]["transaction"]) return undefined;

        let lastTransaction = responseJson["result"]["transaction"][0];
        let payload = atob(lastTransaction["operation"]["payload"]);
        return JSON.parse(payload);
    }

    private searchDIDDocumentOnCache (did) {
        let storage = window.localStorage; //?? localStorage
        let cache = storage.getItem("elastos_cache");
        if (!cache) return undefined;
        let jsonCache = JSON.parse(cache);
        let cacheItem = jsonCache[did];
        if (!cacheItem) return undefined;

        let timestamp = Util.getTimestamp();

        if (timestamp > cacheItem["expiration"]) return undefined;

        return cacheItem["document"];
    }
}
*>


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
    protected const static ID: string = "id";
    protected const static PUBLICKEY: string = "publicKey";
    protected const static TYPE: string = "type";
    protected const static CONTROLLER: string = "controller";
    protected const static MULTI_SIGNATURE: string = "multisig";
    protected const static PUBLICKEY_BASE58: string = "publicKeyBase58";
    protected const static AUTHENTICATION: string = "authentication";
    protected const static AUTHORIZATION: string = "authorization";
    protected const static SERVICE: string = "service";
    protected const static VERIFIABLE_CREDENTIAL: string = "verifiableCredential";
    protected const static SERVICE_ENDPOINT: string = "serviceEndpoint";
    protected const static EXPIRES: string = "expires";
    protected const static PROOF: string = "proof";
    protected const static CREATOR: string = "creator";
    protected const static CREATED: string = "created";
    protected const static SIGNATURE_VALUE: string = "signatureValue";

    private id: DID;

    @JsonProperty({value: DIDDocument.CONTROLLER})
    // TODO: Convert from java - @JsonFormat(with:{JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED} )
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private controllers: DID[];

    @JsonProperty({value: DIDDocument.MULTI_SIGNATURE})
    @JsonInclude({value: JsonIncludeType.NON_NULL})
    private multisig: DIDDocument.MultiSignature;

    @JsonProperty({value: DIDDocument.PUBLICKEY})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private _publickeys: DIDDocument.PublicKey[];

    @JsonProperty({value: DIDDocument.AUTHENTICATION})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private _authentications: DIDDocument.PublicKeyReference[];

    @JsonProperty({value: DIDDocument.AUTHORIZATION})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private _authorizations: DIDDocument.PublicKeyReference[];

    @JsonProperty({value: DIDDocument.VERIFIABLE_CREDENTIAL})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private _credentials: VerifiableCredential[];

    @JsonProperty({value: DIDDocument.SERVICE})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private _services: DIDDocument.Service[];

    @JsonProperty({value: DIDDocument.EXPIRES})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    private expires: Date;

    @JsonProperty({value: DIDDocument.PROOF})
    @JsonInclude({value: JsonIncludeType.NON_EMPTY})
    // TODO - Convert from Java - @JsonFormat(with = {JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY,JsonFormat.Feature.WRITE_SINGLE_ELEM_ARRAYS_UNWRAPPED})
    private _proofs: DIDDocument.Proof[];

    private controllerDocs: Map<DID, DIDDocument>;
    private publicKeys: Map<DIDURL, PublicKey>;
    private credentials: Map<DIDURL, VerifiableCredential>;
    private services: Map<DIDURL, Service>;
    private proofs: HashMap<DID, Proof>;

    private effectiveController: DID;
    public defaultPublicKey: PublicKey;

    private metadata: DIDMetadata;

    /**
     * Set the DIDDocument subject.
     *
     * @param subject the owner of DIDDocument
     */
    @JsonCreator
    public constructor(@JsonProperty({value: ID, required: true}) subject: DID) {
        this.subject = subject;
    }

    /**
     * Copy constructor.
     *
     * @param doc the document be copied
     */
    private constructor(doc: DIDDocument, withProof: boolean) {
        this.subject = doc.subject;
        this.controllers = doc.controllers;
        this.controllerDocs = doc.controllerDocs;
        this.effectiveController = doc.effectiveController;
        this.multisig = doc.multisig;
        this.publicKeys = doc.publicKeys;
        this._publickeys = doc._publickeys;
        this._authentications = doc._authentications;
        this._authorizations = doc._authorizations;
        this.defaultPublicKey = doc.defaultPublicKey;
        this.credentials = doc.credentials;
        this._credentials = doc._credentials;
        this.services = doc.services;
        this._services = doc._services;
        this.expires = doc.expires;
        if (withProof) {
            this.proofs = doc.proofs;
            this._proofs = doc._proofs;
        }
        this.metadata = doc.metadata;
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

            return new DIDURL(this.getSubject(), id);
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
    public getControllers(): DID[] {
        return Collections.unmodifiableList(this.controllers);
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
    protected getController(): DID {
        return this.controllers.length == 1 ? this.controllers[0] : null;
    }

    /**
     * Check if current DID has controller, or has specific controller
     *
     * @return true if has, otherwise false
     */
     public hasController(did: DID = null): boolean {
        if (did)
            return this.controllers.contains(did);
        else
            return this.controllers.length != 0;
    }

    /**
     * Get controller's DID document.
     *
     * @return the DIDDocument object or null if no controller
     */
    protected getControllerDocument(did: DID): DIDDocument {
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

    public getMultiSignature(): MultiSignature {
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
    public getPublicKeys(): ImmutableList<PublicKey> {
        let pks = new ArrayList<PublicKey>(this.publicKeys.values());

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.addAll(doc.getAuthenticationKeys());
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
    public selectPublicKeys(id: DIDURL | string, type: string): ImmutableList<PublicKey> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks: PublicKey[] = [];
        for (let pk of this.publicKeys.values()) {
            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && !pk.getType().equals(type))
                continue;

            pks.push(pk);
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(doc.selectAuthenticationKeys(id, type));
        }

        return ImmutableList(pks);

    }

    /**
     * Get public key matched specified key id.
     *
     * @param id the key id
     * @return the PublicKey object
     */
    public getPublicKey(id: DIDURL | string): PublicKey {
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
    public hasPrivateKey(id: DIDURL): boolean {
        checkArgument(id != null, "Invalid publicKey id");

        if (this.hasPublicKey(id) && this.getMetadata().attachedStore())
            return this.getMetadata().getStore().containsPrivateKey(id);
        else
            return false;
    }

    /**
     * Check if the specified private key exists.
     *
     * @param id the key id string
     * @return the key exists or not
     * @throws DIDStoreException there is no store
     */
    public hasPrivateKey(id: string): boolean {
        return this.hasPrivateKey(this.canonicalId(id));
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
    public getDefaultPublicKey(): PublicKey {
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
    public getKeyPair(id: DIDURL): KeyPair {
        let pk: PublicKey;

        if (id == null) {
            pk = this.getDefaultPublicKey();
            if (pk == null)
                throw new NoEffectiveControllerException(this.getSubject().toString());
        } else {
            pk = this.getPublicKey(id);
            if (pk == null)
                throw new InvalidKeyException(id.toString());
        }

        let key = HDKey.deserialize(HDKey.paddingToExtendedPublicKey(
                pk.getPublicKeyBytes()));

        return key.getJCEKeyPair();
    }

    /**
     * Get KeyPair object according to the given key id.
     *
     * @param id the key id string
     * @return the KeyPair object
     * @throws InvalidKeyException there is no matched key
     */
    public getKeyPair(id: string): KeyPair {
        return this.getKeyPair(this.canonicalId(id));
    }

    /**
     * Get KeyPair object according to the given key id.
     *
     * @return the KeyPair object
     * @throws InvalidKeyException there is no the matched key
     */
    public getKeyPair(): KeyPair {
        return this.getKeyPair(null as DIDURL);
    }

    private getKeyPair(id: DIDURL, storepass: string): KeyPair {
        checkArgument(storepass != null && storepass !== "", "Invalid storepass");
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

        return key.derive(index).serializeBase58();
    }

    /*private mapToDerivePath(identifier: string, securityCode: number): string {
        byte digest[] = new byte[32];
        SHA256Digest sha256 = new SHA256Digest();
        byte[] in = identifier.getBytes();
        sha256.update(in, 0, in.length);
        sha256.doFinal(digest, 0);

        StringBuffer path = new StringBuffer(128);
        ByteBuffer bb = ByteBuffer.wrap(digest);
        while (bb.hasRemaining()) {
            int idx = bb.getInt();
            if (idx >= 0)
                path.append(idx);
            else
                path.append(idx & 0x7FFFFFFF).append('H');

            path.append('/');
        }

        if (securityCode >= 0)
            path.append(securityCode);
        else
            path.append(securityCode & 0x7FFFFFFF).append('H');

        return path.toString();
    }*/

    /**
     * Derive the extended private key according to identifier string and security code.
     *
     * @param identifier the identifier string
     * @param securityCode the security code
     * @param storepass the password for DID store
     * @return the extended derived private key
     * @throws DIDStoreException there is no DID store to get root private key
     */
    public derive(identifier: string, securityCode: number, storepass: string): string {
        checkArgument(identifier != null && !identifier.isEmpty(), "Invalid identifier");
        this.checkAttachedStore();
        this.checkIsPrimitive();

        let key = HDKey.deserialize(this.getMetadata().getStore().loadPrivateKey(
                this.getDefaultPublicKeyId(), storepass));

        let path = mapToDerivePath(identifier, securityCode);
        return key.derive(path).serializeBase58();
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
    public getAuthenticationKeys(): ImmutableList<PublicKey> {
        let pks: PublicKey[] = [];

        for (let pk of this.publicKeys.values()) {
            if (pk.isAuthenticationKey())
                pks.push(pk);
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.push(doc.getAuthenticationKeys());
        }

        return ImmutableList(pks);
    }

    /**
     * Select the authentication key matched the key id or the type.
     *
     * @param id the key id
     * @param type the type of key
     * @return the matched authentication key array
     */
    public selectAuthenticationKeys(id: DIDURL, type: string): PublicKey[] {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks = new ArrayList<PublicKey>();
        for (let pk of this.publicKeys.values()) {
            if (!pk.isAuthenticationKey())
                continue;

            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && !pk.getType().equals(type))
                continue;

            pks.add(pk);
        }

        if (this.hasController()) {
            for (let doc of this.controllerDocs.values())
                pks.addAll(doc.selectAuthenticationKeys(id, type));
        }

        return Collections.unmodifiableList(pks);
    }

    /**
     * Select authentication key array matched the key id or the type
     *
     * @param id the key id string
     * @param type the type of key
     * @return the matched authentication key array
     */
    public selectAuthenticationKeys(id: string, type: string): PublicKey[] {
        return this.selectAuthenticationKeys(this.canonicalId(id), type);
    }

    /**
     * Get authentication key with specified key id.
     *
     * @param id the key id
     * @return the matched authentication key object
     */
    public getAuthenticationKey(id: DIDURL): PublicKey {
        let pk = this.getPublicKey(id);
        return (pk != null && pk.isAuthenticationKey()) ? pk : null;
    }

    /**
     * Get authentication key with specified key id.
     *
     * @param id the key id string
     * @return the matched authentication key object
     */
    public getAuthenticationKey(id: string): PublicKey {
        return this.getAuthenticationKey(this.canonicalId(id));
    }

    /**
     * Judge whether the given key is authentication key or not.
     *
     * @param id the key id
     * @return the returned value is true if the key is an authentication key;
     *         the returned value is false if the key is not an authentication key.
     */
    public isAuthenticationKey(id: DIDURL): boolean {
        return this.getAuthenticationKey(id) != null;
    }

    /**
     * Judge whether the given key is authentication key or not.
     *
     * @param id the key id string
     * @return the returned value is true if the key is an authentication key;
     *         the returned value is false if the key is not an authentication key.
     */
    public isAuthenticationKey(id: string): boolean {
        return this.isAuthenticationKey(this.canonicalId(id));
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
    public getAuthorizationKeys(): PublicKey[] {
        let pks = new ArrayList<PublicKey>();

        for (let pk of this.publicKeys.values()) {
            if (pk.isAuthorizationKey())
                pks.add(pk);
        }

        return Collections.unmodifiableList(pks);
    }

    /**
     * Select the authorization key array matched the key id or the type.
     *
     * @param id the key id
     * @param type the type of key
     * @return the matched authorization key array
     */
    public selectAuthorizationKeys(id: DIDURL, type: string): PublicKey[] {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let pks = new ArrayList<PublicKey>();
        for (let pk of this.publicKeys.values()) {
            if (!pk.isAuthorizationKey())
                continue;

            if (id != null && !pk.getId().equals(id))
                continue;

            if (type != null && !pk.getType().equals(type))
                continue;

            pks.add(pk);
        }

        return Collections.unmodifiableList(pks);
    }

    /**
     * Select the authorization key array matched the key id or the type.
     *
     * @param id the key id string
     * @param type the type of key
     * @return the matched authorization key array
     */
    public selectAuthorizationKeys(id: string, type: string): PublicKey[] {
        return this.selectAuthorizationKeys(this.canonicalId(id), type);
    }

    /**
     * Get authorization key matched the given key id.
     *
     * @param id the key id
     * @return the authorization key object
     */
    public getAuthorizationKey(id: DIDURL): PublicKey {
        let pk = this.getPublicKey(id);
        return pk != null && pk.isAuthorizationKey() ? pk : null;
    }

    /**
     * Get authorization key matched the given key id.
     *
     * @param id the key id string
     * @return the authorization key object
     */
    public getAuthorizationKey(id: string): PublicKey {
        return this.getAuthorizationKey(this.canonicalId(id));
    }

    /**
     * Judge whether the public key matched the given key id is an authorization key.
     *
     * @param id the key id
     * @return the returned value is true if the matched key is an authorization key;
     *         the returned value is false if the matched key is not an authorization key.
     */
    public isAuthorizationKey(id: DIDURL): boolean {
        return this.getAuthorizationKey(id) != null;
    }

    /**
     * Judge whether the public key matched the given key id is an authorization key.
     *
     * @param id the key id string
     * @return the returned value is true if the matched key is an authorization key;
     *         the returned value is false if the matched key is not an authorization key.
     */
    public isAuthorizationKey(id: string): boolean {
        return this.isAuthorizationKey(this.canonicalId(id));
    }

    /**
     * Get the count of Credential array.
     *
     * @return the count
     */
    public getCredentialCount(): number {
        return this.credentials.size();
    }

    /**
     * Get the Credential array.
     *
     * @return the Credential array
     */
    public getCredentials(): ImmutableList<VerifiableCredential> {
        return Collections.unmodifiableList(this._credentials);
    }

    /**
     * Select the Credential array matched the given credential id or the type.
     *
     * @param id the credential id
     * @param type the type of credential
     * @return the matched Credential array
     */
    public selectCredentials(id: DIDURL, type: string): ImmutableList<VerifiableCredential> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let vcs = new ArrayList<VerifiableCredential>();
        for (let vc of this.credentials.values()) {
            if (id != null && !vc.getId().equals(id))
                continue;

            if (type != null && !vc.getType().contains(type))
                continue;

            vcs.add(vc);
        }

        return Collections.unmodifiableList(vcs);
    }

    /**
     * Select the Credential array matched the given credential id or the type.
     *
     * @param id the credential id string
     * @param type the type of credential
     * @return the matched Credential array
     */
    public selectCredentials(id: string, type: string): ImmutableList<VerifiableCredential> {
        return this.selectCredentials(this.canonicalId(id), type);
    }

    /**
     * Get the Credential matched the given credential id.
     *
     * @param id the credential id
     * @return the matched Credential object
     */
    public getCredential(id: DIDURL): VerifiableCredential {
        checkArgument(id != null, "Invalid Credential id");

        return this.credentials.get(this.canonicalId(id));
    }

    /**
     * Get the Credential matched the given credential id.
     *
     * @param id the credential id string
     * @return the matched Credential object
     */
    public getCredential(id: string): VerifiableCredential {
        return this.getCredential(this.canonicalId(id));
    }

    /**
     * Get the count of Service array.
     *
     * @return the count
     */
    public getServiceCount(): number {
        return this.services.size();
    }

    /**
     * Get the Service array.
     *
     * @return the Service array
     */
    public getServices(): ImmutableList<Service> {
        return Collections.unmodifiableList(this._services);
    }

    /**
     * Select Service array matched the given service id or the type.
     *
     * @param id the service id
     * @param type the type of service
     * @return the matched Service array
     */
    public selectServices(id: DIDURL, type: string): ImmutableList<Service> {
        checkArgument(id != null || type != null, "Invalid select args");

        id = this.canonicalId(id);

        let svcs = new ArrayList<Service>();
        for (let svc of this.services.values()) {
            if (id != null && !svc.getId().equals(id))
                continue;

            if (type != null && !svc.getType().equals(type))
                continue;

            svcs.add(svc);
        };

        return Collections.unmodifiableList(svcs);
    }

    /**
     * Select the Service array matched the given service id or the type.
     *
     * @param id the service id string
     * @param type the type of service
     * @return the matched Service array
     */
    public selectServices(id: string, type: string): ImmutableList<Service> {
        return this.selectServices(this.canonicalId(id), type);
    }

    /**
     * Get the Service matched the given service id.
     *
     * @param id the service id
     * @return the matched Service object
     */
    public getService(id: DIDURL): Service {
        checkArgument(id != null, "Invalid service id");
        return this.services.get(this.canonicalId(id));
    }

    /**
     * Get the Service matched the given service id.
     *
     * @param id the service id string
     * @return the matched Service object
     */
    public getService(id: string): Service {
        return this.getService(this.canonicalId(id));
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
     public /*protected*/ getProof(): Proof {
        return this._proofs.get(0);
    }

    /**
     * Get all Proof objects.
     *
     * @return list of the Proof objects
     */
    public getProofs(): ImmutableList<Proof> {
        return Collections.unmodifiableList(this._proofs);
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
        if (this.controllers == null || this.controllers.isEmpty()) {
            this.controllers = Collections.emptyList();
            this.controllerDocs = Collections.emptyMap();

            if (this.multisig != null)
                throw new MalformedDocumentException("Invalid multisig property");

            return;
        }

        this.controllerDocs = new HashMap<DID, DIDDocument>();
        try {
            for (let did of this.controllers) {
                let  doc = did.resolve();
                if (doc == null)
                    throw new MalformedDocumentException("Can not resolve controller: " + did);

                    this.controllerDocs.set(did, doc);
            }
        } catch (e) {
            // DIDResolveException
            throw new  MalformedDocumentException("Can not resolve the controller's DID");
        }

        if (this.controllers.size() == 1) {
            if (this.multisig != null)
                throw new MalformedDocumentException("Invalid multisig property");
        } else {
            if (this.multisig == null)
                throw new MalformedDocumentException("Missing multisig property");

            if (this.multisig.n() != this.controllers.size())
                throw new MalformedDocumentException("Invalid multisig property");
        }

        Collections.sort(this.controllers);

        if (this.controllers.size() == 1)
            this.effectiveController = this.controllers.get(0);
    }

    private sanitizePublickKey() {
        let pks = new TreeMap<DIDURL, PublicKey>();

        if (this._publickeys != null && this._publickeys.size() > 0) {
            for (let pk of this._publickeys) {
                if (pk.getId().getDid() == null) {
                    pk.getId().setDid(this.getSubject());
                } else {
                    if (!pk.getId().getDid().equals(this.getSubject()))
                        throw new MalformedDocumentException("Invalid public key id: " + pk.getId());
                }

                if (pks.containsKey(pk.getId()))
                    throw new MalformedDocumentException("Public key already exists: " + pk.getId());

                if (pk.getPublicKeyBase58().isEmpty())
                    throw new MalformedDocumentException("Invalid public key base58 value.");

                if (pk.getType() == null)
                    pk.type = Constants.DEFAULT_PUBLICKEY_TYPE;

                if (pk.getController() == null)
                    pk.controller = this.getSubject();

                pks.put(pk.getId(), pk);
            }
        }

        if (this._authentications != null && this._authentications.size() > 0) {
            let pk: PublicKey;

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

                    if (pks.containsKey(pk.getId()))
                        throw new MalformedDocumentException("Public key already exists: " + pk.getId());

                    if (pk.getPublicKeyBase58().isEmpty())
                        throw new MalformedDocumentException("Invalid public key base58 value.");

                    if (pk.getType() == null)
                        pk.type = Constants.DEFAULT_PUBLICKEY_TYPE;

                    if (pk.getController() == null)
                        pk.controller = this.getSubject();

                    pks.put(pk.getId(), pk);
                }

                pk.setAuthenticationKey(true);
            }

            Collections.sort(this._authentications);
        } else {
            this._authentications = Collections.emptyList();
        }

        if (this._authorizations != null && this._authorizations.size() > 0) {
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

                    if (pks.containsKey(pk.getId()))
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

                    pks.put(pk.getId(), pk);
                }

                pk.setAuthorizationKey(true);
            }

            Collections.sort(this._authorizations);
        } else {
            this._authorizations = Collections.emptyList();
        }

        // for customized DID with controller, could be no public keys
        if (pks.size() > 0) {
            this.publicKeys = pks;
            this._publickeys = new ArrayList<PublicKey>(pks.values());
        } else {
            this.publicKeys = Collections.emptyMap();
            this._publickeys = Collections.emptyList();
        }

        // Find default key
        for (let pk of this.publicKeys.values()) {
            if (pk.getController().equals(this.getSubject())) {
                let address = HDKey.toAddress(pk.getPublicKeyBytes());
                if (address.equals(this.getSubject().getMethodSpecificId())) {
                    this.defaultPublicKey = pk;
                    if (!pk.isAuthenticationKey()) {
                        pk.setAuthenticationKey(true);
                        if (this._authentications.isEmpty()) {
                            this._authentications = new ArrayList<PublicKeyReference>();
                            this._authentications.add(new PublicKeyReference(pk));
                        } else {
                            this._authentications.add(new PublicKeyReference(pk));
                            Collections.sort(this._authentications);
                        }
                    }

                    break;
                }
            }
        }

        if (this.controllers.isEmpty() && this.defaultPublicKey == null)
            throw new MalformedDocumentException("Missing default public key.");
    }

    private sanitizeCredential() {
        if (this._credentials == null || this._credentials.isEmpty()) {
            this._credentials = Collections.emptyList();
            this.credentials = Collections.emptyMap();
            return;
        }

        let vcs = new TreeMap<DIDURL, VerifiableCredential>();
        for (let vc of this._credentials) {
            if (vc.getId() == null)
                throw new MalformedDocumentException("Missing credential id.");

            if (vc.getId().getDid() == null) {
                vc.getId().setDid(this.getSubject());
            } else {
                if (!vc.getId().getDid().equals(this.getSubject()))
                    throw new MalformedDocumentException("Invalid crdential id: " + vc.getId());
            }

            if (vcs.containsKey(vc.getId()))
                throw new MalformedDocumentException("Credential already exists: " + vc.getId());

            if (vc.getSubject().getId() == null)
                vc.getSubject().setId(this.getSubject());

            try {
                vc.sanitize();
            } catch (e) {
                // DIDSyntaxException
                throw new MalformedDocumentException("Invalid credential: " + vc.getId(), e);
            }

            vcs.put(vc.getId(), vc);
        }

        this.credentials = vcs;
        this._credentials = new ArrayList<VerifiableCredential>(this.credentials.values());
    }

    private sanitizeService() {
        if (this._services == null || this._services.isEmpty()) {
            this._services = Collections.emptyList();
            this.services = Collections.emptyMap();
            return;
        }

        let svcs = new TreeMap<DIDURL, Service>();
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

            if (svcs.containsKey(svc.getId()))
                throw new MalformedDocumentException("Service already exists: " + svc.getId());

            svcs.put(svc.getId(), svc);
        }

        this.services = svcs;
        this._services = new ArrayList<Service>(svcs.values());
    }

    private sanitizeProof() {
        if (_proofs == null || _proofs.isEmpty())
            throw new MalformedDocumentException("Missing document proof");

        this.proofs = new HashMap<DID, Proof>();

        for (let proof of _proofs) {
            if (proof.getCreator() == null) {
                if (defaultPublicKey != null)
                    proof.creator = defaultPublicKey.getId();
                else if (controllers.size() == 1)
                    proof.creator = controllerDocs.get(controllers.get(0)).getDefaultPublicKeyId();
                else
                    throw new MalformedDocumentException("Missing creator key");
            } else {
                if (proof.getCreator().getDid() == null) {
                    if (defaultPublicKey != null)
                        proof.getCreator().setDid(this.getSubject());
                    else if (controllers.size() == 1)
                        proof.getCreator().setDid(controllers.get(0));
                    else
                        throw new MalformedDocumentException("Invalid creator key");
                }
            }

            if (proofs.containsKey(proof.getCreator().getDid()))
                throw new MalformedDocumentException("Aleady exist proof from " + proof.getCreator().getDid());

            proofs.put(proof.getCreator().getDid(), proof);
        }

        this._proofs = new ArrayList<Proof>(proofs.values());
        Collections.sort(this._proofs);
    }

    /**
     * Set DID Metadata object for did document.
     *
     * @param metadata the DIDMetadataImpl object
     */
     public /*protected*/ setMetadata(metadata: DIDMetadata) {
        this.metadata = metadata;
        subject.setMetadata(metadata);
    }

    /**
     * Get DID Metadata object from did document.
     *
     * @return the DIDMetadata object
     */
    public getMetadata(): DIDMetadata {
        if (metadata == null) {
            metadata = new DIDMetadata(this.getSubject());
        }

        return metadata;
    }

    public /*protected*/ getStore(): DIDStore {
        return this.getMetadata().getStore();
    }

    /**
     * Judge whether the did document is expired or not.
     *
     * @return the returned value is true if the did document is expired;
     *         the returned value is false if the did document is not expired.
     */
    public isExpired(): boolean {
        /* TODO Calendar now = Calendar.getInstance(Constants.UTC);

        Calendar expireDate  = Calendar.getInstance(Constants.UTC);
        expireDate.setTime(expires);

        return now.after(expireDate);*/
    }

    /**
     * Judge whether the did document is tampered or not.
     *
     * @return the returned value is true if the did document is genuine;
     *         the returned value is false if the did document is not genuine.
     */
    public isGenuine(): boolean {
        // Proofs count should match with multisig
        let expectedProofs = multisig == null ? 1 : multisig.m();
        if (proofs.size() != expectedProofs)
            return false;

        let doc = new DIDDocument(this, false);
        let json = doc.serialize(true);
        let digest = EcdsaSigner.sha256Digest(json.getBytes());

        // Document should signed(only) by default public key.
        if (!isCustomizedDid()) {
            let proof = this.getProof();

            // Unsupported public key type;
            if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
                return false;

            if (!proof.getCreator().equals(getDefaultPublicKeyId()))
                return false;

            return verifyDigest(proof.getCreator(), proof.getSignature(), digest);
        } else {
            for (let proof of _proofs) {
                // Unsupported public key type;
                if (!proof.getType().equals(Constants.DEFAULT_PUBLICKEY_TYPE))
                    return false;

                let controllerDoc = getControllerDocument(proof.getCreator().getDid());
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
        if (_proofs == null || _proofs.isEmpty())
            return false;

        return _proofs.size() == (multisig == null ? 1 : multisig.m());
    }

    /**
     * Judge whether the did document is valid or not.
     *
     * @return the returned value is true if the did document is valid;
     *         the returned value is false if the did document is not valid.
     */
    public isValid(): boolean {
        if (isDeactivated() || isExpired() || !isGenuine())
            return false;

        if (hasController()) {
            for (let doc of controllerDocs.values()) {
                if (doc.isDeactivated() || !doc.isGenuine())
                    return false;
            }
        }

        return true;
    }

    private copy(): DIDDocument {
        let doc = new DIDDocument(subject);

        doc.controllers = new ArrayList<DID>(controllers);
        doc.controllerDocs = new HashMap<DID, DIDDocument>(controllerDocs);
        if (this.multisig != null)
            doc.multisig = new MultiSignature(this.multisig);
        doc.publicKeys = new TreeMap<DIDURL, PublicKey>(publicKeys);
        doc.defaultPublicKey = this.defaultPublicKey;
        doc.credentials = new TreeMap<DIDURL, VerifiableCredential>(credentials);
        doc.services = new TreeMap<DIDURL, Service>(services);
        doc.expires = expires;
        doc.proofs = new HashMap<DID, Proof>(proofs);

        metadata: DIDMetadata = getMetadata().clone();
        doc.setMetadata(metadata);

        return doc;
    }

    /**
     * Get DID Document Builder object.
     *
     * @return the Builder object
     * @throws DIDStoreException
     */
    public edit(): Builder {
        if (!isCustomizedDid()) {
            checkAttachedStore();

            return new Builder(this);
        } else {
            if (getEffectiveController() == null)
                throw new NoEffectiveControllerException();

            return edit(getEffectiveControllerDocument());
        }

    }

    public edit(controller: DIDDocument): Builder {
        checkIsCustomized();

        if (!getMetadata().attachedStore() && ! controller.getMetadata().attachedStore())
            throw new NotAttachedWithStoreException();

        if (!controller.getMetadata().attachedStore())
            controller.getMetadata().attachStore(getMetadata().getStore());

        if (!hasController(controller.getSubject()))
            throw new NotControllerException(controller.getSubject().toString());

        return new Builder(this, controller);
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
    public sign(id: DIDURL, storepass: string, ...data: string[]): string {
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkArgument(data != null && data.length > 0, "Invalid input data");
        checkAttachedStore();

        let digest = EcdsaSigner.sha256Digest(data);
        return signDigest(id, storepass, digest);
    }

    /**
     * Sign the data by the specified key.
     *
     * @param id the key id string
     * @param storepass the password for DIDStore
     * @param data the data be signed
     * @return the signature string
     * @throws InvalidKeyException if the sign key is invalid
     * @throws DIDStoreException there is no DIDStore to get private key.
     */
    public sign(id: string, storepass: string, ...data: string): string {
        return sign(canonicalId(id), storepass, data);
    }

    /**
     * Sign the data by the default key.
     *
     * @param storepass the password for DIDStore
     * @param data the data be signed
     * @return the signature string
     * @throws DIDStoreException there is no DIDStore to get private key.
     */
    public sign(storepass: string, ...data: string): string {
        return sign(null as DIDURL, storepass, data);
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
    public signDigest(id: DIDURL, storepass: string, digest: string): string {
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkArgument(digest != null && digest.length > 0, "Invalid digest");
        checkAttachedStore();

        let pk = id != null ? getPublicKey(id) : getDefaultPublicKey();
        if (pk == null) {
            if (id != null)
                throw new InvalidKeyException(id.toString());
            else
                throw new NoEffectiveControllerException(this.getSubject().toString());
        }

        return getMetadata().getStore().sign(pk.getId(), storepass, digest);
    }

    /**
     * Sign the digest data by the specified key.
     *
     * @param id the key id string
     * @param storepass the password for DIDStore
     * @param digest the digest data to be signed
     * @return the signature string
     * @throws InvalidKeyException if the sign key is invalid
     * @throws DIDStoreException there is no DIDStore to get private key.
     */
    public signDigest(id: string, storepass: string, digest: string): string {
        return signDigest(canonicalId(id), storepass, digest);
    }

    /**
     * Sign the digest data by the default key.
     *
     * @param storepass the password for DIDStore
     * @param digest the digest data to be signed
     * @return the signature string
     * @throws DIDStoreException there is no DIDStore to get private key.
     */
    public signDigest(storepass: string, digest: string): string {
        return signDigest(null as DIDURL, storepass, digest);
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
    public verify(id: DIDURL, signature: string, ...data: string): boolean {
        checkArgument(signature != null && !signature.isEmpty(), "Invalid signature");
        checkArgument(data != null && data.length > 0, "Invalid digest");

        let digest = EcdsaSigner.sha256Digest(data);
        return verifyDigest(id, signature, digest);
    }

    /**
     * Verify the signature string by data and the sign key.
     *
     * @param id the key id string
     * @param signature the signature string
     * @param data the data to be signed
     * @return the returned value is true if verifing data is successfully;
     *         the returned value is false if verifing data is not successfully.
     */
    public verify(id: string, signature: string, ...data: string): boolean {
        return verify(canonicalId(id), signature, data);
    }

    /**
     * Verify the signature string by data and the default key.
     *
     * @param signature the signature string
     * @param data the data to be signed
     * @return the returned value is true if verifing data is successfully;
     *         the returned value is false if verifing data is not successfully.
     */
    public verify(signature: string, ...data: string): boolean {
        return verify(null as DIDURL, signature, data);
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
    public verifyDigest(id: DIDURL, signature: string, digest: string): boolean {
        checkArgument(signature != null && !signature.isEmpty(), "Invalid signature");
        checkArgument(digest != null && digest.length > 0, "Invalid digest");

        let pk = id != null ? getPublicKey(id) : getDefaultPublicKey();
        if (pk == null) {
            if (id != null)
                throw new InvalidKeyException(id.toString());
            else
                throw new InvalidKeyException("No explicit publicKey");
        }

        let binkey = pk.getPublicKeyBytes();
        let sig = Base64.decode(signature, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);

        return EcdsaSigner.verify(binkey, sig, digest);
    }

    /**
     * Verify the digest by the specified key.
     *
     * @param id the key id string
     * @param signature the signature string
     * @param digest the digest data be signed
     * @return the returned value is true if verifing digest is successfully;
     *         the returned value is false if verifing digest is not successfully.
     */
    public verifyDigest(id: string, signature: string, digest: string): boolean {
        return verifyDigest(canonicalId(id), signature, digest);
    }

    /**
     * Verify the digest by the default key.
     *
     * @param signature the signature string
     * @param digest the digest data be signed
     * @return the returned value is true if verifing digest is successfully;
     *         the returned value is false if verifing digest is not successfully.
     */
    public verifyDigest(signature: string, digest: string): boolean {
        return verifyDigest(null as DIDURL, signature, digest);
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

    public newCustomizedDid(did: DID, force: boolean, storepass: string): DIDDocument {
        return newCustomizedDid(did, null, 1, force, storepass);
    }

    public newCustomizedDid(did: DID, storepass: string): DIDDocument {
        return newCustomizedDid(did, false, storepass);
    }

    public newCustomizedDid(did: string, force: boolean, storepass: string): DIDDocument {
        return newCustomizedDid(DID.valueOf(did), force, storepass);
    }

    public newCustomizedDid(did: string, storepass: string): DIDDocument {
        return newCustomizedDid(DID.valueOf(did), false, storepass);
    }

    public newCustomizedDid(did: DID, controllers: DID[], multisig: number, force: boolean, storepass: string): DIDDocument {
        checkArgument(did != null, "Invalid DID");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkAttachedStore();

        let ctrls = new ArrayList<DID>();
        if (controllers != null && controllers.length > 0) {
            for (let ctrl of controllers) {
                if (ctrl.equals(this.getSubject()) || ctrls.contains(ctrl))
                    continue;

                ctrls.add(ctrl);
            }
        }

        checkArgument(multisig >= 0 && multisig <= ctrls.size() + 1, "Invalid multisig");

        log.info("Creating new DID {} with controller {}...", did, getSubject());

        let doc: DIDDocument = null;
        if (!force) {
            doc = did.resolve(true);
            if (doc != null)
                throw new DIDAlreadyExistException(did.toString());
        }

        log.info("Creating new DID {} with controller {}...", did, getSubject());

        let db = new DIDDocument.Builder(did, this, getStore());
        for (let ctrl of ctrls)
            db.addController(ctrl);

        db.setMultiSignature(multisig);

        try {
            doc = db.seal(storepass);
            getStore().storeDid(doc);
            return doc;
        } catch (ignore) {
            // MalformedDocumentException
            throw new UnknownInternalException(ignore);
        }
    }

    public newCustomizedDid(did: DID, controllers: DID[], multisig: number, storepass: string): DIDDocument {
        return newCustomizedDid(did, controllers, multisig, false, storepass);
    }

    public newCustomizedDid(did: string, controllers: string[], multisig: number, force: boolean, storepass: string): DIDDocument {
        let _controllers = new ArrayList<DID>(controllers.length);
        for (let ctrl of controllers)
            _controllers.add(new DID(ctrl));

        return newCustomizedDid(DID.valueOf(did),_controllers.toArray(new DID[0]),
                multisig, force, storepass);
    }

    public newCustomizedDid(did: string, controllers: string[], multisig: number, storepass: string): DIDDocument {
        return newCustomizedDid(did, controllers, multisig, false, storepass);
    }

    public createTransferTicket(to: DID, storepass: string): TransferTicket {
        checkArgument(to != null, "Invalid to");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        this.checkIsCustomized();
        this.checkAttachedStore();
        this.checkHasEffectiveController();

        let ticket = new TransferTicket(this, to);
        ticket.seal(this.getEffectiveControllerDocument(), storepass);
        return ticket;
    }

    public createTransferTicket(did: DID, to: DID, storepass: string): TransferTicket {
        checkArgument(did != null, "Invalid did");
        checkArgument(to != null, "Invalid to");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        this.checkIsPrimitive();
        this.checkAttachedStore();

        let target = did.resolve(true);
        if (target == null)
            throw new DIDNotFoundException(did.toString());

        if (target.isDeactivated())
            throw new DIDDeactivatedException(did.toString());

        if (!target.isCustomizedDid())
            throw new NotCustomizedDIDException(did.toString());

        if (!target.hasController(this.getSubject()))
            throw new NotControllerException(this.getSubject().toString());

        let ticket = new TransferTicket(target, to);
        ticket.seal(this, storepass);
        return ticket;
    }

    public sign(ticket: TransferTicket, storepass: string): TransferTicket {
        checkArgument(ticket != null, "Invalid ticket");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkAttachedStore();

        ticket.seal(this, storepass);
        return ticket;
    }

    public sign(doc: DIDDocument, storepass: string): DIDDocument {
        checkArgument(doc != null, "Invalid document");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkAttachedStore();

        if (!doc.isCustomizedDid())
            throw new NotCustomizedDIDException(doc.getSubject().toString());

        if (!doc.hasController(this.getSubject()))
            throw new NotControllerException();

        if (isCustomizedDid()) {
            if (getEffectiveController() == null)
                throw new NoEffectiveControllerException(this.getSubject().toString());
        } else {
            if (!doc.hasController(this.getSubject()))
                throw new NotControllerException(this.getSubject().toString());
        }

        if (doc.proofs.containsKey(this.getSubject()))
            throw new AlreadySignedException(this.getSubject().toString());

        let builder = doc.edit(this);
        try {
            return builder.seal(storepass);
        } catch (ignore) {
            // MalformedDocumentException
            throw new UnknownInternalException(ignore);
        }
    }

    public publish(ticket: TransferTicket, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
        checkArgument(ticket.isValid(), "Invalid ticket");
        checkArgument(ticket.getSubject().equals(this.getSubject()), "Ticket mismatch with current DID");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkIsCustomized();
        checkArgument(proofs.containsKey(ticket.getTo()), "Document not signed by: " + ticket.getTo());
        checkAttachedStore();

        if (signKey == null && getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        let did = this.getSubject();
        let targetDoc = did.resolve(true);
        if (targetDoc == null)
            throw new DIDNotFoundException(did.toString());

        if (targetDoc.isDeactivated())
            throw new DIDDeactivatedException(did.toString());

        if (signKey == null) {
            signKey = getDefaultPublicKeyId();
        } else {
            if (getAuthenticationKey(signKey) == null)
                throw new InvalidKeyException(signKey.toString());
        }

        DIDBackend.getInstance().transferDid(this, ticket, signKey, storepass, adapter);
    }

    public publish(ticket: TransferTicket, signKey: DIDURL, storepass: string) {
        publish(ticket,signKey, storepass, null);
    }

    public publish(ticket: TransferTicket, signKey: string, storepass: string, adapter: DIDTransactionAdapter) {
        publish(ticket, canonicalId(signKey), storepass, adapter);
    }

    public publish(ticket: TransferTicket, signKey: string, storepass: string) {
        publish(ticket, canonicalId(signKey), storepass, null);
    }

    public publish(ticket: TransferTicket, storepass: string, adapter: DIDTransactionAdapter) {
        publish(ticket, null as DIDURL, storepass, adapter);
    }

    public publish(ticket: TransferTicket, storepass: string) {
        publish(ticket, null as DIDURL, storepass, null);
    }

    public publishAsync(ticket: TransferTicket, signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter): Promise<void> {
        return new Promise((resolve, reject)=>{
            try {
                this.publish(ticket, signKey, storepass, adapter);
                resolve();
            } catch (e) {
                // DIDException
                reject(e);
            }
        });
    }

    public publishAsync(ticket: TransferTicket, signKey: DIDURL, storepass: string): CompletableFuture<Void>  {
        return publishAsync(ticket, signKey, storepass, null);
    }

    public publishAsync(ticket: TransferTicket, signKey: string, storepass: string, adapter: DIDTransactionAdapter = null): CompletableFuture<Void>  {
        return publishAsync(ticket, canonicalId(signKey), storepass, adapter);
    }

    public publishAsync(ticket: TransferTicket, storepass: string, adapter: DIDTransactionAdapter): CompletableFuture<Void> {
        return publishAsync(ticket, null as DIDURL, storepass, adapter);
    }

    public publishAsync(ticket: TransferTicket, storepass: string): CompletableFuture<Void> {
        return publishAsync(ticket, null as DIDURL, storepass, null);
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
    public publish(signKey: DIDURL, force: boolean, storepass: string,
            adapter: DIDTransactionAdapter) {
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");
        checkAttachedStore();

        if (signKey == null && getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        log.info("Publishing DID {}, force={}...", getSubject(), force);

        if (!isGenuine()) {
            log.error("Publish failed because document is not genuine.");
            throw new DIDNotGenuineException(this.getSubject().toString());
        }

        if (isDeactivated()) {
            log.error("Publish failed because DID is deactivated.");
            throw new DIDDeactivatedException(this.getSubject().toString());
        }

        if (isExpired() && !force) {
            log.error("Publish failed because document is expired.");
            log.info("You can publish the expired document using force mode.");
            throw new DIDExpiredException(this.getSubject().toString());
        }

        let lastTxid: string = null;
        let reolvedSignautre: string= null;
        let resolvedDoc = getSubject().resolve(true);
        if (resolvedDoc != null) {
            if (resolvedDoc.isDeactivated()) {
                getMetadata().setDeactivated(true);

                log.error("Publish failed because DID is deactivated.");
                throw new DIDDeactivatedException(this.getSubject().toString());
            }

            reolvedSignautre = resolvedDoc.getProof().getSignature();

            if (!force) {
                let localPrevSignature = getMetadata().getPreviousSignature();
                let localSignature = getMetadata().getSignature();

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
            signKey = getDefaultPublicKeyId();
        } else {
            if (getAuthenticationKey(signKey) == null)
                throw new InvalidKeyException(signKey.toString());
        }

        if (lastTxid == null || lastTxid.isEmpty()) {
            log.info("Try to publish[create] {}...", getSubject());
            DIDBackend.getInstance().createDid(this, signKey, storepass, adapter);
        } else {
            log.info("Try to publish[update] {}...", getSubject());
            DIDBackend.getInstance().updateDid(this, lastTxid, signKey, storepass, adapter);
        }

        getMetadata().setPreviousSignature(reolvedSignautre);
        getMetadata().setSignature(getProof().getSignature());
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
    public publish(signKey: DIDURL, force: boolean, storepass: string) {
        publish(signKey, force, storepass, null);
    }

    /**
     * Publish DID content(DIDDocument) to chain without force mode.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     * @throws InvalidKeyException there is no an authentication key.
     */
    public publish(signKey: DIDURL, storepass: string, adapter: DIDTransactionAdapter) {
        publish(signKey, false, storepass, adapter);
    }

    /**
     * Publish DID content(DIDDocument) to chain without force mode.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     * @throws InvalidKeyException there is no an authentication key.
     */
    public publish(signKey: DIDURL, storepass: string) {
        publish(signKey, false, storepass, null);
    }

    /**
     * Publish DID content(DIDDocument) to chain.
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
    public publish(signKey: string, force: boolean, storepass: string, adapter: DIDTransactionAdapter) {
        publish(canonicalId(signKey), force, storepass, adapter);
    }

    /**
     * Publish DID content(DIDDocument) to chain.
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
    public publish(signKey: string, force: boolean, storepass: string) {
        publish(canonicalId(signKey), force, storepass, null);
    }

    /**
     * Publish DID content(DIDDocument) to chain without force mode.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     * @throws InvalidKeyException there is no an authentication key.
     */
    public publish(signKey: string, storepass: string, adapter: DIDTransactionAdapter) {
        publish(canonicalId(signKey), false, storepass, adapter);
    }

    /**
     * Publish DID content(DIDDocument) to chain without force mode.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     * @throws InvalidKeyException there is no an authentication key.
     */
    public publish(signKey: string, storepass: string) {
        publish(canonicalId(signKey), false, storepass, null);
    }

    /**
     * Publish DID content(DIDDocument) to chain without force mode.
     * Specify the default key to sign.
     *
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     */
    public publish(storepass: string, adapter: DIDTransactionAdapter) {
        publish(null as DIDURL, false, storepass, adapter);
    }

    /**
     * Publish DID content(DIDDocument) to chain without force mode.
     * Specify the default key to sign.
     *
     * @param storepass the password for DIDStore
     * @throws DIDBackendException publish did failed because of DIDBackend error.
     * @throws DIDStoreException there is no activated DID or no lastest DID Document in DIDStore.
     */
    public publish(storepass: string) {
        publish(null as DIDURL, false, storepass, null);
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
    public publishAsync(signKey: DIDURL, force: boolean = false, storepass: string = null, adapter: DIDTransactionAdapter = null): Promise<boolean> {
        return new Promise((resolve, reject)=>{
            try {
                publish(signKey, force, storepass, adapter);
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
        checkAttachedStore();

        if (signKey == null && getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        // Document should use the IDChain's copy
        let doc = getSubject().resolve(true);
        if (doc == null)
            throw new DIDNotFoundException(this.getSubject().toString());
        else if (doc.isDeactivated())
            throw new DIDDeactivatedException(this.getSubject().toString());
        else
            doc.getMetadata().attachStore(getStore());

        if (signKey == null) {
            signKey = doc.getDefaultPublicKeyId();
        } else {
            if (!doc.isAuthenticationKey(signKey))
                throw new InvalidKeyException(signKey.toString());
        }

        DIDBackend.getInstance().deactivateDid(doc, signKey, storepass, adapter);

        if (!getSignature().equals(doc.getSignature()))
            getStore().storeDid(doc);
    }

    /**
     * Deactivate self use authentication key with asynchronous mode.
     *
     * @param signKey the key to sign
     * @param storepass the password for DIDStore
     * @return the new CompletableStage, no result.
     */
    public deactivateAsync(signKey: DIDURL, storepass: string = null, adapter: DIDTransactionAdapter = null): Promise<void> {
        return new Promise((resolve, reject)=>{
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

        if (signKey == null && getDefaultPublicKeyId() == null)
            throw new NoEffectiveControllerException(this.getSubject().toString());

        let targetDoc = target.resolve(true);
        if (targetDoc == null)
            throw new DIDNotFoundException(target.toString());
        else if (targetDoc.isDeactivated())
            throw new DIDDeactivatedException(target.toString());

        targetDoc.getMetadata().attachStore(getStore());

        if (!targetDoc.isCustomizedDid()) {
            if (targetDoc.getAuthorizationKeyCount() == 0)
                throw new InvalidKeyException("No authorization key from: " + target);

            let candidatePks: PublicKey[]  = null;
            if (signKey == null) {
                candidatePks = this.getAuthenticationKeys();
            } else {
                let pk = this.getAuthenticationKey(signKey);
                if (pk == null)
                    throw new InvalidKeyException(signKey.toString());
                candidatePks = new ArrayList<PublicKey>(1);
                candidatePks.add(pk);
            }

            // Lookup the authorization key id in the target doc
            let realSignKey: DIDURL = null;
            let targetSignKey: DIDURL = null;
            loopkup: for (let candidatePk of candidatePks) {
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

            DIDBackend.getInstance().deactivateDid(targetDoc, targetSignKey,
                    this, realSignKey, storepass, adapter);
        } else {
            if (!targetDoc.hasController(this.getSubject()))
                throw new NotControllerException(this.getSubject().toString());

            if (signKey == null) {
                signKey = getDefaultPublicKeyId();
            } else {
                if (!signKey.equals(getDefaultPublicKeyId()))
                    throw new InvalidKeyException(signKey.toString());
            }

            DIDBackend.getInstance().deactivateDid(targetDoc, signKey, storepass, adapter);

            if (getStore().containsDid(target))
                getStore().storeDid(targetDoc);
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
        return new Promise((resolve, reject)=>{
            try {
                this.deactivateTargetDID(target, signKey, storepass, adapter);
                resolve();
            } catch ( e) {
                // DIDException
                reject(e);
            }
        });

        return future;
    }

    /**
     * Parse a DIDDocument object from from a string JSON representation.
     *
     * @param content the string JSON content for building the object.
     * @return the DIDDocument object.
     * @throws MalformedDocumentException if a parse error occurs.
     */
    public static parse(content: string): DIDDocument {
        try {
            return parse(content, DIDDocument.class);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedDocumentException)
                throw e;
            else
                throw new MalformedDocumentException(e);
        }
    }

    /**
     * Parse a DIDDocument object from from a Reader object.
     *
     * @param src Reader object used to read JSON content for building the object
     * @return the DIDDocument object
     * @throws MalformedDocumentException if a parse error occurs
     * @throws IOException if an IO error occurs
     */
    /* public static DIDDocument parse(Reader src) {
        try {
            return parse(src, DIDDocument.class);
        } catch (DIDSyntaxException e) {
            if (e instanceof MalformedDocumentException)
                throw (MalformedDocumentException)e;
            else
                throw new MalformedDocumentException(e);
        }
    } */

    /**
     * Parse a DIDDocument object from from a InputStream object.
     *
     * @param src InputStream object used to read JSON content for building the object
     * @return the DIDDocument object
     * @throws MalformedDocumentException if a parse error occurs
     * @throws IOException if an IO error occurs
     */
    /* public static DIDDocument parse(InputStream src) {
        try {
            return parse(src, DIDDocument.class);
        } catch (DIDSyntaxException e) {
            if (e instanceof MalformedDocumentException)
                throw (MalformedDocumentException)e;
            else
                throw new MalformedDocumentException(e);
        }
    } */

    /**
     * Parse a DIDDocument object from from a File object.
     *
     * @param src File object used to read JSON content for building the object
     * @return the DIDDocument object
     * @throws MalformedDocumentException if a parse error occurs
     * @throws IOException if an IO error occurs
     */
    /* public static parse(File src): DIDDocument {
        try {
            return parse(src, DIDDocument.class);
        } catch (DIDSyntaxException e) {
            if (e instanceof MalformedDocumentException)
                throw (MalformedDocumentException)e;
            else
                throw new MalformedDocumentException(e);
        }
    } */
}

/**
 * Builder object to create or modify the DIDDocument.
 */
export class Builder {
    private document: DIDDocument;
    private controllerDoc: DIDDocument;

    /**
     * Constructs DID Document Builder with given DID and DIDStore.
     *
     * @param did the specified DID
     * @param store the DIDStore object
     */
    protected Builder(did: DID, store: DIDStore) {
        this.document = new DIDDocument(did);
        metadata: DIDMetadata = new DIDMetadata(did, store);
        this.document.setMetadata(metadata);
    }

    /**
     * Constructs DID Document Builder with given customizedDid and DIDStore.
     *
     * @param did the specified DID
     * @param store the DIDStore object
     */
    protected constructor(did: DID, controller: DIDDocument, store: DIDStore) {
        this.document = new DIDDocument(did);

        this.document.controllers = new ArrayList<DID>();
        this.document.controllerDocs = new HashMap<DID, DIDDocument>();

        this.document.controllers.add(controller.getSubject());
        this.document.controllerDocs.put(controller.getSubject(), controller);
        this.document.effectiveController = controller.getSubject();

        this.document.setMetadata(new DIDMetadata(did, store));

        this.controllerDoc = controller;
    }

    /**
     * Constructs DID Document Builder with given DID Document.
     *
     * @param doc the DID Document object
     */
    protected constructor(doc: DIDDocument) {
        this.document = doc.copy();
    }

    public constructor(doc: DIDDocument, controller: DIDDocument) {
        this.document = doc.copy();
        this.document.effectiveController = controller.getSubject();
        // if (controller.getMetadata().attachedStore())
        //    this.document.getMetadata().setStore(controller.getMetadata().getStore());
        this.controllerDoc = controller;
    }

    private canonicalId(id: string): DIDURL {
        return DIDURL.valueOf(this.getSubject(), id);
    }

    private canonicalId(id: DIDURL): DIDURL {
        if (id == null || id.getDid() != null)
            return id;

        return new DIDURL(this.getSubject(), id);
    }

    private invalidateProof() {
        if (document.proofs != null && !document.proofs.isEmpty())
            document.proofs.clear();
    }

    private checkNotSealed() {
        if (document == null)
            throw new AlreadySealedException();
    }

    private checkIsCustomized() {
        if (!document.isCustomizedDid())
            throw new NotCustomizedDIDException(document.getSubject().toString());
    }

    /**
     * Get document subject from did document builder.
     *
     * @return the owner of did document builder
     */
    public getSubject(): DID {
        checkNotSealed();
        return document.getSubject();
    }

    /**
     * Add a new controller to the customized DID document.
     *
     * @param controller the new controller's DID
     * @return the Builder object
     * @throws DIDResolveException if failed resolve the new controller's DID
     */
    public addController(controller: DID): Builder {
        checkArgument(controller != null, "Invalid controller");
        checkNotSealed();
        checkIsCustomized();
        checkArgument(!document.controllers.contains(controller), "Controller already exists");

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

        document.controllers.add(controller);
        document.controllerDocs.put(controller, controllerDoc);

        document.multisig = null; // invalidate multisig
        invalidateProof();
        return this;
    }

    /**
     * Add a new controller to the customized DID document.
     *
     * @param controller the new controller's DID
     * @return the Builder object
     * @throws DIDResolveException if failed resolve the new controller's DID
     */
    public addController(controller: string): Builder {
        return addController(DID.valueOf(controller));
    }

    /**
     * Remove controller from the customized DID document.
     *
     * @param controller the controller's DID to be remove
     * @return the Builder object
     */
    public removeController(controller: DID): Builder {
        checkArgument(controller != null, "Invalid controller");
        checkNotSealed();
        checkIsCustomized();
        // checkArgument(document.controllers.contains(controller), "Controller not exists");

        if (controller.equals(controllerDoc.getSubject()))
            throw new CanNotRemoveEffectiveController(controller.toString());

        if (document.controllers.remove(controller)) {
            document.controllerDocs.remove(controller);
            invalidateProof();
        }

        return this;
    }

    /**
     * Remove controller from the customized DID document.
     *
     * @param controller the controller's DID to be remove
     * @return the Builder object
     */
    public removeController(controller: string): Builder {
        return removeController(DID.valueOf(controller));
    }

    /**
     * Set multiple signature for multi-controllers DID document.
     *
     * @param m the required signature count
     * @return the Builder object
     */
    public setMultiSignature(m: number): Builder {
        checkNotSealed();
        checkIsCustomized();
        checkArgument(m >= 1, "Invalid signature count");

        let n = document.controllers.size();
        checkArgument(m <= n, "Signature count exceeds the upper limit");

        let multisig: MultiSignature = null;
        if (n > 1)
            multisig = new MultiSignature(m, n);

        if (document.multisig == null && multisig == null)
            return this;

        if (document.multisig != null && multisig != null &&
                document.multisig.equals(multisig))
            return this;

        document.multisig = new MultiSignature(m, n);

        invalidateProof();
        return this;
    }

    private addPublicKey(key: PublicKey) {
        if (document.publicKeys == null) {
            document.publicKeys = new TreeMap<DIDURL, PublicKey>();
        } else {
            // Check the existence, both id and keyBase58
            for (let pk of document.publicKeys.values()) {
                if (pk.getId().equals(key.getId()))
                    throw new DIDobjectAlreadyExistException("PublicKey id '"
                            + key.getId() + "' already exist.");

                if (pk.getPublicKeyBase58().equals(key.getPublicKeyBase58()))
                    throw new DIDobjectAlreadyExistException("PublicKey '"
                            + key.getPublicKeyBase58() + "' already exist.");
            }
        }

        document.publicKeys.put(key.getId(), key);
        if (document.defaultPublicKey == null) {
            let address = HDKey.toAddress(key.getPublicKeyBytes());
            if (address.equals(this.getSubject().getMethodSpecificId())) {
                document.defaultPublicKey = key;
                key.setAuthenticationKey(true);
            }
        }

        invalidateProof();
    }

    /**
     * Add PublicKey to did document builder.
     *
     * @param id the key id
     * @param controller the owner of public key
     * @param pk the public key base58 string
     * @return the DID Document Builder object
     */
    public addPublicKey(id: DIDURL, type: string, controller: DID, pk: string): Builder {
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

        if (controller == null)
            controller = getSubject();

        addPublicKey(new PublicKey(canonicalId(id), type, controller, pk));
        return this;
    }

    /**
     * Add PublicKey to did document builder.
     *
     * @param id the key id string
     * @param controller the owner of public key
     * @param pk the public key base58 string
     * @return the DID Document Builder object
     */
    public addPublicKey(id: string, type: string, controller: string, pk: string): Builder {
        return addPublicKey(canonicalId(id), type, DID.valueOf(controller), pk);
    }

    public addPublicKey(id: DIDURL, controller: DID, pk: string): Builder {
        return addPublicKey(id, null, controller, pk);
    }

    public addPublicKey(id: string, controller: string, pk: string): Builder {
        return addPublicKey(id, null, controller, pk);
    }

    public addPublicKey(id: DIDURL, pk: string): Builder {
        return addPublicKey(id, null, null, pk);
    }

    public addPublicKey(id: string, pk: string): Builder {
        return addPublicKey(id, null, null, pk);
    }

    /**
     * Remove PublicKey with the specified key id.
     *
     * @param id the key id
     * @param force the owner of public key
     * @return the DID Document Builder object
     */
    public removePublicKey(id: DIDURL, force: boolean): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (document.publicKeys == null || document.publicKeys.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        id = canonicalId(id);
        let pk = document.publicKeys.get(id);
        if (pk == null)
            throw new DIDobjectNotExistException(id.toString());

        // Can not remove default public key
        if (document.defaultPublicKey != null && document.defaultPublicKey.getId().equals(id))
            throw new DIDobjectHasReference(id.toString() + "is default key");

        if (!force) {
            if (pk.isAuthenticationKey() || pk.isAuthorizationKey())
                throw new DIDobjectHasReference(id.toString());
        }

        if (document.publicKeys.remove(id) != null) {
            try {
                // TODO: should delete the loosed private key when store the document
                if (document.getMetadata().attachedStore())
                    document.getMetadata().getStore().deletePrivateKey(id);
            } catch (ignore: DIDStoreException) {
                log.error("INTERNAL - Remove private key", ignore);
            }

            invalidateProof();
        }

        return this;
    }

    /**
     * Remove PublicKey matched the specified key id.
     *
     * @param id the key id
     * @param force force = true, the matched key must be removed.
     *              force = false, the matched key must not be removed if this key is authentiacation
     *              or authorization key.
     * @return the DID Document Builder object
     */
    public removePublicKey(id: string, force: boolean): Builder {
        return removePublicKey(canonicalId(id), force);
    }

    /**
     * Remove PublicKey matched the specified key id without force module.
     *
     * @param id the key id
     * @return the DID Document Builder object
     */
    public removePublicKey(id: DIDURL): Builder {
        return removePublicKey(id, false);
    }

    /**
     * Remove PublicKey matched the specified key id without force module.
     *
     * @param id the key id
     * @return the DID Document Builder object
     */
    public removePublicKey(id: string): Builder {
        return removePublicKey(id, false);
    }

    /**
     * Add the exist Public Key matched the key id to be Authentication key.
     *
     * @param id the key id
     * @return the DID Document Builder object
     */
    public addAuthenticationKey(id: DIDURL): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (document.publicKeys == null || document.publicKeys.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        id = canonicalId(id);
        let key: PublicKey =document.publicKeys.get(id);
        if (key == null)
            throw new DIDobjectNotExistException(id.toString());

        // Check the controller is current DID subject
        if (!key.getController().equals(this.getSubject()))
            throw new IllegalUsage(id.toString());

        if (!key.isAuthenticationKey()) {
            key.setAuthenticationKey(true);
            invalidateProof();
        }

        return this;
    }

    /**
     * Add the exist Public Key matched the key id to be Authentication key.
     *
     * @param id the key id string
     * @return the DID Document Builder object
     */
    public addAuthenticationKey(id: string): Builder {
        return addAuthenticationKey(canonicalId(id));
    }

    /**
     * Add the PublicKey named the key id to be an authentication key.
     * It is failed if the key id exist but the public key base58 string is not same as the given pk string.
     *
     * @param id the key id
     * @param pk the public key base58 string
     * @return the DID Document Builder
     */
    public addAuthenticationKey(id: DIDURL, pk: string): Builder {
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

        let key: PublicKey =new PublicKey(canonicalId(id), null, getSubject(), pk);
        key.setAuthenticationKey(true);
        addPublicKey(key);

        return this;
    }

    /**
     * Add the PublicKey named the key id to be an authentication key.
     * It is failed if the key id exist but the public key base58 string is not same as the given pk string.
     *
     * @param id the key id string
     * @param pk the public key base58 string
     * @return the DID Document Builder
     */
    public addAuthenticationKey(id: string, pk: string): Builder {
        return addAuthenticationKey(canonicalId(id), pk);
    }

    /**
     * Remove Authentication Key matched the given id.
     *
     * @param id the key id
     * @return the DID Document Builder
     */
    public removeAuthenticationKey(id: DIDURL): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (document.publicKeys == null || document.publicKeys.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        id = canonicalId(id);
        let key = document.publicKeys.get(id);
        if (key == null || !key.isAuthenticationKey())
            throw new DIDobjectNotExistException(id.toString());

        // Can not remove default public key
        if (document.defaultPublicKey != null && document.defaultPublicKey.getId().equals(id))
            throw new DIDobjectHasReference(
                    "Cannot remove the default PublicKey from authentication.");

        if (key.isAuthenticationKey()) {
            key.setAuthenticationKey(false);
            invalidateProof();
        } else {
            throw new DIDobjectNotExistException(id.toString());
        }

        return this;
    }

    /**
     * Remove Authentication Key matched the given id.
     *
     * @param id the key id string
     * @return the DID Document Builder
     */
    public removeAuthenticationKey(id: string): Builder {
        return removeAuthenticationKey(canonicalId(id));
    }

    /**
     * Add the exist Public Key matched the key id to be Authorization key.
     *
     * @param id the key id
     * @return the DID Document Builder
     */
    public addAuthorizationKey(id: DIDURL): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (document.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());

        if (document.publicKeys == null || document.publicKeys.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        id = canonicalId(id);
        let key: PublicKey = document.publicKeys.get(id);
        if (key == null)
            throw new DIDobjectNotExistException(id.toString());

        // Can not authorize to self
        if (key.getController().equals(this.getSubject()))
            throw new IllegalUsage(id.toString());

        if (!key.isAuthorizationKey()) {
            key.setAuthorizationKey(true);
            invalidateProof();
        }

        return this;
    }

    /**
     * Add the exist Public Key matched the key id to be Authorization Key.
     *
     * @param id the key id string
     * @return the DID Document Builder
     */
    public addAuthorizationKey(id: string): Builder {
        return addAuthorizationKey(canonicalId(id));
    }

    /**
     * Add the PublicKey named key id to be Authorization Key.
     * It is failed if the key id exist but the public key base58 string is not same as the given pk string.
     *
     * @param id the key id
     * @param controller the owner of public key
     * @param pk the public key base58 string
     * @return the DID Document Builder
     */
    public addAuthorizationKey(id: DIDURL, controller: DID, pk: string): Builder {
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(pk != null && !pk.isEmpty(), "Invalid publicKey");

        if (document.isCustomizedDid())
            throw new NotPrimitiveDIDException(this.getSubject().toString());

        // Can not authorize to self
        if (controller.equals(this.getSubject()))
            throw new IllegalUsage("Key's controller is self.");

        let key: PublicKey =new PublicKey(canonicalId(id), null, controller, pk);
        key.setAuthorizationKey(true);
        addPublicKey(key);

        return this;
    }

    /**
     * Add the PublicKey named key id to be Authorization Key.
     * It is failed if the key id exist but the public key base58 string is not same as the given pk string.
     *
     * @param id the key id string
     * @param controller the owner of public key
     * @param pk the public key base58 string
     * @return the DID Document Builder
     */
    public addAuthorizationKey(id: string, controller: string, pk: string): Builder {
        return addAuthorizationKey(canonicalId(id), DID.valueOf(controller), pk);
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
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(controller != null && !controller.equals(this.getSubject()), "Invalid controller");

        if (document.isCustomizedDid())
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
            throw new DIDobjectNotExistException(key.toString());

        let pk = new PublicKey(canonicalId(id), targetPk.getType(),
                controller, targetPk.getPublicKeyBase58());
        pk.setAuthorizationKey(true);
        addPublicKey(pk);

        return this;
    }

    /**
     * Add Authorization key to Authentication array according to DID.
     * Authentication is the mechanism by which the controller(s) of a DID can
     * cryptographically prove that they are associated with that DID.
     * A DID Document must include authentication key.
     *
     * @param id the key id string
     * @param controller the owner of public key
     * @return the DID Document Builder
     * @throws DIDResolveException resolve controller failed.
     * @throws InvalidKeyException the key is not an authentication key.
     */
    public authorizationDid(id: DIDURL, controller: DID): Builder {
        return authorizationDid(id, controller, null);
    }

    /**
     * Add Authorization key to Authentication array according to DID.
     * Authentication is the mechanism by which the controller(s) of a DID can
     * cryptographically prove that they are associated with that DID.
     * A DID Document must include authentication key.
     *
     * @param id the key id string
     * @param controller the owner of public key
     * @param key the key of controller to be an Authorization key.
     * @return the DID Document Builder
     * @throws DIDResolveException resolve controller failed.
     * @throws InvalidKeyException the key is not an authentication key.
     */
    public authorizationDid(id: string, controller: string, key: string): Builder {
        return authorizationDid(canonicalId(id),
                DID.valueOf(controller), DIDURL.valueOf(controller, key));
    }

    /**
     * Add Authorization key to Authentication array according to DID.
     * Authentication is the mechanism by which the controller(s) of a DID can
     * cryptographically prove that they are associated with that DID.
     * A DID Document must include authentication key.
     *
     * @param id the key id string
     * @param controller the owner of public key
     * @return the DID Document Builder
     * @throws DIDResolveException resolve controller failed.
     * @throws InvalidKeyException the key is not an authentication key.
     */
    public authorizationDid(id: string, controller: string): Builder {
        return authorizationDid(id, controller, null);
    }

    /**
     * Remove the Authorization Key matched the given id.
     *
     * @param id the key id
     * @return the DID Document Builder
     */
    public removeAuthorizationKey(id: DIDURL): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid publicKey id");

        if (document.publicKeys == null || document.publicKeys.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        id = canonicalId(id);
        let key: PublicKey =document.publicKeys.get(id);
        if (key == null)
            throw new DIDobjectNotExistException(id.toString());

        if (key.isAuthorizationKey()) {
            key.setAuthorizationKey(false);
            invalidateProof();
        } else {
            throw new DIDobjectNotExistException(id.toString());
        }

        return this;
    }

    /**
     * Remove the Authorization Key matched the given id.
     *
     * @param id the key id string
     * @return the DID Document Builder
     */
    public removeAuthorizationKey(id: string): Builder {
        return removeAuthorizationKey(canonicalId(id));
    }

    /**
     * Add Credentail to DID Document Builder.
     *
     * @param vc the Verifiable Credential object
     * @return the DID Document Builder
     */
    public addCredential(vc: VerifiableCredential): Builder {
        checkNotSealed();
        checkArgument(vc != null, "Invalid credential");

        // Check the credential belongs to current DID.
        if (!vc.getSubject().getId().equals(this.getSubject()))
            throw new IllegalUsage(vc.getSubject().getId().toString());

        if (document.credentials == null) {
            document.credentials = new TreeMap<DIDURL, VerifiableCredential>();
        } else {
            if (document.credentials.containsKey(vc.getId()))
                throw new DIDobjectAlreadyExistException(vc.getId().toString());
        }

        document.credentials.put(vc.getId(), vc);
        invalidateProof();

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
    public addCredential(id: DIDURL, types: string[] = null, subject: Map<String, object> = null, expirationDate: Date = null, storepass: string): Builder {
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

        let issuer = new Issuer(document);
        let cb = issuer.issueFor(document.getSubject());
        if (types == null)
            types = ["SelfProclaimedCredential"];

        if (expirationDate == null)
            expirationDate = document.getExpires();

        try {
            let vc = cb.id(canonicalId(id))
                    .type(types)
                    .properties(subject)
                    .expirationDate(expirationDate)
                    .seal(storepass);

            addCredential(vc);
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
    public addCredential(id: DIDURL, String[] types, String json, Date expirationDate, storepass: string): Builder {
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(json != null && !json.isEmpty(), "Invalid json");
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

        Issuer issuer = new Issuer(document);
        VerifiableCredential.Builder cb = issuer.issueFor(document.getSubject());
        if (types == null)
            types = new String[]{ "SelfProclaimedCredential" };

        if (expirationDate == null)
            expirationDate = document.expires;

        try {
            VerifiableCredential vc = cb.id(canonicalId(id))
                    .type(types)
                    .properties(json)
                    .expirationDate(expirationDate)
                    .seal(storepass);

            addCredential(vc);
        } catch (MalformedCredentialException ignore) {
            throw new UnknownInternalException(ignore);
        }

        return this;
    }

    /**
     * Remove Credential with the specified id.
     *
     * @param id the Credential id
     * @return the DID Document Builder
     */
    public removeCredential(id: DIDURL): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid credential id");

        if (document.credentials == null || document.credentials.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        if (document.credentials.remove(canonicalId(id)) != null)
            invalidateProof();
        else
            throw new DIDobjectNotExistException(id.toString());

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
    // TODO: Use JSON object (~~ type json = {[key: string]:json}), not map, for properties?
    public addService(id: DIDURL, type: string, endpoint: string, properties: Map<string, object>): Builder {
        checkNotSealed();
        checkArgument(id != null && (id.getDid() == null || id.getDid().equals(this.getSubject())),
                "Invalid publicKey id");
        checkArgument(type != null && !type.isEmpty(), "Invalid type");
        checkArgument(endpoint != null && !endpoint.isEmpty(), "Invalid endpoint");

        Service svc = new Service(canonicalId(id), type, endpoint, properties);
        if (document.services == null)
            document.services = new TreeMap<DIDURL, Service>();
        else {
            if (document.services.containsKey(svc.getId()))
                throw new DIDobjectAlreadyExistException("Service '"
                        + svc.getId() + "' already exist.");
        }

        document.services.put(svc.getId(), svc);
        invalidateProof();

        return this;
    }

    public Builder addService(id: string, type: string, String endpoint,
            Map<String, object> properties) {
        return addService(canonicalId(id), type, endpoint, properties);
    }

    public Builder addService(id: DIDURL, type: string, String endpoint) {
        return addService(id, type, endpoint, null);
    }

    /**
     * Add Service.
     *
     * @param id the specified Service id string
     * @param type the Service type
     * @param endpoint the service point's adderss
     * @return the DID Document Builder
     */
    public addService(id: string, type: string, endpoint: string): Builder {
        return addService(canonicalId(id), type, endpoint, null);
    }

    /**
     * Remove the Service with the specified id.
     *
     * @param id the Service id
     * @return the DID Document Builder
     */
    public removeService(id: DIDURL): Builder {
        checkNotSealed();
        checkArgument(id != null, "Invalid credential id");

        if (document.services == null || document.services.isEmpty())
            throw new DIDobjectNotExistException(id.toString());

        if (document.services.remove(canonicalId(id)) != null)
            invalidateProof();
        else
            throw new DIDobjectNotExistException(id.toString());

        return this;
    }

    private Calendar getMaxExpires() {
        Calendar cal = Calendar.getInstance(Constants.UTC);
        cal.add(Calendar.YEAR, Constants.MAX_VALID_YEARS);
        return cal;
    }

    /**
     * Set the current time to be expires time for DID Document Builder.
     *
     * @return the DID Document Builder
     */
    public Builder setDefaultExpires() {
        checkNotSealed();

        document.expires = getMaxExpires().getTime();
        invalidateProof();

        return this;
    }

    /**
     * Set the specified time to be expires time for DID Document Builder.
     *
     * @param expires the specified time
     * @return the DID Document Builder
     */
    public Builder setExpires(Date expires) {
        checkNotSealed();
        checkArgument(expires != null, "Invalid expires");

        Calendar cal = Calendar.getInstance(Constants.UTC);
        cal.setTime(expires);

        if (cal.after(getMaxExpires()))
            throw new IllegalArgumentException("Invalid expires, out of range.");

        document.expires = expires;
        invalidateProof();

        return this;
    }

    /**
     * Remove the proof that created by the specific controller.
     *
     * @param controller the controller's DID
     * @return the DID Document Builder
     */
    public Builder removeProof(controller: DID) {
        checkNotSealed();
        checkArgument(controller != null, "Invalid controller");

        if (document.proofs == null || document.proofs.isEmpty())
            return this;

        if (document.proofs.remove(controller) == null)
            throw new DIDobjectNotExistException("No proof signed by: " + controller);

        return this;
    }

    private sanitize() {
        if (document.isCustomizedDid()) {
            if (document.controllers == null || document.controllers.isEmpty())
                throw new MalformedDocumentException("Missing controllers");

            if (document.controllers.size() > 1) {
                if (document.multisig == null)
                    throw new MalformedDocumentException("Missing multisig");

                if (document.multisig.n() != document.controllers.size())
                    throw new MalformedDocumentException("Invalid multisig, not matched with controllers");
            } else {
                if (document.multisig != null)
                    throw new MalformedDocumentException("Invalid multisig");
            }
        }

        int sigs = document.multisig == null ? 1 : document.multisig.m();
        if (document.proofs != null && document.proofs.size() == sigs)
            throw new AlreadySealedException(this.getSubject().toString());

        if (document.controllers == null || document.controllers.isEmpty()) {
            document.controllers = Collections.emptyList();
            document.controllerDocs = Collections.emptyMap();
        } else {
            Collections.sort(document.controllers);
        }

        if (document.publicKeys == null || document.publicKeys.isEmpty()) {
            document.publicKeys = Collections.emptyMap();
            document._publickeys = Collections.emptyList();
            document._authentications = Collections.emptyList();
            document._authorizations = Collections.emptyList();
        } else {
            document._publickeys = new ArrayList<PublicKey>(document.publicKeys.values());

            document._authentications = new ArrayList<PublicKeyReference>();
            document._authorizations = new ArrayList<PublicKeyReference>();

            for (PublicKey pk : document.publicKeys.values()) {
                if (pk.isAuthenticationKey())
                    document._authentications.add(new PublicKeyReference(pk));

                if (pk.isAuthorizationKey())
                    document._authorizations.add(new PublicKeyReference(pk));
            }

            if (document._authentications.isEmpty())
                document._authentications = Collections.emptyList();

            if (document._authentications.isEmpty())
                document._authorizations = Collections.emptyList();
        }

        if (document.credentials == null || document.credentials.isEmpty()) {
            document.credentials = Collections.emptyMap();
            document._credentials = Collections.emptyList();
        } else {
            document._credentials = new ArrayList<VerifiableCredential>(document.credentials.values());
        }

        if (document.services == null || document.services.isEmpty()) {
            document.services = Collections.emptyMap();
            document._services = Collections.emptyList();
        } else {
            document._services = new ArrayList<Service>(document.services.values());
        }

        if (document.proofs == null || document.proofs.isEmpty()) {
            if (document.getExpires() == null)
                setDefaultExpires();
        }

        if (document.proofs == null)
            document.proofs = new HashMap<DID, Proof>();

        document._proofs = null;
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
    public DIDDocument seal(storepass: string) {
        checkNotSealed();
        checkArgument(storepass != null && !storepass.isEmpty(), "Invalid storepass");

        sanitize();

        DIDDocument    signerDoc = document.isCustomizedDid() ? controllerDoc : document;
        DIDURL signKey = signerDoc.getDefaultPublicKeyId();

        if (document.proofs.containsKey(signerDoc.getSubject()))
            throw new AlreadySignedException(signerDoc.getSubject().toString());

        String json = document.serialize(true);
        String sig = document.sign(signKey, storepass, json.getBytes());
        Proof proof = new Proof(signKey, sig);
        document.proofs.put(proof.getCreator().getDid(), proof);
        document._proofs = new ArrayList<Proof>(document.proofs.values());
        Collections.sort(document._proofs);

        // Invalidate builder
        DIDDocument doc = document;
        this.document = null;

        return doc;
    }
}
