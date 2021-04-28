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

import { Mnemonic } from "../mnemonic";
import { crypto } from "bitcore-lib";
import { HDKey as DeterministicKey} from "../hdkey-secp256r1";
import { Base58 } from './base58';
import { SHA256 } from "./sha256";
import { KeyPair } from "./keypair";

export class HDKey {
	public static PUBLICKEY_BYTES = 33;
	public static PRIVATEKEY_BYTES = 32;
	public static SEED_BYTES = 64;
	public static EXTENDED_KEY_BYTES = 82;
	public static EXTENDED_PRIVATEKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
	public static EXTENDED_PUBLICKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
	public static HARDENED_BIT = 0x80000000;
    private static PADDING_IDENTITY = 0x67;
    private static PADDING_STANDARD = 0xAD;

	private static bip32HeaderP2PKHpub = 0x0488b21e; // The 4 byte header that serializes in base58 to "xpub".
    private static bip32HeaderP2PKHpriv = 0x0488ade4; // The 4 byte header that serializes in base58 to "xprv"
    private static bip32HeaderP2WPKHpub = 0x04b24746; // The 4 byte header that serializes in base58 to "zpub".
    private static bip32HeaderP2WPKHpriv = 0x04b2430c; // The 4 byte header that serializes in base58 to "zprv"

	// Derive path: m/44'/0'/0'/0/index
	public static DERIVE_PATH_PREFIX = "m/44'/0'/0'/0/" //"44H/0H/0H/0/";

	// Pre-derive publickey path: m/44'/0'/0'
	public static PRE_DERIVED_PUBLICKEY_PATH = "m/44'/0'/0'" //"44H/0H/0H";

	public static newWithMnemonic(mnemonic: string, passphrase: string): HDKey {
		let seed = Mnemonic.toSeed(mnemonic, passphrase)
		
		return HDKey.newWithSeed(seed);
	}

	public static newWithSeed(seed: Buffer): HDKey {
		return HDKey.newWithKey(DeterministicKey.fromMasterSeed(seed));
	}

	public static newWithKey(key: DeterministicKey): HDKey {
		return new HDKey(key)
	}

	private constructor(private root: DeterministicKey) {
 }

	public getPrivateKeyBytes(): Buffer {
		return this.root.privateKey;
	}

	public getPrivateKeyBase58(): string {
		return Base58.encode(this.root.privateKey)
	}

	public getPublicKeyBytes(): Buffer {
		return this.root.publicKey
	}

	public getPublicKeyBase58(): string {
		return Base58.encode(this.root.publicKey)
	}

	public serialize(): Buffer {
		return Base58.decode(this.serializeBase58());
	}

	public serializeBase58(): string {
		return Base58.encode(HDKey.paddingToExtendedPrivateKey(this.getPrivateKeyBytes()));
	}

	public serializePublicKey(): Buffer {
		return Base58.decode(this.serializePublicKeyBase58()) ;
	}

    public serializePublicKeyBase58(): string {
		return Base58.encode(this.root.publicKey);
    }

	public static deserialize(keyData: Buffer): HDKey {
		return this.deserializeBase58(Base58.encode(keyData));
	}

	public static deserializeBase58(keyData: string): HDKey {
		return new HDKey(DeterministicKey.fromExtendedKey(keyData));
	}

	public static paddingToExtendedPrivateKey(pk: Buffer): Buffer {

		let extendedPrivateKeyBytes = Buffer.alloc(HDKey.EXTENDED_PRIVATEKEY_BYTES)
		let version = this.bip32HeaderP2PKHpriv;
		extendedPrivateKeyBytes[0] = ((version >> 24) & 0xFF)
		extendedPrivateKeyBytes[1] = ((version >> 16) & 0xFF)
		extendedPrivateKeyBytes[2] = ((version >> 8) & 0xFF)
		extendedPrivateKeyBytes[3] = (version & 0xFF)

		pk.copy(extendedPrivateKeyBytes, 46, 0, 32)

		let buftoHash = Buffer.alloc(78);
		extendedPrivateKeyBytes.copy(buftoHash, 0 , 0 , 78)
		let hash = SHA256.hashTwice(buftoHash)
		hash.copy(extendedPrivateKeyBytes, 78, 0, 4)

		return extendedPrivateKeyBytes

	}

	public static paddingToExtendedPublicKey(pk: Buffer): Buffer{
		let extendedPublicKeyBytes = Buffer.alloc(HDKey.EXTENDED_PUBLICKEY_BYTES)
		let version = this.bip32HeaderP2PKHpub;
		extendedPublicKeyBytes[0] = ((version >> 24) & 0xFF)
		extendedPublicKeyBytes[1] = ((version >> 16) & 0xFF)
		extendedPublicKeyBytes[2] = ((version >> 8) & 0xFF)
		extendedPublicKeyBytes[3] = (version & 0xFF)

		pk.copy(extendedPublicKeyBytes, 45, 0, 33)

		let buftoHash = Buffer.alloc(78);
		extendedPublicKeyBytes.copy(buftoHash, 0 , 0 , 78)
		let hash = SHA256.hashTwice(buftoHash)
		hash.copy(extendedPublicKeyBytes, 78, 0, 4)

		return extendedPublicKeyBytes
	}

	

