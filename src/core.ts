import { CoinType, ChangeChain, SignType, SignTypeMap } from "./constants"

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

export class Util {
    public static getTimestamp (): number {
        return Math.floor(Date.now() / 1000);
    }

    public static arrayCopy(src: Uint8Array, srcIndex: number, dest: Uint8Array, destIndex: number, length: number): void {
        let values = [...src.slice(srcIndex, srcIndex + length)];
        dest.set(values, destIndex);
    }
}

export class Cache {
    public readonly expiration: Number;
    public document?: any;

    public constructor(expiration) {
        this.expiration = expiration;
    }
}

export class KeyManager {
    public static generateSubPrivateKey (seed: Buffer, coinType: CoinType = CoinType.ELA, changeChain: ChangeChain = ChangeChain.EXTERNAL, index: number = 0): Buffer {
        const prvKey = HDPrivateKey.fromSeed(seed);
        const parent = new HDPrivateKey(prvKey.xprivkey);
        const privateKey = parent
            .deriveChild(44, true)
            .deriveChild(0, true)
            .deriveChild(0, true)
            .deriveChild(0, false)
            .deriveChild(index, false);
        return privateKey.privateKey;
    }

    public static getMasterPublicKey (seed: Buffer, coinType: CoinType = CoinType.ELA): Buffer {
        const prvKey = HDPrivateKey.fromSeed(seed);
        const parent = new HDPrivateKey(prvKey.xprivkey);
        const multiWallet = parent
            .deriveChild(44, true)
            .deriveChild(coinType, true)
            .deriveChild(0, true);
        return multiWallet.xpubkey;
    }

    public static generateSubPublicKey (masterPublicKey: Buffer, changeChain: ChangeChain = ChangeChain.EXTERNAL, index: number = 0): Buffer {
        const parent = new HDPublicKey(masterPublicKey);
        const multiWallet = parent
            .deriveChild(changeChain)
            .deriveChild(index);

        return multiWallet.publicKey;
    }

    public static getAddressBase (pubKey: string, signType: SignType): string {
        const pubKeyBuf = Buffer.from(pubKey, 'hex');
        const signTypeMap = SignTypeMap[signType];
        const code = Buffer.concat([Buffer.from([0x21]), pubKeyBuf, Buffer.from([SignTypeMap[signType].type])]);
        const hashBuf = Hash.sha256ripemd160(code);
        const programHashBuf = Buffer.concat([Buffer.from([SignTypeMap[signType].address]), hashBuf]);

        return Base58Check.encode(programHashBuf);
    }

    public static getPublicKeyBase58 (masterPublicKey: Buffer, changeChain: ChangeChain = ChangeChain.EXTERNAL, index: number = 0): Buffer {

        const parent = new HDPublicKey(masterPublicKey);
        const multiWallet = parent
            .deriveChild(changeChain)
            .deriveChild(index);

        return Base58.encode(Buffer.from(multiWallet._buffers.publicKey));
    }

    public static getBase58 (pubKey: string): Buffer {
        return Base58.encode(Buffer.from(pubKey));
    }

    public static getPublicKey (publicKeyHex: string): string {
        let pubKeyObj = PublicKey.fromString(publicKeyHex);
        let json = pubKeyObj.toJSON();
        return json;
    }
}

export class Signer {
    public static signData (bufferData: string, privateKey: string): string {
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
        Util.arrayCopy(r.toArray("le"), 0, buffer64, 0, 32);
        Util.arrayCopy(s.toArray("le"), 0, buffer64, 32, 32);

        const signedData = rs.hextob64u(rs.BAtohex(buffer64));
        return signedData;
    }

    public static verifyData (data: string, signature: string, publicKey: string): boolean {
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

    private static uncompress (key): Buffer  {
        if (!key.compressed) {
            throw new Error('Public key is not compressed.');
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

    private static getPublicFromPrivateKey (privateKey: string): Buffer {
        return PrivateKey.fromBuffer(privateKey).publicKey;
    }
}

export class MnemonicManager {
    public static readonly WORDLIST = {
        EN: bip39.wordlists.english,
        CN: bip39.wordlists.chinese_simplified,
        FR: bip39.wordlists.french,
        IT: bip39.wordlists.italian,
        JP: bip39.wordlists.japanese,
        SP: bip39.wordlists.spanish
    }

    public static generateMnemonic(lang: string = 'en', wordlist: string[] = []): string {
        return bip39.generateMnemonic(128, randombytes, wordlist.length > 0 ? wordlist : this.WORDLIST[lang.toUpperCase()]);
    }

    public static async getSeedFromMnemonic (mnemonic: string, password:string|undefined): Promise<Buffer> {
        return await bip39.mnemonicToSeed(mnemonic, password);
    }
}

export class DIDUtil {

    public static async rpcResolveDID (did: string, rpcHost: string): Promise<any> {
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

    private static generateDIDFromPublicKey (pubKey: string): Buffer {

        //GET REDEEM SCRIPT
        let pk = Buffer.from(pubKey).slice(0, 33);
        let script = new Uint8Array(35);
        script[0] = 33;
        Util.arrayCopy(pk, 0, script, 1, 33);
        script[34] = 0xAD;
        //-------------

        // sha256Ripemd160
        let hash = Hash.sha256ripemd160(script);
        //---------------

        // getBinAddress
        let hashProgram = new Uint8Array(hash.length + 1);
        hashProgram[0] = 0x67;
        Util.arrayCopy(hash, 0, hashProgram, 1, hash.length);

        hash = Hash.sha256sha256(hashProgram);

        let binAddress = new Uint8Array(hashProgram.length + 4);
        Util.arrayCopy(hashProgram, 0, binAddress, 0, hashProgram.length);
        Util.arrayCopy(hash, 0, binAddress, hashProgram.length, 4);
        //-------

        // getAddress
        return Base58.encode(Buffer.from(binAddress));
    }
}
