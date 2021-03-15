const { constants } = require("../constants")
const rs = require('jsrsasign')
const bip39 = require('bip39')
const { Buffer } = require('buffer')
const randombytes = require('randombytes')
const createHash = require('create-hash')
const { HDPrivateKey, HDPublicKey, PrivateKey, PublicKey, encoding, crypto } = require('bitcore-lib-curve');
const { has } = require("lodash")
const { BN, Hash, Point } = crypto
const { Base58, Base58Check } = encoding
const { BigInteger, Base64x, KEYUTIL } = require("jsrsasign")
const js = require("bitcore-lib-curve/lib/util/js")
var EC = require('elliptic').ec;

Point.setCurve('p256')

const generateMnemonic = (lang = 'en', wordlist = []) => {
    let wordListMap = {
        en: bip39.wordlists.english,
        cn: bip39.wordlists.chinese_simplified,
        fr: bip39.wordlists.french,
        it: bip39.wordlists.italian,
        jp: bip39.wordlists.japanese,
        sp: bip39.wordlists.spanish,
    }

    return bip39.generateMnemonic(128, randombytes, wordlist.length > 0 ? wordlist : wordListMap[lang])
}

const getSeedFromMnemonic = async (mnemonic, password = null) => {
    return await bip39.mnemonicToSeed(mnemonic, password);
}


const generateSubPrivateKey = (seed, coinType = constants.coinTypes.ELA, changeChain = constants.changeChain.EXTERNAL, index = 0) => {
    const prvKey = HDPrivateKey.fromSeed(seed)
    const parent = new HDPrivateKey(prvKey.xprivkey)
    const privateKey = parent
        .deriveChild(44, true)
        .deriveChild(coinType, true)
        .deriveChild(0, true)
        .deriveChild(changeChain, false)
        .deriveChild(index, false)
    return privateKey.privateKey

}

const getMasterPublicKey = (seed, coinType = constants.coinTypes.ELA) => {
    const prvKey = HDPrivateKey.fromSeed(seed)
    const parent = new HDPrivateKey(prvKey.xprivkey)
    const multiWallet = parent
        .deriveChild(44, true)
        .deriveChild(coinType, true)
        .deriveChild(0, true)
    return multiWallet.xpubkey
}

const generateSubPublicKey = (masterPublicKey, changeChain = constants.changeChain.EXTERNAL, index = 0) => {
    const parent = new HDPublicKey(masterPublicKey);
    const multiWallet = parent
        .deriveChild(changeChain)
        .deriveChild(index);



    return multiWallet.publicKey
}

const getAddressBase = (pubKey, signType) => {

    const pubKeyBuf = Buffer.from(pubKey, 'hex')
    const code = Buffer.concat([Buffer.from([0x21]), pubKeyBuf, Buffer.from([constants.signTypeMap[signType].type])])
    const hashBuf = Hash.sha256ripemd160(code)
    const programHashBuf = Buffer.concat([Buffer.from([constants.signTypeMap[signType].address]), hashBuf])

    return Base58Check.encode(programHashBuf)
}

const getPublicFromPrivateKey = (privateKey) => {
    PrivateKey.fromBuffer(privateKey).publicKey
}

function arrayCopy(src, srcIndex, dest, destIndex, length) {
    let values = [...src.slice(srcIndex, srcIndex + length)]
    dest.set(values, destIndex);
}


const getpublicKeyBase58 = (masterPublicKey, changeChain = constants.changeChain.EXTERNAL, index = 0) => {

    const parent = new HDPublicKey(masterPublicKey);
    const multiWallet = parent
        .deriveChild(changeChain)
        .deriveChild(index);

    return Base58.encode(Buffer.from(multiWallet._buffers.publicKey))
}

const generateDIDFromPublicKey = (pubKey) => {

    //GET REDEEM SCRIPT
    let pk = Buffer.from(pubKey).slice(0, 33);
    let script = new Uint8Array(35);
    script[0] = 33;
    arrayCopy(pk, 0, script, 1, 33)
    script[34] = 0xAD
    //-------------

    // sha256Ripemd160
    let hash = Hash.sha256ripemd160(script)
    //---------------

    // getBinAddress
    let hashProgram = new Uint8Array(hash.length + 1)
    hashProgram[0] = 0x67
    arrayCopy(hash, 0, hashProgram, 1, hash.length);

    hash = Hash.sha256sha256(hashProgram)

    let binAddress = new Uint8Array(hashProgram.length + 4)
    arrayCopy(hashProgram, 0, binAddress, 0, hashProgram.length);
    arrayCopy(hash, 0, binAddress, hashProgram.length, 4);
    //-------

    // getAddress
    return Base58.encode(Buffer.from(binAddress))
}




