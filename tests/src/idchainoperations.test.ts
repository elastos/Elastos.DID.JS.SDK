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

import { TestData } from "./utils/testdata";
import {
    DIDBiographyStatus,
    Logger,
    DIDStore,
    DID,
    DIDURL,
    RootIdentity,
    DIDDocument,
    IDChainRequest,
    VerifiableCredential,
    Issuer,
    File,
    Features,
    Exceptions,
    JSONObject} from "@elastosfoundation/did-js-sdk";
import { TestConfig } from "./utils/testconfig";
import { Utils } from "./utils/utils";
import { DIDTestExtension } from "./utils/didtestextension";
import { join } from "path";

const log = new Logger("IDChainOperationsTest");

let testData: TestData;
let store: DIDStore;
let dids: DID[];
let customizeDid: DID;
let multiCustomizeDid: DID;

let mnemonic: string;
let identity: RootIdentity;

const _charStr = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function randomIndex(min, max, i): number {
    let index = Math.floor(Math.random()*(max-min+1)+min);
    let numStart = _charStr.length - 10;
    if (i==0 && index >= numStart)
        index = randomIndex(min, max, i);

    return index;
}

function genRandomString(len): string {
    let min = 0, max = _charStr.length -1, _str = "";
    len = len || 15;
    for (let i = 0, index; i < len; i++) {
        index = randomIndex(min, max, i);
        _str += _charStr[index];
    }
    return _str;
}
// We use several describe() to force jest running test in a sequential order, as the below
// tests depend on each other.
describe('IDChainOperations Tests', () => {
    beforeAll(async ()=> {
        testData = new TestData(true);
        await testData.cleanup();
        await testData.getRootIdentity();
        dids = [];
    });

    afterAll(async () => {
    });

    beforeEach(async () => {
        store = await testData.getStore();
        mnemonic = testData.getMnemonic();
        identity = await testData.getRootIdentity();
    });

    describe('Order 1', () => {
        test('testCreateController1', async () => {
            log.trace("Begin 'testCreateController1'...");

            // Create new DID and publish to ID sidechain.
            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

            log.debug("Publishing new DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Publish new DID {}...OK({}s)", did, duration);

            let resolved = await did.resolve();
            expect(resolved).not.toBeNull();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            dids.push(did); // 0
        });
    });

    describe('Order 2', () => {
        test('testCreateController2', async () => {
            log.trace("Begin 'testCreateController2'...");
            // Create new DID and publish to ID sidechain.
            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

            //Add one key
            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            let keyid = DIDURL.from("#key1", did);
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid, key.getPublicKeyBase58());
            store.storePrivateKey(keyid, key.serialize(), TestConfig.storePass);

            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toEqual(2);
            expect(doc.getAuthenticationKeyCount()).toEqual(2);
            await store.storeDid(doc);

            log.debug("Publishing new DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass, "#key1");
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Publish new DID {}...OK({}s)", did, duration);

            testData.waitForWalletAvailable();
            let resolved = await did.resolve(true);
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            dids.push(did); // 1
        });
    });

    describe('Order 3', () => {
        test('testCreateController3', async () => {
            log.trace("Begin 'testCreateController3'...");
            // Create new DID and publish to ID sidechain.
            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            // Add two services
            db.addService("#test-svc-1", "Service.Testing",
                "https://www.elastos.org/testing1");
            db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
                "Service.Testing", "https://www.elastos.org/testing2");
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.isValid()).toBeTruthy();
            await store.storeDid(doc);

            log.debug("Publishing new DID and resolve {}...", did);

            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let resolved = await did.resolve(true);

            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Publish new DID and resolve {}...OK({}s)", did, duration);

            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            dids.push(did); // 2
        });
    });

    describe('Order 4', () => {
        test('testUpdateController1', async () => {
            log.trace("Begin 'testUpdateController1'...");
            // User the DID that created in previous case(1)
            let doc = await store.loadDid(dids[0]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update: add one key and self-claimed credential.
            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            let keyid1 = DIDURL.from("#key1", doc.getSubject());
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid1, key.getPublicKeyBase58());
            store.storePrivateKey(keyid1, key.serialize(), TestConfig.storePass);

            let subject = {
                "passport": "S653258Z07"
            };
            await db.createAndAddCredential(TestConfig.storePass, "#passport", subject);

            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toEqual(2);
            expect(doc.getAuthenticationKeyCount()).toEqual(2);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve();
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID).toEqual(rr.getStatus());
            expect(rr.getTransactionCount()).toBe(2);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(2);

            let tx = txs[0];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            tx = txs[1];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();
        });
    });

    describe('Order 5', () => {
        test('testUpdateAgainController1', async () => {
            log.trace("Begin 'testUpdateAgainController1'...");

            // User the DID that created in previous case(1)
            let doc = await store.loadDid(dids[0]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update again: add key2, remove key1 and add service
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            let keyid2 = DIDURL.from("#key2", doc.getSubject());
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid2, key.getPublicKeyBase58());
            store.storePrivateKey(keyid2, key.serialize(), TestConfig.storePass);

            db.removeAuthenticationKey("#key1");
            db.addService("#test-svc-1",
                "Service.Testing", "https://www.elastos.org/testing1");

            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(3);
            expect(doc.getAuthenticationKeyCount()).toBe(2);
            expect(doc.getServiceCount()).toBe(1);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve();
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(3);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(3);

            let tx = txs[0];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            tx = txs[1];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            tx = txs[2];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();
        });
    });

    describe('Order 6', () => {
        test('testUpdateController2', async () => {
            log.trace("Begin 'testUpdateController2'...");
            // User the DID that created in previous case(2)
            Features.enableJsonLdContext(true);

            let doc = await store.loadDid(dids[1]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve(true);
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update: add one authentication key and one service
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            let keyid2 = DIDURL.from("#key2", doc.getSubject());
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid2, key.getPublicKeyBase58());
            store.storePrivateKey(keyid2, key.serialize(), TestConfig.storePass);

            db.addService("#test-svc-1",
                    "Service.Testing", "https://www.elastos.org/testing1");
            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(3);
            expect(doc.getAuthenticationKeyCount()).toBe(3);
            expect(doc.getServiceCount()).toBe(1);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve(true);
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));
            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(2);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(2);

            let tx = txs[0];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            tx = txs[1];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            Features.enableJsonLdContext(false);
        });
    });

    describe('Order 7', () => {
        test('testUpdateAgainController2', async () => {
            log.trace("Begin 'testUpdateAgainController2'...");

            // User the DID that created in previous case(2)
            let doc = await store.loadDid(dids[1]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve(true);
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update by the same document
            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await store.storeDid(resolved);
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve(true);
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toReturn;
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(3);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(3);

            let tx = txs[0];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            tx = txs[1];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(await tx.getRequest().isValid()).toBeTruthy();

            tx = txs[2];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            await expect(async() => {await tx.getRequest().isValid() }).toBeTruthy();
        });
    });

    describe('Order 8', () => {
        test('testCreateController4', async () => {
            log.trace("Begin 'testCreateController4'...");

            // Create new DID and publish to ID sidechain.
            Features.enableJsonLdContext(true);

            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(did);

            let props= {
                name: "John",
                gender: "Male",
                nationality: "Singapore",
                email: "john@example.com",
                twitter: "@john"
            };

            let vc = await cb.id("#profile")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .typeWithContext("ProfileCredential", "https://ns.elastos.org/credentials/profile/v1")
                    .typeWithContext("EmailCredential", "https://ns.elastos.org/credentials/email/v1")
                    .typeWithContext("SocialCredential", "https://ns.elastos.org/credentials/social/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toBe(1);
            await store.storeDid(doc);

            log.debug("Publishing new DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Publish new DID {}...OK({}s)", did, duration);

            let resolved = await did.resolve();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            Features.enableJsonLdContext(false);
            dids.push(did); // 3
        });
    });

    describe('Order 9', () => {
        test('testUpdateController4', async () => {
            log.trace("Begin 'testUpdateController4'...");

            // User the DID that created in previous case(8)
            let issuerDoc = await store.loadDid(dids[1]);
            expect(issuerDoc).not.toBeNull();
            let issuerId = issuerDoc.getSubject();

            let doc = await store.loadDid(dids[3]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            //Update: add kyc credential and one authentication key
            let issuer = new Issuer(issuerDoc);
            let cb = issuer.issueFor(did);

            let props = {
                nationality: "Singapore",
                passport: "S653258Z07"
            };

            let vc = await cb.id("#passport")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            let keyid1 = DIDURL.from("#key1", doc.getSubject());
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid1, key.getPublicKeyBase58());
            store.storePrivateKey(keyid1, key.serialize(), TestConfig.storePass);

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toBe(2);
            expect(doc.getAuthenticationKeyCount()).toBe(2);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve();
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(2);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(2);

            let tx = txs[0];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            expect(tx.getRequest().isValid()).toBeTruthy();

            tx = txs[1];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            expect(tx.getRequest().isValid()).toBeTruthy();
        });
    });

    describe('Order 10', () => {
        test('testUpdateAgainController4', async () => {
            log.trace("Begin 'testUpdateAgainController4'...");

            // User the DID that created in previous case(8)
            let doc = await store.loadDid(dids[3]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update again: add self-claimed credential and remove passport credential
            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(did);

            let props = {
                Abc: "Abc",
                abc: "abc",
                Foobar: "Foobar",
                foobar: "foobar",
                zoo: "zoo",
                Zoo: "Zoo"
            };

            let vc = await cb.id("#test")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            db.removeCredential("#profile");
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toEqual(2);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve();
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(3);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(3);

            let tx = txs[0];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            expect(tx.getRequest().isValid()).toBeTruthy();

            tx = txs[1];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            expect(tx.getRequest().isValid()).toBeTruthy();

            tx = txs[2];
            expect(did.equals(tx.getDid())).toBeTruthy();
            expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            expect(tx.getRequest().isValid()).toBeTruthy();
        });
    });

    describe('Order 11', () => {
        test('testCreateController5', async () => {
            log.trace("Begin 'testCreateController5'...");

            // Create new DID and publish to ID sidechain.
            Features.enableJsonLdContext(true);

            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(did);

            let props = {
                name: "John",
                gender: "Male",
                nationality: "Singapore",
                email: "john@example.com",
                twitter: "@john"
            };

            let vc = await cb.id("#profile")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .typeWithContext("ProfileCredential", "https://ns.elastos.org/credentials/profile/v1")
                    .typeWithContext("EmailCredential", "https://ns.elastos.org/credentials/email/v1")
                    .typeWithContext("SocialCredential", "https://ns.elastos.org/credentials/social/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toBe(1);
            await store.storeDid(doc);

            log.debug("Publishing new DID {}...", did);
            let s1 = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - s1 + 500) / 1000;
            log.debug("Publish new DID {}...OK({}s)", did, duration);

            let resolved = await did.resolve(true);
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            Features.enableJsonLdContext(false);
            dids.push(did); // 4
        });
    });

    describe('Order 12', () => {
        test('testUpdateController5', async () => {
            log.trace("Begin 'testUpdateController5'...");

            // User the DID that created in previous case(11)
            let doc = await store.loadDid(dids[4]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve(true);
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update: add a self-claimed credential and an authorization key
            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(did);

            let props = {
                nationality: "Singapore",
                passport: "S653258Z07"
            };

            let vc = await cb.id("#passport")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);

            //add controller2's key2 to be authorization key.
            let authorizationDoc = await store.loadDid(dids[1]);
            let key = authorizationDoc.getAuthenticationKey("#key2");

            db.addAuthorizationKey("#recovery", authorizationDoc.getSubject().toString(),
                    key.getPublicKeyBase58());

            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toBe(2);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            resolved = await did.resolve(true);
            expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);
        });
    });

    describe('Order 13', () => {
        test('testUpdateAgainController5', async () => {
            log.trace("Begin 'testUpdateAgainController5'...");

            // User the DID that created in previous case(11)
            let doc = await store.loadDid(dids[4]);
            expect(doc).not.toBeNull();
            let did = doc.getSubject();

            let resolved = await did.resolve(true);
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            expect(resolved.isValid()).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);

            // Update three times with the same document.
            for (let times = 0; times < 3; times++) {
                log.debug("Updating{} DID {}...", times + 1, did);
                let start = Date.now();
                await store.storeDid(resolved);
                await resolved.publish(TestConfig.storePass);
                await DIDTestExtension.awaitStandardPublishingDelay();
                let duration = (Date.now() - start + 500) / 1000;
                log.debug("Update DID {}...OK({}s)", did, duration);

                resolved = await did.resolve(true);
                expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
                expect(did.equals(resolved.getSubject())).toBeTruthy();
                expect(resolved.isValid()).toBeTruthy();
                expect(doc.toString(true)).toEqual(resolved.toString(true));

                lastTxid = resolved.getMetadata().getTransactionId();
                log.debug("Last transaction id {}", lastTxid);
            }

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(5);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(5);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(did.equals(tx.getDid())).toBeTruthy();
                await expect(await tx.getRequest().isValid()).toBeTruthy();

                if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    describe('Order 14', () => {
        test("testCreateCustomizedDid", async () => {
            log.trace("Begin 'testCreateCustomizedDid'...");

            let controllerDoc = await store.loadDid(dids[0]);
            expect(controllerDoc).not.toBeNull();
            expect(controllerDoc.isValid()).toBeTruthy();

            // Create customized DID
            let customizedStr = genRandomString(20);
            customizeDid = new DID(DID.METHOD, customizedStr);
            log.trace("Begin to create a new customized DID: " + customizedStr);

            let doc = await controllerDoc.newCustomized(customizeDid, TestConfig.storePass, false);
            expect(doc.isValid()).toBeTruthy();

            expect(doc.getSubject()).toEqual(customizeDid);
            expect(doc.getController()).toEqual(controllerDoc.getSubject());

            let resolved = await customizeDid.resolve();
            expect(resolved).toBeNull();

            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await customizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(customizeDid)).toBeTruthy();
            expect(resolved.getController().equals(controllerDoc.getSubject())).toBeTruthy();
            expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
            expect(resolved.isValid()).toBeTruthy();

            // Update: add two authentication keys
            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            let keyid1 = DIDURL.from("#key1", customizeDid);
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid1, key.getPublicKeyBase58());
            store.storePrivateKey(keyid1, key.serialize(), TestConfig.storePass);

            let keyid2 = DIDURL.from("#key2", customizeDid);
            key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid2, key.getPublicKeyBase58());
            store.storePrivateKey(keyid2, key.serialize(), TestConfig.storePass);

            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(4);
            expect(doc.getAuthenticationKeyCount()).toBe(4);
            expect(doc.getCredentialCount()).toBe(0);
            expect(doc.getServiceCount()).toBe(0);
            await store.storeDid(doc);

            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull()
            expect(resolved.toString()).toEqual(doc.toString());

            // Update again: add a self-claimed credential and a kyc credential by controller3
            db = DIDDocument.Builder.newFromDocument(doc).edit();
            let json = "{\"name\":\"Jay Holtslander\",\"alternateName\":\"Jason Holtslander\"}";
            await db.createAndAddCredential(TestConfig.storePass, "#name", json);

            let issuerDoc = await store.loadDid(dids[2]);
            expect(issuerDoc).not.toBeNull();
            let issuerId = issuerDoc.getSubject();

            let issuer = new Issuer(issuerDoc);
            let cb = issuer.issueFor(customizeDid);

            let props = {
                nationality: "Singapore",
                passport: "S653258Z07"
            };

            let vc = await cb.id("#passport")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();
            db.addCredential(vc);

            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(4);
            expect(doc.getAuthenticationKeyCount()).toBe(4);
            expect(doc.getCredentialCount()).toBe(2);
            expect(doc.getServiceCount()).toBe(0);
            await store.storeDid(doc);

            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.toString()).toEqual(doc.toString());

            let rr = await customizeDid.resolveBiography();
            expect(rr).not.toBeNull();
            expect(customizeDid.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(3);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(3);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(customizeDid.equals(tx.getDid())).toBeTruthy();
                await expect(await tx.getRequest().isValid()).toBeTruthy();

                if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    //multisig customized did: ctrl1, ctrl2, ctrl3, 2:3, key1, key2
    describe('Order 15', () => {
        test("testCreateMultisigCustomizedDid", async () => {
            log.trace("Begin 'testCreateMultisigCustomizedDid'...");

            let ctrl1 = await store.loadDid(dids[0]);
            expect(ctrl1).not.toBeNull();
            let valid = await ctrl1.isValid();
            expect(valid).toBeTruthy();

            let ctrl2 = await store.loadDid(dids[1]);
            expect(ctrl2).not.toBeNull();
            valid = await ctrl2.isValid();
            expect(valid).toBeTruthy();

            let ctrl3 = await store.loadDid(dids[2]);
            expect(ctrl3).not.toBeNull();
            valid = await ctrl3.isValid();
            expect(valid).toBeTruthy();

            // Create customized DID
            let customizedStr = genRandomString(20);
            multiCustomizeDid = new DID(DID.METHOD, customizedStr);
            log.trace("Begin to create a new multi-customized DID: " + customizedStr);

            let doc = await ctrl1.newCustomizedDidWithController(multiCustomizeDid, [ctrl2.getSubject(), ctrl3.getSubject()],
                2, TestConfig.storePass);
            valid = await doc.isValid();
            expect(valid).toBeFalsy();

            const d = doc;
            expect(async () => { await ctrl1.signWithDocument(d, TestConfig.storePass); }).rejects.toThrowError();

            doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(doc.getSubject().equals(multiCustomizeDid)).toBeTruthy();
            expect(doc.getControllerCount()).toBe(3);
            expect(doc.getPublicKeyCount()).toBe(6);
            expect(doc.getAuthenticationKeyCount()).toBe(6);
            expect(doc.getCredentialCount()).toBe(0);

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

            let resolved = await multiCustomizeDid.resolve();
            expect(resolved).toBeNull();

            doc.setEffectiveController(ctrl1.getSubject());
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await multiCustomizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(multiCustomizeDid)).toBeTruthy();
            expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
            valid = await resolved.isValid();
            expect(valid).toBeTruthy();

            // Update: add an authentication key and self-claimed credential signed by controller2
            let db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl2);

            let keyid1 = DIDURL.from("#key1", multiCustomizeDid);
            let key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid1, key.getPublicKeyBase58());
            store.storePrivateKey(keyid1, key.serialize(), TestConfig.storePass);

            let json = "{\"twitter\":\"@john\"}";
            await db.createAndAddCredential(TestConfig.storePass, "#twitter", json);
            doc = await db.seal(TestConfig.storePass);
            doc = await ctrl1.signWithDocument(doc, TestConfig.storePass);
            await store.storeDid(doc);

            doc.setEffectiveController(ctrl1.getSubject());
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.toString()).toEqual(doc.toString());
            expect(resolved.getPublicKeyCount()).toBe(7);
            expect(resolved.getAuthenticationKeyCount()).toBe(7);
            expect(resolved.getCredentialCount()).toBe(1);

            // Update again: add an authentication key, an kyc credential by customized did and
            // an service.
            db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl3);
            let keyid2 = DIDURL.from("#key2", multiCustomizeDid);
            key = TestData.generateKeypair();
            db.addAuthenticationKey(keyid2, key.getPublicKeyBase58());
            store.storePrivateKey(keyid2, key.serialize(), TestConfig.storePass);

            let issuerDoc = await store.loadDid(customizeDid);
            expect(issuerDoc).not.toBeNull();

            let issuer = new Issuer(issuerDoc, DIDURL.from("#key1", issuerDoc.getSubject()));
            expect(issuer).not.toBeNull();
            let cb = issuer.issueFor(multiCustomizeDid);

            let props = {
                nationality: "Singapore",
                passport: "S653258Z07"
            };

            let vc = await cb.id("#passport")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();
            db.addCredential(vc);

            db.addService("#test-svc-1", "Service.Testing",
                    "https://www.elastos.org/testing1");

            doc = await db.seal(TestConfig.storePass);
            doc = await ctrl2.signWithDocument(doc, TestConfig.storePass);
            await store.storeDid(doc);

            doc.setEffectiveController(ctrl1.getSubject());
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.toString()).toEqual(doc.toString());
            expect(resolved.getPublicKeyCount()).toBe(8);
            expect(resolved.getAuthenticationKeyCount()).toBe(8);
            expect(resolved.getCredentialCount()).toBe(2);
            expect(resolved.getServiceCount()).toBe(1);
            await store.storeDid(resolved);
        });
    });

    describe('Order 16', () => {
        test('testDeclareAndRevokeCredentialByIssuer2', async () => {
            log.trace("Begin 'testDeclareAndRevokeCredentialByIssuer2'...");

            let doc = await store.loadDid(multiCustomizeDid);
            expect(doc).not.toBeNull();

            //get kyc credential in customized document
            let vc = doc.getCredential("#passport");
            expect(vc).not.toBeNull();
            vc.getMetadata().attachStore(doc.getStore());

            let declared = await vc.wasDeclared();
            expect(declared).toBeFalsy();

            let issuer = vc.getIssuer();
            let issuerDoc = await store.loadDid(issuer);

            //revoke by random
            let randomDoc = await store.loadDid(dids[4]);
            await VerifiableCredential.revoke(vc.getId(), randomDoc, null, TestConfig.storePass);
            let revoked = await vc.isRevoked();
            expect(revoked).toBeFalsy();

            //revoke by issuer
            let keys = issuerDoc.getAuthenticationKeys();
            await VerifiableCredential.revoke(vc.getId(), issuerDoc, keys[0].getId(), TestConfig.storePass);
            revoked = await vc.isRevoked();
            expect(revoked).toBeTruthy();

            let resolved = await VerifiableCredential.resolve(vc.getId());
            expect(resolved).toBeNull();

            //revoke by owner, success.
            keys = doc.getAuthenticationKeys();
            await VerifiableCredential.revoke(vc.getId(), doc, keys[0].getId(), TestConfig.storePass);

            //declare by owner, fail.
            await expect(async () => {
                await vc.declare(null, TestConfig.storePass);
            }).rejects.toThrowError(Exceptions.CredentialRevokedException);

            let bio = await VerifiableCredential.resolveBiography(vc.getId(), null);
            expect(bio).not.toBeNull();
            expect(bio.getTransactionCount()).toBe(1);

            bio = await VerifiableCredential.resolveBiography(vc.getId(), issuer);
            expect(bio).not.toBeNull();
            expect(bio.getTransactionCount()).toBe(1);
            expect(bio.getAllTransactions().length).toBe(1);
            expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
        });
    });

    describe('Order 17', () => {
        test("testTransferCustomizedDid", async () => {
            log.trace("Begin 'testTransferCustomizedDid'...");

            let doc = await store.loadDid(customizeDid);
            expect(doc).not.toBeNull();

            //new controller: controller3
            let newController = await store.loadDid(dids[2]);
            expect(newController).not.toBeNull();
            let valid = await newController.isValid();
            expect(valid).toBeTruthy();

            let ticket = await doc.createTransferTicket(newController.getSubject(), TestConfig.storePass);
            await expect(async() => {await ticket.isValid(); }).toBeTruthy();

            // create new document for customized DID
            let newDoc = await newController.newCustomized(customizeDid, TestConfig.storePass, true);
            valid = await newDoc.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(newDoc).edit(newController);
            db.addCredential(doc.getCredential("#name"));
            db.addCredential(doc.getCredential("#passport"));

            db.addAuthenticationKey("#key1", doc.getAuthenticationKey("#key1").getPublicKeyBase58());
            db.addAuthenticationKey("#key2", doc.getAuthenticationKey("#key2").getPublicKeyBase58());
            newDoc = await db.seal(TestConfig.storePass);

            expect(newDoc.getSubject().equals(customizeDid)).toBeTruthy();
            expect(newDoc.getController().equals(newController.getSubject())).toBeTruthy();
            await store.storeDid(newDoc);

            // transfer
            await newDoc.publishWithTicket(ticket, newController.getDefaultPublicKeyId(), TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            let resolved = await customizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(customizeDid)).toBeTruthy();
            expect(resolved.getController().equals(newController.getSubject())).toBeTruthy();
            valid = await resolved.isValid();
            expect(valid).toBeTruthy();

            //transfer again: add controller1
            await store.storeDid(resolved);

            db = DIDDocument.Builder.newFromDocument(resolved).edit(newController);
            await db.addController(dids[0]);
            db.setMultiSignature(2);
            newDoc = await db.seal(TestConfig.storePass);
            expect(newDoc).not.toBeNull();
            valid = await newDoc.isValid();
            expect(valid).toBeFalsy();

            let ctrl1 = await store.loadDid(dids[0]);
            expect(ctrl1).not.toBeNull();
            newDoc = await ctrl1.signWithDocument(newDoc, TestConfig.storePass);
            expect(newDoc).not.toBeNull();
            valid = await newDoc.isValid();
            expect(valid).toBeTruthy();

            expect(newDoc.getControllerCount()).toBe(2);
            expect(newDoc.hasController(dids[0])).toBeTruthy();
            expect(newDoc.hasController(dids[2])).toBeTruthy();
            await store.storeDid(newDoc);

            //ticket: 1:1
            ticket = await newController.createTransferTicket(ctrl1.getSubject(), TestConfig.storePass, customizeDid);
            await expect(async() => {await ticket.isValid(); }).toBeTruthy();

            await newDoc.publishWithTicket(ticket, ctrl1.getDefaultPublicKeyId(), TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await customizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(customizeDid)).toBeTruthy();
            expect(resolved.hasController(dids[0])).toBeTruthy();
            expect(resolved.hasController(dids[2])).toBeTruthy();
            valid = await resolved.isValid();
            expect(valid).toBeTruthy();

            //update afer tranfer
            await store.storeDid(resolved);
            resolved.setEffectiveController(ctrl1.getSubject());
            await resolved.publish(TestConfig.storePass, new DIDURL("#key1", customizeDid));
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await customizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.toString()).toEqual(newDoc.toString());

            let rr = await customizeDid.resolveBiography();
            expect(rr).not.toBeNull();
            expect(customizeDid.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(6);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(6);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(customizeDid.equals(tx.getDid())).toBeTruthy();
                valid = await tx.getRequest().isValid();
                expect(valid).toBeTruthy();

                if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == 1 || i == 2)
                    expect(IDChainRequest.Operation.TRANSFER.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    //2:3 -> 2:2
    describe('Order 18', () => {
        test("testTransferMultisigCustomizedDid", async () => {
            log.trace("Begin 'testTransferMultisigCustomizedDid'...");

            let doc = await store.loadDid(multiCustomizeDid);
            expect(doc).not.toBeNull();
            let valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let ctrl1 = await store.loadDid(dids[0]);
            let ctrl2 = await store.loadDid(dids[1]);
            let ctrl3 = await store.loadDid(dids[2]);

            //new controller
            let u = await store.loadDid(dids[4]);

            // transfer ticket
            let ticket = await ctrl1.createTransferTicket(u.getSubject(), TestConfig.storePass, multiCustomizeDid);
            ticket = await ctrl2.signWithTicket(ticket, TestConfig.storePass);
            valid = await ticket.isValid();
            expect(valid).toBeTruthy();

            let db = DIDDocument.Builder.newFromDocument(doc).edit(ctrl1);
            db.removeController(ctrl2.getSubject());       //remove controller2
            db.removeController(ctrl3.getSubject());      //remove contoller3
            await db.addController(u.getSubject());
            db.setMultiSignature(2);
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeFalsy();

            doc = await u.signWithDocument(doc, TestConfig.storePass);
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(doc.getSubject().equals(multiCustomizeDid)).toBeTruthy();
            expect(doc.getControllerCount()).toBe(2);
            expect(doc.getMultiSignature().toString()).toEqual("2:2");
            expect(doc.getAuthenticationKeyCount()).toBe(5);
            expect(doc.getCredentialCount()).toBe(2);

            // transfer
            await doc.publishWithTicket(ticket, u.getDefaultPublicKeyId(), TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            let resolved = await multiCustomizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(multiCustomizeDid)).toBeTruthy();
            valid = await resolved.isValid();
            expect(valid).toBeTruthy();

            expect(resolved.toString()).toEqual(doc.toString());
            await store.storeDid(resolved);

            //update the same doc
            resolved.setEffectiveController(u.getSubject());
            //let signkey = DIDURL.from("key2", ctrl1.getSubject());
            await resolved.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await multiCustomizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(multiCustomizeDid)).toBeTruthy();
            valid = await resolved.isValid();
            expect(valid).toBeTruthy();

            expect(resolved.toString()).toEqual(doc.toString());
            await store.storeDid(resolved);

            //transfer again: set multisig = 1:1
            db = DIDDocument.Builder.newFromDocument(doc).edit(u);
            db.removeController(ctrl1.getSubject());
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            expect(doc.getControllerCount()).toBe(1);
            expect(doc.getMultiSignature()).toBeNull();
            await store.storeDid(doc);

            ticket = await u.createTransferTicket(u.getSubject(), TestConfig.storePass, multiCustomizeDid);
            valid = await ticket.isValid();
            expect(valid).toBeFalsy();

            ticket = await ctrl1.signWithTicket(ticket, TestConfig.storePass);
            valid = await ticket.isValid();
            expect(valid).toBeTruthy();

            await doc.publishWithTicket(ticket, u.getDefaultPublicKeyId(), TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await multiCustomizeDid.resolve();
            expect(resolved).not.toBeNull();
            expect(resolved.getSubject().equals(multiCustomizeDid)).toBeTruthy();
            valid = await resolved.isValid();
            expect(valid).toBeTruthy();

            expect(resolved.toString()).toEqual(doc.toString());

            let rr = await multiCustomizeDid.resolveBiography();
            expect(rr).not.toBeNull();
            expect(multiCustomizeDid.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.VALID.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(6);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(6);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(multiCustomizeDid.equals(tx.getDid())).toBeTruthy();
                valid = await tx.getRequest().isValid();
                expect(valid).toBeTruthy();

                if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == 0 || i == 2)
                    expect(IDChainRequest.Operation.TRANSFER.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    describe('Order 19', () => {
        test('testSyncRootIdentityClean', async () => {
            log.trace("Begin 'testSyncRootIdentityClean'...");

            let filePath = TestConfig.tempDir + "/cleanstore";
            let path = new File(filePath);
            Utils.deleteFile(path);

            let cleanStore = await DIDStore.open(filePath);
            let rootIdentity = RootIdentity.createFromMnemonic(mnemonic,
                    TestConfig.passphrase, cleanStore, TestConfig.storePass, true);

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();
            await rootIdentity.synchronize();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            //create a credential for testing lazy private key
            let did = restoredDids[0];
            let issuer = await Issuer.newWithDID(did, cleanStore);

            let props = {
                name: "John",
                gender: "Male"
            };

            let cb = issuer.issueFor(did);
            let vc  = await cb.id("#selfCredential")
                    .typeWithContext("ProfileCredential", "https://ns.elastos.org/credentials/profile/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();
            expect(vc.getSubject().getProperty("name")).toEqual("John")

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();
        });
    });

    describe('Order 20', () => {
        test('testSyncRootIdentityCleanAsync', async () => {
            log.trace("Begin 'testSyncRootIdentityCleanAsync'...");

            let filePath = TestConfig.tempDir + "/cleanstore";
            let path = new File(filePath);
            Utils.deleteFile(path);

            let cleanStore = await DIDStore.open(filePath);
            let rootIdentity = RootIdentity.createFromMnemonic(mnemonic,
                    TestConfig.passphrase, cleanStore, TestConfig.storePass, true);

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();
            await rootIdentity.synchronize()
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();
        });
    });

    describe('Order 21', () => {
        test('testSyncRootIdentityWithoutModification', async () => {
            log.trace("Begin 'testSyncRootIdentityWithoutModification'...");

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();
            await identity.synchronize({
                merge(c, l): DIDDocument {
                    expect(l.getProof().getSignature()).toEqual(c.getProof().getSignature());
                    expect(l.getLastModified().getTime()).toEqual(c.getLastModified().getTime());

                    l.getMetadata().setPublished(c.getMetadata().getPublished());
                    l.getMetadata().setSignature(c.getMetadata().getSignature());
                    return l;
                }
            })

            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await store.listDids());
            expect(restoredDids.length).toBe(7);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.push(customizeDid);
            originalDids.push(multiCustomizeDid);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 7; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();
        });
    });

    describe('Order 22', () => {
        test('testSyncRootIdentityWithoutModificationAsync', async () => {
            log.trace("Begin 'testSyncRootIdentityWithoutModificationAsync'...");

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();

            let ch = {
                merge(c: DIDDocument, l: DIDDocument) {
                    expect(l.getProof().getSignature()).toEqual(c.getProof().getSignature());
                    expect(l.getLastModified().getTime()).toEqual(c.getLastModified().getTime());

                    l.getMetadata().setPublished(c.getMetadata().getPublished());
                    l.getMetadata().setSignature(c.getMetadata().getSignature());
                    return l;
                }
            }

            await identity.synchronize(ch)
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await store.listDids());
            expect(restoredDids.length).toBe(7);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.push(customizeDid);
            originalDids.push(multiCustomizeDid);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 7; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();
        });
    });

    describe('Order 23', () => {
        test('testSyncRootIdentityWithLocalModification1', async () => {
            log.trace("Begin 'testSyncRootIdentityWithLocalModification1'...");

            // Sync to a clean store first
            let filePath = TestConfig.tempDir + "/cleanstore";
            let path = new File(filePath);
            Utils.deleteFile(path);

            let cleanStore = await DIDStore.open(filePath);
            let rootIdentity = RootIdentity.createFromMnemonic(mnemonic,
                    TestConfig.passphrase, cleanStore, TestConfig.storePass, true);

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();
            await rootIdentity.synchronize();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();

            // Modify a DID document
            let modifiedDid = dids[0];
            let doc = await cleanStore.loadDid(modifiedDid);
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addService("#test1", "TestType", "http://test.com/");
            doc = await db.seal(TestConfig.storePass);
            await cleanStore.storeDid(doc);
            let modifiedSignature = doc.getProof().getSignature();

            log.debug("Synchronizing again from IDChain...");
            start = Date.now();
            await rootIdentity.synchronize();
            duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize again from IDChain...OK({}s)", duration);

            restoredDids = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            originalDids = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();

            // Should keep the local modified copy after sync
            doc = await cleanStore.loadDid(modifiedDid);
            expect(modifiedSignature).toEqual(doc.getProof().getSignature());
        });
    });

    describe('Order 24', () => {
        test('testSyncRootIdentityWithLocalModification2', async () => {
            log.trace("Begin 'testSyncRootIdentityWithLocalModification2'...");

            // Sync to a clean store first
            let filePath = TestConfig.tempDir + "/cleanstore";
            let path = new File(filePath);
            Utils.deleteFile(path);

            let cleanStore = await DIDStore.open(filePath);
            let rootIdentity = RootIdentity.createFromMnemonic(mnemonic,
                    TestConfig.passphrase, cleanStore, TestConfig.storePass, true);

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();
            await rootIdentity.synchronize();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();

            // Modify a DID document
            let modifiedDid = dids[0];
            let doc = await cleanStore.loadDid(modifiedDid);
            let originalSignature = doc.getSignature();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addService("#Stest1", "TestType", "http://test.com/");
            doc = await db.seal(TestConfig.storePass);
            await cleanStore.storeDid(doc);

            log.debug("Synchronizing again from IDChain...");
            start = Date.now();
            await rootIdentity.synchronize({
                merge(c, l) { return c; }
            });
            duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize again from IDChain...OK({}s)", duration);

            restoredDids = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            originalDids = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();

            // Should overwrite the local modified copy with chain copy after sync
            doc = await cleanStore.loadDid(modifiedDid);
            expect(originalSignature).toEqual(doc.getSignature());
        });
    });

    describe('Order 25', () => {
        test('testSyncRootIdentityWithLocalModificationAsync', async () => {
            log.trace("Begin 'testSyncRootIdentityWithLocalModificationAsync'...");

            // Sync to a clean store first
            let filePath = TestConfig.tempDir + "/cleanstore";
            let path = new File(filePath);
            Utils.deleteFile(path);

            let cleanStore = await DIDStore.open(filePath);
            let rootIdentity = RootIdentity.createFromMnemonic(mnemonic,
                    TestConfig.passphrase, cleanStore, TestConfig.storePass, true);

            log.debug("Synchronizing from IDChain...");
            let start = Date.now();
            await rootIdentity.synchronize()
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Synchronize from IDChain...OK({}s)", duration);

            let restoredDids: DID[] = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();

            // Modify a DID document
            let modifiedDid = dids[0];
            let doc = await cleanStore.loadDid(modifiedDid);
            let originalSignature = doc.getSignature();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addService("#test1", "TestType", "http://test.com/");
            doc = await db.seal(TestConfig.storePass);
            await cleanStore.storeDid(doc);

            log.debug("Synchronizing again from IDChain...");
            let start2 = Date.now();
            await rootIdentity.synchronize({
                merge(c, l) { return c; }
            });
            duration = (Date.now() - start2 + 500) / 1000;
            log.debug("Synchronize again from IDChain...OK({}s)", duration);

            restoredDids = Array.from(await cleanStore.listDids());
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            originalDids = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();

            // Should overwrite the local modified copy with chain copy after sync
            doc = await cleanStore.loadDid(modifiedDid);
            expect(originalSignature).toEqual(doc.getSignature());
        });
    });

    describe('Order 27', () => {
        test('testSynchronizeStore', async () => {
            log.trace("Begin 'testSynchronizeStore'...");

            let listdids: DID[] = Array.from(await store.listDids());
            listdids.sort((a,b) => a.compareTo(b));
            for (let did of listdids) {
                let doc = await store.loadDid(did);
                if (!doc.isCustomizedDid())
                    expect(store.deleteDid(did)).toBeTruthy();
            }

            let empty: DID[] = Array.from(await store.listDids());
            expect(empty.length).toBe(2);

            await store.synchronize();
            let syncedDids: DID[] =  Array.from(await store.listDids());
            syncedDids.sort((a,b) => a.compareTo(b));
            let originalDids: DID[] = Array.from(dids);
            originalDids.push(customizeDid);
            originalDids.push(multiCustomizeDid);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < dids.length; i++)
                expect(originalDids[i].equals(syncedDids[i])).toBeTruthy();
        });
    });

    describe('Order 28', () => {
        test('testDeclareMultilangCredential', async () => {
            let doc = await store.loadDid(multiCustomizeDid);
            expect(doc).not.toBeNull();

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(doc.getSubject());
            let props: JSONObject = {};

            let dirPath = join(__dirname, "data/i18n");
            let i18nDir = new File(dirPath);
            let i18nRes = i18nDir.listFiles();

            for (let res of i18nRes) {
                props[res.getName()] = res.readText();
            }

            let vc = await cb.id("#i18n")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .typeWithContext("TestCredential", "https://trinity-tech.io/credentials/i18n/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();
            await store.storeCredential(vc);

            let keys = doc.getAuthenticationKeys();
            await vc.declare(keys[0].getId(), TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            log.trace(vc.toJSON());

            let id = vc.getId();
            let resolvedVc = await VerifiableCredential.resolve(id);
            expect(resolvedVc).not.toBeNull();
            expect(id.equals(resolvedVc.getId())).toBeTruthy();
		    expect(resolvedVc.getType().includes("SelfProclaimedCredential")).toBeTruthy();
		    expect(doc.getSubject().equals(resolvedVc.getSubject().getId())).toBeTruthy();
            expect(doc.getSubject().equals(resolvedVc.getIssuer())).toBeTruthy();
            expect(vc.getProof().getSignature()).toEqual(resolvedVc.getProof().getSignature());

            let valid = await resolvedVc.isValid();
            expect(valid).toBeTruthy();

            let bio = await VerifiableCredential.resolveBiography(id, null);
            expect(bio).not.toBeNull();
            expect(bio.getTransactionCount()).toBe(1);
            expect(vc.getProof().getSignature()).toEqual(bio.getTransaction(0).getRequest().getCredential().getProof().getSignature());
        });
    });

    describe('Order 35', () => {
        test('testDeclareAndRevokeCredentialByOwner', async () => {
            log.trace("Begin 'testDeclareAndRevokeCredentialByOwner'...");

            let doc = await store.loadDid(dids[4]);
            expect(doc).not.toBeNull();

            let vcs = doc.getCredentials();
            expect(vcs.length).toBe(2);

            let declared: boolean;
            for (let i = 0; i < vcs.length; i++) {
                vcs[i].getMetadata().attachStore(doc.getStore());
                declared = await vcs[i].wasDeclared();
                expect(declared).toBeFalsy();
            }

            //declare one credential
            let declareVc = vcs[0];
            await declareVc.declare(null, TestConfig.storePass);
            declared = await declareVc.wasDeclared();
            expect(declared).toBeTruthy();

            let revoked: boolean;
            for (let i = 0; i < vcs.length; i++) {
                revoked = await vcs[i].isRevoked();
                expect(revoked).toBeFalsy();

                let vc = await VerifiableCredential.resolve(vcs[i].getId());
                if (i != 0)
                    expect(vc).toBeNull();
                else
                    expect(vc).not.toBeNull();

                await vcs[i].revoke(null, null, TestConfig.storePass);

                revoked = await vcs[i].isRevoked();
                expect(revoked).toBeTruthy();

                let bio = await VerifiableCredential.resolveBiography(vcs[i].getId(), null);
                expect(bio).not.toBeNull();
                if (i != 0) {
                    expect(bio.getAllTransactions().length).toBe(1);
                    expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
                } else {
                    expect(bio.getAllTransactions().length).toBe(2);
                    expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
                }
            }
        });
    });

    describe('Order 40', () => {
        test('testDeclareAndRevokeCredentialByOwner2', async () => {
            log.trace("Begin 'testDeclareAndRevokeCredentialByOwner2'...");

            let doc = await store.loadDid(customizeDid);
            expect(doc).not.toBeNull();

            let vcs = doc.getCredentials();
            expect(vcs.length).toBe(2);

            let declared: boolean;
            for (let i = 0; i < vcs.length; i++) {
                vcs[i].getMetadata().attachStore(doc.getStore());
                declared = await vcs[i].wasDeclared();
                expect(declared).toBeFalsy();
            }

            //declare one credential
            let declareVc = vcs[0];
            let keys = doc.getAuthenticationKeys();
            await declareVc.declare(keys[0].getId(), TestConfig.storePass);
            declared = await declareVc.wasDeclared();
            expect(declared).toBeTruthy();

            let revoked: boolean;
            for (let i = 0; i < vcs.length; i++) {
                revoked = await vcs[i].isRevoked();
                expect(revoked).toBeFalsy();

                let vc = await VerifiableCredential.resolve(vcs[i].getId());
                if (i != 0)
                    expect(vc).toBeNull();
                else
                    expect(vc).not.toBeNull();

                //let  = await store.loadDid(dids[0]);
                //let key = DIDURL.from("#key2", signer.getSubject());
                keys = doc.getAuthenticationKeys();
                let signer = keys[0].getController();
                let signerDoc = await store.loadDid(signer);
                expect(signerDoc).not.toBeNull();
                await vcs[i].revoke(keys[0].getId(), signerDoc, TestConfig.storePass);

                revoked = await vcs[i].isRevoked();
                expect(revoked).toBeTruthy();

                let bio = await VerifiableCredential.resolveBiography(vcs[i].getId(), null);
                expect(bio).not.toBeNull();
                if (i != 0) {
                    expect(bio.getAllTransactions().length).toBe(1);
                    expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
                } else {
                    expect(bio.getAllTransactions().length).toBe(2);
                    expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
                }
            }
        });
    });

    describe('Order 50', () => {
        test('testDeclareAndRevokeCredentialByIssuer', async () => {
            log.trace("Begin 'testDeclareAndRevokeCredentialByIssuer'...");

            let doc = await store.loadDid(dids[3]);
            expect(doc).not.toBeNull();

            //get kyc credential
            let vc = doc.getCredential("#passport");
            expect(vc).not.toBeNull();
            vc.getMetadata().attachStore(doc.getStore());

            let declared = await vc.wasDeclared();
            expect(declared).toBeFalsy();

            let issuer = vc.getIssuer();
            let isssuerDoc = await store.loadDid(issuer);

            //revoke by random
            let randomDoc = await store.loadDid(dids[0]);
            await VerifiableCredential.revoke(vc.getId(), randomDoc, null, TestConfig.storePass);
            let revoked = await vc.isRevoked();
            expect(revoked).toBeFalsy();

            //revoke by issuer
            await VerifiableCredential.revoke(vc.getId(), isssuerDoc, null, TestConfig.storePass);
            revoked = await vc.isRevoked();
            expect(revoked).toBeTruthy();
            let resolved = await VerifiableCredential.resolve(vc.getId());
            expect(resolved).toBeNull();

            //declare by owner, fail.
            await expect(async () => {
                await vc.declare(null, TestConfig.storePass);
            }).rejects.toThrowError(Exceptions.CredentialRevokedException);

            //revoke by owner, success.
            await VerifiableCredential.revoke(vc.getId(), doc, null, TestConfig.storePass);
            revoked = await vc.isRevoked();
            expect(revoked).toBeTruthy();

            //declare by owner, fail.
            await expect(async () => {
                await vc.declare(null, TestConfig.storePass);
            }).rejects.toThrowError(Exceptions.CredentialRevokedException);

            let bio = await VerifiableCredential.resolveBiography(vc.getId(), null);
            expect(bio).not.toBeNull();
            expect(bio.getTransactionCount()).toBe(1);

            bio = await VerifiableCredential.resolveBiography(vc.getId(), issuer);
            expect(bio).not.toBeNull();
            expect(bio.getTransactionCount()).toBe(1);
            expect(bio.getAllTransactions().length).toBe(1);
            expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
            expect(bio.getTransaction(0).getRequest().getProof().getVerificationMethod().getDid().equals(issuer)).toBeTruthy();
        });
    });

    describe('Order 60', () => {
        test('testListPagination', async () => {
            log.trace("Begin 'testListPagination'...");

            let doc = await store.loadDid(dids[0]);
            let did = doc.getSubject();

            let selfIssuer = new Issuer(doc);

            for (let i = 0; i < 36; i++) {
                log.trace("Creating test credential {}...", i);

                let vc = await selfIssuer.issueFor(did)
                        .id("#test" + i)
                        .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                        .properties({"index": i})
                        .seal(TestConfig.storePass);

                vc.getMetadata().attachStore(doc.getStore());
                await vc.declare(null, TestConfig.storePass);

                expect(await vc.wasDeclared()).toBeTruthy();
            }

            let index = 35;
            let ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(36);

            for (let id of ids) {
                log.trace("Resolving credential {}...", id.getFragment());

                let ref = new DIDURL("#test" + index--, did);
                expect(ref.equals(id)).toBeTruthy();

                let vc = await VerifiableCredential.resolve(id);
                expect(vc).not.toBeNull();
                expect(ref.equals(vc.getId())).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
            }

            index = 35;
            ids = await VerifiableCredential.list(did, 0, 560);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(36);
            for (let id of ids) {
                let ref = new DIDURL("#test" + index--, did);
                expect(ref.equals(id)).toBeTruthy();
            }

            ids = await VerifiableCredential.list(did, 36, 100);
            expect(ids).toBeNull();

            let skip = 0;
            let limit = 16;
            index = 36;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                let resultSize = index >= limit ? limit : index;
                ids = await VerifiableCredential.list(did, skip, limit);
                if (ids == null)
                    break;

                expect(ids.length).toEqual(resultSize);
                for (let id of ids) {
                    let ref = new DIDURL("#test" + --index, did);
                    expect(ref.equals(id)).toBeTruthy();

                    //let vc = await VerifiableCredential.resolve(id);
                    //expect(vc).not.toBeNull();
                    //expect(ref.equals(vc.getId())).toBeTruthy();
                    //expect(await vc.wasDeclared()).toBeTruthy();
                }

                skip += ids.length;
            }
            expect(index).toEqual(0);

            skip = 20;
            limit = 10;
            index = 16;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                let resultSize = index >= limit ? limit : index;
                ids = await VerifiableCredential.list(did, skip, limit);
                if (ids == null)
                    break;

                expect(ids.length).toEqual(resultSize);
                for (let id of ids) {
                    let ref = new DIDURL("#test" + --index, did);
                    expect(ref.equals(id)).toBeTruthy();

                    //let vc = await VerifiableCredential.resolve(id);
                    //expect(vc).not.toBeNull();
                    //expect(ref.equals(vc.getId())).toBeTruthy();
                    //expect(await vc.wasDeclared()).toBeTruthy();
                }

                skip += ids.length;
            }
            expect(index).toBe(0);
        });
    });

    describe('Order 80', () => {
        test("testDeactivateCustomizedDid", async () => {
            log.trace("Begin 'testDeactivateCustomizedDid'...");

            let target = await multiCustomizeDid.resolve(true);
            expect(target).not.toBeNull();
            await store.storeDid(target);

            let ctrls = target.getControllers();
            expect(ctrls.length).toBe(1);

            let ctrl = ctrls[0];
            let ctrlDoc = await store.loadDid(ctrl);
            expect(ctrlDoc).not.toBeNull();

            let valid = await ctrlDoc.isValid();
            expect(valid).toBeTruthy();

            await ctrlDoc.deactivateTargetDID(target.getSubject(), null, TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            let resolved = await multiCustomizeDid.resolve(true);
            expect(resolved.toString()).toEqual(target.toString());
            expect(resolved.isDeactivated()).toBeTruthy();

            let rr = await multiCustomizeDid.resolveBiography();
            expect(rr).not.toBeNull();
            expect(multiCustomizeDid.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.DEACTIVATED.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(7);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(7);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(multiCustomizeDid.equals(tx.getDid())).toBeTruthy();

                if (i == 0)
                    expect(IDChainRequest.Operation.DEACTIVATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == 1 || i == 3)
                    expect(IDChainRequest.Operation.TRANSFER.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    describe('Order 100', () => {
        test("testDeactivateByAuthorizationKey", async () => {
            log.trace("Begin 'testDeactivateByAuthorizationKey'...");

            let target = await store.loadDid(dids[4]);
            let did = target.getSubject();
            expect(target).not.toBeNull();

            expect(target.getAuthorizationKeyCount()).toBe(1);

            let pks = target.getAuthorizationKeys();
            expect(pks.length).toBe(1);

            let authorizationKey = pks[0];
            let authorizationDoc = await store.loadDid(authorizationKey.getController());

            let keys = authorizationDoc.getAuthenticationKeys();
            let signkey: DIDDocument.PublicKey = null;
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].getPublicKeyBase58() === authorizationKey.getPublicKeyBase58()) {
                    signkey = keys[i];
                    break;
                }
            }
            expect(signkey).not.toBeNull();

            await authorizationDoc.deactivateTargetDID(target.getSubject(), signkey.getId(), TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            let resolved = await did.resolve(true);
            expect(resolved.toString()).toEqual(target.toString());
            expect(resolved.isDeactivated()).toBeTruthy();

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.DEACTIVATED.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(6);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(6);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(did.equals(tx.getDid())).toBeTruthy();

                if (i == 0)
                    expect(IDChainRequest.Operation.DEACTIVATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    describe('Order 120', () => {
        test("testDeactivate", async () => {
            log.trace("Begin 'testDeactivate'...");

            let doc = await store.loadDid(dids[0]);
            let did = doc.getSubject();
            expect(doc).not.toBeNull();

            await doc.deactivate(null, TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            let resolved = await did.resolve(true);
            expect(resolved.toString()).toEqual(doc.toString());
            expect(resolved.isDeactivated()).toBeTruthy();

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.DEACTIVATED.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(4);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(4);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(did.equals(tx.getDid())).toBeTruthy();

                if (i == 0)
                    expect(IDChainRequest.Operation.DEACTIVATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    describe('Order 135', () => {
        test("testDeactivate2", async () => {
            log.trace("Begin 'testDeactivate2'...");

            let doc = await store.loadDid(dids[1]);
            let did = doc.getSubject();
            expect(doc).not.toBeNull();
            let resolved = await did.resolve(true);
            expect(resolved).not.toBeNull();
            expect(resolved.toString()).toEqual(doc.toString());

            await doc.deactivate(null, TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            resolved = await did.resolve(true);
            expect(resolved.toString()).toEqual(doc.toString());
            expect(resolved.isDeactivated()).toBeTruthy();

            let rr = await did.resolveBiography();
            expect(rr).not.toBeNull();
            expect(did.equals(rr.getDid())).toBeTruthy();
            expect(DIDBiographyStatus.DEACTIVATED.equals(rr.getStatus())).toBeTruthy();
            expect(rr.getTransactionCount()).toBe(4);
            let txs = rr.getAllTransactions();
            expect(txs).not.toBeNull();
            expect(txs.length).toBe(4);

            for (let i = 0; i < txs.length; i++) {
                let tx = txs[i];
                expect(did.equals(tx.getDid())).toBeTruthy();

                if (i == 0)
                    expect(IDChainRequest.Operation.DEACTIVATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else if (i == txs.length - 1)
                    expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
                else
                    expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
            }
        });
    });

    describe('Order 236', () => {
        test("testCreateAndResolveWithMultilangCredential", async () => {
		    let doc = await identity.newDid(TestConfig.storePass);
		    let did = doc.getSubject();

		    let selfIssuer = new Issuer(doc);
		    let cb = selfIssuer.issueFor(did);

            let props: JSONObject = {};

            let dirPath = join(__dirname, "data/i18n");
            let i18nDir = new File(dirPath);
            let i18nRes = i18nDir.listFiles();

            for (let res of i18nRes) {
                props[res.getName()] = res.readText();
            }

            let vc = await cb.id("#profile")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .typeWithContext("TestCredential", "https://trinity-tech.io/credentials/i18n/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toBe(1);
            await store.storeDid(doc);

            log.debug("Publishing new DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            let duration = (Date.now() - start + 500) / 1000;
            log.debug("Update DID {}...OK({}s)", did, duration);

            let resolved = await did.resolve();
            expect(did.equals(resolved.getSubject())).toBeTruthy();
            let valid = await resolved.isValid();
            expect(valid).toBeTruthy();
            expect(doc.toString(true)).toEqual(resolved.toString(true));

            let lastTxid = resolved.getMetadata().getTransactionId();
            log.debug("Last transaction id {}", lastTxid);
        });
    });
});