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

import crypto from "crypto"
import { BASE64 } from "./base64";

export class Aes256cbc {
	private static generateKeyAndIv(passwd: string): {key: string, iv: string} {

		let bufferPassword : Buffer = Buffer.from(passwd, "utf-8")

		let first16KeyBytesInHex = crypto
		.createHash('md5')
		.update(bufferPassword)
		.digest("hex");

		let last16KeyBytesInHex = crypto
		.createHash('md5')
		.update(Buffer.from(first16KeyBytesInHex, "hex"))
		.update(bufferPassword)
		.digest("hex")

		let iv = crypto
		.createHash('md5')
		.update(Buffer.from(last16KeyBytesInHex, "hex"))
		.update(bufferPassword)
		.digest("hex");

		return {
			key: first16KeyBytesInHex + last16KeyBytesInHex,
			iv
		};

	}

	public static encrypt(plain: Buffer, passwd: string): Buffer {
		let { key, iv } = Aes256cbc.generateKeyAndIv(passwd);

		let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
		let encrypted = cipher.update(plain.toString("utf-8"), 'utf8', 'base64');
		encrypted += cipher.final('base64');
		return Buffer.from(encrypted, "base64")
	}

	public static decrypt(secret: Buffer, passwd: string): Buffer {

		let { key, iv } = this.generateKeyAndIv(passwd);

		let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
		let decrypted = decipher.update(secret);
		decrypted = Buffer.concat([decrypted, decipher.final()]);

		return decrypted

	}

	public static encryptToBase64(plain: Buffer, passwd: string): string {
		let secret = this.encrypt(plain, passwd);
		return BASE64.toUrlFormat(secret.toString("base64"))
	}

	public static decryptFromBase64(base64Secret: string, passwd: string): Buffer {
		let secret = Buffer.from(BASE64.fromUrlFormat(base64Secret), "base64")
		return Aes256cbc.decrypt(secret, passwd);
	}
}
