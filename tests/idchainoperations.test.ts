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
import { Logger, DIDStore, DID, RootIdentity, DIDDocument, DIDBiography, IDChainRequest } from "../dist/did";
import { TestConfig } from "./utils/testconfig";

const log = new Logger("IDChainOperationsTest");

let testData: TestData;
let store: DIDStore;
let dids: DID[];

let mnemonic: string;
let identity: RootIdentity;

describe('IDChainOperations Tests', () => {
    beforeAll(()=> {
    	testData = new TestData();
    	testData.getRootIdentity();
    	dids = [];
    });

    afterAll(() => {
    	testData.cleanup();
    });

    beforeEach(() => {
    	store = testData.getStore();
    	mnemonic = testData.getMnemonic();
    	identity = testData.getRootIdentity();

		testData.waitForWalletAvailable();
    });

	describe('Order 1', () => {
		test('testCreateAndResolve', () => {
			// Create new DID and publish to ID sidechain.
			let doc = identity.newDid(TestConfig.storePass);
			let did = doc.getSubject();

			log.debug("Publishing new DID {}...", did);
			let start = Date.now();
			doc.publish(TestConfig.storePass);
			let duration = (Date.now() - start + 500) / 1000;
			log.debug("Publish new DID {}...OK({}s)", did, duration);

			testData.waitForWalletAvailable();
			let resolved = did.resolve();
			expect(resolved).not.toBeNull();
			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.toString(true)).toEqual(resolved.toString(true));

			dids.push(did); // 0
		});
	});

	describe('Order 2', () => {
		test('testCreateAndResolveAsync', async () => {
			// Create new DID and publish to ID sidechain.
			let doc = identity.newDid(TestConfig.storePass);
			let did = doc.getSubject();

			log.debug("Publishing new DID {}...", did);
			let start = Date.now();
			await doc.publishAsync(TestConfig.storePass)
			let duration = (Date.now() - start + 500) / 1000;
			log.debug("Publish new DID {}...OK({}s)", did, duration);

			testData.waitForWalletAvailable();
			let resolved = await did.resolveAsync(true);
			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.toString(true)).toEqual(resolved.toString(true));

			dids.push(did); // 1
		});
	});

	describe('Order 3', () => {
		test('testCreateAndResolveAsync2', async () => {
			// Create new DID and publish to ID sidechain.
			let doc = identity.newDid(TestConfig.storePass);
			let did = doc.getSubject();

			log.debug("Publishing new DID and resolve {}...", did);

			let start = Date.now();
			doc.publishAsync(TestConfig.storePass);
			testData.waitForWalletAvailable();
			let resolved = await did.resolveAsync(true);

			let duration = (Date.now() - start + 500) / 1000;
			log.debug("Publish new DID and resolve {}...OK({}s)", did, duration);

			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.toString(true)).toEqual(resolved.toString(true));

			dids.push(did); // 2
		});
	});

	describe('Order 4', () => {
		test('testUpdateAndResolve', () => {
			// User the DID that created in previous case(1)
			let doc = store.loadDid(dids[0]);
			expect(doc).not.toBeNull();
			let did = doc.getSubject();

			let resolved = did.resolve();
			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
			let lastTxid = resolved.getMetadata().getTransactionId();
			log.debug("Last transaction id {}", lastTxid);

			// Update
			let db = doc.edit();
			let key = TestData.generateKeypair();
			db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
			doc = db.seal(TestConfig.storePass);
			expect(2).toEqual(doc.getPublicKeyCount());
			expect(2).toEqual(doc.getAuthenticationKeyCount());
			store.storeDid(doc);

			log.debug("Updating DID {}...", did);
			let start = Date.now();
			doc.publish(TestConfig.storePass);
			let duration = (Date.now() - start + 500) / 1000;
			log.debug("Update DID {}...OK({}s)", did, duration);

			testData.waitForWalletAvailable();
			resolved = did.resolve();
			expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.toString(true)).toEqual(resolved.toString(true));

			lastTxid = resolved.getMetadata().getTransactionId();
			log.debug("Last transaction id {}", lastTxid);

			let rr = did.resolveBiography();
			expect(rr).not.toBeNull();
			expect(did.equals(rr.getDid())).toBeTruthy();
			expect(DIDBiography.Status.VALID).toEqual(rr.getStatus());
			expect(2).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(2).toEqual(txs.size());

			let tx = txs.get(0);
			expect(did.equals(tx.getDid())).toBeTruthy();
			expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
			expect(tx.getRequest().isValid()).toBeTruthy();

			tx = txs.get(1);
			expect(did.equals(tx.getDid())).toBeTruthy();
			expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
			expect(tx.getRequest().isValid()).toBeTruthy();
		});
	});

	describe('Order 5', () => {
		test('testUpdateAndResolveAgain', () => {
			// User the DID that created in previous case(1)
			let doc = store.loadDid(dids[0]);
			expect(doc).not.toBeNull();
			let did = doc.getSubject();

			let resolved = did.resolve();
			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());
			let lastTxid = resolved.getMetadata().getTransactionId();
			log.debug("Last transaction id {}", lastTxid);

			// Update again
			let db = doc.edit();
			let key = TestData.generateKeypair();
			db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
			doc = db.seal(TestConfig.storePass);
			expect(3).toEqual(doc.getPublicKeyCount());
			expect(3).toEqual(doc.getAuthenticationKeyCount());
			store.storeDid(doc);

			log.debug("Updating DID {}...", did);
			let start = Date.now();
			doc.publish(TestConfig.storePass);
			let duration = (Date.now() - start + 500) / 1000;
			log.debug("Update DID {}...OK({}s)", did, duration);

			testData.waitForWalletAvailable();
			resolved = did.resolve();
			expect(lastTxid).not.toEqual(resolved.getMetadata().getTransactionId());
			expect(did.equals(resolved.getSubject())).toBeTruthy();
			expect(resolved.isValid()).toBeTruthy();
			expect(doc.toString(true)).toEqual(resolved.toString(true));

			lastTxid = resolved.getMetadata().getTransactionId();
			log.debug("Last transaction id {}", lastTxid);

			let rr = did.resolveBiography();
			expect(rr).not.toBeNull();
			expect(did.equals(rr.getDid())).toBeTruthy();
			expect(DIDBiography.Status.VALID.equals(rr.getStatus())).toBeTruthy();
			expect(3).toEqual(rr.getTransactionCount());
			let txs = rr.getAllTransactions();
			expect(txs).not.toBeNull();
			expect(3).toEqual(txs.size());

			let tx = txs.get(0);
			expect(did.equals(tx.getDid())).toBeTruthy();
			expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
			expect(tx.getRequest().isValid()).toBeTruthy();

			tx = txs.get(1);
			expect(did.equals(tx.getDid())).toBeTruthy();
			expect(IDChainRequest.Operation.UPDATE.equals(tx.getRequest().getOperation())).toBeTruthy();
			expect(tx.getRequest().isValid()).toBeTruthy();

			tx = txs.get(2);
			expect(did.equals(tx.getDid())).toBeTruthy();
			expect(IDChainRequest.Operation.CREATE.equals(tx.getRequest().getOperation())).toBeTruthy();
			expect(tx.getRequest().isValid()).toBeTruthy();
		});
	});

	/*@Test
	@Order(6)
	public void testUpdateAndResolveAsync() throws DIDException {
		// User the DID that created in previous case(2)
		DIDDocument doc = store.loadDid(dids.get(1));
		assertNotNull(doc);
		DID did = doc.getSubject();

		CompletableFuture<DIDDocument> rf = did.resolveAsync(true);
		DIDDocument resolved = rf.join();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.getProof().getSignature(), resolved.getProof().getSignature());
		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		// Update
		DIDDocument.Builder db = doc.edit();
		HDKey key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		assertEquals(2, doc.getPublicKeyCount());
		assertEquals(2, doc.getAuthenticationKeyCount());
		store.storeDid(doc);

        log.debug("Updating DID {}...", did);
		long start = System.currentTimeMillis();
		CompletableFuture<Void> tf = doc.publishAsync(TestConfig.storePass)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
			        log.debug("Update DID {}...OK({}s)", did, duration);
				});
		tf.join();

		testData.waitForWalletAvailable();
		rf = did.resolveAsync(true);
		resolved = rf.join();
		assertNotEquals(lastTxid, resolved.getMetadata().getTransactionId());
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));
		lastTxid = resolved.getMetadata().getTransactionId();
        log.debug("Last transaction id {}", lastTxid);

		DIDBiography rr = did.resolveBiographyAsync().join();
		assertNotNull(rr);
		assertEquals(did, rr.getDid());
		assertEquals(DIDBiography.Status.VALID, rr.getStatus());
		assertEquals(2, rr.getTransactionCount());
		List<DIDTransaction> txs = rr.getAllTransactions();
		assertNotNull(txs);
		assertEquals(2, txs.size());

		DIDTransaction tx = txs.get(0);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(1);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.CREATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());
	}

	@Test
	@Order(7)
	public void testUpdateAndResolveAsyncAgain() throws DIDException {
		// User the DID that created in previous case(2)
		DIDDocument doc = store.loadDid(dids.get(1));
		assertNotNull(doc);
		DID did = doc.getSubject();

		CompletableFuture<DIDDocument> rf = did.resolveAsync(true);
		DIDDocument resolved = rf.join();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.getProof().getSignature(), resolved.getProof().getSignature());
		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		// Update again
		DIDDocument.Builder db = doc.edit();
		HDKey key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		assertEquals(3, doc.getPublicKeyCount());
		assertEquals(3, doc.getAuthenticationKeyCount());
		store.storeDid(doc);

        log.debug("Updating DID {}...", did);
		long start = System.currentTimeMillis();
		CompletableFuture<Void> tf = doc.publishAsync(TestConfig.storePass)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
			        log.debug("Update DID {}...OK({}s)", did, duration);
				});
		tf.join();

		testData.waitForWalletAvailable();
		rf = did.resolveAsync(true);
		resolved = rf.join();
		assertNotEquals(lastTxid, resolved.getMetadata().getTransactionId());
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		lastTxid = resolved.getMetadata().getTransactionId();
        log.debug("Last transaction id {}", lastTxid);

		DIDBiography rr = did.resolveBiography();
		assertNotNull(rr);
		assertEquals(did, rr.getDid());
		assertEquals(DIDBiography.Status.VALID, rr.getStatus());
		assertEquals(3, rr.getTransactionCount());
		List<DIDTransaction> txs = rr.getAllTransactions();
		assertNotNull(txs);
		assertEquals(3, txs.size());

		DIDTransaction tx = txs.get(0);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(1);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(2);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.CREATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());
	}

	@Test
	@Order(8)
	public void testCreateAndResolveWithCredentials() throws DIDException {
		// Create new DID and publish to ID sidechain.
		DIDDocument doc = identity.newDid(TestConfig.storePass);
		DID did = doc.getSubject();

		Issuer selfIssuer = new Issuer(doc);
		VerifiableCredential.Builder cb = selfIssuer.issueFor(did);

		Map<String, Object> props= new HashMap<String, Object>();
		props.put("name", "John");
		props.put("gender", "Male");
		props.put("nation", "Singapore");
		props.put("language", "English");
		props.put("email", "john@example.com");
		props.put("twitter", "@john");

		VerifiableCredential vc = cb.id("#profile")
				.type("BasicProfileCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);
		assertNotNull(vc);

		DIDDocument.Builder db = doc.edit();
		db.addCredential(vc);
		doc = db.seal(TestConfig.storePass);
		assertNotNull(doc);
		assertEquals(1, doc.getCredentialCount());
		store.storeDid(doc);

        log.debug("Publishing new DID {}...", did);
		long start = System.currentTimeMillis();
		doc.publish(TestConfig.storePass);
		long duration = (System.currentTimeMillis() - start + 500) / 1000;
        log.debug("Publish new DID {}...OK({}s)", did, duration);

		testData.waitForWalletAvailable();
		DIDDocument resolved = did.resolve();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		String lastTxid = resolved.getMetadata().getTransactionId();
        log.debug("Last transaction id {}", lastTxid);

        dids.add(did); // 3
	}

	@Test
	@Order(9)
	public void testUpdateAndResolveWithCredentials() throws DIDException {
		// User the DID that created in previous case(8)
		DIDDocument doc = store.loadDid(dids.get(3));
		assertNotNull(doc);
		DID did = doc.getSubject();

		DIDDocument resolved = did.resolve();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.getProof().getSignature(), resolved.getProof().getSignature());
		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		Issuer selfIssuer = new Issuer(doc);
		VerifiableCredential.Builder cb = selfIssuer.issueFor(did);

		Map<String, Object> props= new HashMap<String, Object>();
		props.put("nation", "Singapore");
		props.put("passport", "S653258Z07");

		VerifiableCredential vc = cb.id("#passport")
				.type("BasicProfileCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);
		assertNotNull(vc);

		DIDDocument.Builder db = doc.edit();
		db.addCredential(vc);
		doc = db.seal(TestConfig.storePass);
		assertNotNull(doc);
		assertEquals(2, doc.getCredentialCount());
		store.storeDid(doc);

        log.debug("Updating DID {}...", did);
		long start = System.currentTimeMillis();
		doc.publish(TestConfig.storePass);
		long duration = (System.currentTimeMillis() - start + 500) / 1000;
        log.debug("Update DID {}...OK({}s)", did, duration);

		testData.waitForWalletAvailable();
		resolved = did.resolve();
		assertNotEquals(lastTxid, resolved.getMetadata().getTransactionId());
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		DIDBiography rr = did.resolveBiography();
		assertNotNull(rr);
		assertEquals(did, rr.getDid());
		assertEquals(DIDBiography.Status.VALID, rr.getStatus());
		assertEquals(2, rr.getTransactionCount());
		List<DIDTransaction> txs = rr.getAllTransactions();
		assertNotNull(txs);
		assertEquals(2, txs.size());

		DIDTransaction tx = txs.get(0);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(1);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.CREATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());
	}

	@Test
	@Order(10)
	public void testUpdateAndResolveWithCredentialsAgain() throws DIDException {
		// User the DID that created in previous case(8)
		DIDDocument doc = store.loadDid(dids.get(3));
		assertNotNull(doc);
		DID did = doc.getSubject();

		DIDDocument resolved = did.resolve();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.getProof().getSignature(), resolved.getProof().getSignature());
		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		// Update again
		Issuer selfIssuer = new Issuer(doc);
		VerifiableCredential.Builder cb = selfIssuer.issueFor(did);

		Map<String, Object> props= new HashMap<String, Object>();
		props.put("Abc", "Abc");
		props.put("abc", "abc");
		props.put("Foobar", "Foobar");
		props.put("foobar", "foobar");
		props.put("zoo", "zoo");
		props.put("Zoo", "Zoo");

		VerifiableCredential vc = cb.id("#test")
				.type("TestCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);
		assertNotNull(vc);

		DIDDocument.Builder db = doc.edit();
		db.addCredential(vc);
		doc = db.seal(TestConfig.storePass);
		assertNotNull(doc);
		assertEquals(3, doc.getCredentialCount());
		store.storeDid(doc);

		log.debug("Updating DID {}...", did);
		long start = System.currentTimeMillis();
		doc.publish(TestConfig.storePass);
		long duration = (System.currentTimeMillis() - start + 500) / 1000;
        log.debug("Update DID {}...OK({}s)", did, duration);

		testData.waitForWalletAvailable();
		resolved = did.resolve();
		assertNotEquals(lastTxid, resolved.getMetadata().getTransactionId());
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		DIDBiography rr = did.resolveBiography();
		assertNotNull(rr);
		assertEquals(did, rr.getDid());
		assertEquals(DIDBiography.Status.VALID, rr.getStatus());
		assertEquals(3, rr.getTransactionCount());
		List<DIDTransaction> txs = rr.getAllTransactions();
		assertNotNull(txs);
		assertEquals(3, txs.size());

		DIDTransaction tx = txs.get(0);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(1);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(2);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.CREATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());
	}

	@Test
	@Order(11)
	public void testCreateAndResolveWithCredentialsAsync() throws DIDException {
		// Create new DID and publish to ID sidechain.
		DIDDocument doc = identity.newDid(TestConfig.storePass);
		DID did = doc.getSubject();

		Issuer selfIssuer = new Issuer(doc);
		VerifiableCredential.Builder cb = selfIssuer.issueFor(did);

		Map<String, Object> props= new HashMap<String, Object>();
		props.put("name", "John");
		props.put("gender", "Male");
		props.put("nation", "Singapore");
		props.put("language", "English");
		props.put("email", "john@example.com");
		props.put("twitter", "@john");

		VerifiableCredential vc = cb.id("#profile")
				.type("BasicProfileCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);
		assertNotNull(vc);

		DIDDocument.Builder db = doc.edit();
		db.addCredential(vc);
		doc = db.seal(TestConfig.storePass);
		assertNotNull(doc);
		assertEquals(1, doc.getCredentialCount());
		store.storeDid(doc);

        log.debug("Publishing new DID {}...", did);
		long s1 = System.currentTimeMillis();
		CompletableFuture<Void> tf = doc.publishAsync(TestConfig.storePass)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - s1 + 500) / 1000;
			        log.debug("Publish new DID {}...OK({}s)", did, duration);
				});
		tf.join();

		testData.waitForWalletAvailable();
		CompletableFuture<DIDDocument> rf = did.resolveAsync(true);
		DIDDocument resolved = rf.join();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		dids.add(did); // 4
	}

	@Test
	@Order(12)
	public void testUpdateAndResolveWithCredentialsAsync() throws DIDException {
		// User the DID that created in previous case(11)
		DIDDocument doc = store.loadDid(dids.get(4));
		assertNotNull(doc);
		DID did = doc.getSubject();

		DIDDocument resolved = did.resolveAsync(true).join();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.getProof().getSignature(), resolved.getProof().getSignature());
		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		// Update
		Issuer selfIssuer = new Issuer(doc);
		VerifiableCredential.Builder cb = selfIssuer.issueFor(did);

		Map<String, Object> props= new HashMap<String, Object>();
		props.put("nation", "Singapore");
		props.put("passport", "S653258Z07");

		VerifiableCredential vc = cb.id("#passport")
				.type("BasicProfileCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);
		assertNotNull(vc);

		DIDDocument.Builder db = doc.edit();
		db.addCredential(vc);
		doc = db.seal(TestConfig.storePass);
		assertNotNull(doc);
		assertEquals(2, doc.getCredentialCount());
		store.storeDid(doc);

        log.debug("Updating DID {}...", did);
		long start = System.currentTimeMillis();
		CompletableFuture<Void> tf = doc.publishAsync(TestConfig.storePass)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
			        log.debug("Update DID {}...OK({}s)", did, duration);
				});
		tf.join();

		testData.waitForWalletAvailable();
		CompletableFuture<DIDDocument> rf = did.resolveAsync(true);
		resolved = rf.join();
		assertNotEquals(lastTxid, resolved.getMetadata().getTransactionId());
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);
	}

	@Test
	@Order(13)
	public void testUpdateAndResolveWithCredentialsAsyncAgain() throws DIDException {
		// User the DID that created in previous case(11)
		DIDDocument doc = store.loadDid(dids.get(4));
		assertNotNull(doc);
		DID did = doc.getSubject();

		DIDDocument resolved = did.resolveAsync(true).join();
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.getProof().getSignature(), resolved.getProof().getSignature());
		String lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		// Update again
		Issuer selfIssuer = new Issuer(doc);
		VerifiableCredential.Builder cb = selfIssuer.issueFor(did);

		Map<String, Object> props= new HashMap<String, Object>();
		props.put("Abc", "Abc");
		props.put("abc", "abc");
		props.put("Foobar", "Foobar");
		props.put("foobar", "foobar");
		props.put("zoo", "zoo");
		props.put("Zoo", "Zoo");

		VerifiableCredential vc = cb.id("#test")
				.type("TestCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);
		assertNotNull(vc);

		DIDDocument.Builder db = doc.edit();
		db.addCredential(vc);
		doc = db.seal(TestConfig.storePass);
		assertNotNull(doc);
		assertEquals(3, doc.getCredentialCount());
		store.storeDid(doc);

        log.debug("Updating DID {}...", did);
		long start = System.currentTimeMillis();
		CompletableFuture<Void> tf = doc.publishAsync(TestConfig.storePass)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
			        log.debug("Update DID {}...OK({}s)", did, duration);
				});
		tf.join();

		testData.waitForWalletAvailable();
		CompletableFuture<DIDDocument> rf = did.resolveAsync(true);
		resolved = rf.join();
		assertNotEquals(lastTxid, resolved.getMetadata().getTransactionId());
		assertEquals(did, resolved.getSubject());
		assertTrue(resolved.isValid());
		assertEquals(doc.toString(true), resolved.toString(true));

		lastTxid = resolved.getMetadata().getTransactionId();
		log.debug("Last transaction id {}", lastTxid);

		DIDBiography rr = did.resolveBiography();
		assertNotNull(rr);
		assertEquals(did, rr.getDid());
		assertEquals(DIDBiography.Status.VALID, rr.getStatus());
		assertEquals(3, rr.getTransactionCount());
		List<DIDTransaction> txs = rr.getAllTransactions();
		assertNotNull(txs);
		assertEquals(3, txs.size());

		DIDTransaction tx = txs.get(0);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(1);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.UPDATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());

		tx = txs.get(2);
		assertEquals(did, tx.getDid());
		assertEquals(IDChainRequest.Operation.CREATE, tx.getRequest().getOperation());
		assertTrue(tx.getRequest().isValid());
	}

	@Test
	@Order(14)
	public void testSyncRootIdentityClean() throws DIDException, IOException {
		File path = new File(TestConfig.tempDir + "/cleanstore").getCanonicalFile();
		Utils.deleteFile(path);

		DIDStore cleanStore = DIDStore.open(path);
		RootIdentity rootIdentity = RootIdentity.create(mnemonic,
				TestConfig.passphrase, true, cleanStore, TestConfig.storePass);

		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();
		rootIdentity.synchronize();
		long duration = (System.currentTimeMillis() - start + 500) / 1000;
		log.debug("Synchronize from IDChain...OK({}s)", duration);

		List<DID> restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));
	}

	@Test
	@Order(15)
	public void testSyncRootIdentityCleanAsync() throws DIDException, IOException {
		File path = new File(TestConfig.tempDir + "/cleanstore").getCanonicalFile();
		Utils.deleteFile(path);

		DIDStore cleanStore = DIDStore.open(path);
		RootIdentity rootIdentity = RootIdentity.create(mnemonic,
				TestConfig.passphrase, true, cleanStore, TestConfig.storePass);

		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();
		CompletableFuture<Void> f = rootIdentity.synchronizeAsync()
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
					log.debug("Synchronize from IDChain...OK({}s)", duration);
				});

		f.join();

		List<DID> restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));
	}

	@Test
	@Order(16)
	public void testSyncRootIdentityWithoutModification() throws DIDException, IOException {
		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();
		identity.synchronize((c, l) -> {
			assertEquals(l.getProof().getSignature(), c.getProof().getSignature());
			assertEquals(l.getLastModified(), c.getLastModified());

			l.getMetadata().setPublished(c.getMetadata().getPublished());
			l.getMetadata().setSignature(c.getMetadata().getSignature());
			return l;
		});

		long duration = (System.currentTimeMillis() - start + 500) / 1000;
		log.debug("Synchronize from IDChain...OK({}s)", duration);

		List<DID> restoredDids = new ArrayList<DID>(store.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));
	}

	@Test
	@Order(17)
	public void testSyncRootIdentityWithoutModificationAsync() throws DIDException, IOException {
		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();

		ConflictHandle ch = (c, l) -> {
			assertEquals(l.getProof().getSignature(), c.getProof().getSignature());
			assertEquals(l.getLastModified(), c.getLastModified());

			l.getMetadata().setPublished(c.getMetadata().getPublished());
			l.getMetadata().setSignature(c.getMetadata().getSignature());
			return l;
		};

		CompletableFuture<Void> f = identity.synchronizeAsync(ch)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
					log.debug("Synchronize from IDChain...OK({}s)", duration);
				});

		f.join();

		List<DID> restoredDids = new ArrayList<DID>(store.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));
	}

	@Test
	@Order(18)
	public void testSyncRootIdentityWithLocalModification1() throws DIDException, IOException {
		// Sync to a clean store first
		File path = new File(TestConfig.tempDir + "/cleanstore").getCanonicalFile();
		Utils.deleteFile(path);

		DIDStore cleanStore = DIDStore.open(path);
		RootIdentity rootIdentity = RootIdentity.create(mnemonic,
				TestConfig.passphrase, true, cleanStore, TestConfig.storePass);

		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();
		rootIdentity.synchronize();
		long duration = (System.currentTimeMillis() - start + 500) / 1000;
		log.debug("Synchronize from IDChain...OK({}s)", duration);

		List<DID> restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));

		// Modify a DID document
		DID modifiedDid = dids.get(0);
		DIDDocument doc = cleanStore.loadDid(modifiedDid);
		DIDDocument.Builder db = doc.edit();
		db.addService("#test1", "TestType", "http://test.com/");
		doc = db.seal(TestConfig.storePass);
		cleanStore.storeDid(doc);
		String modifiedSignature = doc.getProof().getSignature();

		log.debug("Synchronizing again from IDChain...");
		start = System.currentTimeMillis();
		rootIdentity.synchronize();
		duration = (System.currentTimeMillis() - start + 500) / 1000;
		log.debug("Synchronize again from IDChain...OK({}s)", duration);

		restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));

		// Should keep the local modified copy after sync
		doc = cleanStore.loadDid(modifiedDid);
		assertEquals(modifiedSignature, doc.getProof().getSignature());
	}

	@Test
	@Order(19)
	public void testSyncRootIdentityWithLocalModification2() throws DIDException, IOException {
		// Sync to a clean store first
		File path = new File(TestConfig.tempDir + "/cleanstore").getCanonicalFile();
		Utils.deleteFile(path);

		DIDStore cleanStore = DIDStore.open(path);
		RootIdentity rootIdentity = RootIdentity.create(mnemonic,
				TestConfig.passphrase, true, cleanStore, TestConfig.storePass);

		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();
		rootIdentity.synchronize();
		long duration = (System.currentTimeMillis() - start + 500) / 1000;
		log.debug("Synchronize from IDChain...OK({}s)", duration);

		List<DID> restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));

		// Modify a DID document
		DID modifiedDid = dids.get(0);
		DIDDocument doc = cleanStore.loadDid(modifiedDid);
		String originalSignature = doc.getSignature();

		DIDDocument.Builder db = doc.edit();
		db.addService("#Stest1", "TestType", "http://test.com/");
		doc = db.seal(TestConfig.storePass);
		cleanStore.storeDid(doc);

		log.debug("Synchronizing again from IDChain...");
		start = System.currentTimeMillis();
		rootIdentity.synchronize((c, l) -> c);
		duration = (System.currentTimeMillis() - start + 500) / 1000;
		log.debug("Synchronize again from IDChain...OK({}s)", duration);

		restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));

		// Should overwrite the local modified copy with chain copy after sync
		doc = cleanStore.loadDid(modifiedDid);
		assertEquals(originalSignature, doc.getSignature());
	}

	@Test
	@Order(20)
	public void testSyncRootIdentityWithLocalModificationAsync() throws DIDException, IOException {
		// Sync to a clean store first
		File path = new File(TestConfig.tempDir + "/cleanstore").getCanonicalFile();
		Utils.deleteFile(path);

		DIDStore cleanStore = DIDStore.open(path);
		RootIdentity rootIdentity = RootIdentity.create(mnemonic,
				TestConfig.passphrase, true, cleanStore, TestConfig.storePass);

		log.debug("Synchronizing from IDChain...");
		long start = System.currentTimeMillis();
		CompletableFuture<Void> f = rootIdentity.synchronizeAsync()
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
					log.debug("Synchronize from IDChain...OK({}s)", duration);
				});

		f.join();

		List<DID> restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		List<DID> originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));

		// Modify a DID document
		DID modifiedDid = dids.get(0);
		DIDDocument doc = cleanStore.loadDid(modifiedDid);
		String originalSignature = doc.getSignature();

		DIDDocument.Builder db = doc.edit();
		db.addService("#test1", "TestType", "http://test.com/");
		doc = db.seal(TestConfig.storePass);
		cleanStore.storeDid(doc);

		log.debug("Synchronizing again from IDChain...");
		long start2 = System.currentTimeMillis();
		f = rootIdentity.synchronizeAsync((c, l) -> c)
				.thenRun(() -> {
					long duration = (System.currentTimeMillis() - start2 + 500) / 1000;
					log.debug("Synchronize again from IDChain...OK({}s)", duration);
				});

		f.join();

		restoredDids = new ArrayList<DID>(cleanStore.listDids());
		assertEquals(5, restoredDids.size());
		Collections.sort(restoredDids);

		originalDids = new ArrayList<DID>(dids);
		Collections.sort(originalDids);

		assertArrayEquals(originalDids.toArray(new DID[0]),
				restoredDids.toArray(new DID[0]));

		// Should overwrite the local modified copy with chain copy after sync
		doc = cleanStore.loadDid(modifiedDid);
		assertEquals(originalSignature, doc.getSignature());
	} */
});