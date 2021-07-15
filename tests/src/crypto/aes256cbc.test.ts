/*
 * Copyright (c) 2019 Elastos Foundation
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

import { Aes256cbc, BASE64 } from "@elastosfoundation/did-js-sdk"

describe('Aes256cbc Encryption Tests', () => {
    const passwd: string = "secret";
    const plain: string = "The quick brown fox jumps over the lazy dog."
    const cipherBase64u: string = "TBimuq42IyD6FsoZK0AoCOt75uiL_gEepZTpgu59RYSV-NR-fqxsYfx0cyyzGacX";

    test('encrypt method', () => {
        let cipherResult: Buffer = Aes256cbc.encrypt(Buffer.from(plain, "utf-8"), passwd)
        let base64: string = BASE64.fromUrlFormat(cipherBase64u)
        let base64Buffer: Buffer = Buffer.from(base64, "base64")

        expect(cipherResult)
        .toEqual(base64Buffer)
    });

    test('decrypt method', () => {
        let base64: string = BASE64.fromUrlFormat(cipherBase64u)
        let base64Buffer: Buffer = Buffer.from(base64, "base64")
        let expectedBuffer: Buffer = Buffer.from(plain, "utf-8")
        let decipherResult: Buffer = Aes256cbc.decrypt(base64Buffer, passwd)

        expect(decipherResult)
        .toEqual(expectedBuffer)
    });

    test('encryptToBase64 method', () => {
        let cipherResult = Aes256cbc.encryptToBase64( Buffer.from(plain, "utf-8"), passwd)
        expect(cipherResult)
        .toBe(cipherBase64u);
    });

    test('decryptFromBase64 method', () => {
        let decipherResult = Aes256cbc.decryptFromBase64(cipherBase64u, passwd)
        expect(decipherResult.toString("utf-8"))
        .toBe(plain);
    });

    test('Compatibility', () => {

        let cipherResult = Aes256cbc.encryptToBase64(Buffer.from("brown bear what do you see", "utf-8"), "password")
        expect(cipherResult)
        .toBe("uK7mHw5JHRD2WS-BmA2b_4mUPD9WhttY9uAC_aw9Tdc");
    });
})

