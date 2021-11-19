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
    File } from "@elastosfoundation/did-js-sdk";
import { TestConfig } from "./utils/testconfig";
import { Utils } from "./utils/utils";
import { DIDTestExtension } from "./utils/didtestextension";

const log = new Logger("IDChainOperationsTest");

let testData: TestData;
let store: DIDStore;
let dids: DID[];

let mnemonic: string;
let identity: RootIdentity;

// We use several describe() to force jest running test in a sequential order, as the below
// tests depend on each other.
describe('IDChainOperations Tests', () => {
    beforeAll(async ()=> {
        testData = new TestData(false);
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
        test('testCreateAndResolve', async () => {
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
        test('testCreateAndresolve', async () => {
            // Create new DID and publish to ID sidechain.
            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

            log.debug("Publishing new DID {}...", did);
            let start = Date.now();
            await doc.publish(TestConfig.storePass);
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
        test('testCreateAndresolve2', async () => {
            // Create new DID and publish to ID sidechain.
            let doc = await identity.newDid(TestConfig.storePass);
            let did = doc.getSubject();

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
        test('testUpdateAndResolve', async () => {
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

            // Update
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            let key = TestData.generateKeypair();
            db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
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
        test('testUpdateAndResolveAgain', async () => {
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

            // Update again
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            let key = TestData.generateKeypair();
            db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(3);
            expect(doc.getAuthenticationKeyCount()).toBe(3);
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
        test('testUpdateAndresolve', async () => {
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

            // Update
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            let key = TestData.generateKeypair();
            db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(2);
            expect(doc.getAuthenticationKeyCount()).toBe(2);
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
        });
    });

    describe('Order 7', () => {
        test('testUpdateAndresolveAgain', async () => {
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

            // Update again
            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            let key = TestData.generateKeypair();
            db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
            doc = await db.seal(TestConfig.storePass);
            expect(doc.getPublicKeyCount()).toBe(3);
            expect(doc.getAuthenticationKeyCount()).toEqual(3);
            await store.storeDid(doc);

            log.debug("Updating DID {}...", did);
            let start = Date.now();
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
            await expect(await tx.getRequest().isValid()).toBeTruthy();
        });
    });

    describe('Order 8', () => {
        test('testCreateAndResolveWithCredentials', async () => {
            // Create new DID and publish to ID sidechain.
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
                    .typeWithContext("SelfProclaimedCredential", "https://elastos.org/credentials/v1")
                    .typeWithContext("ProfileCredential", "https://elastos.org/credentials/profile/v1")
                    .typeWithContext("EmailCredential", "https://elastos.org/credentials/email/v1")
                    .typeWithContext("SocialCredential", "https://elastos.org/credentials/social/v1")
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

            dids.push(did); // 3
        });
    });

    describe('Order 9', () => {
        test('testUpdateAndResolveWithCredentials', async () => {
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

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(did);

            let props = {
                nationality: "Singapore",
                passport: "S653258Z07"
            };

            let vc = await cb.id("#passport")
                    .typeWithContext("SelfProclaimedCredential", "https://elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
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
        test('testUpdateAndResolveWithCredentialsAgain', async () => {
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

            // Update again
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
                    .typeWithContext("SelfProclaimedCredential", "https://elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toEqual(3);
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
        test('testCreateAndResolveWithCredentialsAsync', async () => {
            // Create new DID and publish to ID sidechain.
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
                    .typeWithContext("SelfProclaimedCredential", "https://elastos.org/credentials/v1")
                    .typeWithContext("ProfileCredential", "https://elastos.org/credentials/profile/v1")
                    .typeWithContext("EmailCredential", "https://elastos.org/credentials/email/v1")
                    .typeWithContext("SocialCredential", "https://elastos.org/credentials/social/v1")
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

            dids.push(did); // 4
        });
    });

    describe('Order 12', () => {
        test('testUpdateAndResolveWithCredentialsAsync', async () => {
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

            // Update
            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(did);

            let props = {
                nationality: "Singapore",
                passport: "S653258Z07"
            };

            let vc = await cb.id("#passport")
                    .typeWithContext("SelfProclaimedCredential", "https://elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
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
        test('testUpdateAndResolveWithCredentialsAsyncAgain', async () => {
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

            // Update again
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
                    .typeWithContext("SelfProclaimedCredential", "https://elastos.org/credentials/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);
            expect(vc).not.toBeNull();

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);
            doc = await db.seal(TestConfig.storePass);
            expect(doc).not.toBeNull();
            expect(doc.getCredentialCount()).toBe(3);
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

    describe('Order 14', () => {
        test('testSyncRootIdentityClean', async () => {
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
                    .typeWithContext("ProfileCredential", "https://elastos.org/credentials/profile/v1")
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

    describe('Order 15', () => {
        test('testSyncRootIdentityCleanAsync', async () => {
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

    describe('Order 16', () => {
        test('testSyncRootIdentityWithoutModification', async () => {
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
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();
        });
    });

    describe('Order 17', () => {
        test('testSyncRootIdentityWithoutModificationAsync', async () => {
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
            expect(restoredDids.length).toBe(5);
            restoredDids.sort((a,b) => a.compareTo(b));

            let originalDids: DID[] = Array.from(dids);
            originalDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < 5; i++)
                expect(originalDids[i].equals(restoredDids[i])).toBeTruthy();
        });
    });

    describe('Order 18', () => {
        test('testSyncRootIdentityWithLocalModification1', async () => {
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

    describe('Order 19', () => {
        test('testSyncRootIdentityWithLocalModification2', async () => {
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

    describe('Order 20', () => {
        test('testSyncRootIdentityWithLocalModificationAsync', async () => {
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

    describe('Order 30', () => {
        test('testResolveVC', async () => {
            let id = new DIDURL("did:elastos:iZrzd9TFbVhRBgcnjoGYQhqkHf7emhxdYu#1234");
            let vc = await VerifiableCredential.resolve(id);
            expect(vc).toBeNull();
        });
    });

    describe('Order 40', () => {
        test('testSynchronizeStore', async () => {
            let dids: DID[] = Array.from(await store.listDids());
            dids.sort((a,b) => a.compareTo(b));
            for (let did of dids) {
                expect(store.deleteDid(did)).toBeTruthy();
            }

            let empty: DID[] = Array.from(await store.listDids());
            expect(empty.length).toBe(0);

            await store.synchronize();
            let syncedDids: DID[] =  Array.from(await store.listDids());
            syncedDids.sort((a,b) => a.compareTo(b));

            for (let i = 0; i < dids.length; i++)
                expect(dids[i].equals(syncedDids[i])).toBeTruthy();
        });
    });
});