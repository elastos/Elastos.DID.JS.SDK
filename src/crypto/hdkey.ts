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
import createHash  from 'create-hash';
import { Mnemonic } from "../mnemonic";
import { HDKey as DeterministicKey} from "../hdkey-secp256r1";
import { encode as encodeBase58, decode as decodeBase58 } from "bs58check";

export class HDKey {
	public static PUBLICKEY_BYTES = 33;
	public static PRIVATEKEY_BYTES = 32;
	public static SEED_BYTES = 64;
	public static EXTENDED_KEY_BYTES = 82;
	public static EXTENDED_PRIVATEKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;
	public static EXTENDED_PUBLICKEY_BYTES = HDKey.EXTENDED_KEY_BYTES;

    private static PADDING_IDENTITY = 0x67;
    private static PADDING_STANDARD = 0xAD;

	// Derive path: m/44'/0'/0'/0/index
	public static DERIVE_PATH_PREFIX = "44H/0H/0H/0/";

	// Pre-derive publickey path: m/44'/0'/0'
	public static PRE_DERIVED_PUBLICKEY_PATH = "44H/0H/0H";

	public static newWithMnemonic(mnemonic: string, passphrase: string): HDKey {
		return HDKey.newWithSeed(Mnemonic.toSeed(mnemonic, passphrase));
	}

	public static newWithSeed(seed: string): HDKey {
		return HDKey.newWithKey(DeterministicKey.fromMasterSeed(Buffer.from(seed)));
	}

	public static newWithKey(key: DeterministicKey): HDKey {
		return new HDKey(key);
	}

	private constructor(private key: DeterministicKey) {}

	public getPrivateKeyBytes(): string {
		return this.key.privateKey.toString();
	}

	public getPrivateKeyBase58(): string {
		return encodeBase58(this.getPrivateKeyBytes());
	}

	public getPublicKeyBytes(): string {
		return this.key.publicKey.toString();
	}

	public getPublicKeyBase58(): string {
		return encodeBase58(this.getPublicKeyBytes());
	}

	public serialize(): string {
		return decodeBase58(this.serializeBase58());
	}

	public serializeBase58(): string {
		return encodeBase58(this.key.privateExtendedKey);
		// JAVA: return this.key.serializePrivB58(MainNetParams.get());
	}

	public serializePublicKey(): string {
		return decodeBase58(this.serializePublicKeyBase58());
	}

    public serializePublicKeyBase58(): string {
		return encodeBase58(this.key.publicExtendedKey);
    	// JAVA: return this.key.serializePubB58(MainNetParams.get());
    }

	public static deserialize(keyData: string): HDKey {
		return this.deserializeBase58(encodeBase58(keyData));
	}

	public static deserializeBase58(keyData: string): HDKey {
		let k = DeterministicKey.fromExtendedKey(keyData);
		// JAVA: let k = DeterministicKey.deserializeB58(keyData, MainNetParams.get());
		return new HDKey(k);
	}

	/*public static paddingToExtendedPrivateKey(privateKeyBytes: string): string {
		byte[] extendedPrivateKeyBytes = new byte[EXTENDED_PRIVATEKEY_BYTES];

		int version = MainNetParams.get().getBip32HeaderP2PKHpriv();
		extendedPrivateKeyBytes[0] = (byte)((version >> 24) & 0xFF);
		extendedPrivateKeyBytes[1] = (byte)((version >> 16) & 0xFF);
		extendedPrivateKeyBytes[2] = (byte)((version >> 8) & 0xFF);
		extendedPrivateKeyBytes[3] = (byte)(version & 0xFF);

		System.arraycopy(privateKeyBytes, 0,
				extendedPrivateKeyBytes, 46, 32);

		byte[] hash = Sha256Hash.hashTwice(extendedPrivateKeyBytes, 0, 78);
		System.arraycopy(hash, 0, extendedPrivateKeyBytes, 78, 4);

		return extendedPrivateKeyBytes;
	}

	public static paddingToExtendedPublicKey(publicKeyBytes: string): string {
		let extendedPublicKeyBytes = new byte[EXTENDED_PUBLICKEY_BYTES];

		let version = MainNetParams.get().getBip32HeaderP2PKHpub();
		extendedPublicKeyBytes[0] = (byte)((version >> 24) & 0xFF);
		extendedPublicKeyBytes[1] = (byte)((version >> 16) & 0xFF);
		extendedPublicKeyBytes[2] = (byte)((version >> 8) & 0xFF);
		extendedPublicKeyBytes[3] = (byte)(version & 0xFF);

		System.arraycopy(publicKeyBytes, 0,
				extendedPublicKeyBytes, 45, 33);

		byte[] hash = Sha256Hash.hashTwice(extendedPublicKeyBytes, 0, 78);
		System.arraycopy(hash, 0, extendedPublicKeyBytes, 78, 4);

		return extendedPublicKeyBytes;
	}*/

	public deriveWithPath(path: string): HDKey {
		this.key.identifier
		return new HDKey(this.key.derive(path));
	}

	public deriveWithIndex(index: number, hardened: boolean = false): HDKey {
		return new HDKey(this.key.deriveChild(index + (hardened ? DeterministicKey.HARDENED_OFFSET : 0)));
	}

    /*public getJCEKeyPair(): KeyPair {
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

	private static getRedeemScript(pk: string): string {
		let script = new byte[35];
		script[0] = 33;
		System.arraycopy(pk, 0, script, 1, 33);
		script[34] = HDKey.PADDING_STANDARD;
		return script;
	}

	private static byte[] sha256Ripemd160(byte[] input) {
		byte[] sha256 = new byte[32];

		SHA256Digest sha256Digest = new SHA256Digest();
		sha256Digest.update(input, 0, input.length);
		sha256Digest.doFinal(sha256, 0);

		RIPEMD160Digest digest = new RIPEMD160Digest();
		digest.update(sha256, 0, sha256.length);
		byte[] out = new byte[20];
		digest.doFinal(out, 0);
		return out;
	}

	private static getBinAddress(pk: string): string {
		let script = this.getRedeemScript(pk);

		let hash = this.sha256Ripemd160(script);
		byte[] programHash = new byte[hash.length + 1];
		programHash[0] = PADDING_IDENTITY;
		System.arraycopy(hash, 0, programHash, 1, hash.length);

		hash = Sha256Hash.hashTwice(programHash);
		byte[] binAddress = new byte[programHash.length + 4];
		System.arraycopy(programHash, 0, binAddress, 0, programHash.length);
		System.arraycopy(hash, 0, binAddress, programHash.length, 4);

		return binAddress;
	}*/

	/* public getBinAddress(): string {
		return this.getBinAddress(this.getPublicKeyBytes());
	} */

	/* public getAddress(): string {
		return Base58.encode(getBinAddress());
	} */

	public static toAddress(pk: string): string {
		return encodeBase58(this.getBinAddress(pk));
	}

	public static isAddressValid(address: string): boolean {
		let binAddress = decodeBase58(address);

		if (binAddress.length != 25)
			return false;

		if (binAddress[0] != HDKey.PADDING_IDENTITY)
			return false;

		// Hash twice
		let bufferToHash = Buffer.from(binAddress.substr(0,21));
		var firstHash = createHash('sha256').update(bufferToHash).digest();
		let hash = createHash('sha256').update(firstHash).digest()

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