const getBase58 = (pubKey) => {
    return Base58.encode(Buffer.from(pubKey))
}



const addReadOnlyPropertyToObject = (obj, prop, value) => {
    Object.defineProperty(obj, prop, {
        value: value,
        writable: false
    });

}

const getPublicKey = (publicKeyHex) => {
    let pubKeyObj = PublicKey.fromString(publicKeyHex)
    let json = pubKeyObj.toJSON()
    return json
}

const signData = (bufferData, privateKey) => {
    let ec = new rs.KJUR.crypto.ECDSA({curve: "secp256r1"})
    ec.setPrivateKeyHex(privateKey)

    
    
    let dataSigner = new rs.KJUR.crypto.Signature({ alg: "SHA256withECDSA" })
    dataSigner.init(ec)
    dataSigner.updateHex(bufferData)



    let signed = dataSigner.sign()
    
    let compact = rs.KJUR.crypto.ECDSA.asn1SigToConcatSig(signed)
    let r = new BN(compact.slice(0, compact.length / 2), "hex", "le")
    let s = new BN(compact.slice(compact.length / 2), "hex", "le")

    if (r.isNeg()) r = r.ineg()
    if (s.isNeg()) s = s.ineg()

    let buffer64 = new Uint8Array(64)
    arrayCopy(r.toArray("le"), 0, buffer64, 0, 32)
    arrayCopy(s.toArray("le"), 0, buffer64, 32, 32)

    const signedData = rs.hextob64u(rs.BAtohex(buffer64))
    return signedData
}

const verifyData = (data, signature, publicKey) => {
    let pubKeyObj = PublicKey.fromString(publicKey)
    
    let signer = new rs.KJUR.crypto.Signature({ alg: 'SHA256withECDSA' })

    signer.init({ xy: uncompress(pubKeyObj).toString('hex'), curve: 'secp256r1' })
    signer.updateHex(data)
    
    let signatureBA = rs.b64toBA(rs.b64utob64(signature))

    let r = new BN(signatureBA.slice(0, 32), Number, "le")
    let s = new BN(signatureBA.slice(32), Number, "le")
    
    let asn1 = rs.KJUR.crypto.ECDSA.hexRSSigToASN1Sig(rs.BAtohex(r.toArray("le")),rs.BAtohex(s.toArray("le")))

    return signer.verify(asn1)
}

const uncompress = key => {
    if (!key.compressed) {
        throw new Error('Publick key is not compressed.')
    }

    const x = key.point.getX()
    const y = key.point.getY()

    const xbuf = x.toBuffer({
        size: 32,
    })

    const ybuf = y.toBuffer({
        size: 32,
    })

    return Buffer.concat([Buffer.from([0x04]), xbuf, ybuf])
}

const setToJSON = obj => {
    Object.defineProperty(obj, 'toJSON', {
        value: function () {
            var alt = {};

            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);

            return alt;
        },
        configurable: true,
        writable: true
    });
}

const getTimestamp = () => {
    return Math.floor(Date.now() / 1000)
}

const rpcResolveDID = async (did, rpcHost) =>{
    let didKey = did.replace("did:elastos:", "")

    let body = {
        "jsonrpc": '2.0',
        "id": "1",
        "method": "resolvedid",
        "params": {
            "did": didKey,
            "all": true
        }
    }

    let rpcResponse = await fetch(rpcHost, {
        "method": "POST",
        "headers": {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        "body": JSON.stringify(body)
    })


    if (!rpcResponse.ok) throw new Error(`Error on Elastos RPC Call - ${rpcResponse.status} : ${rpcResponse.statusText}`)

    return await rpcResponse.json()
}

module.exports.core = {
    generateMnemonic,
    getSeedFromMnemonic,
    generateSubPrivateKey,
    getMasterPublicKey,
    generateSubPublicKey,
    getAddressBase,
    getBase58,
    getpublicKeyBase58,
    addReadOnlyPropertyToObject,
    signData,
    verifyData,
    setToJSON,
    getTimestamp,
    getPublicKey,
    rpcResolveDID
}
