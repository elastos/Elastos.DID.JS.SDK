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

import jsrsasign from "jsrsasign";
import { crypto, PrivateKey, PublicKey } from "bitcore-lib";
import BN from "bn.js";
import { SHA256 } from "./sha256";
import { BASE64 } from "./base64";
// import { uint8ArrayCopy } from "../utils";



export class EcdsaSigner {



	private static uint8ArrayCopy(src: Uint8Array, srcIndex: number, dest: Uint8Array, destIndex: number, length: number): void {
		let values = [...src.slice(srcIndex, srcIndex + length)];
		dest.set(values, destIndex);
	}



	// NOTE: Ned to convert bitcoin spec private key to ECDSA spec key before signing.
	public static sign(privateKey: Buffer | string, digest: Buffer): string {

		let ec = new jsrsasign.KJUR.crypto.ECDSA({curve: "secp256r1"});

		if (privateKey instanceof Buffer){
			ec.setPrivateKeyHex(privateKey.toString("hex"));
		} else {
			ec.setPrivateKeyHex(privateKey);
		}
        
        let dataSigner = new jsrsasign.KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        dataSigner.init(ec);
        dataSigner.updateHex(digest.toString("hex"));

        let signed = dataSigner.sign();

		let compact = jsrsasign.KJUR.crypto.ECDSA.asn1SigToConcatSig(signed);
        let r = new BN(compact.slice(0, compact.length / 2), "hex", "le");
        let s = new BN(compact.slice(compact.length / 2), "hex", "le");

        if (r.isNeg()) r = r.ineg();
        if (s.isNeg()) s = s.ineg();

		let a= new Array<number>();
		let hexBuffer = BASE64.fromByteArray(a.concat(r.toArray("le"), s.toArray("le")), true)
		console.log("compacted sig", hexBuffer)
        let signedData = jsrsasign.hextob64u(hexBuffer);
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

	

	public static signData(privateKey: Buffer | string, ...data: Buffer[]): string {
		return this.sign(privateKey, SHA256.encodeToBuffer(...data));
	}

	public static verify(publicKey: Buffer | string, signature: string, data: Buffer): boolean {
	
		let ec = new jsrsasign.KJUR.crypto.ECDSA({curve: "secp256r1"});
		console.log("pk", publicKey.toString("hex"))
			ec.setPublicKeyHex(publicKey.toString("hex"))	
		// if (publicKey instanceof Buffer){
		// 	console.log("pk", publicKey.toString("hex"))
		// 	ec.setPublicKeyHex(publicKey.toString("hex"))
		// } else {
		// 	ec.setPublicKeyHex(publicKey)
		// }
		
        let signer = new jsrsasign.KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
		signer.init(ec);
        signer.updateHex(data.toString("hex"));

        let signatureBA = BASE64.toByteArray(signature) 

        let r = new BN(signatureBA.slice(0, 32), 'hex', "le");
        let s = new BN(signatureBA.slice(32), 'hex', "le");

        let asn1 = jsrsasign.KJUR.crypto.ECDSA.hexRSSigToASN1Sig(jsrsasign.BAtohex(r.toArray("le")), jsrsasign.BAtohex(s.toArray("le")));

		console.log("ASN1", asn1)

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

	// private static uncompress (key: PublicKey): Buffer  {
    //     if (!key.compressed) {
    //         throw new Error('Public key is not compressed.');
    //     }

    //     const x = key.point.getX();
    //     const y = key.point.getY();

    //     const xbuf = x.toBuffer({
    //         size: 32,
    //     });

    //     const ybuf = y.toBuffer({
    //         size: 32,
    //     });

    //     return Buffer.concat([Buffer.from([0x04]), xbuf, ybuf]);
    // } 

	public static verifyData(publicKey: Buffer | string, sig: string, ...data: Buffer[]): boolean {
		return this.verify(publicKey, sig, SHA256.encodeToBuffer(...data));
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
