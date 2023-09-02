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

import { Constants } from "./constants";
import {
    DIDDocument,
    DIDURL,
    DIDStore,
    DID,
    JSONObject,
    HDKey,
    Base58,
    Exceptions,
    VerificationEventListener,
    DIDBackend,
    DIDBiographyStatus,
    Logger,
    Cipher
} from "@elastosfoundation/did-js-sdk";
import {
    TestData,
    CompatibleData
} from "./utils/testdata";
import {
    assertNull
} from "./utils/utils";
import { TestConfig } from "./utils/testconfig";
import { DIDTestExtension } from "./utils/didtestextension";
import { LocalResolveHandle } from "../../typings/didbackend";

const log = new Logger("DIDDocumentTest");

async function testGetPublicKey(version: string, testData: TestData) {
    let doc: DIDDocument = await testData.getCompatibleData(version).getDocument("user1");
    expect(doc).not.toBeNull();
    let valid = await doc.isValid();
    expect(valid).toBeTruthy();

    // Count and list.
    expect(doc.getPublicKeyCount()).toBe(4);

    let pks = doc.getPublicKeys();
    expect(pks.length).toBe(4);

    for (let pk of pks) {
        expect(pk.getId().getDid().equals(doc.getSubject())).toBeTruthy();
        expect(pk.getType()).toEqual(Constants.DEFAULT_PUBLICKEY_TYPE);

        if (pk.getId().getFragment() == "recovery")
            expect(pk.getController().equals(doc.getSubject())).toBeFalsy();
        else
            expect(pk.getController().equals(doc.getSubject())).toBeTruthy();

        expect(pk.getId().getFragment() == "primary"
            || pk.getId().getFragment() == "key2"
            || pk.getId().getFragment() == "key3"
            || pk.getId().getFragment() == "recovery").toBeTruthy();
    }

    // PublicKey getter.
    let pk: DIDDocument.PublicKey = doc.getPublicKey("#primary");
    expect(pk).not.toBeNull();
    expect(DIDURL.from("#primary", doc.getSubject()).equals(pk.getId())).toBeTruthy();

    let id: DIDURL = DIDURL.from("#key2", doc.getSubject());
    pk = doc.getPublicKey(id);
    expect(pk).not.toBeNull();
    expect(pk.getId().equals(id)).toBeTruthy();

    id = doc.getDefaultPublicKeyId();
    expect(id).not.toBeNull();
    expect(DIDURL.from("#primary", doc.getSubject()).equals(id)).toBeTruthy();

    // Key not exist, should fail.
    pk = doc.getPublicKey("#notExist");
    expect(pk).toBeNull();

    id = DIDURL.from("#notExist", doc.getSubject());
    pk = doc.getPublicKey(id);
    expect(pk).toBeNull();

    // Selector
    id = doc.getDefaultPublicKeyId();
    pks = doc.selectPublicKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
    expect(pks.length).toBe(1);
    expect(DIDURL.from("#primary", doc.getSubject()).equals(pks[0].getId())).toBeTruthy();

    pks = doc.selectPublicKeys(id, null);
    expect(pks.length).toBe(1);
    expect(DIDURL.from("#primary", doc.getSubject()).equals(pks[0].getId())).toBeTruthy();

    pks = doc.selectPublicKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
    expect(pks.length).toBe(4);

    pks = doc.selectPublicKeys("#key2", Constants.DEFAULT_PUBLICKEY_TYPE);
    expect(pks.length).toBe(1);
    expect(DIDURL.from("#key2", doc.getSubject()).equals(pks[0].getId())).toBeTruthy();

    pks = doc.selectPublicKeys("#key3", null);
    expect(pks.length).toBe(1);
    expect(DIDURL.from("#key3", doc.getSubject()).equals(pks[0].getId())).toBeTruthy();
}

