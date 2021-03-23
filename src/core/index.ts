import { Constants } from "../constants"
import { Did } from "../did"

const rs = require('jsrsasign');
const bip39 = require('bip39');
const { Buffer } = require('buffer');
const randombytes = require('randombytes');
const createHash = require('create-hash');
const { HDPrivateKey, HDPublicKey, PrivateKey, PublicKey, encoding, crypto } = require('bitcore-lib-curve');
const { has } = require("lodash");
const { BN, Hash, Point } = crypto;
const { Base58, Base58Check } = encoding;
const { BigInteger, Base64x, KEYUTIL } = require("jsrsasign");
const js = require("bitcore-lib-curve/lib/util/js");
var EC = require('elliptic').ec;

Point.setCurve('p256');

export abstract class JSONObject {

    public serialize () {
        return JSON.stringify(this);
    }
}

export class VerifiableCredential extends JSONObject {
    public readonly id: string;
    public readonly type: string[];
    public readonly issuer: Did;
    public readonly issuanceDate: string;
    public readonly expirationDate: string;
    public readonly credentialSubject: Subject;

    public constructor(id, type, issuer, issuanceDate, expirationDate, credentialSubject) {
        super();
        this.id = id;
        this.type = type;
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

export class Subject extends JSONObject  {
    public readonly id: Did;
    public appDid?: string;
    public appInstanceDid?: Did;
    public name?: string;
    public value?: any;

    public constructor (id) {
        super();
        this.id = id;
    }
}

export class Service extends JSONObject  {
    public readonly id: string;
    public readonly type: string;
    public readonly serviceEndpoint: string;

    public constructor (id, type, endpoint) {
        super();
        this.id = id;
        this.type = type;
        this.serviceEndpoint = endpoint;
    }
}

export class DocumentPublicKey extends JSONObject  {
    public readonly id: string;
    public readonly type: String
    public readonly controller: Did;
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

export class Document  extends JSONObject {

    public verifiableCredential: VerifiableCredential[];
    public verifiablePresentation: VerifiablePresentation[];
    public service: Service[];
    public readonly proof: Proof;
    public readonly id: any;
    public readonly publicKey: DocumentPublicKey;
    public readonly authentication: any;
    public readonly expires: string;

    public constructor(id, publicKey, authentication, expires, proof) {
        super();
        this.verifiableCredential = [];
        this.verifiablePresentation = [];
        this.service = [];
        this.id = id;
        this.publicKey = publicKey;
        this.authentication = authentication;
        this.expires = expires;
        this.proof = proof;
    }

    public clone(): Document {
        let clonedDocument = new Document(
            this.id,
            this.publicKey,
            this.authentication,
            this.expires,
            this.proof
        );

        clonedDocument.verifiableCredential = this.verifiableCredential;
        clonedDocument.verifiablePresentation = this.verifiablePresentation;
        clonedDocument.service = this.service;

        return clonedDocument;
    }

    public hasProof(): boolean {
        return (this.proof ? true : false);
    }
}

export class Cache {
    public readonly expiration: Number;
    public document?: any;

    public constructor(expiration) {
        this.expiration = expiration;
    }
}

export class Core {

    public generateMnemonic(lang = 'en', wordlist = []) {
        let wordListMap = {
            en: bip39.wordlists.english,
            cn: bip39.wordlists.chinese_simplified,
            fr: bip39.wordlists.french,
            it: bip39.wordlists.italian,
            jp: bip39.wordlists.japanese,
            sp: bip39.wordlists.spanish,
        };

        return bip39.generateMnemonic(128, randombytes, wordlist.length > 0 ? wordlist : wordListMap[lang]);
    }

    public async getSeedFromMnemonic (mnemonic, password:string|undefined) {
        return await bip39.mnemonicToSeed(mnemonic, password);
    }


    public generateSubPrivateKey (seed, coinType = Constants.coinTypes.ELA, changeChain = Constants.changeChain.EXTERNAL, index = 0) {
        const prvKey = HDPrivateKey.fromSeed(seed);
        const parent = new HDPrivateKey(prvKey.xprivkey);
        const privateKey = parent
            .deriveChild(44, true)
            .deriveChild(coinType, true)
            .deriveChild(0, true)
            .deriveChild(changeChain, false)
            .deriveChild(index, false);
        return privateKey.privateKey;

    }

    public getMasterPublicKey (seed, coinType = Constants.coinTypes.ELA) {
        const prvKey = HDPrivateKey.fromSeed(seed);
        const parent = new HDPrivateKey(prvKey.xprivkey);
        const multiWallet = parent
            .deriveChild(44, true)
            .deriveChild(coinType, true)
            .deriveChild(0, true);
        return multiWallet.xpubkey;
    }

    public generateSubPublicKey (masterPublicKey, changeChain = Constants.changeChain.EXTERNAL, index = 0) {
        const parent = new HDPublicKey(masterPublicKey);
        const multiWallet = parent
            .deriveChild(changeChain)
            .deriveChild(index);

        return multiWallet.publicKey;
    }

    public getAddressBase (pubKey, signType) {
        const pubKeyBuf = Buffer.from(pubKey, 'hex');
        const code = Buffer.concat([Buffer.from([0x21]), pubKeyBuf, Buffer.from([Constants.signTypeMap[signType].type])]);
        const hashBuf = Hash.sha256ripemd160(code);
        const programHashBuf = Buffer.concat([Buffer.from([Constants.signTypeMap[signType].address]), hashBuf]);

        return Base58Check.encode(programHashBuf);
    }

    public getpublicKeyBase58 (masterPublicKey, changeChain = Constants.changeChain.EXTERNAL, index = 0) {

        const parent = new HDPublicKey(masterPublicKey);
        const multiWallet = parent
            .deriveChild(changeChain)
            .deriveChild(index);

        return Base58.encode(Buffer.from(multiWallet._buffers.publicKey));
    }

    public getBase58 (pubKey) {
        return Base58.encode(Buffer.from(pubKey));
    }

    public addReadOnlyPropertyToObject (obj, prop, value) {
        Object.defineProperty(obj, prop, {
            value: value,
            writable: false
        });
    }

    public getPublicKey (publicKeyHex) {
        let pubKeyObj = PublicKey.fromString(publicKeyHex);
        let json = pubKeyObj.toJSON();
        return json;
    }

    public signData (bufferData, privateKey) {
        let ec = new rs.KJUR.crypto.ECDSA({curve: "secp256r1"});
        ec.setPrivateKeyHex(privateKey);
        let dataSigner = new rs.KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        dataSigner.init(ec);
        dataSigner.updateHex(bufferData);

        let signed = dataSigner.sign();
        let compact = rs.KJUR.crypto.ECDSA.asn1SigToConcatSig(signed);
        let r = new BN(compact.slice(0, compact.length / 2), "hex", "le");
        let s = new BN(compact.slice(compact.length / 2), "hex", "le");

        if (r.isNeg()) r = r.ineg();
        if (s.isNeg()) s = s.ineg();

        let buffer64 = new Uint8Array(64);
        this.arrayCopy(r.toArray("le"), 0, buffer64, 0, 32);
        this.arrayCopy(s.toArray("le"), 0, buffer64, 32, 32);

        const signedData = rs.hextob64u(rs.BAtohex(buffer64));
        return signedData;
    }

    public verifyData (data, signature, publicKey) {
        let pubKeyObj = PublicKey.fromString(publicKey);
        let signer = new rs.KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });

        signer.init({ xy: this.uncompress(pubKeyObj).toString('hex'), curve: 'secp256r1' });
        signer.updateHex(data);
        let signatureBA = rs.b64toBA(rs.b64utob64(signature))

        let r = new BN(signatureBA.slice(0, 32), Number, "le");
        let s = new BN(signatureBA.slice(32), Number, "le");
        let asn1 = rs.KJUR.crypto.ECDSA.hexRSSigToASN1Sig(rs.BAtohex(r.toArray("le")),rs.BAtohex(s.toArray("le")));

        return signer.verify(asn1);
    }

    public getTimestamp () {
        return Math.floor(Date.now() / 1000);
    }

    public async rpcResolveDID (did, rpcHost) {
        let didKey = did.replace("did:elastos:", "");

        let body = {
            "jsonrpc": '2.0',
            "id": "1",
            "method": "resolvedid",
            "params": {
                "did": didKey,
                "all": true
            }
        };

        let rpcResponse = await fetch(rpcHost, {
            "method": "POST",
            "headers": {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            "body": JSON.stringify(body)
        });


        if (!rpcResponse.ok) throw new Error(`Error on Elastos RPC Call - ${rpcResponse.status} : ${rpcResponse.statusText}`);

        return await rpcResponse.json();
    }

    private uncompress (key)  {
        if (!key.compressed) {
            throw new Error('Publick key is not compressed.');
        }

        const x = key.point.getX();
        const y = key.point.getY();

        const xbuf = x.toBuffer({
            size: 32,
        });

        const ybuf = y.toBuffer({
            size: 32,
        });

        return Buffer.concat([Buffer.from([0x04]), xbuf, ybuf]);
    }

    private getPublicFromPrivateKey (privateKey) {
        return PrivateKey.fromBuffer(privateKey).publicKey;
    }

    private arrayCopy(src, srcIndex, dest, destIndex, length) {
        let values = [...src.slice(srcIndex, srcIndex + length)];
        dest.set(values, destIndex);
    }

    private generateDIDFromPublicKey (pubKey) {

        //GET REDEEM SCRIPT
        let pk = Buffer.from(pubKey).slice(0, 33);
        let script = new Uint8Array(35);
        script[0] = 33;
        this.arrayCopy(pk, 0, script, 1, 33);
        script[34] = 0xAD;
        //-------------

        // sha256Ripemd160
        let hash = Hash.sha256ripemd160(script);
        //---------------

        // getBinAddress
        let hashProgram = new Uint8Array(hash.length + 1);
        hashProgram[0] = 0x67;
        this.arrayCopy(hash, 0, hashProgram, 1, hash.length);

        hash = Hash.sha256sha256(hashProgram);

        let binAddress = new Uint8Array(hashProgram.length + 4);
        this.arrayCopy(hashProgram, 0, binAddress, 0, hashProgram.length);
        this.arrayCopy(hash, 0, binAddress, hashProgram.length, 4);
        //-------

        // getAddress
        return Base58.encode(Buffer.from(binAddress));
    }
}