	public deriveWithPath(path: string): HDKey {
		return new HDKey(this.root.derive(path));
	}

	public deriveWithIndex(index: number, hardened: boolean = false): HDKey {
		if (hardened) index += HDKey.HARDENED_BIT;
		return new HDKey(this.root.deriveChild(index));	
	}

	/*
    public getJCEKeyPair(): KeyPair {
    	let paramSpec = new ECNamedCurveSpec(
        		"secp256r1", CURVE_PARAMS.getCurve(), CURVE_PARAMS.getG(),
        		CURVE_PARAMS.getN(), CURVE_PARAMS.getH());

        KeyFactory keyFactory = null;
		try {
			keyFactory = KeyFactory.getInstance("EC");
		} catch (NoSuchAlgorithmException ignore) {
			// never happen
		}

    	PublicKey pub = null;
    	PrivateKey priv = null;

    	try {
    		ECPublicKeyParameters pubParams = new ECPublicKeyParameters(
    				CURVE_PARAMS.getCurve().decodePoint(getPublicKeyBytes()), CURVE);
    		ECPublicKeySpec pubSpec = new ECPublicKeySpec(new java.security.spec.ECPoint(
    				pubParams.getQ().getXCoord().toBigInteger(),
    				pubParams.getQ().getYCoord().toBigInteger()), paramSpec);
    		pub = keyFactory.generatePublic(pubSpec);

	    	if (key.hasPrivKey()) {
	    		BigInteger keyInt = new BigInteger(1, getPrivateKeyBytes());
	    		ECPrivateKeySpec privSpec = new ECPrivateKeySpec(keyInt, paramSpec);
	    		priv = keyFactory.generatePrivate(privSpec);
	    	}
		} catch (InvalidKeySpecException e) {
			throw new UnknownInternalException(e);
		}
    	return new KeyPair(pub, priv);
    }
	*/

	private static getRedeemScript(pk: Buffer): Buffer {
		let script = Buffer.alloc(35)
		script[0] = 33;
		pk.copy(script,1);
		script[34] = HDKey.PADDING_STANDARD;
		return script;
	}

	

	private static getBinAddressFromBuffer(pk: Buffer): Buffer {
		let script = this.getRedeemScript(pk);

		let hash = crypto.Hash.sha256ripemd160(script);
		let programHash = Buffer.alloc(hash.length + 1);
		programHash[0] = HDKey.PADDING_IDENTITY;
		hash.copy(programHash,1);

		hash = crypto.Hash.sha256sha256(programHash)
		let binAddress = Buffer.alloc(programHash.length + 4);
		programHash.copy(binAddress, 0)
		hash.copy(binAddress, programHash.length, 0, 4)

		return binAddress;
	}

	public getBinAddress(): Buffer {
		return HDKey.getBinAddressFromBuffer(this.getPublicKeyBytes());
	} 

	public getAddress(): string {



		let binAddress = this.getBinAddress()

		return Base58.encode(binAddress);
	} 

	public static toAddress(pk: Buffer): string {
		return Base58.encode(this.getBinAddressFromBuffer(pk));
	}

	public static isAddressValid(address: string): boolean {
		let binAddress = Base58.decode(address);

		if (binAddress.length != 25)
			return false;

		if (binAddress[0] != HDKey.PADDING_IDENTITY)
			return false;

		// Hash twice
		let hash = SHA256.hashTwice(Buffer.from(binAddress.toString("hex").substr(0,21)))

		return (hash[0] == binAddress[21] && hash[1] == binAddress[22]
				&& hash[2] == binAddress[23] && hash[3] == binAddress[24]);
	}

	/*public sign(sha256Hash: string): string {
		let sig = this.key.sign(Sha256Hash.wrap(sha256Hash));
		return sig.encodeToDER();
	}

	public signData(...inputs: string[]): string {
		let hash = this.sha256Digest(inputs);

		return this.sign(hash);
	}

	public verify(sha256Hash: string, signature: string): boolean {
		try {
			return this.key.verify(sha256Hash, signature);
		} catch (e) {
			// SignatureDecodeException
			return false;
		}
	}

	public verifyData(signature: string, byte[] ... inputs): boolean {
		let hash = this.sha256Digest(inputs);
		return this.verify(hash, signature);
	}

	private static sha256Digest(byte[] ... inputs): string {
		byte digest[] = new byte[32];

		SHA256Digest sha256 = new SHA256Digest();

		for (byte[] input : inputs)
			sha256.update(input, 0, input.length);

		sha256.doFinal(digest, 0);

		return digest;
	} */

	public wipe() {
		// TODO
	}
}
