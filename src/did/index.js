const {constants} = require('../constants')
const {core} = require('../core')


const generateNew = async (password) =>{
    let mnemonic = core.generateMnemonic(password);
    console.log(mnemonic)
    password = "";
    return await loadFromMnemonic(mnemonic, password);
}

const loadFromMnemonic = async (mnemonic, password, index = 0) =>{
    
    let seed = await core.getSeedFromMnemonic(mnemonic, password);
    let privateKey = core.generateSubPrivateKey(buf2hex(seed), constants.coinTypes.ELA, constants.changeChain.EXTERNAL, index).toString('hex');
    let masterPublicKey = core.getMasterPublicKey(seed, constants.coinTypes.ELA);
    let publicKey = core.generateSubPublicKey(masterPublicKey, constants.changeChain.EXTERNAL, index).toString('hex')
    let did = core.getAddressBase(publicKey, constants.signTypes.ELA_IDCHAIN).toString()
    let publicBase58 = core.getpublicKeyBase58(masterPublicKey)

    return {
        mnemonic: mnemonic,
        seed: buf2hex(seed),
        did: `did:elastos:${did}`,
        publicKey: publicKey,
        privateKey: privateKey,
        publicKeyBase58: publicBase58
    }

}

function buf2hex(buffer) { 
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }

module.exports.did = {
    generateNew,
    loadFromMnemonic
}

