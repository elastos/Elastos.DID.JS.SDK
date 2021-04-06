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

export class Aes256cbc {
	private static generateKeyAndIv(passwd: string): {key: string, iv: CryptoJS.lib.WordArray} {
		// Create key from passwd
		let key = CryptoJS.MD5(passwd).toString();
		key = CryptoJS.MD5(key.substr(0,16)+passwd).toString();
		let iv = CryptoJS.MD5(key.substr(15,16)+passwd);

		return {
			key,
			iv
		};

		/* NOTE: REFERENCE JAVA IMPLEMENTATION - TO BE TESTED! I'M UNSURE OF THIS CryptoJS CONVERSION FOR NOW */
		/*MD5Digest md = new MD5Digest();
		md.update(pass, 0, pass.length);
		md.doFinal(key, 0);

		md.reset();
		md.update(key, 0, 16);
		md.update(pass, 0, pass.length);
		md.doFinal(key, 16);

		// Create iv from passwd
		md.reset();
		md.update(key, 16, 16);
		md.update(pass, 0, pass.length);
		md.doFinal(iv, 0);*/
	}

	public static encrypt(plain: string, passwd: string): CryptoJS.lib.WordArray {
		let { key, iv } = Aes256cbc.generateKeyAndIv(passwd);

		let cipher = CryptoJS.AES.encrypt(plain, key, {
			iv: iv,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7
		});

		return cipher.ciphertext;

		/* NOTE: REFERENCE JAVA IMPLEMENTATION - TO BE TESTED! I'M UNSURE OF THIS CryptoJS CONVERSION FOR NOW */
		/*KeyParameter keyParam = new KeyParameter(key);
		ParametersWithIV keyWithIv = new ParametersWithIV(keyParam, iv);

		BufferedBlockCipher cipher = new PaddedBufferedBlockCipher(new CBCBlockCipher(new AESEngine()));
        cipher.init(true, keyWithIv);

        byte[] secret = new byte[cipher.getOutputSize(length)];
        int len = cipher.processBytes(plain, offset, length, secret, 0);
		len += cipher.doFinal(secret, len);

		if (len < secret.length)
        	plain = Arrays.copyOf(secret, len);

		return secret;*/
	}

	public static decrypt(secret:  CryptoJS.lib.WordArray | string, passwd: string): CryptoJS.lib.WordArray {
		if ("words" in (secret as CryptoJS.lib.WordArray)) // "words" exists only in WordArray.
			secret = secret.toString();

		let { key, iv } = this.generateKeyAndIv(passwd);

		let cipher = CryptoJS.AES.encrypt(secret, key, {
			iv: iv,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7
		});

		return cipher.ciphertext;
	}

	public static encryptToBase64(plain: string, passwd: string): string {
		let secret = this.encrypt(plain, passwd);
		return CryptoJS.enc.Base64.stringify(secret);
		// TODO: DOES CRYPTOJS ALREADY HANDLE URL_SAFE, ETC? return Base64.encodeToString(secret,Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
	}

	public static decryptFromBase64(base64Secret: string, passwd: string): string {
		let secret = CryptoJS.enc.Base64.parse(base64Secret);
		// TODO: CHECK CRYPTOJS let secretBytes =  Base64.decode(secret, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
		return Aes256cbc.decrypt(secret, passwd).toString();
	}
}
