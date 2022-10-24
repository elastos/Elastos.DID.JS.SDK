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

import {
    Logger,
    DIDStore,
    RootIdentity
} from "@elastosfoundation/did-js-sdk";
import { DIDTestExtension } from "./utils/didtestextension";
import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";

const log = new Logger("DIDStoreTest");

let testData: TestData;
let store: DIDStore;

describe("RootIdentity Tests", ()=>{
    beforeEach(async () => {
        testData = await TestData.create();
        await testData.cleanup();
        store = await testData.getStore();
    });

    afterEach(async () => {
    });

    test("testInitPrivateIdentity", async () => {
        expect(await store.containsRootIdentities()).toBeFalsy();

        let identity = await testData.getRootIdentity();
        expect(await store.containsRootIdentities()).toBeTruthy();

        let store2 = await DIDStore.open(TestConfig.storeRoot);
        expect(await store2.containsRootIdentities()).toBeTruthy();
        let identity2 = await store2.loadRootIdentity();
        expect(identity2).not.toBeNull();
        expect(await store2.containsRootIdentity(identity2.getId())).toBeTruthy();

        expect(identity.getPreDerivedPublicKey().serializePublicKeyBase58()).toEqual(
                identity2.getPreDerivedPublicKey().serializePublicKeyBase58());

        let exportedMnemonic = await identity2.exportMnemonic(TestConfig.storePass);
        expect(testData.getMnemonic()).toEqual(exportedMnemonic);
    });

    test("testInitPrivateIdentityWithMnemonic", async () => {
        let expectedIDString = "iY4Ghz9tCuWvB5rNwvn4ngWvthZMNzEA7U";
        let mnemonic = "cloth always junk crash fun exist stumble shift over benefit fun toe";

        expect(await store.containsRootIdentities()).toBeFalsy();

        let identity = await RootIdentity.createFromMnemonic(mnemonic, "", store, TestConfig.storePass);
        expect(await store.containsRootIdentities()).toBeTruthy();
        expect(identity.getId()).toEqual(RootIdentity.getIdFromMnemonic(mnemonic, ""));

        let store2 = await DIDStore.open(TestConfig.storeRoot);
        expect(await store2.containsRootIdentities()).toBeTruthy();

        let identity2 = await store2.loadRootIdentity();

        let doc = await identity2.newDid(TestConfig.storePass);
        expect(doc).not.toBeNull();
        expect(expectedIDString).toEqual(doc.getSubject().getMethodSpecificId());
    });

    test("testInitPrivateIdentityWithRootKey", async () => {
        let expectedIDString = "iYbPqEA98rwvDyA5YT6a3mu8UZy87DLEMR";
        let rootKey = "xprv9s21ZrQH143K4biiQbUq8369meTb1R8KnstYFAKtfwk3vF8uvFd1EC2s49bMQsbdbmdJxUWRkuC48CXPutFfynYFVGnoeq8LJZhfd9QjvUt";

        expect(await store.containsRootIdentities()).toBeFalsy();

        await RootIdentity.createFromPrivateKey(rootKey, store, TestConfig.storePass);
        expect(await store.containsRootIdentities()).toBeTruthy();

        let store2 = await DIDStore.open(TestConfig.storeRoot);
        expect(await store2.containsRootIdentities()).toBeTruthy();

        let identity2 = await store2.loadRootIdentity();

        let doc = await identity2.newDid(TestConfig.storePass);
        expect(doc).not.toBeNull();
        expect(expectedIDString).toEqual(doc.getSubject().getMethodSpecificId());
    });

    test("testCreateDIDWithAlias", async () => {
        let identity = await testData.getRootIdentity();

        let alias = "my first did";

        let doc = await identity.newDid(TestConfig.storePass);
        await doc.getMetadata().setAlias(alias);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();

        // test alias
        await store.storeDid(resolved);
        expect(alias).toEqual(resolved.getMetadata().getAlias());
        expect(doc.getSubject().equals(resolved.getSubject())).toBeTruthy();
        expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    });

    test("testCreateDIDWithoutAlias", async () => {
        let identity = await testData.getRootIdentity();

        let doc = await identity.newDid(TestConfig.storePass);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        let resolved = await doc.getSubject().resolve();
        expect(resolved).toBeNull();

        await doc.publish(TestConfig.storePass);
        await DIDTestExtension.awaitStandardPublishingDelay();

        resolved = await doc.getSubject().resolve();
        expect(resolved).not.toBeNull();
        expect(doc.getSubject().equals(resolved.getSubject())).toBeTruthy();
        expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());

        valid = await resolved.isValid();
        expect(valid).toBeTruthy();
    });

    test("testCreateDIDByIndex", async () => {
        let identity = await testData.getRootIdentity();

        let did = identity.getDid(0);
        let doc = await identity.newDid(TestConfig.storePass, 0);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(did.equals(doc.getSubject())).toBeTruthy();

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await expect(() => identity.newDid(TestConfig.storePass)).rejects.toThrowError("DID already exists in the store.");

        let success = await store.deleteDid(did);
        expect(success).toBeTruthy();
        doc = await identity.newDid(TestConfig.storePass);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(did.equals(doc.getSubject())).toBeTruthy();
    });

    test("testGetDid", async () => {
        let identity = await testData.getRootIdentity();

        for (let i = 0; i < TestConfig.DID_INDEX_LOOPS; i++) {
            let doc = await identity.newDid(TestConfig.storePass, i);

            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let did = identity.getDid(i);

            expect(doc.getSubject().equals(did)).toBeTruthy();
        }
    });

    test("testCreateAppDid", async () => {
        let identity = await testData.getRootIdentity();

        let appId = "io.trinity-tech.did.testcase";
        let appCode = 619;

        let did = identity.getDidFromIdentifier(appId, appCode);
        let doc = await identity.newDidFromIdentifier(TestConfig.storePass, appId, appCode);
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(did.equals(doc.getSubject())).toBeTruthy();

        await expect(async () => { await identity.newDidFromIdentifier(TestConfig.storePass, appId, appCode); }).rejects.toThrowError();

        let success = await store.deleteDid(did);
        expect(success).toBeTruthy();
        doc = await identity.newDidFromIdentifier(TestConfig.storePass, appId, appCode);
        valid = await doc.isValid();
        expect(valid).toBeTruthy();
        expect(did.equals(doc.getSubject())).toBeTruthy();
    });
});