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

import { HDKey } from "@elastosfoundation/did-js-sdk";

describe('HDKey Tests', () => {


    test('Test 0', () => {
        let expectedIDString = "iY4Ghz9tCuWvB5rNwvn4ngWvthZMNzEA7U";
        let mnemonic = "cloth always junk crash fun exist stumble shift over benefit fun toe";

        let root = HDKey.newWithMnemonic(mnemonic, "");
        let key = root.deriveWithPath(HDKey.DERIVE_PATH_PREFIX + "0")

        expect(key.getAddress()).toBe(expectedIDString)


        let sk = HDKey.paddingToExtendedPrivateKey(key.getPrivateKeyBytes());
        let rk = HDKey.deserialize(sk);

        expect(key.getPrivateKeyBase58()).toBe(rk.getPrivateKeyBase58())
        expect(key.getPublicKeyBase58()).toBe(rk.getPublicKeyBase58())
    });


    test('Test 1', () => {
        let expectedIDString = "iW3HU8fTmwkENeVT9UCEvvg3ddUD5oCxYA";
        let mnemonic = "service illegal blossom voice three eagle grace agent service average knock round";

        let root = HDKey.newWithMnemonic(mnemonic, "");
        let key = root.deriveWithPath(HDKey.DERIVE_PATH_PREFIX + "0")

        expect(key.getAddress()).toBe(expectedIDString)
        expect(key.getAddress()).toEqual(HDKey.toAddress(key.getPublicKeyBytes()));

        let sk = HDKey.paddingToExtendedPrivateKey(key.getPrivateKeyBytes());
        let rk = HDKey.deserialize(sk);

        expect(key.getPrivateKeyBase58()).toBe(rk.getPrivateKeyBase58())
        expect(key.getPublicKeyBase58()).toBe(rk.getPublicKeyBase58())
    });

    test('Test 2', () => {
        let mnemonic = "pact reject sick voyage foster fence warm luggage cabbage any subject carbon";
        let expectedKey = "xprv9s21ZrQH143K4biiQbUq8369meTb1R8KnstYFAKtfwk3vF8uvFd1EC2s49bMQsbdbmdJxUWRkuC48CXPutFfynYFVGnoeq8LJZhfd9QjvUt";
        let root = HDKey.newWithMnemonic(mnemonic, "helloworld");
        let key = root.serializeBase58();
        expect(key).toBe(expectedKey)

        let rk = HDKey.deserializeBase58(key);

        expect(rk.getPrivateKeyBase58()).toBe(root.getPrivateKeyBase58())
        expect(rk.getPublicKeyBase58()).toBe(root.getPublicKeyBase58())
    });


    test('Test Derive Public Only', () => {
        let mnemonic = "pact reject sick voyage foster fence warm luggage cabbage any subject carbon";
        let root = HDKey.newWithMnemonic(mnemonic, "helloworld");
        let preDerivedKey = root.deriveWithPath(HDKey.PRE_DERIVED_PUBLICKEY_PATH);
        let preDerivedPubBase58 = preDerivedKey.serializePublicKeyBase58();
        let preDerivedPub = HDKey.deserializeBase58(preDerivedPubBase58);

        for (let index = 0; index < 5; index++) {
            let key = root.deriveWithPath(HDKey.DERIVE_PATH_PREFIX + index);
            let keyPubOnly = preDerivedPub.deriveWithPath("m/0/" + index);

            expect(key.getPublicKeyBase58()).toBe(keyPubOnly.getPublicKeyBase58())
            expect(key.getAddress()).toBe(keyPubOnly.getAddress())
        }
    });






})