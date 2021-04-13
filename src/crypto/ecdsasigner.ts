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

import { KJUR, hextob64u, BAtohex, ArrayBuffertohex, b64toBA, b64utob64 } from "jsrsasign";
import { crypto, PublicKey } from "bitcore-lib";
import BN from "bn.js";
import { uint8ArrayCopy } from "../utils";

crypto.Point.setCurve('p256');

export class EcdsaSigner {
	// NOTE: Ned to convert bitcoin spec private key to ECDSA spec key before signing.
	public static sign(privateKey: string, digest: string): string {
		let ec = new KJUR.crypto.ECDSA({curve: "secp256r1"});
        ec.setPrivateKeyHex(privateKey);
        let dataSigner = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        dataSigner.init(ec);
        dataSigner.updateHex(digest);

        let signed = dataSigner.sign();
        let compact = KJUR.crypto.ECDSA.asn1SigToConcatSig(signed);
        let r = new BN(compact.slice(0, compact.length / 2), "hex", "le");
        let s = new BN(compact.slice(compact.length / 2), "hex", "le");

        if (r.isNeg()) r = r.ineg();
        if (s.isNeg()) s = s.ineg();

        let buffer64 = new Uint8Array(64);
        uint8ArrayCopy(r.toArrayLike(Buffer, "le"), 0, buffer64, 0, 32);
        uint8ArrayCopy(s.toArrayLike(Buffer, "le"), 0, buffer64, 32, 32);

        const signedData = hextob64u(ArrayBuffertohex(buffer64));
        return signedData;

		/* Java:
		BigInteger keyInt = new BigInteger(1, privateKey);

		ECPrivateKeyParameters keyParams = new ECPrivateKeyParameters(
				keyInt, CURVE);

		ECDSASigner signer = new ECDSASigner(
				new RandomDSAKCalculator());
		signer.init(true, keyParams);

		BigInteger[] rs = signer.generateSignature(digest);

		byte[] r = bigIntegerToBytes(rs[0], 32);
		byte[] s = bigIntegerToBytes(rs[1], 32);

		byte[] sig = new byte[r.length + s.length];
		System.arraycopy(r, 0, sig, 0, r.length);
		System.arraycopy(s, 0, sig, r.length, s.length);

		return sig.toString();*/
	}

	public static signData(privateKey: string, ...data: Buffer[]): string {
		return this.sign(privateKey, this.sha256Digest(...data));
	}

	public static verify(publicKey: Buffer | string, signature: string, data: string): boolean {
		if (publicKey instanceof Buffer)
			publicKey = publicKey.toString();

		let pubKeyObj = PublicKey.fromString(publicKey);
        let signer = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
		//new KJUR.crypto.Signature()

		signer.init(new KJUR.crypto.ECDSA({ pub: publicKey, curve: 'secp256r1' }));
        // Java: signer.init( { xy: this.uncompress(pubKeyObj).toString('hex'), curve: 'secp256r1' });
        signer.updateHex(data);
        let signatureBA = b64toBA(b64utob64(signature))

        let r = new BN(signatureBA.slice(0, 32), 'hex', "le");
        let s = new BN(signatureBA.slice(32), 'hex', "le");
        let asn1 = KJUR.crypto.ECDSA.hexRSSigToASN1Sig(BAtohex(r.toArray("le")), BAtohex(s.toArray("le")));

        return signer.verify(asn1);

		/*
		Java:
		if (sig.length != 64) {
			return false;
		}

		ECPublicKeyParameters keyParams = new ECPublicKeyParameters(
				CURVE_PARAMS.getCurve().decodePoint(publicKey), CURVE);

		ECDSASigner signer = new ECDSASigner(
				new RandomDSAKCalculator());
		signer.init(false, keyParams);

		byte rb[] = new byte[sig.length / 2];
		byte sb[] = new byte[sig.length / 2];
		System.arraycopy(sig, 0, rb, 0, rb.length);
		System.arraycopy(sig, sb.length, sb, 0, sb.length);
		BigInteger r = parseBigIntegerPositive(new BigInteger(rb), rb.length * 8);
		BigInteger s = parseBigIntegerPositive(new BigInteger(sb), rb.length * 8);

		return signer.verifySignature(digest, r, s); */
	}

	/* private static uncompress (key: PublicKey): Buffer  {
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
    } */

	public static verifyData(publicKey: string, sig: string, ...data: Buffer[]): boolean {
		return this.verify(publicKey, sig, this.sha256Digest(...data));
	}

	public static sha256Digest(...inputs: Buffer[]): string {
		// Flatten inputs into a big string - NOT good for memory - to be improved
		let fullInput = inputs.reduce((prev, curr) => prev + curr, "");
		return crypto.Hash.sha256(Buffer.from(fullInput)).toString();

		/* Java:
		crypto.Hash.sha256()
		byte digest[] = new byte[32];

		SHA256Digest sha256 = new SHA256Digest();

		for (byte[] input : inputs)
			sha256.update(input, 0, input.length);

		sha256.doFinal(digest, 0);

		return digest;
		*/
	}

	/* private static BigInteger parseBigIntegerPositive(BigInteger b, int bitlen) {
		if (b.compareTo(BigInteger.ZERO) < 0)
			b = b.add(BigInteger.ONE.shiftLeft(bitlen));
		return b;
	} */

	/* private static bigIntegerToBytes(BigInteger value, int bytes): string {
		byte[] src = value.toByteArray();
		boolean signByte = src[0] == 0;

		int length = signByte ? src.length - 1 : src.length;
		if (length > bytes)
			throw new IllegalArgumentException(
					"Excepted length is samll than BigInteger.");

		byte[] dest = new byte[bytes];
		int srcPos = signByte ? 1 : 0;
		int destPos = bytes - length;
		System.arraycopy(src, srcPos, dest, destPos, length);

		return dest;
	} */
}