describe('DIDDocument Tests', () => {
    let testData: TestData;
    let store: DIDStore;
    beforeEach(async () => {
        testData = await TestData.init();
        await testData.cleanup();
        store = await testData.getStore();
    });

    afterEach(async () => {});

    ["1", "2", "2.2"].forEach((version)=> {
        test('Test Get Public Key', async () => {
            await testGetPublicKey(version, testData);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test('Test Get PublicKey With Multi Controller Cid1', async () => {
            let cd: CompatibleData = testData.getCompatibleData(version);

            let user1: DIDDocument = await cd.getDocument("user1");
            let user2: DIDDocument = await cd.getDocument("user2");
            let user3: DIDDocument = await cd.getDocument("user3");
            let doc: DIDDocument = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getPublicKeyCount()).toBe(7);

            let pks = doc.getPublicKeys();
            expect(pks.length).toBe(7);

            let ids: DIDURL[] = [];
            for (let i = 0; i < pks.length; i++) {
                let pk: DIDDocument.PublicKey = pks[i];
                ids.push(pk.getId());
            }
            ids.sort((e1, e2) => {
                return e1.compareTo(e2);
            });

            let refs: DIDURL[] = [];
            refs.push(user1.getDefaultPublicKeyId());
            refs.push(user2.getDefaultPublicKeyId());
            refs.push(user3.getDefaultPublicKeyId());
            refs.push(DIDURL.from("#key2", user1.getSubject()));
            refs.push(DIDURL.from("#key3", user1.getSubject()));
            refs.push(DIDURL.from("#key2", doc.getSubject()));
            refs.push(DIDURL.from("#key3", doc.getSubject()));

            refs.sort((e1, e2) => {
                return e1.compareTo(e2);
            });

            for (let i = 0; i < refs.length; i++)
                expect(refs[i].equals(refs[i])).toBeTruthy();

            // PublicKey getter.
            let pk: DIDDocument.PublicKey = doc.getPublicKey("#primary");
            expect(pk).toBeNull();

            let id: DIDURL = DIDURL.from("#primary", user1.getSubject());
            pk = doc.getPublicKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key2", user1.getSubject());
            pk = doc.getPublicKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key2", doc.getSubject());
            pk = doc.getPublicKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key3", doc.getSubject());
            pk = doc.getPublicKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = doc.getDefaultPublicKeyId();
            assertNull(id);

            // Key not exist, should fail.
            pk = doc.getPublicKey("#notExist");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExist", doc.getController());
            pk = doc.getPublicKey(id);
            expect(pk).toBeNull();

            // Selector
            id = user1.getDefaultPublicKeyId();
            pks = doc.selectPublicKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectPublicKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectPublicKeys(null,
                Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(7);

            pks = doc.selectPublicKeys(DIDURL.from("#key2", user1.getSubject()),
                Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key2", user1.getSubject()))).toBeTruthy();

            pks = doc.selectPublicKeys(DIDURL.from("#key3", doc.getSubject()), null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key3", doc.getSubject()))).toBeTruthy();
        });
    });
    ["2", "2.2"].forEach((version) => {
        test('Test Get Public Key With Multi Controller Cid2', async () => {
            let cd = testData.getCompatibleData(version);

            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");
            let doc = await cd.getDocument("baz");

            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(doc.getPublicKeyCount()).toEqual(5);

            let pks = doc.getPublicKeys();
            expect(pks.length).toBe(5);

            let ids = new Array<DIDURL>(5);

            pks.forEach((pk) => {
                ids.push(pk.getId());
            })

            ids.sort();

            let refs = new Array<DIDURL>(5);
            refs.push(user1.getDefaultPublicKeyId());
            refs.push(user2.getDefaultPublicKeyId());
            refs.push(user3.getDefaultPublicKeyId());
            refs.push(DIDURL.from("#key2", user1.getSubject()));
            refs.push(DIDURL.from("#key3", user1.getSubject()));

            refs.sort();

            for (let i = 0; i < 5; i++)
                expect(refs[i].equals(ids[i])).toBeTruthy();

            // PublicKey getter.
            let pk = doc.getPublicKey("#primary");
            expect(pk).toBeNull();

            let id = DIDURL.from("#primary", user1.getSubject());
            pk = doc.getPublicKey(id);

            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key2", user1.getSubject());
            pk = doc.getPublicKey(id);

            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = doc.getDefaultPublicKeyId();
            expect(id).toBeNull();

            // Key not exist, should fail.
            pk = doc.getPublicKey("#notExist");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExist", user2.getSubject());
            pk = doc.getPublicKey(id);
            expect(pk).toBeNull();

            // Selector
            id = user2.getDefaultPublicKeyId();
            pks = doc.selectPublicKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);

            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            id = user3.getDefaultPublicKeyId();
            pks = doc.selectPublicKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectPublicKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(5);

            pks = doc.selectPublicKeys(DIDURL.from("#key2", user1.getSubject()),
                Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);

            expect(pks[0].getId().equals(DIDURL.from("#key2", user1.getSubject()))).toBeTruthy();

            pks = doc.selectPublicKeys(DIDURL.from("#key3", user1.getSubject()), null);
            expect(pks.length).toBe(1);
            expect(DIDURL.from("#key3", user1.getSubject()).equals(pks[0].getId())).toBeTruthy();
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("Test Add PublicKey", async () => {
            await testData.getRootIdentity();

            let doc: DIDDocument = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull()
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add 2 public keys
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

            key = TestData.generateKeypair();
            db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getPublicKey("#test1");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test1", doc.getSubject()))).toBeTruthy();

            pk = doc.getPublicKey("#test2");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test2", doc.getSubject()))).toBeTruthy();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(6);
            expect(doc.getAuthenticationKeyCount()).toBe(3);
            expect(doc.getAuthorizationKeyCount()).toBe(1);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("Test Add PublicKey With Cid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // Add 2 public keys
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

            key = TestData.generateKeypair();
            db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

            doc = await db.seal(TestConfig.storePass);
            doc = await user2.signWithDocument(doc, TestConfig.storePass);

            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getPublicKey("#test1");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test1", doc.getSubject()))).toBeTruthy();

            pk = doc.getPublicKey("#test2");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test2", doc.getSubject()))).toBeTruthy();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(9);
            expect(doc.getAuthenticationKeyCount()).toBe(7);
            expect(doc.getAuthorizationKeyCount()).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("Test Remove PublicKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // recovery used by authorization, should failed.
            let id = DIDURL.from("#recovery", doc.getSubject());
            await expect(async() => { await db.removePublicKey(id) }).rejects.toThrowError();

            // force remove public key, should success
            await db.removePublicKey(id, true);
            await db.removePublicKey("#key2", true);

            // Key not exist, should fail.
            await expect(async() => { await db.removePublicKey("#notExistKey", true); }).rejects.toThrowError();

            // Can not remove default publickey, should fail.
            let d = doc;
            await expect(async() => { await db.removePublicKey(d.getDefaultPublicKeyId(), true); }).rejects.toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getPublicKey("#recovery");
            expect(pk).toBeNull();

            pk = doc.getPublicKey("#key2");
            expect(pk).toBeNull();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(2);
            expect(doc.getAuthenticationKeyCount()).toBe(2);
            expect(doc.getAuthorizationKeyCount()).toBe(0);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("Test Remove PublicKey With Cid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user2);

            // Can not remove the controller's key
            let key2 = DIDURL.from("#key2", user1.getSubject());
            await expect(async() => { await db.removePublicKey(key2); }).rejects.toThrowError();

            // key2 used by authentication, should failed.
            let id = DIDURL.from("#key2", doc.getSubject());
            await expect(async() => { await db.removePublicKey(id); }).rejects.toThrowError();

            // force remove public key, should success
            await db.removePublicKey(id, true);
            await db.removePublicKey("#key3", true);

            // Key not exist, should fail.
            await expect(async() => { await db.removePublicKey("#notExistKey", true); }).rejects.toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user1.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getPublicKey("#key2");
            expect(pk).toBeNull();

            pk = doc.getPublicKey("#key3");
            expect(pk).toBeNull();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(5);
            expect(doc.getAuthenticationKeyCount()).toBe(5);
            expect(doc.getAuthorizationKeyCount()).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testGetAuthenticationKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getAuthenticationKeyCount()).toEqual(3);

            let pks = doc.getAuthenticationKeys();
            expect(pks.length).toBe(3);

            pks.forEach(pk => {
                expect(pk.getId().getDid().equals(doc.getSubject())).toBeTruthy();
                expect(pk.getType()).toEqual(Constants.DEFAULT_PUBLICKEY_TYPE);
                expect(pk.getController().equals(doc.getSubject())).toBeTruthy();
                expect(pk.getId().getFragment() == "primary"
                    || pk.getId().getFragment() == "key2"
                    || pk.getId().getFragment() == "key3").toBeTruthy();
            });

            // AuthenticationKey getter
            let pk = doc.getAuthenticationKey("#primary");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#primary", doc.getSubject()))).toBeTruthy();

            let id = DIDURL.from("#key3", doc.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            // Key not exist, should fail.
            pk = doc.getAuthenticationKey("#notExist");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExist", doc.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).toBeNull();

            // selector
            id = DIDURL.from("#key3", doc.getSubject());
            pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthenticationKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(3);

            pks = doc.selectAuthenticationKeys("#key2", Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key2", doc.getSubject()))).toBeTruthy();

            pks = doc.selectAuthenticationKeys("#key2", null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key2", doc.getSubject()))).toBeTruthy();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testGetAuthenticationKeyWithCid", async () => {
            let cd = await testData.getCompatibleData(version);

            let issuer = await cd.getDocument("issuer");
            let doc = await cd.getDocument("examplecorp");
            expect(doc).not.toBeNull();

            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getAuthenticationKeyCount()).toBe(1);

            let pks = doc.getAuthenticationKeys();
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(issuer.getDefaultPublicKeyId())).toBeTruthy();

            let pk = doc.getAuthenticationKey("#primary");
            expect(pk).toBeNull();

            let id = DIDURL.from("#primary", doc.getController());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            // Key not exist, should fail.
            pk = doc.getAuthenticationKey("#notExist");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExist", doc.getController());
            pk = doc.getAuthenticationKey(id);
            expect(pk).toBeNull();

            // Selector
            id = doc.getDefaultPublicKeyId();
            pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#primary", doc.getController()))).toBeTruthy();

            pks = doc.selectPublicKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#primary", doc.getController()))).toBeTruthy();

            pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testGetAuthenticationKeyWithMultiControllerCid1", async () => {
            let cd = testData.getCompatibleData(version);

            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");
            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getAuthenticationKeyCount()).toBe(7);

            let pks = doc.getAuthenticationKeys();
            expect(pks.length).toBe(7);

            let ids = new Array<DIDURL>(7);
            pks.forEach(pk => {
                ids.push(pk.getId());
            });

            ids.sort();

            let refs = new Array<DIDURL>(7);
            refs.push(user1.getDefaultPublicKeyId());
            refs.push(user2.getDefaultPublicKeyId());
            refs.push(user3.getDefaultPublicKeyId());
            refs.push(DIDURL.from("#key2", user1.getSubject()));
            refs.push(DIDURL.from("#key3", user1.getSubject()));
            refs.push(DIDURL.from("#key2", doc.getSubject()));
            refs.push(DIDURL.from("#key3", doc.getSubject()));

            refs.sort();

            for (let i = 0; i < 7; i++)
                expect(refs[i].equals(ids[i])).toBeTruthy();

            // PublicKey getter.
            let pk = doc.getAuthenticationKey("#primary");
            expect(pk).toBeNull();

            let id = DIDURL.from("#primary", user1.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key2", user1.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key2", doc.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key3", doc.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            // Key not exist, should fail.
            pk = doc.getAuthenticationKey("#notExist");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExist", doc.getController());
            pk = doc.getAuthenticationKey(id);
            expect(pk).toBeNull();

            // Selector
            id = user1.getDefaultPublicKeyId();
            pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthenticationKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(7);

            pks = doc.selectAuthenticationKeys(DIDURL.from("#key2", user1.getSubject()),
                Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);

            expect(pks[0].getId().equals(DIDURL.from("#key2", user1.getSubject()))).toBeTruthy()

            pks = doc.selectAuthenticationKeys(DIDURL.from("#key3", doc.getSubject()), null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key3", doc.getSubject()))).toBeTruthy();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testGetAuthenticationKeyWithMultiControllerCid2", async () => {
            let cd = testData.getCompatibleData(version);

            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");

            let doc = await cd.getDocument("baz");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getAuthenticationKeyCount()).toEqual(5);

            let pks = doc.getAuthenticationKeys();
            expect(pks.length).toBe(5);

            let ids = new Array<DIDURL>(5);
            pks.forEach(pk => {
                ids.push(pk.getId());
            });

            ids.sort();

            let refs = new Array<DIDURL>(5);
            refs.push(user1.getDefaultPublicKeyId());
            refs.push(user2.getDefaultPublicKeyId());
            refs.push(user3.getDefaultPublicKeyId());
            refs.push(DIDURL.from("#key2", user1.getSubject()));
            refs.push(DIDURL.from("#key3", user1.getSubject()));

            refs.sort();

            for (let i = 0; i < 5; i++)
                expect(refs[i].equals(ids[i])).toBeTruthy();

            // PublicKey getter.
            let pk = doc.getAuthenticationKey("#primary");
            expect(pk).toBeNull();

            let id = DIDURL.from("#primary", user1.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            id = DIDURL.from("#key2", user1.getSubject());
            pk = doc.getAuthenticationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            // Key not exist, should fail.
            pk = doc.getAuthenticationKey("#notExist");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExist", user2.getSubject());
            pk = doc.getPublicKey(id);
            expect(pk).toBeNull();

            // Selector
            id = user2.getDefaultPublicKeyId();
            pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            id = user3.getDefaultPublicKeyId();
            pks = doc.selectAuthenticationKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(5);

            pks = doc.selectAuthenticationKeys(DIDURL.from("#key2", user1.getSubject()),
                Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key2", user1.getSubject()))).toBeTruthy();

            pks = doc.selectAuthenticationKeys(DIDURL.from("#key3", user1.getSubject()), null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(DIDURL.from("#key3", user1.getSubject()))).toBeTruthy();
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testAddAuthenticationKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add 2 public keys for test.
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

            key = TestData.generateKeypair();
            db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

            // Add by reference
            db.addExistingAuthenticationKey(DIDURL.from("#test1", doc.getSubject()));
            db.addExistingAuthenticationKey("#test2");

            // Add new keys
            key = TestData.generateKeypair();
            db.addAuthenticationKey(DIDURL.from("#test3", doc.getSubject()),
                key.getPublicKeyBase58());

            key = TestData.generateKeypair();
            db.addAuthenticationKey("#test4", key.getPublicKeyBase58());

            // Try to add a non existing key, should fail.
            expect(() => { db.addExistingAuthenticationKey("#notExistKey"); }).toThrowError();

            // Try to add a key not owned by self, should fail.
            expect(() => { db.addExistingAuthenticationKey("#recovery"); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getAuthenticationKey("#test1");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test1", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthenticationKey("#test2");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test2", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthenticationKey("#test3");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test3", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthenticationKey("#test4");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test4", doc.getSubject()))).toBeTruthy();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(8);
            expect(doc.getAuthenticationKeyCount()).toBe(7);
            expect(doc.getAuthorizationKeyCount()).toBe(1);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testAddAuthenticationKeyWithCid", async () => {
            let cd = testData.getCompatibleData(version);

            let user1 = await cd.getDocument("user1");
            await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");
            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // Add 2 public keys for test.
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

            key = TestData.generateKeypair();
            db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

            // Add by reference
            db.addExistingAuthenticationKey(DIDURL.from("#test1", doc.getSubject()));
            db.addExistingAuthenticationKey("#test2");

            // Add new keys
            key = TestData.generateKeypair();
            db.addAuthenticationKey(DIDURL.from("#test3", doc.getSubject()),
                key.getPublicKeyBase58());

            key = TestData.generateKeypair();
            db.addAuthenticationKey("#test4", key.getPublicKeyBase58());

            // Try to add a controller's key, should fail.
            let key3 = DIDURL.from("#testkey", user1.getSubject());
            expect(() => { db.addExistingAuthenticationKey(key3); }).toThrowError();

            // Try to add a non existing key, should fail.
            expect(() => { db.addExistingAuthenticationKey("#notExistKey"); }).toThrowError();

            // Try to add a key not owned by self, should fail.
            let recovery = DIDURL.from("#recovery", user1.getSubject());
            expect(() => { db.addExistingAuthenticationKey(recovery); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user3.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getAuthenticationKey("#test1");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test1", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthenticationKey("#test2");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test2", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthenticationKey("#test3");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test3", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthenticationKey("#test4");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test4", doc.getSubject()))).toBeTruthy();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(11);
            expect(doc.getAuthenticationKeyCount()).toBe(11);
            expect(doc.getAuthorizationKeyCount()).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testRemoveAuthenticationKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add 2 public keys for test
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(
                DIDURL.from("#test1", doc.getSubject()),
                key.getPublicKeyBase58());

            key = TestData.generateKeypair();
            db.addAuthenticationKey("#test2", key.getPublicKeyBase58());

            // Remote keys
            db.removeAuthenticationKey(DIDURL.from("#test1", doc.getSubject()))
                .removeAuthenticationKey("#test2")
                .removeAuthenticationKey("#key2");

            // Key not exist, should fail.
            expect(() => { db.removeAuthenticationKey("#notExistKey"); }).toThrowError();

            // Default publickey, can not remove, should fail.
            let id = doc.getDefaultPublicKeyId();
            expect(() => { db.removeAuthenticationKey(id); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getAuthenticationKey("#test1");
            expect(pk).toBeNull();

            pk = doc.getAuthenticationKey("#test2");
            expect(pk).toBeNull();

            pk = doc.getAuthenticationKey("#key2");
            expect(pk).toBeNull();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(6);
            expect(doc.getAuthenticationKeyCount()).toBe(2);
            expect(doc.getAuthorizationKeyCount()).toBe(1);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testRemoveAuthenticationKeyWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(doc.getPublicKeyCount()).toBe(7);
            expect(doc.getAuthenticationKeyCount()).toBe(7);
            expect(doc.getAuthorizationKeyCount()).toBe(0);

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // Remote keys
            db.removeAuthenticationKey(DIDURL.from("#key2", doc.getSubject()))
                .removeAuthenticationKey("#key3");

            db.removePublicKey("#key3");

            // Key not exist, should fail.
            expect(() => { db.removeAuthenticationKey("#notExistKey"); }).toThrowError();

            // Remove controller's key, should fail.
            let key2 = DIDURL.from("#key2", user1.getSubject());
            expect(() => { db.removeAuthenticationKey(key2); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user2.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getAuthenticationKey("#key2");
            expect(pk).toBeNull();

            pk = doc.getAuthenticationKey("#key3");
            expect(pk).toBeNull();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(6);
            expect(doc.getAuthenticationKeyCount()).toBe(5);
            expect(doc.getAuthorizationKeyCount()).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testGetAuthorizationKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getAuthorizationKeyCount()).toBe(1);

            let pks = doc.getAuthorizationKeys();
            expect(pks.length).toBe(1);

            pks.forEach(pk => {
                expect(pk.getId().getDid().equals(doc.getSubject())).toBeTruthy();
                expect(pk.getType()).toEqual(Constants.DEFAULT_PUBLICKEY_TYPE);
                expect(pk.getController().equals(doc.getSubject())).toBeFalsy();
                expect(pk.getId().getFragment()).toEqual("recovery");
            });

            // AuthorizationKey getter
            let pk = doc.getAuthorizationKey("#recovery");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#recovery", doc.getSubject()))).toBeTruthy();

            let id = DIDURL.from("#recovery", doc.getSubject());
            pk = doc.getAuthorizationKey(id);
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(id)).toBeTruthy();

            // Key not exist, should fail.
            pk = doc.getAuthorizationKey("#notExistKey");
            expect(pk).toBeNull();

            id = DIDURL.from("#notExistKey", doc.getSubject());
            pk = doc.getAuthorizationKey(id);
            expect(pk).toBeNull();

            // Selector
            id = DIDURL.from("#recovery", doc.getSubject());
            pks = doc.selectAuthorizationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthorizationKeys(id, null);
            expect(pks.length).toBe(1);
            expect(pks[0].getId().equals(id)).toBeTruthy();

            pks = doc.selectAuthorizationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
            expect(pks.length).toBe(1);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testGetAuthorizationKeyWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            await cd.getDocument("user1");
            await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getAuthorizationKeyCount()).toBe(0);

            let pks = doc.getAuthorizationKeys();
            expect(pks.length).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testAddAuthorizationKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add 2 public keys for test.
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.createAndAddPublicKey(id,
                key.getPublicKeyBase58(),
                new DID(DID.METHOD, key.getAddress()));

            key = TestData.generateKeypair();
            db.createAndAddPublicKey("#test2",
                key.getPublicKeyBase58(),
                new DID(DID.METHOD, key.getAddress()).toString());

            // Add by reference
            db.addExistingAuthorizationKey(DIDURL.from("#test1", doc.getSubject()));
            db.addExistingAuthorizationKey("#test2");

            // Add new keys
            key = TestData.generateKeypair();
            db.addAuthorizationKey(DIDURL.from("#test3", doc.getSubject()),
                new DID(DID.METHOD, key.getAddress()),
                key.getPublicKeyBase58());

            key = TestData.generateKeypair();
            db.addAuthorizationKey("#test4",
                new DID(DID.METHOD, key.getAddress()).toString(),
                key.getPublicKeyBase58());

            // Try to add a non existing key, should fail.
            expect(() => { db.addExistingAuthorizationKey("#notExistKey"); }).toThrowError();

            // Try to add key owned by self, should fail.
            expect(() => { db.addExistingAuthorizationKey("#key2"); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let pk = doc.getAuthorizationKey("#test1");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test1", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthorizationKey("#test2");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test2", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthorizationKey("#test3");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test3", doc.getSubject()))).toBeTruthy();

            pk = doc.getAuthorizationKey("#test4");
            expect(pk).not.toBeNull();
            expect(pk.getId().equals(DIDURL.from("#test4", doc.getSubject()))).toBeTruthy();

            // Check the final key count.
            expect(doc.getPublicKeyCount()).toBe(8);
            expect(doc.getAuthenticationKeyCount()).toBe(3);
            expect(doc.getAuthorizationKeyCount()).toBe(5);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testAddAuthorizationKeyWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let did = doc.getSubject();
            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // Add 2 public keys for test.
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.createAndAddPublicKey(id,
                key.getPublicKeyBase58(),
                new DID(DID.METHOD, key.getAddress()));

            key = TestData.generateKeypair();
            db.createAndAddPublicKey("#test2",
                key.getPublicKeyBase58(),
                new DID(DID.METHOD, key.getAddress()).toString());

            expect(() => { db.addExistingAuthorizationKey(DIDURL.from("#test1", did)); }).toThrowError();
            expect(() => { db.addExistingAuthorizationKey("#test2"); }).toThrowError();

            // Try to add a non existing key, should fail.
            expect(() => { db.addExistingAuthorizationKey("#notExistKey"); }).toThrowError();

            // Try to add controller's, should fail.
            let recovery = DIDURL.from("#recovery", user1.getSubject());
            expect(() => { db.addExistingAuthorizationKey(recovery); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user2.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let pk = doc.getAuthorizationKey("#test1");
            expect(pk).toBeNull();

            pk = doc.getAuthorizationKey("#test2");
            expect(pk).toBeNull();

            pk = doc.getAuthorizationKey("#test3");
            expect(pk).toBeNull();

            pk = doc.getAuthorizationKey("#test4");
            expect(pk).toBeNull();

            // Check the final key count.
            expect(doc.getPublicKeyCount()).toBe(9);
            expect(doc.getAuthenticationKeyCount()).toBe(7);
            expect(doc.getAuthorizationKeyCount()).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testRemoveAuthorizationKey", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add 2 keys for test.
            let id = DIDURL.from("#test1", db.getSubject());
            let key = TestData.generateKeypair();
            db.addAuthorizationKey(id,
                new DID(DID.METHOD, key.getAddress()),
                key.getPublicKeyBase58());

            key = TestData.generateKeypair();
            db.addAuthorizationKey("#test2",
                new DID(DID.METHOD, key.getAddress()).toString(),
                key.getPublicKeyBase58());

            // Remove keys.
            db.removeAuthorizationKey(DIDURL.from("#test1", doc.getSubject()))
                .removeAuthorizationKey("#recovery");

            // Key not exist, should fail.
            expect(() => { db.removeAuthorizationKey("#notExistKey"); }).toThrowError()

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let pk = doc.getAuthorizationKey("#test1");
            expect(pk).toBeNull();

            pk = doc.getAuthorizationKey("#test2");
            expect(pk).not.toBeNull();

            pk = doc.getAuthorizationKey("#recovery");
            expect(pk).toBeNull();

            // Check the final count.
            expect(doc.getPublicKeyCount()).toBe(6);
            expect(doc.getAuthenticationKeyCount()).toBe(3)
            expect(doc.getAuthorizationKeyCount()).toBe(1);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testGetCredential", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getCredentialCount()).toBe(2);

            let vcs = doc.getCredentials();
            expect(vcs.length).toBe(2);

            vcs.forEach(vc => {
                expect(vc.getId().getDid().equals(doc.getSubject())).toBeTruthy();
                expect(vc.getSubject().getId().equals(doc.getSubject())).toBeTruthy();
                expect(vc.getId().getFragment() == "profile"
                    || vc.getId().getFragment() == "email").toBeTruthy();
            });

            // Credential getter.
            let vc = doc.getCredential("#profile");
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vc = doc.getCredential(DIDURL.from("#email", doc.getSubject()));
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#email", doc.getSubject()))).toBeTruthy()

            // Credential not exist.
            vc = doc.getCredential("#notExistVc");
            expect(vc).toBeNull();

            // Credential selector.
            vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()),
                "SelfProclaimedCredential");
            expect(vcs.length).toBe(1);
            expect(vcs[0].getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();


            vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()), null);
            expect(vcs.length).toBe(1);
            expect(vcs[0].getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vcs = doc.selectCredentials(null, "SelfProclaimedCredential");
            expect(vcs.length).toBe(1);
            expect(vcs[0].getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vcs = doc.selectCredentials(null, "TestingCredential");
            expect(vcs.length).toBe(0);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testGetCredentialWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            await cd.getDocument("user1");
            await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list.
            expect(doc.getCredentialCount()).toBe(2);
            let vcs = doc.getCredentials();
            expect(vcs.length).toBe(2);

            vcs.forEach(vc => {
                expect(vc.getId().getDid().equals(doc.getSubject())).toBeTruthy();
                expect(vc.getSubject().getId().equals(doc.getSubject())).toBeTruthy();
                expect(vc.getId().getFragment() == "profile"
                    || vc.getId().getFragment() == "email").toBeTruthy();
            });

            // Credential getter.
            let vc = doc.getCredential("#profile");
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vc = doc.getCredential(DIDURL.from("#email", doc.getSubject()));
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#email", doc.getSubject()))).toBeTruthy();

            // Credential not exist.
            vc = doc.getCredential("#notExistVc");
            expect(vc).toBeNull();

            // Credential selector.
            vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()),
                "SelfProclaimedCredential");
            expect(vcs.length).toBe(1);
            expect(vcs[0].getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()), null);
            expect(vcs.length).toBe(1);
            expect(vcs[0].getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vcs = doc.selectCredentials(null, "SelfProclaimedCredential");
            expect(vcs.length).toBe(1);
            expect(vcs[0].getId().equals(DIDURL.from("#profile", doc.getSubject()))).toBeTruthy();

            vcs = doc.selectCredentials(null, "TestingCredential");
            expect(vcs.length).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testAddCredential", async () => {
            let cd = testData.getCompatibleData(version);
            cd.getDocument("issuer");

            await testData.getRootIdentity();

            let doc = await cd.getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            let vc = await cd.getCredential("user1", "passport");
            await db.addCredential(vc);
            vc = await cd.getCredential("user1", "twitter");
            await db.addCredential(vc);

            let fvc = vc;
            //Credential already exist, should fail.
            await expect(async() => { await db.addCredential(fvc); }).rejects.toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check new added credential.
            vc = doc.getCredential("#passport");
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#passport", doc.getSubject()))).toBeTruthy()

            let id = DIDURL.from("#twitter", doc.getSubject());
            vc = doc.getCredential(id);
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(id)).toBeTruthy();

            // Should contains 3 credentials.
            expect(doc.getCredentialCount()).toBe(4);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testAddCredentialWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy()

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // Add credentials.
            let vc = await cd.getCredential("foobar", "license");
            await db.addCredential(vc);

            vc = await cd.getCredential("foobar", "services");
            await db.addCredential(vc);

            let fvc = vc;
            // Credential already exist, should fail.
            await expect( async() => { await db.addCredential(fvc); }).rejects.toThrowError();

            // Credential not belongs to current did, should fail.
            fvc = await cd.getCredential("user1", "passport");
            await expect( async() => { await db.addCredential(fvc); }).rejects.toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user2.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check new added credential.
            vc = doc.getCredential("#license");
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#license", doc.getSubject()))).toBeTruthy();
            expect(vc.getId().equals(DIDURL.from("#license", doc.getSubject()))).toBeTruthy();

            let id = DIDURL.from("#services", doc.getSubject());
            vc = doc.getCredential(id);
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(id)).toBeTruthy();

            expect(doc.getCredentialCount()).toBe(4);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testAddSelfClaimedCredential", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add credentials.
            let subject = {
                "passport": "S653258Z07"
            };
            await db.createAndAddCredential(TestConfig.storePass, "#passport", subject);

            let json = "{\"name\":\"Jay Holtslander\",\"alternateName\":\"Jason Holtslander\"}";
            await db.createAndAddCredential(TestConfig.storePass, "#name", json);

            json = "{\"twitter\":\"@john\"}";
            await db.createAndAddCredential(TestConfig.storePass, "#twitter", json);

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check new added credential.
            let vc = doc.getCredential("#passport");
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#passport", doc.getSubject()))).toBeTruthy();
            expect(vc.isSelfProclaimed()).toBeTruthy();

            let id = DIDURL.from("#name", doc.getSubject());
            vc = doc.getCredential(id);
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(id)).toBeTruthy();
            expect(vc.isSelfProclaimed()).toBeTruthy();

            id = DIDURL.from("#twitter", doc.getSubject());
            vc = doc.getCredential(id);
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(id)).toBeTruthy();
            expect(vc.isSelfProclaimed()).toBeTruthy();
            expect(doc.getCredentialCount()).toBe(5);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testAddSelfClaimedCredentialWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user2);

            // Add credentials.
            let subject = {
                "foo": "bar"
            };
            await db.createAndAddCredential(TestConfig.storePass, "#testvc", subject);

            let json = "{\"name\":\"Foo Bar\",\"alternateName\":\"Jason Holtslander\"}";
            await db.createAndAddCredential(TestConfig.storePass, "#name", json);

            json = "{\"twitter\":\"@foobar\"}";
            await db.createAndAddCredential(TestConfig.storePass, "#twitter", json);

            doc = await db.seal(TestConfig.storePass);
            doc = await user1.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check new added credential.
            let vc = doc.getCredential("#testvc");
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(DIDURL.from("#testvc", doc.getSubject()))).toBeTruthy();
            expect(vc.isSelfProclaimed()).toBeTruthy();

            let id = DIDURL.from("#name", doc.getSubject());
            vc = doc.getCredential(id);
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(id)).toBeTruthy();
            expect(vc.isSelfProclaimed()).toBeTruthy();

            id = DIDURL.from("#twitter", doc.getSubject());
            vc = doc.getCredential(id);
            expect(vc).not.toBeNull();
            expect(vc.getId().equals(id)).toBeTruthy();
            expect(vc.isSelfProclaimed()).toBeTruthy();

            expect(doc.getCredentialCount()).toBe(5);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testRemoveCredential", async () => {
            await testData.getRootIdentity();
            let cd = testData.getCompatibleData(version);
            cd.getDocument("issuer");

            let doc = await cd.getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add test credentials.
            let vc = await cd.getCredential("user1", "passport");
            await db.addCredential(vc);

            vc = await cd.getCredential("user1", "twitter");
            await db.addCredential(vc);

            // Remove credentials
            db.removeCredential("#profile");
            db.removeCredential(DIDURL.from("#twitter", doc.getSubject()));

            // Credential not exist, should fail.
            expect(() => { db.removeCredential("#notExistCredential"); }).toThrowError();

            let did = doc.getSubject();
            expect(() => { db.removeCredential(DIDURL.from("#notExistCredential", did)); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            vc = doc.getCredential("#profile");
            expect(vc).toBeNull();

            vc = doc.getCredential(DIDURL.from("#twitter", doc.getSubject()));
            expect(vc).toBeNull();

            // Check the final count.
            expect(doc.getCredentialCount()).toBe(2);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testRemoveCredentialWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            let user2 = await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // Remove credentials
            db.removeCredential("#profile");
            db.removeCredential(DIDURL.from("#email", doc.getSubject()));

            // Credential not exist, should fail.
            expect(() => { db.removeCredential("#notExistCredential"); }).toThrowError();

            let did = doc.getSubject();
            expect(() => { db.removeCredential(DIDURL.from("#notExistCredential", did)); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user2.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check existence
            let vc = doc.getCredential("#profile");
            expect(vc).toBeNull();

            vc = doc.getCredential(DIDURL.from("#email", doc.getSubject()));
            expect(vc).toBeNull();

            // Check the final count.
            expect(doc.getCredentialCount()).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testGetService", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list
            expect(doc.getServiceCount()).toBe(3);
            let svcs = doc.getServices();
            expect(svcs.length).toBe(3);

            svcs.forEach(svc => {
                expect(svc.getId().getDid().equals(doc.getSubject())).toBeTruthy();
                expect(svc.getId().getFragment() == "openid"
                    || svc.getId().getFragment() == "vcr"
                    || svc.getId().getFragment() == "carrier").toBeTruthy();
            });

            // Service getter, should success.
            let svc = doc.getService("#openid");
            expect(svc).not.toBeNull();
            expect(svc.getId().equals(DIDURL.from("#openid", doc.getSubject()))).toBeTruthy();
            expect(svc.getType()).toEqual("OpenIdConnectVersion1.0Service")
            expect(svc.getServiceEndpoint()).toEqual("https://openid.example.com/")

            let props = svc.getProperties();
            expect(props).toBeNull();

            svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
            expect(svc).not.toBeNull();
            expect(svc.getId().equals(DIDURL.from("#vcr", doc.getSubject()))).toBeTruthy();
            props = svc.getProperties();
            expect(props).toBeNull();

            // Service not exist, should fail.
            svc = doc.getService("#notExistService");
            expect(svc).toBeNull();

            // Service selector.
            svcs = doc.selectServices("#vcr", "CredentialRepositoryService");
            expect(svcs.length).toBe(1);
            expect(svcs[0].getId().equals(DIDURL.from("#vcr", doc.getSubject()))).toBeTruthy();

            svcs = doc.selectServices(DIDURL.from("#openid", doc.getSubject()), null);
            expect(svcs.length).toBe(1);
            expect(svcs[0].getId().equals(DIDURL.from("#openid", doc.getSubject()))).toBeTruthy();

            svcs = doc.selectServices(null, "CarrierAddress");
            expect(svcs.length).toBe(1);
            expect(svcs[0].getId().equals(DIDURL.from("#carrier", doc.getSubject()))).toBeTruthy();

            props = svcs[0].getProperties();
            expect(svcs.length).toBe(1);
            if (parseFloat(version) < 2.0) {
                expect(props).toBeNull();
            } else {
                expect(Object.keys(props).length).toBe(12);
                expect(props["foobar"]).toEqual("lalala...");
                expect(props["FOOBAR"]).toEqual("Lalala...");
            }

            // Service not exist, should return a empty list.
            svcs = doc.selectServices("#notExistService",
                "CredentialRepositoryService");
            expect(svcs.length).toBe(0);

            svcs = doc.selectServices(null, "notExistType");
            expect(svcs.length).toBe(0);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testGetServiceWithCid", async () => {

            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            await cd.getDocument("user1");
            await cd.getDocument("user2");
            await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Count and list
            expect(doc.getServiceCount()).toBe(2);

            let svcs = doc.getServices();
            expect(svcs.length).toBe(2);

            svcs.forEach(svc => {
                expect(svc.getId().getDid().equals(doc.getSubject())).toBeTruthy();
                expect(svc.getId().getFragment() == "vault"
                    || svc.getId().getFragment() == "vcr").toBeTruthy();
            });

            // Service getter, should success.
            let svc = doc.getService("#vault");
            expect(svc).not.toBeNull();
            expect(svc.getId().equals(DIDURL.from("#vault", doc.getSubject()))).toBeTruthy()
            expect(svc.getType()).toEqual("Hive.Vault.Service")
            expect(svc.getServiceEndpoint()).toEqual("https://foobar.com/vault")

            let props = svc.getProperties();
            expect(props).toBeNull();

            svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
            expect(svc).not.toBeNull();
            expect(svc.getId().equals(DIDURL.from("#vcr", doc.getSubject()))).toBeTruthy();
            props = svc.getProperties();
            expect(Object.keys(props).length).toBe(12);
            expect(props["foobar"]).toEqual("lalala...");
            expect(props["FOOBAR"]).toEqual("Lalala...");

            // Service not exist, should fail.
            svc = doc.getService("#notExistService");
            expect(svc).toBeNull();

            // Service selector.
            svcs = doc.selectServices("#vcr", "CredentialRepositoryService");
            expect(svcs.length).toBe(1);
            expect(svcs[0].getId().equals(DIDURL.from("#vcr", doc.getSubject()))).toBeTruthy();

            svcs = doc.selectServices(DIDURL.from("#openid", doc.getSubject()), null);
            expect(svcs.length).toBe(0);

            // Service not exist, should return a empty list.
            svcs = doc.selectServices("#notExistService", "CredentialRepositoryService");
            expect(svcs.length).toBe(0);

            svcs = doc.selectServices(null, "notExistType");
            expect(svcs.length).toBe(0);
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testAddService", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add services
            db.addService("#test-svc-1", "Service.Testing",
                "https://www.elastos.org/testing1");
            db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing2");

            // Service id already exist, should failed.
            expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test"); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check the final count
            expect(doc.getServiceCount()).toBe(5);

            // Try to select new added 2 services
            let svcs = doc.selectServices(null, "Service.Testing");
            expect(svcs.length).toBe(2);
            expect(svcs[0].getType()).toEqual("Service.Testing");
            expect(svcs[1].getType()).toEqual("Service.Testing");
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testAddServiceWithDescription", async () => {
            await testData.getRootIdentity();

            let map: JSONObject = {
                "abc": "helloworld",
                "foo": 123,
                "bar": "foobar",
                "foobar": "lalala...",
                "date": new Date().toISOString(),
                "ABC": "Helloworld",
                "FOO": 678,
                "BAR": "Foobar",
                "FOOBAR": "Lalala...",
                "DATE": new Date().toISOString()
            }

            let props: JSONObject = {
                "abc": "helloworld",
                "foo": 123,
                "bar": "foobar",
                "foobar": "lalala...",
                "date": new Date().toISOString(),
                "map": map,
                "ABC": "Helloworld",
                "FOO": 678,
                "BAR": "Foobar",
                "FOOBAR": "Lalala...",
                "DATE": new Date().toISOString(),
                "MAP": map
            }

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // Add services
            db.addService("#test-svc-1", "Service.Testing",
                "https://www.elastos.org/testing1", props);
            db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing2", props);
            db.addService(DIDURL.from("#test-svc-3", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing3");

            // Service id already exist, should failed.+
            expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test", props); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check the final count
            expect(doc.getServiceCount()).toBe(6);

            // Try to select new added 2 services
            let svcs = doc.selectServices(null, "Service.Testing");
            expect(svcs.length).toBe(3);
            expect(svcs[0].getType()).toEqual("Service.Testing");
            expect(svcs[0].getProperties()).not.toBeNull();
            expect(svcs[0].getProperties()).not.toBeUndefined();
            expect(Object.keys(svcs[0].getProperties()).length).toBeGreaterThan(0);
            expect(svcs[0].getProperties().constructor).toEqual(Object);

            expect(svcs[1].getType()).toEqual("Service.Testing");
            expect(svcs[1].getProperties()).not.toBeNull();
            expect(svcs[1].getProperties()).not.toBeUndefined();
            expect(Object.keys(svcs[1].getProperties()).length).toBeGreaterThan(0);
            expect(svcs[1].getProperties().constructor).toEqual(Object);

            expect(svcs[2].getType()).toEqual("Service.Testing");
            expect(svcs[2].getProperties()).toBeNull();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testAddServiceWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user3);

            // Add services
            db.addService("#test-svc-1", "Service.Testing",
                "https://www.elastos.org/testing1");
            db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing2");

            // Service id already exist, should failed.
            expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test"); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user1.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check the final count
            expect(doc.getServiceCount()).toBe(4);

            // Try to select new added 2 services
            let svcs = doc.selectServices(null, "Service.Testing");
            expect(svcs.length).toBe(2);
            expect(svcs[0].getType()).toEqual("Service.Testing");
            expect(svcs[1].getType()).toEqual("Service.Testing");
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testAddServiceWithCidAndDescription", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user3);

            let map: JSONObject = {
                "abc": "helloworld",
                "foo": 123,
                "bar": "foobar",
                "foobar": "lalala...",
                "date": new Date().toISOString(),
                "ABC": "Helloworld",
                "FOO": 678,
                "BAR": "Foobar",
                "FOOBAR": "Lalala...",
                "DATE": new Date().toISOString()
            }

            let props: JSONObject = {
                "abc": "helloworld",
                "foo": 123,
                "bar": "foobar",
                "foobar": "lalala...",
                "date": new Date().toISOString(),
                "map": map,
                "ABC": "Helloworld",
                "FOO": 678,
                "BAR": "Foobar",
                "FOOBAR": "Lalala...",
                "DATE": new Date().toISOString(),
                "MAP": map
            }

            // Add services
            db.addService("#test-svc-1", "Service.Testing",
                "https://www.elastos.org/testing1", props);
            db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing2", props);
            db.addService(DIDURL.from("#test-svc-3", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing3");

            // Service id already exist, should failed.
            expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test", props); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user1.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            // Check the final count
            expect(doc.getServiceCount()).toBe(5);

            // Try to select new added 2 services
            let svcs = doc.selectServices(null, "Service.Testing");
            expect(svcs.length).toBe(3);
            expect(svcs[0].getType()).toEqual("Service.Testing");
            expect(svcs[0].getProperties()).not.toBeNull();
            expect(svcs[0].getProperties()).not.toBeUndefined();
            expect(Object.keys(svcs[0].getProperties()).length).toBeGreaterThan(0);
            expect(svcs[0].getProperties().constructor).toEqual(Object);
            expect(svcs[1].getType()).toEqual("Service.Testing");
            expect(svcs[1].getProperties()).not.toBeNull();
            expect(svcs[1].getProperties()).not.toBeUndefined();
            expect(Object.keys(svcs[1].getProperties()).length).toBeGreaterThan(0);
            expect(svcs[1].getProperties().constructor).toEqual(Object);

            expect(svcs[2].getType()).toEqual("Service.Testing");
            expect(svcs[2].getProperties()).toBeNull();
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test("testRemoveService", async () => {
            await testData.getRootIdentity();

            let doc = await testData.getCompatibleData(version).getDocument("user1");
            expect(doc).not.toBeNull();

            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            // remove services
            db.removeService("#openid");
            db.removeService(DIDURL.from("#vcr", doc.getSubject()));

            // Service not exist, should fail.
            expect(() => { db.removeService("#notExistService"); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let svc = doc.getService("#openid");
            expect(svc).toBeNull();

            svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
            expect(svc).toBeNull();

            // Check the final count
            expect(doc.getServiceCount()).toBe(1);
        });
    });

    ["2", "2.2"].forEach((version) => {
        test("testRemoveServiceWithCid", async () => {
            let cd = testData.getCompatibleData(version);
            await testData.getRootIdentity();

            await cd.getDocument("issuer");
            let user1 = await cd.getDocument("user1");
            await cd.getDocument("user2");
            let user3 = await cd.getDocument("user3");
            await cd.getDocument("examplecorp");

            let doc = await cd.getDocument("foobar");
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(user1);

            // remove services
            db.removeService("#vault");
            db.removeService(DIDURL.from("#vcr", doc.getSubject()));

            // Service not exist, should fail.
            expect(() => { db.removeService("#notExistService"); }).toThrowError();

            doc = await db.seal(TestConfig.storePass);
            doc = await user3.signWithDocument(doc, TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let svc = doc.getService("#openid");
            expect(svc).toBeNull();

            svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
            expect(svc).toBeNull();

            // Check the final count
            expect(doc.getServiceCount()).toBe(0);
        });
    });

    test("testParseAndSerialize", async () => {
        let csvSource = [
            {version:"1", did:"issuer"},
            {version:"1", did:"user1"},
            {version:"1", did:"user2"},
            {version:"1", did:"user3"},
            {version:"2", did:"issuer"},
            {version:"2", did:"user1"},
            {version:"2", did:"user2"},
            {version:"2", did:"user3"},
            {version:"2", did:"user4"},
            {version:"2", did:"examplecorp"},
            {version:"2", did:"foobar"},
            {version:"2", did:"foo"},
            {version:"2", did:"bar"},
            {version:"2", did:"baz"},
            {version:"2.2", did:"issuer"},
            {version:"2.2", did:"user1"},
            {version:"2.2", did:"user2"},
            {version:"2.2", did:"user3"},
            {version:"2.2", did:"user4"},
            {version:"2.2", did:"examplecorp"},
            {version:"2.2", did:"foobar"},
            {version:"2.2", did:"foo"},
            {version:"2.2", did:"bar"},
            {version:"2.2", did:"baz"}
        ];

        for(const source of csvSource){
            let cd = testData.getCompatibleData(source.version);
            await cd.loadAll();

            let compactJson = cd.getDocumentJson(source.did, "compact");
            let compact = await DIDDocument.parseAsync(compactJson);
            expect(compact).not.toBeNull();
            let valid = await compact.isValid();
            expect(valid).toBeTruthy();

            let normalizedJson = cd.getDocumentJson(source.did, "normalized");
            let normalized = await DIDDocument.parseAsync(normalizedJson);
            expect(normalized).not.toBeNull();
            valid = await normalized.isValid();
            expect(valid).toBeTruthy();

            let doc = await cd.getDocument(source.did);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(compact.toString(true)).toEqual(normalizedJson);
            expect(normalized.toString(true)).toEqual(normalizedJson);
            expect(doc.toString(true)).toEqual(normalizedJson);

            // Don't check the compact mode for the old versions
            if (cd.isLatestVersion()) {
                expect(compact.toString(false)).toEqual(compactJson);
                expect(normalized.toString(false)).toEqual(compactJson);
                expect(doc.toString(false)).toEqual(compactJson);
            }
        }
    })

    test("testGenuineAndValidWithListener", async () => {
        let csvSource = [
            {version:"1", did:"issuer"},
            {version:"1", did:"user1"},
            {version:"1", did:"user2"},
            {version:"1", did:"user3"},
            {version:"2", did:"issuer"},
            {version:"2", did:"user1"},
            {version:"2", did:"user2"},
            {version:"2", did:"user3"},
            {version:"2", did:"user4"},
            {version:"2", did:"examplecorp"},
            {version:"2", did:"foobar"},
            {version:"2", did:"foo"},
            {version:"2", did:"bar"},
            {version:"2", did:"baz"},
            {version:"2.2", did:"issuer"},
            {version:"2.2", did:"user1"},
            {version:"2.2", did:"user2"},
            {version:"2.2", did:"user3"},
            {version:"2.2", did:"user4"},
            {version:"2.2", did:"examplecorp"},
            {version:"2.2", did:"foobar"},
            {version:"2.2", did:"foo"},
            {version:"2.2", did:"bar"},
            {version:"2.2", did:"baz"}
        ];

        let listener = VerificationEventListener.getDefault("  ", "- ", "* ");
        for(let source of csvSource){
            let cd = testData.getCompatibleData(source.version);
            await cd.loadAll();
            let compactJson = cd.getDocumentJson(source.did, "compact");
            let compact = await DIDDocument.parseAsync(compactJson);
            expect(compact).not.toBeNull();
            let valid = await compact.isValid();
            expect(valid).toBeTruthy();

            expect(compact.isGenuine(listener)).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();

            valid = await compact.isValid(listener);
            expect(valid).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();

            let normalizedJson = cd.getDocumentJson(source.did, "normalized");
            let normalized = await DIDDocument.parseAsync(normalizedJson);
            expect(normalized).not.toBeNull();
            valid = await normalized.isValid();
            expect(valid).toBeTruthy();

            expect(normalized.isGenuine(listener)).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();

            valid = await normalized.isValid(listener);
            expect(valid).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();

            let doc = await cd.getDocument(source.did);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(doc.isGenuine(listener)).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();

            valid = await doc.isValid(listener);
            expect(valid).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();
        }
    });

    test("testSignAndVerify", async () => {
        let identity = await testData.getRootIdentity();
        let doc = await identity.newDid(TestConfig.storePass);
        expect(doc).not.toBeNull();
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        let data = Buffer.alloc(1024);
        let pkid = DIDURL.from("#primary", doc.getSubject());

        for (let i = 0; i < 10; i++) {
            data.fill(i)

            let sig = await doc.signWithId(pkid, TestConfig.storePass, data);
            let result = doc.verify(pkid, sig, data);
            expect(result).toBeTruthy();

            data[0] = 0xF;
            result = doc.verify(pkid, sig, data);
            expect(result).toBeFalsy();

            sig = await doc.signWithStorePass(TestConfig.storePass, data);
            result = doc.verify(pkid, sig, data);
            expect(result).toBeTruthy();

            data[0] = i;
            result = doc.verify(pkid, sig, data);
            expect(result).toBeFalsy();
        }
    })

    test("testDerive", async () => {
        let identity = await testData.getRootIdentity();
        let doc = await identity.newDid(TestConfig.storePass);
        expect(doc).not.toBeNull();
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        for (let i = 0; i < 10; i++) {
            let strKey = await doc.derive(i, TestConfig.storePass);
            let key = HDKey.deserializeBase58(strKey);

            let binKey = Base58.decode(strKey);
            let sk = Buffer.from(binKey.slice(46, 78));

            expect(sk.length).toEqual(key.getPrivateKeyBytes().length)
            expect(sk).toEqual(key.getPrivateKeyBytes());
        }
    })

    test("testDeriveFromIdentifier", async () => {
        let identifier = "org.elastos.did.test";
        let identity = await testData.getRootIdentity();
        let doc = await identity.newDid(TestConfig.storePass);
        expect(doc).not.toBeNull();

        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        //todo: compare to java derive result
        for (let i = -10; i < 10; i++) {
            let strKey = await doc.deriveFromIdentifier(identifier, i, TestConfig.storePass);
            let key = HDKey.deserializeBase58(strKey);

            let binKey = Base58.decode(strKey);
            let sk = Buffer.from(binKey.slice(46, 78));

            expect(sk.length).toEqual(key.getPrivateKeyBytes().length);
            expect(sk).toEqual(key.getPrivateKeyBytes());
        }
    })

    test("testEncryptDecryptData", async () => {
        // Get random DIDDocument.
        const identity = await testData.getRootIdentity();
        const doc: DIDDocument = await identity.newDid(TestConfig.storePass, 0, true);
        expect(doc).not.toBeNull();

        expect(await doc.isValid()).toBeTruthy();

        const testEncryptDecrypt = (cipher: Cipher, cipher2: Cipher) => {
            const sourceStr1 = 'This is the string 1 for encrypting.';
            const sourceStr2 = 'This is the string 2 for encrypting.';
            const sourceStr3 = 'This is the string 3 for encrypting.';
            const nonce = Buffer.from('404142434445464748494a4b4c4d4e4f5051525354555657', 'hex');

            // message
            const cipherStr = cipher.encrypt(Buffer.from(sourceStr1), nonce);
            const clearText = cipher2.decrypt(Buffer.from(cipherStr), nonce);
            expect(clearText.toString('utf8')).toEqual(sourceStr1);

            // stream
            let encryptStream = cipher.createEncryptionStream();
            const header = encryptStream.header();

            const cipherStr1 = encryptStream.push(Buffer.from(sourceStr1, 'utf8'));
            const cipherStr2 = encryptStream.push(Buffer.from(sourceStr2, 'utf8'));
            const cipherStr3 = encryptStream.pushLast(Buffer.from(sourceStr3, 'utf8'));

            let decryptStream = cipher2.createDecryptionStream(Buffer.from(header));

            const clearStr1 = decryptStream.pull(cipherStr1);
            const clearStr2 = decryptStream.pull(cipherStr2);
            const clearStr3 = decryptStream.pull(cipherStr3);

            expect(Buffer.from(clearStr1).toString('utf8')).toEqual(sourceStr1);
            expect(Buffer.from(clearStr2).toString('utf8')).toEqual(sourceStr2);
            expect(Buffer.from(clearStr3).toString('utf8')).toEqual(sourceStr3);
            expect(decryptStream.isComplete()).toBe(true);
        }

        // symmetric encryption
        const [identifier, securityCode] = ['identifier1', 1];
        let cipher = await doc.createCipher(identifier, securityCode, TestConfig.storePass);
        testEncryptDecrypt(cipher, cipher);

        // asymmetric encryption
        const identity2 = await testData.getSpecificRootIdentity();
        const doc2: DIDDocument = await identity2.newDid(TestConfig.storePass, 0, true);
        expect(doc2).not.toBeNull();
        expect(await doc2.isValid()).toBeTruthy();

        const identity3 = await testData.getSpecificRootIdentity2();
        const doc3: DIDDocument = await identity3.newDid(TestConfig.storePass, 0, true);
        expect(doc3).not.toBeNull();
        expect(await doc3.isValid()).toBeTruthy();

        const cipher2 = await doc2.createCurve25519Cipher(identifier, securityCode, TestConfig.storePass, false);
        const cipher3 = await doc3.createCurve25519Cipher(identifier, securityCode, TestConfig.storePass, true);
        cipher2.setOtherSideCurve25519PublicKey(cipher3.getCurve25519PublicKey());
        cipher3.setOtherSideCurve25519PublicKey(cipher2.getCurve25519PublicKey());

        testEncryptDecrypt(cipher2, cipher3);
        testEncryptDecrypt(cipher3, cipher2);
    })

    test("testCreateCustomizedDid", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();

        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass, false);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject()).toEqual(did);
        expect(doc.getController()).toEqual(controller.getSubject());

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    })

    test("testCreateMultisigCustomizedDid", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();
        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();

        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();
        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()], 2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async() => {await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();
        expect(ctrls.length).toBe(docctrls.length);

        for (let i = 0; i < ctrls.length; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    })

    test("testUpdateDid", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull()
        expect(resolved.toString()).toEqual(doc.toString())

        // Update again
        db = DIDDocument.Builder.newFromDocument(doc).edit();
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(3);
        expect(doc.getAuthenticationKeyCount()).toBe(3);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull()
        expect(resolved.toString()).toEqual(doc.toString());
    })

    test("testUpdateCustomizedDid", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");

        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull()
        expect(resolved.toString()).toEqual(doc.toString());

        // Update again
        db = DIDDocument.Builder.newFromDocument(doc).edit();
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(3);
        expect(doc.getAuthenticationKeyCount()).toBe(3);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
    })

    test("testUpdateMultisigCustomizedDid", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();
        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();
        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();
        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");

        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async () => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();

        expect(ctrls.length).toBe(docctrls.length);

        for (let i =0; i < 3; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl2);
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        doc = await ctrl1.signWithDocument(doc, TestConfig.storePass);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
        expect(doc.getPublicKeyCount()).toBe(4);
        expect(doc.getAuthenticationKeyCount()).toBe(4)

        // Update again
        db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl3);
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
        expect(doc.getPublicKeyCount()).toBe(5);
        expect(doc.getAuthenticationKeyCount()).toBe(5)
    })

    test("testTransferCustomizedDidAfterCreate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // create new controller
        let newController = await identity.newDid(TestConfig.storePass);
        valid = await newController.isValid();
        expect(valid).toBeTruthy();

        resolved = await newController.getSubject().resolve();
        expect(resolved).toBeNull();

        await newController.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await newController.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(newController.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(newController.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // create the transfer ticket
        doc.setEffectiveController(controller.getSubject());
        let ticket = await doc.createTransferTicket(newController.getSubject(), TestConfig.storePass);
        await expect(async() => {await ticket.isValid(); }).toBeTruthy();

        // create new document for customized DID
        let db = DIDDocument.Builder.newFromDocument(doc).edit(controller);
        await db.addController(newController.getSubject());
        db.setMultiSignature(1);
        doc = await db.seal(TestConfig.storePass);

        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(2);

        db = DIDDocument.Builder.newFromDocument(doc).edit(newController);
        db.removeController(controller.getSubject());
        doc = await db.seal(TestConfig.storePass);

        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(1);
        await store.storeDid(doc);

        // transfer
        await doc.publishWithTicket(ticket, newController.getDefaultPublicKeyId(), TestConfig.storePass);

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(newController.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    })

    test("testTransferCustomizedDidAfterUpdate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // create new controller
        let newController = await identity.newDid(TestConfig.storePass);
        valid = await newController.isValid();
        expect(valid).toBeTruthy();

        resolved = await newController.getSubject().resolve();
        expect(resolved).toBeNull();

        await newController.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await newController.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(newController.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(newController.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // create the transfer ticket
        let ticket = await controller.createTransferTicket(newController.getSubject(), TestConfig.storePass, did);
        valid = await ticket.isValid();
        expect(valid).toBeTruthy();

        // create new document for customized DID
        doc = await newController.newCustomized(did, TestConfig.storePass, true);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(newController.getSubject())).toBeTruthy();

        // transfer
        await doc.publishWithTicket(ticket, newController.getDefaultPublicKeyId(), TestConfig.storePass);

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(newController.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    })

    test("testTransferMultisigCustomizedDidAfterCreate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();
        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();
        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();
        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async() => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();

        expect(ctrls.length).toBe(docctrls.length);

        for (let i = 0; i < 3; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // new controllers for the did
        let td = testData.getInstantData();
        await td.getIssuerDocument();
        let u1 = await td.getUser1Document();
        let u2 = await td.getUser2Document();
        let u3 = await td.getUser3Document();
        let u4 = await td.getUser4Document();

        // transfer ticket
        let ticket = await ctrl1.createTransferTicket(u1.getSubject(), TestConfig.storePass, did);
        ticket = await ctrl2.signWithTicket(ticket, TestConfig.storePass);
        valid = await ticket.isValid();
        expect(valid).toBeTruthy();

        doc = await u1.newCustomizedDidWithController(did, [u2.getSubject(), u3.getSubject(), u4.getSubject()],
            3, TestConfig.storePass, true);
        doc = await u2.signWithDocument(doc, TestConfig.storePass);
        doc = await u3.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(4);
        expect(doc.getMultiSignature().toString()).toEqual("3:4");

        // transfer
        await doc.publishWithTicket(ticket, u2.getDefaultPublicKeyId(), TestConfig.storePass);

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    })

    test("testTransferMultisigCustomizedDidAfterUpdate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();

        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();
        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();
        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        await expect(async () => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();

        expect(ctrls.length).toBe(docctrls.length);

        for (let i = 0; i < ctrls.length; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl2);
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        doc = await ctrl1.signWithDocument(doc, TestConfig.storePass);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull()
        expect(resolved.toString()).toEqual(doc.toString());
        expect(doc.getPublicKeyCount()).toBe(4);
        expect(doc.getAuthenticationKeyCount()).toBe(4);

        // new controllers for the did
        let td = testData.getInstantData();
        await td.getIssuerDocument();
        let u1 = await td.getUser1Document();
        let u2 = await td.getUser2Document();
        let u3 = await td.getUser3Document();
        let u4 = await td.getUser4Document();

        // transfer ticket
        doc.setEffectiveController(ctrl1.getSubject());

        let ticket = await doc.createTransferTicket(u1.getSubject(), TestConfig.storePass);
        ticket = await ctrl2.signWithTicket(ticket, TestConfig.storePass);
        valid = await ticket.isValid();
        expect(valid).toBeTruthy();


        doc = await u1.newCustomizedDidWithController(did, [u2.getSubject(), u3.getSubject(), u4.getSubject()],
            3, TestConfig.storePass, true);
        doc = await u2.signWithDocument(doc, TestConfig.storePass);
        doc = await u3.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(4);
        expect(doc.getMultiSignature().toString()).toEqual("3:4");

        // transfer
        await doc.publishWithTicket(ticket, u3.getDefaultPublicKeyId(), TestConfig.storePass);

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    })

    test("testUpdateDidWithoutPrevSignature", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString())

        doc.getMetadata().setPreviousSignature(null);

        // Update again
        db = DIDDocument.Builder.newFromDocument(doc).edit();
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(3);
        expect(doc.getAuthenticationKeyCount()).toBe(3);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
    })

    test("testUpdateDidWithoutSignature", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString())

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        doc.getMetadata().setSignature(null);

        // Update again
        db = DIDDocument.Builder.newFromDocument(doc).edit();
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(3);
        expect(doc.getAuthenticationKeyCount()).toBe(3)
        await store.storeDid(doc);

        let d = doc;
        await expect(async () => {
                await d.publish(TestConfig.storePass);
                await DIDTestExtension.awaitStandardPublishingDelay();
        }).rejects.toThrowError(Exceptions.DIDNotUpToDateException);
    })

    test("testUpdateDidWithoutAllSignatures", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull()
        expect(resolved.toString()).toEqual(doc.toString());

        doc.getMetadata().setPreviousSignature(null);
        doc.getMetadata().setSignature(null);

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        let d = doc;
        await expect(async() => {
                await d.publish(TestConfig.storePass);
                await DIDTestExtension.awaitStandardPublishingDelay();
        }).rejects.toThrowError(Exceptions.DIDNotUpToDateException);
    })

    test("testForceUpdateDidWithoutAllSignatures", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString())

        doc.getMetadata().setPreviousSignature(null);
        doc.getMetadata().setSignature(null);

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass, doc.getDefaultPublicKeyId(), true);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
    })

    test("testUpdateDidWithWrongPrevSignature", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        doc.getMetadata().setPreviousSignature("1234567890");

        // Update
        db = DIDDocument.Builder.newFromDocument(doc).edit();
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(3);
        expect(doc.getAuthenticationKeyCount()).toBe(3)
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
    })

    test("testUpdateDidWithWrongSignature", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString())

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        doc.getMetadata().setSignature("1234567890");

        // Update
        db = DIDDocument.Builder.newFromDocument(doc).edit();
        key = TestData.generateKeypair();
        db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(3);
        expect(doc.getAuthenticationKeyCount()).toBe(3)
        await store.storeDid(doc);

        let d = doc;
        await expect(async() => {
                await d.publish(TestConfig.storePass);
                await DIDTestExtension.awaitStandardPublishingDelay();
        }).rejects.toThrowError(Exceptions.DIDNotUpToDateException);
    })

    test("testForceUpdateDidWithWrongPrevSignature", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString())

        doc.getMetadata().setPreviousSignature("1234567890");
        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass, doc.getDefaultPublicKeyId(), true);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString())
    })

    test("testForceUpdateDidWithWrongSignature", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        doc.getMetadata().setSignature("1234567890");

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass, doc.getDefaultPublicKeyId(), true);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
    })

    test("testDeactivateSelfAfterCreate", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let did = doc.getSubject();
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        await doc.deactivate(null, TestConfig.storePass, null);

        doc = await doc.getSubject().resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();

        let rr = await did.resolveBiography();
        expect(rr).not.toBeNull();
        expect(did.equals(rr.getDid())).toBeTruthy();
        expect(DIDBiographyStatus.DEACTIVATED.equals(rr.getStatus())).toBeTruthy();
        expect(rr.getTransactionCount()).toBe(2);
        let txs = rr.getAllTransactions();
        expect(txs).not.toBeNull();
        expect(txs.length).toBe(2);
    })

    test("testDeactivateSelfAfterUpdate", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        await doc.deactivate(null, TestConfig.storePass, null);
        doc = await doc.getSubject().resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateCustomizedDidAfterCreate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Deactivate
        await doc.deactivate(null, TestConfig.storePass, null);
        doc = await doc.getSubject().resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateCustomizedDidAfterUpdate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // Deactivate
        await doc.deactivate(null, TestConfig.storePass, null);
        doc = await doc.getSubject().resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateCidAfterCreateByController", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Deactivate
        await doc.deactivate(controller.getDefaultPublicKeyId(), TestConfig.storePass, null);
        doc = await did.resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateCidAfterUpdateByController", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let controller = await identity.newDid(TestConfig.storePass);
        let valid = await controller.isValid();
        expect(valid).toBeTruthy();

        let resolved = await controller.getSubject().resolve();
        expect(resolved).toBeNull();

        await controller.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await controller.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld");
        let doc = await controller.newCustomized(did, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getController().equals(controller.getSubject())).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getController().equals(controller.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        expect(doc.getPublicKeyCount()).toBe(2);
        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        // Deactivate
        await doc.deactivate(controller.getDefaultPublicKeyId(),TestConfig.storePass, null);
        doc = await did.resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateMultisigCustomizedDidAfterCreate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();

        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();

        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();

        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async() => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();
        expect(ctrls.length).toBe(docctrls.length);

        for (let i = 0; i < 3; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Deactivate
        await doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass, null);
        doc = await doc.getSubject().resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateMultisigCustomizedDidAfterUpdate", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();

        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();

        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();

        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async() => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();
        expect(ctrls.length).toBe(docctrls.length);

        for (let i = 0; i < 3; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl2);
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        doc = await ctrl1.signWithDocument(doc, TestConfig.storePass);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
        expect(doc.getPublicKeyCount()).toBe(4);
        expect(doc.getAuthenticationKeyCount()).toBe(4);

        // Deactivate
        await doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass, null);
        doc = await doc.getSubject().resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateMultisigCidAfterCreateByController", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();

        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();

        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();

        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async() => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Deactivate
        await doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass, null);
        doc = await did.resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateMultisigCidAfterUpdateByController", async () => {
        let identity = await testData.getRootIdentity();

        // Create normal DID first
        let ctrl1 = await identity.newDid(TestConfig.storePass);
        let valid = await ctrl1.isValid();
        expect(valid).toBeTruthy();

        await ctrl1.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await ctrl1.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl1.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl2 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl2.isValid();
        expect(valid).toBeTruthy();

        await ctrl2.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl2.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl2.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        let ctrl3 = await identity.newDid(TestConfig.storePass);
        valid = await ctrl3.isValid();
        expect(valid).toBeTruthy();

        await ctrl3.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await ctrl3.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(ctrl3.getSubject())).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Create customized DID
        let did = new DID("did:elastos:helloworld3");
        let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
            2, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeFalsy();

        const d = doc;
        expect(async() => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

        doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getSubject().equals(did)).toBeTruthy();
        expect(doc.getControllerCount()).toBe(3);

        let ctrls = new Array<DID>();
        ctrls.push(ctrl1.getSubject());
        ctrls.push(ctrl2.getSubject());
        ctrls.push(ctrl3.getSubject());
        ctrls.sort();

        let docctrls = doc.getControllers();
        docctrls.sort();
        expect(ctrls.length).toBe(docctrls.length);

        for (let i = 0; i < 3; i++)
            expect(ctrls[i].equals(docctrls[i])).toBeTruthy();

        resolved = await did.resolve();
        expect(resolved).toBeNull();

        doc.setEffectiveController(ctrl1.getSubject());
        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await did.resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.getSubject().equals(did)).toBeTruthy();
        expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await resolved.isValid();
        expect(valid).toBeTruthy();

        // Update
        let db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl2);
        let key = TestData.generateKeypair();
        db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
        doc = await db.seal(TestConfig.storePass);
        doc = await ctrl1.signWithDocument(doc, TestConfig.storePass);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());
        expect(doc.getPublicKeyCount()).toBe(4);
        expect(doc.getAuthenticationKeyCount()).toBe(4)

        // Deactivate
        await doc.deactivate(ctrl2.getDefaultPublicKeyId(), TestConfig.storePass, null);
        doc = await did.resolve();
        await expect(async() => { await doc.isDeactivated();}).toBeTruthy();
    })

    test("testDeactivateWithAuthorization1", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        let target = await identity.newDid(TestConfig.storePass);
        let db = DIDDocument.Builder.newFromDocument(target).edit();
        await db.authorizeDid(new DIDURL("#recovery", target.getSubject()), doc.getSubject(), null);
        target = await db.seal(TestConfig.storePass);
        expect(target).not.toBeNull();
        expect(target.getAuthorizationKeyCount()).toBe(1);
        expect(target.getAuthorizationKeys()[0].getController().equals(doc.getSubject())).toBeTruthy();
        await store.storeDid(target);

        await target.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await target.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(target.toString());

        let deactivated = await doc.isDeactivated();
        expect(deactivated).toBeFalsy();

        await doc.deactivateTargetDID(target.getSubject(), null, TestConfig.storePass, null);
        target = await target.getSubject().resolve();
        await expect(async() => { await target.isDeactivated();}).toBeTruthy();

        doc = await doc.getSubject().resolve();
        deactivated = await doc.isDeactivated();
        expect(deactivated).toBeFalsy();
    })

    test("testDeactivateWithAuthorization2", async () => {
        let identity = await testData.getRootIdentity();
        let doc = await identity.newDid(TestConfig.storePass);
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        let id = DIDURL.from("#key-2", doc.getSubject());

        db.addAuthenticationKey(id, key.getPublicKeyBase58());
        store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
        expect(store.containsPrivateKey(id)).toBeTruthy();

        doc = await db.seal(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        let target = await identity.newDid(TestConfig.storePass);
        db = DIDDocument.Builder.newFromDocument(target).edit();
        db.addAuthorizationKey("#recovery", doc.getSubject().toString(), key.getPublicKeyBase58());
        target = await db.seal(TestConfig.storePass);
        expect(target).not.toBeNull();
        expect(target.getAuthorizationKeyCount()).toBe(1);
        expect(target.getAuthorizationKeys()[0].getController().equals(doc.getSubject())).toBeTruthy();
        await store.storeDid(target);

        await target.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await target.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(target.toString());

        await doc.deactivateTargetDID(target.getSubject(), null, TestConfig.storePass, null);
        target = await target.getSubject().resolve();
        await expect(async() => { await target.isDeactivated();}).toBeTruthy();

        doc = await doc.getSubject().resolve();
        let deactivated = await doc.isDeactivated();
        expect(deactivated).toBeFalsy();
    })

    test("testDeactivateWithAuthorization3", async () => {
        let identity = await testData.getRootIdentity();
        let doc = await identity.newDid(TestConfig.storePass);
        let db = DIDDocument.Builder.newFromDocument(doc).edit();
        let key = TestData.generateKeypair();
        let id = DIDURL.from("#key-2", doc.getSubject());
        db.addAuthenticationKey(id, key.getPublicKeyBase58());
        store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
        doc = await db.seal(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        expect(doc.getAuthenticationKeyCount()).toBe(2);
        await store.storeDid(doc);

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(doc.toString());

        let target = await identity.newDid(TestConfig.storePass);
        db = DIDDocument.Builder.newFromDocument(target).edit();
        db.addAuthorizationKey("#recovery", doc.getSubject().toString(),
            key.getPublicKeyBase58());
        target = await db.seal(TestConfig.storePass);
        expect(target).not.toBeNull();
        expect(target.getAuthorizationKeyCount()).toBe(1);
        expect(target.getAuthorizationKeys()[0].getController().equals(doc.getSubject())).toBeTruthy();
        await store.storeDid(target);

        await target.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await target.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(resolved.toString()).toEqual(target.toString());

        await doc.deactivateTargetDID(target.getSubject(), null, TestConfig.storePass, null);
        target = await target.getSubject().resolve();
        await expect(async() => { await target.isDeactivated();}).toBeTruthy();

        doc = await doc.getSubject().resolve();
        let deactivated = await doc.isDeactivated();
        expect(deactivated).toBeFalsy();
    });

    test("testResolveLocal", async () => {
		let json = "{\"id\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab\",\"publicKey\":[{\"id\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab#primary\",\"type\":\"ECDSAsecp256r1\",\"controller\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab\",\"publicKeyBase58\":\"21YM84C9hbap4GfFSB3QbjauUfhAN4ETKg2mn4bSqx4Kp\"}],\"authentication\":[\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab#primary\"],\"verifiableCredential\":[{\"id\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab#name\",\"type\":[\"BasicProfileCredential\",\"SelfProclaimedCredential\"],\"issuer\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab\",\"issuanceDate\":\"2020-07-01T00:46:40Z\",\"expirationDate\":\"2025-06-30T00:46:40Z\",\"credentialSubject\":{\"id\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab\",\"name\":\"KP Test\"},\"proof\":{\"type\":\"ECDSAsecp256r1\",\"verificationMethod\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab#primary\",\"signature\":\"jQ1OGwpkYqjxooyaPseqyr_1MncOZDrMS_SvwYzqkCHVrRfjv_b7qfGCjxy7Gbx-LS3bvxZKeMxU1B-k3Ysb3A\"}}],\"expires\":\"2025-07-01T00:46:40Z\",\"proof\":{\"type\":\"ECDSAsecp256r1\",\"created\":\"2020-07-01T00:47:20Z\",\"creator\":\"did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab#primary\",\"signatureValue\":\"TOpNt-pWeQDJFaS5EkpMOuCqnZKhPCizf7LYQQDBrNLVIZ_7AR73m-KJk7Aja0wmZWXd7S4n7SC2W4ZQayJlMA\"}}";
		let did = new DID("did:elastos:idFKwBpj3Buq3XbLAFqTy8LMAW8K7kp3Ab");

		let doc = await did.resolve();
		expect(doc).toBeNull();

        let parserDoc = await DIDDocument.parseAsync(json);
		DIDBackend.getInstance().setResolveHandle(new class implements LocalResolveHandle {
            public resolve(d: DID): DIDDocument {
                if (d.equals(did))
                    return parserDoc;

                return null;
            }
        });

		doc = await did.resolve();
        expect(doc).not.toBeNull();
        expect(doc.getSubject().equals(did)).toBeTruthy();

		DIDBackend.getInstance().setResolveHandle(null);
		doc = await did.resolve();
        expect(doc).toBeNull();
	});
});