import { Constants } from "../constants"
import { Core } from "../core"
const bip39 = require('bip39')

export class Did {

    private core: Core

    public constructor (code: Core) {
        this.core = core;
    }

    public async generateNew (password = "") {
        let mnemonic = this.core.generateMnemonic(password);
        return await this.loadFromMnemonic(mnemonic, password);
    }

    public async loadFromMnemonic (mnemonic, password = "", index = 0) {
        if (!bip39.validateMnemonic(mnemonic)) {
            return null;
        }
        let seed = await this.core.getSeedFromMnemonic(mnemonic, password);
        let privateKey = this.core.generateSubPrivateKey(this.buf2hex(seed), Constants.coinTypes.ELA, Constants.changeChain.EXTERNAL, index).toString('hex');
        let masterPublicKey = this.core.getMasterPublicKey(seed, Constants.coinTypes.ELA);
        let publicKey = this.core.generateSubPublicKey(masterPublicKey, Constants.changeChain.EXTERNAL, index).toString('hex')
        let did = this.core.getAddressBase(publicKey, Constants.signTypes.ELA_IDCHAIN).toString()
        let publicBase58 = this.core.getpublicKeyBase58(masterPublicKey)

        return {
            mnemonic: mnemonic,
            seed: this.buf2hex(seed),
            did: `did:elastos:${did}`,
            publicKey: publicKey,
            privateKey: privateKey,
            publicKeyBase58: publicBase58
        }

    }

    private buf2hex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }
}