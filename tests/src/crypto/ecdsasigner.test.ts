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

import { Base58, BASE64, EcdsaSigner, HDKey, Mnemonic } from "@elastosfoundation/did-js-sdk";

describe('ECSDA Signer Tests', () => {
    let plain: string = "The quick brown fox jumps over the lazy dog.";
    let nonce: string = "testcase";
    var key: HDKey;
    var sig: Buffer;

    beforeAll(() => {
        let mc= Mnemonic.getInstance();
        let mnemonic = mc.generate();
        let root = HDKey.newWithMnemonic(mnemonic, "");
        key = root.deriveWithPath(HDKey.DERIVE_PATH_PREFIX + 0)
        sig = EcdsaSigner.signData(key.getPrivateKeyBytes(), Buffer.from(plain, "utf-8"), Buffer.from(nonce, "utf-8"))
        expect(sig).toBeDefined()
    });
    test('Verify signature is correct', () => {
        let response = EcdsaSigner.verifyData(key.getPublicKeyBytes(), sig, Buffer.from(plain, "utf-8"), Buffer.from(nonce, "utf-8"))

        expect(response).toBeTruthy()
    });


    test('Verify signature is not valid', () => {

        let modSig = Buffer.from(sig);
        modSig[8] +=1;
        let response = EcdsaSigner.verifyData(key.getPublicKeyBytes(), modSig, Buffer.from(plain, "utf-8"), Buffer.from(nonce, "utf-8"))

        expect(response).toBeFalsy();
    });


    test('Verify signature is not valid when change nonce', () => {
        let response = EcdsaSigner.verifyData(key.getPublicKeyBytes(), sig, Buffer.from(plain, "utf-8"), Buffer.from("testcase0", "utf-8"))

        expect(response).toBeFalsy()
    });

    test('Verify signature is not valid with different digest value', () => {
        let response = EcdsaSigner.verifyData(key.getPublicKeyBytes(), sig, Buffer.from(plain, "utf-8"))

        expect(response).toBeFalsy()
    });


    test('Compatibility', () =>{
        let input = 'abcdefghijklmnopqrstuvwxyz';
        let pkBase58 = 'voHKsUjoPSJSQKWLJHWYzUfEv3NEaRUyJReoZVS6XCYM';
        let expectedSig1 = "SlDq9rsEQJgS83ydi2cPMiwXm6SgJCuwYwx_NqpOwf5IQcbfUM574GHThnvJ5lgTeyeOwVcxbWyQxehlK3MO-A";
        let expectedSig2 = "gm4Bx8ijQjBEFsf1Cm1mHcqSzFHquoQe235uzL3OUDJiIuFnJ49lEWn0RueIfgCZbrDEhLdxKSaNYqnBpjiR6A";


        let pkBytes = Base58.decode(pkBase58);

        var sigToTest = Buffer.from(BASE64.decode(expectedSig1), "hex")

        let isSig1Valid = EcdsaSigner.verifyData(pkBytes , sigToTest, Buffer.from(input, "utf-8"))
        expect(isSig1Valid).toBeTruthy()

        var sigToTest2 = Buffer.from(BASE64.decode(expectedSig2), "hex")

        let isSig2Valid = EcdsaSigner.verifyData(pkBytes, sigToTest2, Buffer.from(input, "utf-8"))
        expect(isSig2Valid).toBeTruthy()
    })
  });

