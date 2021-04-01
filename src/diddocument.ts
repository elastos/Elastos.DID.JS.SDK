import { StaticConfiguration } from "./staticconfiguration";
import { Util, Signer, DIDUtil, Cache } from "./core";
import { DIDElement, JSONObject, Service, Subject, Proof, DocumentPublicKey, VerifiableCredential, VerifiablePresentation } from "./domain";
import { DID } from "./did"

export class DIDDocument extends JSONObject {

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
        var keys = Object.keys(cache);
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
