import { DID } from "./did";

export abstract class JSONObject {
    public serialize () {
        return JSON.stringify(this);
    }
}

export class DIDElement {
    public readonly did: DID
    public publicKeyBase58?: string;
    public privateKey?: string;
    public publicKey?: string;

    public constructor (did: DID) {
        this.did = did;
    }

    public static createWithPublicKey(did: DID, publicKey: string): DIDElement {
    	let didElement = new DIDElement(did);
    	didElement.publicKey = publicKey;
    	return didElement;
    }
    public static createWithPrivateKey(did: DID, privateKey: string): DIDElement {
    	let didElement = new DIDElement(did);
    	didElement.privateKey = privateKey;
    	return didElement;
    }
    public static createWithPublicKeyBase58(did: DID, publicKeyBase58: string): DIDElement {
    	let didElement = new DIDElement(did);
    	didElement.publicKeyBase58 = publicKeyBase58;
    	return didElement;
    }
}

export class DocumentPublicKey extends JSONObject  {
    public readonly id: string;
    public readonly type: String
    public readonly controller: DID;
    public readonly publicKeyBase58: string;

    public constructor (id, type, controller, publicKeyBase58) {
        super();
        this.id = id;
        this.type = type;
        this.controller = controller;
        this.publicKeyBase58 = publicKeyBase58;
    }
}

export class Proof extends JSONObject  {
    public readonly type: string;
    public created?: string;
    public creator?: string;
    public signature?: string;
    public signatureValue?: string;
    public verificationMethod?: string;
    public realm?: any;
    public nonce?: any;

    public constructor (type) {
        super();
        this.type = type;
    }
}

export class Service extends JSONObject  {
    public readonly id: string;
    public readonly type: string;
    public readonly serviceEndpoint: string;

    public constructor (id: string, type: string, endpoint: string) {
        super();
        this.id = id;
        this.type = type;
        this.serviceEndpoint = endpoint;
    }
}

export class Subject extends JSONObject  {
    public readonly id: DID;
    public appDid?: string;
    public appInstanceDid?: DID;
    public name?: string;
    public value?: any;

    public constructor (id: DID) {
        super();
        this.id = id;
    }
}

export class VerifiableCredential extends JSONObject {
    public readonly id: DIDElement;
    public readonly types: string[];
    public readonly issuer: DID;
    public readonly issuanceDate: string;
    public readonly expirationDate: string;
    public readonly credentialSubject: Subject;

    public constructor(id: DIDElement, types: string[], issuer: DID, issuanceDate: string, expirationDate: string, credentialSubject: Subject) {
        super();
        this.id = id;
        this.types = types;
        this.issuer = issuer;
        this.issuanceDate = issuanceDate;
        this.expirationDate = expirationDate;
        this.credentialSubject = credentialSubject;
    }
}

export class VerifiablePresentation extends JSONObject  {
    public readonly type: string;
    public readonly created: string;
    public readonly verifiableCredential: VerifiableCredential[];

    public constructor (type, created, verifiableCredential) {
        super();
        this.type = type;
        this.created = created;
        this.verifiableCredential = verifiableCredential;
    }
}