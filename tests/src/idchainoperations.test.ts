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
	DIDDocumentBuilder,
	DIDBiographyStatus,
	Logger,
	DIDStore,
	DID,
	RootIdentity,
	DIDDocument,
	IDChainRequest,
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
    beforeAll(()=> {
    	testData = new TestData();
    	testData.getRootIdentity();
    	dids = [];
    });

    afterAll(async () => {
    	await testData.cleanup();
    });

    beforeEach(async () => {
    	store = await testData.getStore();
    	mnemonic = testData.getMnemonic();
    	identity = testData.getRootIdentity();
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
			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			let key = TestData.generateKeypair();
			db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
			doc = db.seal(TestConfig.storePass);
			expect(2).toEqual(doc.getPublicKeyCount());
			expect(2).toEqual(doc.getAuthenticationKeyCount());
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
			expect(2).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(2).toEqual(txs.length);

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
			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			let key = TestData.generateKeypair();
			db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
			doc = db.seal(TestConfig.storePass);
			expect(3).toEqual(doc.getPublicKeyCount());
			expect(3).toEqual(doc.getAuthenticationKeyCount());
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
			expect(3).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(3).toEqual(txs.length);

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
			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			let key = TestData.generateKeypair();
			db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
			doc = db.seal(TestConfig.storePass);
			expect(2).toEqual(doc.getPublicKeyCount());
			expect(2).toEqual(doc.getAuthenticationKeyCount());
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
			expect(2).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(2).toEqual(txs.length);

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
			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			let key = TestData.generateKeypair();
			db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
			doc = db.seal(TestConfig.storePass);
			expect(3).toEqual(doc.getPublicKeyCount());
			expect(3).toEqual(doc.getAuthenticationKeyCount());
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
			expect(3).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(3).toEqual(txs.length);

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
			    nation: "Singapore",
			    language: "English",
			    email: "john@example.com",
			    twitter: "@john"
			};

			let vc = await cb.id("#profile")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			expect(vc).not.toBeNull();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addCredential(vc);
			doc = db.seal(TestConfig.storePass);
			expect(doc).not.toBeNull();
			expect(1).toEqual(doc.getCredentialCount());
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
				nation: "Singapore",
				passport: "S653258Z07"
			};

			let vc = await cb.id("#passport")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			expect(vc).not.toBeNull();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addCredential(vc);
			doc = db.seal(TestConfig.storePass);
			expect(doc).not.toBeNull();
			expect(2).toEqual(doc.getCredentialCount());
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
			expect(2).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(2).toEqual(txs.length);

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
					.type("TestCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			expect(vc).not.toBeNull();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addCredential(vc);
			doc = db.seal(TestConfig.storePass);
			expect(doc).not.toBeNull();
			expect(3).toEqual(doc.getCredentialCount());
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
			expect(3).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(3).toEqual(txs.length);

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
				nation: "Singapore",
				language: "English",
				email: "john@example.com",
				twitter: "@john"
			};

			let vc = await cb.id("#profile")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			expect(vc).not.toBeNull();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addCredential(vc);
			doc = db.seal(TestConfig.storePass);
			expect(doc).not.toBeNull();
			expect(1).toEqual(doc.getCredentialCount());
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
				nation: "Singapore",
				passport: "S653258Z07"
			};

			let vc = await cb.id("#passport")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			expect(vc).not.toBeNull();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addCredential(vc);
			doc = db.seal(TestConfig.storePass);
			expect(doc).not.toBeNull();
			expect(2).toEqual(doc.getCredentialCount());
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
					.type("TestCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			expect(vc).not.toBeNull();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addCredential(vc);
			doc = db.seal(TestConfig.storePass);
			expect(doc).not.toBeNull();
			expect(3).toEqual(doc.getCredentialCount());
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
			expect(3).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(3).toEqual(txs.length);

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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison
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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison
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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison
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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison
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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison

			// Modify a DID document
			let modifiedDid = dids[0];
			let doc = await cleanStore.loadDid(modifiedDid);
			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addService("#test1", "TestType", "http://test.com/");
			doc = db.seal(TestConfig.storePass);
			await cleanStore.storeDid(doc);
			let modifiedSignature = doc.getProof().getSignature();

			log.debug("Synchronizing again from IDChain...");
			start = Date.now();
			await rootIdentity.synchronize();
			duration = (Date.now() - start + 500) / 1000;
			log.debug("Synchronize again from IDChain...OK({}s)", duration);

			restoredDids = Array.from(await cleanStore.listDids());
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			originalDids = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison

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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison

			// Modify a DID document
			let modifiedDid = dids[0];
			let doc = await cleanStore.loadDid(modifiedDid);
			let originalSignature = doc.getSignature();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addService("#Stest1", "TestType", "http://test.com/");
			doc = db.seal(TestConfig.storePass);
			await cleanStore.storeDid(doc);

			log.debug("Synchronizing again from IDChain...");
			start = Date.now();
			await rootIdentity.synchronize({
				merge(c, l) { return c; }
			});
			duration = (Date.now() - start + 500) / 1000;
			log.debug("Synchronize again from IDChain...OK({}s)", duration);

			restoredDids = Array.from(await cleanStore.listDids());
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			originalDids = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison

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
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			let originalDids: DID[] = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison

			// Modify a DID document
			let modifiedDid = dids[0];
			let doc = await cleanStore.loadDid(modifiedDid);
			let originalSignature = doc.getSignature();

			let db = DIDDocumentBuilder.newFromDocument(doc).edit();
			db.addService("#test1", "TestType", "http://test.com/");
			doc = db.seal(TestConfig.storePass);
			await cleanStore.storeDid(doc);

			log.debug("Synchronizing again from IDChain...");
			let start2 = Date.now();
			await rootIdentity.synchronize({
				merge(c, l) { return c; }
			});
			duration = (Date.now() - start2 + 500) / 1000;
			log.debug("Synchronize again from IDChain...OK({}s)", duration);

			restoredDids = Array.from(await cleanStore.listDids());
			expect(5).toEqual(restoredDids.length);
			restoredDids.sort((a,b) => a.compareTo(b));

			originalDids = Array.from(dids);
			originalDids.sort((a,b) => a.compareTo(b));

			expect(originalDids).toEqual(restoredDids); // Array comparison

			// Should overwrite the local modified copy with chain copy after sync
			doc = await cleanStore.loadDid(modifiedDid);
			expect(originalSignature).toEqual(doc.getSignature());
		});
	});
});