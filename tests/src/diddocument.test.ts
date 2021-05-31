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
	DIDDocumentPublicKey,
	DIDURL,
	DIDStore,
	DID,
	DIDDocumentBuilder,
	JSONObject,
	HDKey,
	Base58
} from "@elastosfoundation/did-js-sdk";
import {
	TestData,
	CompatibleData
} from "./utils/testdata";
import {
	assertEquals,
	assertArrayEquals,
	assertNull
} from "./utils/utils";
import { TestConfig } from "./utils/testconfig";
import { DIDTestExtension } from "./utils/didtestextension";

async function testGetPublicKey(version: number, testData: TestData) {
	let doc: DIDDocument = await testData.getCompatibleData(version).getDocument("user1");
	expect(doc).not.toBeNull();
	expect(doc.isValid()).toBeTruthy();

	// Count and list.
	expect(doc.getPublicKeyCount()).toEqual(4);

	let pks = doc.getPublicKeys();
	expect(pks.length).toEqual(4);

	for (let pk of pks) {
		expect(pk.getId().getDid()).toEqual(doc.getSubject());
		expect(pk.getType()).toEqual(Constants.DEFAULT_PUBLICKEY_TYPE);

		if (pk.getId().getFragment() == "recovery")
			expect(pk.getController()).not.toEqual(doc.getSubject());
		else
			expect(pk.getController()).toEqual(doc.getSubject());

		expect(pk.getId().getFragment() == "primary"
			|| pk.getId().getFragment() == "key2"
			|| pk.getId().getFragment() == "key3"
			|| pk.getId().getFragment() == "recovery").toBeTruthy();
	}

	// PublicKey getter.
	let pk: DIDDocumentPublicKey = doc.getPublicKey("#primary");
	expect(pk).not.toBeNull();
	expect(DIDURL.from("#primary", doc.getSubject())).toEqual(pk.getId());

	let id: DIDURL = DIDURL.from("#key2", doc.getSubject());
	pk = doc.getPublicKey(id);
	expect(pk).not.toBeNull();
	expect(pk.getId()).toEqual(id);

	id = doc.getDefaultPublicKeyId();
	expect(id).not.toBeNull();
	expect(DIDURL.from("#primary", doc.getSubject())).toEqual(id);

	// Key not exist, should fail.
	pk = doc.getPublicKey("#notExist");
	expect(pk).toBeNull();

	id = DIDURL.from("#notExist", doc.getSubject());
	pk = doc.getPublicKey(id);
	expect(pk).toBeNull();

	// Selector
	id = doc.getDefaultPublicKeyId();
	pks = doc.selectPublicKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
	expect(pks.length).toEqual(1);
	expect(DIDURL.from("#primary", doc.getSubject())).toEqual(pks[0].getId());

	pks = doc.selectPublicKeys(id, null);
	expect(pks.length).toEqual(1);
	expect(DIDURL.from("#primary", doc.getSubject())).toEqual(pks[0].getId());

	pks = doc.selectPublicKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
	expect(pks.length).toEqual(4);

	pks = doc.selectPublicKeys("#key2", Constants.DEFAULT_PUBLICKEY_TYPE);
	expect(pks.length).toEqual(1);
	expect(DIDURL.from("#key2", doc.getSubject())).toEqual(pks[0].getId());

	pks = doc.selectPublicKeys("#key3", null);
	expect(pks.length).toEqual(1);
	expect(DIDURL.from("#key3", doc.getSubject())).toEqual(pks[0].getId());
}

describe('DIDDocument Tests', () => {
	let testData: TestData;
	let store: DIDStore;
	beforeAll(() => {
		testData = new TestData();
		store = testData.getStore();
	});

	afterAll(async () => {
		await testData.cleanup();
	});

	test('Test Get Public Key', async () => {
		await testGetPublicKey(1, testData);
		await testGetPublicKey(2, testData);
	});


	test('Test Get PublicKey With Multi Controller Cid1', async () => {
		let cd: CompatibleData = testData.getCompatibleData(2);

		let user1: DIDDocument = await cd.getDocument("user1");
		let user2: DIDDocument = await cd.getDocument("user2");
		let user3: DIDDocument = await cd.getDocument("user3");
		let doc: DIDDocument = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getPublicKeyCount()).toBe(7);

		let pks = doc.getPublicKeys();
		assertEquals(7, pks.length);

		let ids: DIDURL[] = [];
		for (let i = 0; i < pks.length; i++) {
			let pk: DIDDocumentPublicKey = pks[i];
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
		refs.push(DIDURL.from("#key3", user1.getSubject(), ));
		refs.push(DIDURL.from("#key2", doc.getSubject()));
		refs.push(DIDURL.from("#key3", doc.getSubject()));

		refs.sort((e1, e2) => {
			return e1.compareTo(e2);
		});

		assertArrayEquals(refs, ids);

		// PublicKey getter.
		let pk: DIDDocumentPublicKey = doc.getPublicKey("#primary");
		expect(pk).toBeNull();

		let id: DIDURL = DIDURL.from("#primary", user1.getSubject());
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key2", user1.getSubject());
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key2", doc.getSubject());
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key3", doc.getSubject());
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

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
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectPublicKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectPublicKeys(null,
			Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toBe(7);

		pks = doc.selectPublicKeys(DIDURL.from("#key2", user1.getSubject()),
			Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key2", user1.getSubject()));

		pks = doc.selectPublicKeys(DIDURL.from("#key3", doc.getSubject()), null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key3", user1.getSubject()));
	});

	test('Test Get Public Key With Multi Controller Cid2', async () => {
		let cd = testData.getCompatibleData(2);

		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		let doc = await cd.getDocument("baz");

		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy();

		expect(doc.getPublicKeyCount()).toEqual(5)


		let pks = doc.getPublicKeys();
		expect(pks.length).toEqual(5);

		let ids = new Array<DIDURL>(5);

		pks.forEach((pk) => {
			ids.push(pk.getId());
		})


		ids.sort()

		let refs = new Array<DIDURL>(5);
		refs.push(user1.getDefaultPublicKeyId());
		refs.push(user2.getDefaultPublicKeyId());
		refs.push(user3.getDefaultPublicKeyId());
		refs.push(DIDURL.from("#key2", user1.getSubject()));
		refs.push(DIDURL.from("#key3", user1.getSubject()));

		refs.sort();

		expect(refs).toEqual(ids)

		// PublicKey getter.
		let pk = doc.getPublicKey("#primary");
		expect(pk).toBeNull();


		let id = DIDURL.from("#primary", user1.getSubject());
		pk = doc.getPublicKey(id);

		expect(pk).not.toBeNull()
		expect(id).toEqual(pk.getId())

		id = DIDURL.from("#key2", user1.getSubject());
		pk = doc.getPublicKey(id);

		expect(pk).not.toBeNull()
		expect(id).toEqual(pk.getId())

		id = doc.getDefaultPublicKeyId();
		expect(id).toBeNull()

		// Key not exist, should fail.
		pk = doc.getPublicKey("#notExist");
		expect(pk).toBeNull()

		id = DIDURL.from("#notExist", user2.getSubject());
		pk = doc.getPublicKey(id);
		expect(pk).toBeNull()

		// Selector
		id = user2.getDefaultPublicKeyId();
		pks = doc.selectPublicKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);

		expect(pks.length).toEqual(1);
		expect(pks[0].getId()).toEqual(id);

		id = user3.getDefaultPublicKeyId();
		pks = doc.selectPublicKeys(id, null);
		expect(pks.length).toEqual(1);
		expect(pks[0].getId()).toEqual(id);

		pks = doc.selectPublicKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(5);

		pks = doc.selectPublicKeys(DIDURL.from("#key2", user1.getSubject()),
			Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1);

		expect(pks[0].getId()).toEqual(DIDURL.from("#key2", user1.getSubject()));

		pks = doc.selectPublicKeys(DIDURL.from("#key3", user1.getSubject()), null);
		expect(pks.length).toEqual(1);
		expect(DIDURL.from("#key3", user1.getSubject())).toEqual(pks[0].getId())
	})

	test("Test Add PublicKey", async () => {
		testData.getRootIdentity();

		let doc: DIDDocument = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add 2 public keys
		let id = DIDURL.from("#test1", db.getSubject());
		let key = TestData.generateKeypair();
		db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

		key = TestData.generateKeypair();
		db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getPublicKey("#test1");
		expect(pk).not.toBeNull()
		expect(pk.getId()).toEqual(DIDURL.from("#test1", doc.getSubject()))

		pk = doc.getPublicKey("#test2");
		expect(pk).not.toBeNull()
		expect(pk.getId()).toEqual(DIDURL.from("#test2", doc.getSubject()));


		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(6)
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		expect(doc.getAuthorizationKeyCount()).toBe(1)
	})

	test("Test Add PublicKey With Cid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy();

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// Add 2 public keys
		let id = DIDURL.from("#test1", db.getSubject());
		let key = TestData.generateKeypair();
		db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

		key = TestData.generateKeypair();
		db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);

		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy();

		// Check existence
		let pk = doc.getPublicKey("#test1");
		expect(pk).not.toBeNull()
		expect(pk.getId()).toEqual(DIDURL.from("#test1", doc.getSubject()))

		pk = doc.getPublicKey("#test2");
		expect(pk).not.toBeNull()
		expect(pk.getId()).toEqual(DIDURL.from("#test2", doc.getSubject()))


		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(9)
		expect(doc.getAuthenticationKeyCount()).toBe(7)
		expect(doc.getAuthorizationKeyCount()).toBe(0)

	})

	test("Test Remove PublicKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy();

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// recovery used by authorization, should failed.
		let id = DIDURL.from("#recovery", doc.getSubject());
		expect(() => { db.removePublicKey(id) }).toThrowError()

		// force remove public key, should success
		db.removePublicKey(id, true);
		db.removePublicKey("#key2", true);

		// Key not exist, should fail.
		expect(() => { db.removePublicKey("#notExistKey", true); }).toThrowError()


		// Can not remove default publickey, should fail.
		let d = doc;
		expect(() => { db.removePublicKey(d.getDefaultPublicKeyId(), true); }).toThrowError()


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy();

		// Check existence
		let pk = doc.getPublicKey("#recovery");
		expect(pk).toBeNull()

		pk = doc.getPublicKey("#key2");
		expect(pk).toBeNull()

		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(2)
		expect(doc.getAuthenticationKeyCount()).toBe(2)
		expect(doc.getAuthorizationKeyCount()).toBe(0)

	})

	test("Test Remove PublicKey With Cid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user2);

		// Can not remove the controller's key
		let key2 = DIDURL.from("#key2", user1.getSubject());
		expect(() => { db.removePublicKey(key2); }).toThrowError()

		// key2 used by authentication, should failed.
		let id = DIDURL.from("#key2", doc.getSubject());
		expect(() => { db.removePublicKey(id); }).toThrowError()

		// force remove public key, should success
		db.removePublicKey(id, true);

		db.removePublicKey("#key3", true);

		// Key not exist, should fail.
		expect(() => { db.removePublicKey("#notExistKey", true); }).toThrowError()


		doc = db.seal(TestConfig.storePass);
		doc = user1.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getPublicKey("#key2");
		expect(pk).toBeNull();

		pk = doc.getPublicKey("#key3");
		expect(pk).toBeNull();

		// Check the final count.
		expect(doc.getPublicKeyCount()).toEqual(5);
		expect(doc.getAuthenticationKeyCount()).toEqual(5);
		expect(doc.getAuthorizationKeyCount()).toEqual(0);
	})

	test("testGetAuthenticationKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getAuthenticationKeyCount()).toEqual(3)


		let pks = doc.getAuthenticationKeys();
		expect(pks.length).toEqual(3)

		pks.forEach(pk => {
			expect(pk.getId().getDid()).toEqual(doc.getSubject());
			expect(pk.getType()).toEqual(Constants.DEFAULT_PUBLICKEY_TYPE);
			expect(pk.getController()).toEqual(doc.getSubject())
			expect(pk.getId().getFragment() == "primary"
				|| pk.getId().getFragment() == "key2"
				|| pk.getId().getFragment() == "key3").toBeTruthy()
		});

		// AuthenticationKey getter
		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#primary", doc.getSubject()));

		let id = DIDURL.from("#key3", doc.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.from("#notExist", doc.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).toBeNull();

		// selector
		id = DIDURL.from("#key3", doc.getSubject());
		pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthenticationKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(3)

		pks = doc.selectAuthenticationKeys("#key2", Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key2", doc.getSubject()))

		pks = doc.selectAuthenticationKeys("#key2", null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key2", doc.getSubject()))
	})

	test("testGetAuthenticationKeyWithCid", async () => {
		let cd = await testData.getCompatibleData(2);

		let issuer = await cd.getDocument("issuer");
		let doc = await cd.getDocument("examplecorp");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getAuthenticationKeyCount()).toBe(1)

		let pks = doc.getAuthenticationKeys();
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(issuer.getDefaultPublicKeyId())

		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).toBeNull();

		let id = DIDURL.from("#primary", doc.getController());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.from("#notExist", doc.getController());
		pk = doc.getAuthenticationKey(id);
		expect(pk).toBeNull();

		// Selector
		id = doc.getDefaultPublicKeyId();
		pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#primary", doc.getController()))

		pks = doc.selectPublicKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#primary", doc.getController()))

		pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
	})

	test("testGetAuthenticationKeyWithMultiControllerCid1", async () => {
		let cd = testData.getCompatibleData(2);

		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getAuthenticationKeyCount()).toBe(7);

		let pks = doc.getAuthenticationKeys();
		expect(pks.length).toBe(7);

		let ids = new Array<DIDURL>(7);
		pks.forEach(pk => {
			ids.push(pk.getId());
		});


		ids.sort()


		let refs = new Array<DIDURL>(7);
		refs.push(user1.getDefaultPublicKeyId());
		refs.push(user2.getDefaultPublicKeyId());
		refs.push(user3.getDefaultPublicKeyId());
		refs.push(DIDURL.from("#key2", user1.getSubject()));
		refs.push(DIDURL.from("#key3", user1.getSubject()));
		refs.push(DIDURL.from("#key2", doc.getSubject()));
		refs.push(DIDURL.from("#key3", doc.getSubject()));

		refs.sort()

		expect(refs).toEqual(ids)


		// PublicKey getter.
		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).toBeNull();

		let id = DIDURL.from("#primary", user1.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key2", user1.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key2", doc.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key3", doc.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.from("#notExist", doc.getController());
		pk = doc.getAuthenticationKey(id);
		expect(pk).toBeNull();

		// Selector
		id = user1.getDefaultPublicKeyId();
		pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthenticationKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toBe(7);

		pks = doc.selectAuthenticationKeys(DIDURL.from("#key2", user1.getSubject()),
			Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)

		expect(pks[0].getId()).toEqual(DIDURL.from("#key2", user1.getSubject()));

		pks = doc.selectAuthenticationKeys(DIDURL.from("#key3", doc.getSubject()), null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key3", user1.getSubject()));
	})
	test("testGetAuthenticationKeyWithMultiControllerCid2", async () => {
		let cd = testData.getCompatibleData(2);

		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");

		let doc = await cd.getDocument("baz");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		assertEquals(5, doc.getAuthenticationKeyCount());

		let pks = doc.getAuthenticationKeys();
		expect(pks.length).toEqual(5)

		let ids = new Array<DIDURL>(5);
		pks.forEach(pk => {
			ids.push(pk.getId());
		});

		ids.sort()

		let refs = new Array<DIDURL>(5);
		refs.push(user1.getDefaultPublicKeyId());
		refs.push(user2.getDefaultPublicKeyId());
		refs.push(user3.getDefaultPublicKeyId());
		refs.push(DIDURL.from("#key2", user1.getSubject()));
		refs.push(DIDURL.from("#key3", user1.getSubject()));

		refs.sort()

		expect(refs).toEqual(ids)

		// PublicKey getter.
		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).toBeNull();

		let id = DIDURL.from("#primary", user1.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.from("#key2", user1.getSubject());
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.from("#notExist", user2.getSubject());
		pk = doc.getPublicKey(id);
		expect(pk).toBeNull();

		// Selector
		id = user2.getDefaultPublicKeyId();
		pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		id = user3.getDefaultPublicKeyId();
		pks = doc.selectAuthenticationKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(5)

		pks = doc.selectAuthenticationKeys(DIDURL.from("#key2", user1.getSubject()),
			Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key2", user1.getSubject()));

		pks = doc.selectAuthenticationKeys(DIDURL.from("#key3", user1.getSubject()), null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.from("#key3", user1.getSubject()));

	})
	test("testAddAuthenticationKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

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
		expect(() => { db.addExistingAuthenticationKey("#notExistKey"); }).toThrowError()


		// Try to add a key not owned by self, should fail.
		expect(() => { db.addExistingAuthenticationKey("#recovery"); }).toThrowError()

		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getAuthenticationKey("#test1");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test1", doc.getSubject()));

		pk = doc.getAuthenticationKey("#test2");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test2", doc.getSubject()))

		pk = doc.getAuthenticationKey("#test3");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test3", doc.getSubject()))

		pk = doc.getAuthenticationKey("#test4");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test4", doc.getSubject()))

		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(8)
		expect(doc.getAuthenticationKeyCount()).toBe(7);
		expect(doc.getAuthorizationKeyCount()).toBe(1);
	})
	test("testAddAuthenticationKeyWithCid", async () => {
		let cd = testData.getCompatibleData(2);

		let user1 = await cd.getDocument("user1");
		await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

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
		expect(() => { db.addExistingAuthenticationKey(key3); }).toThrowError()

		// Try to add a non existing key, should fail.
		expect(() => { db.addExistingAuthenticationKey("#notExistKey"); }).toThrowError()

		// Try to add a key not owned by self, should fail.
		let recovery = DIDURL.from("#recovery", user1.getSubject());
		expect(() => { db.addExistingAuthenticationKey(recovery); }).toThrowError()


		doc = db.seal(TestConfig.storePass);
		doc = user3.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getAuthenticationKey("#test1");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test1", doc.getSubject()));

		pk = doc.getAuthenticationKey("#test2");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test2", doc.getSubject()))

		pk = doc.getAuthenticationKey("#test3");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test3", doc.getSubject()))

		pk = doc.getAuthenticationKey("#test4");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test4", doc.getSubject()))

		// Check the final count.

		expect(doc.getPublicKeyCount()).toBe(11);
		expect(doc.getAuthenticationKeyCount()).toBe(11);
		expect(doc.getAuthorizationKeyCount()).toBe(0);
	})
	test("testRemoveAuthenticationKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

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


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

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
	})
	test("testRemoveAuthenticationKeyWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getPublicKeyCount()).toBe(7);
		expect(doc.getAuthenticationKeyCount()).toBe(7);
		expect(doc.getAuthorizationKeyCount()).toBe(0);

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// Remote keys
		db.removeAuthenticationKey(DIDURL.from("#key2", doc.getSubject()))
			.removeAuthenticationKey("#key3");

		db.removePublicKey("#key3");

		// Key not exist, should fail.
		expect(() => { db.removeAuthenticationKey("#notExistKey"); }).toThrowError();


		// Remove controller's key, should fail.
		let key2 = DIDURL.from("#key2", user1.getSubject());
		expect(() => { db.removeAuthenticationKey(key2); }).toThrowError();

		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getAuthenticationKey("#key2");
		expect(pk).toBeNull();

		pk = doc.getAuthenticationKey("#key3");
		expect(pk).toBeNull();

		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(6);
		expect(doc.getAuthenticationKeyCount()).toBe(5);
		expect(doc.getAuthorizationKeyCount()).toBe(0);
	})
	test("testGetAuthorizationKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getAuthorizationKeyCount()).toBe(1);

		let pks = doc.getAuthorizationKeys();
		expect(pks.length).toEqual(1)

		pks.forEach(pk => {
			expect(pk.getId().getDid()).toEqual(doc.getSubject());
			expect(pk.getType()).toEqual(Constants.DEFAULT_PUBLICKEY_TYPE);
			expect(pk.getController()).not.toEqual(doc.getSubject());
			expect(pk.getId().getFragment()).toEqual("recovery")
		});



		// AuthorizationKey getter
		let pk = doc.getAuthorizationKey("#recovery");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#recovery", doc.getSubject()));

		let id = DIDURL.from("#recovery", doc.getSubject());
		pk = doc.getAuthorizationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthorizationKey("#notExistKey");
		expect(pk).toBeNull();

		id = DIDURL.from("#notExistKey", doc.getSubject());
		pk = doc.getAuthorizationKey(id);
		expect(pk).toBeNull();

		// Selector
		id = DIDURL.from("#recovery", doc.getSubject());
		pks = doc.selectAuthorizationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthorizationKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthorizationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
	})
	test("testGetAuthorizationKeyWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		await cd.getDocument("user1");
		await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getAuthorizationKeyCount()).toBe(0);

		let pks = doc.getAuthorizationKeys();
		expect(pks.length).toBe(0);
	})
	test("testAddAuthorizationKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

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


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let pk = doc.getAuthorizationKey("#test1");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test1", doc.getSubject()));

		pk = doc.getAuthorizationKey("#test2");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test2", doc.getSubject()))

		pk = doc.getAuthorizationKey("#test3");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test3", doc.getSubject()))

		pk = doc.getAuthorizationKey("#test4");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.from("#test4", doc.getSubject()))

		// Check the final key count.
		expect(doc.getPublicKeyCount()).toBe(8)
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		expect(doc.getAuthorizationKeyCount()).toBe(5)
	})
	test("testAddAuthorizationKeyWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let did = doc.getSubject();
		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

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

		expect(() => { db.addExistingAuthorizationKey(DIDURL.from("#test1", did)); }).toThrowError()

		expect(() => { db.addExistingAuthorizationKey("#test2"); }).toThrowError()

		// Try to add a non existing key, should fail.
		expect(() => { db.addExistingAuthorizationKey("#notExistKey"); }).toThrowError()


		// Try to add controller's, should fail.
		let recovery = DIDURL.from("#recovery", user1.getSubject());
		expect(() => { db.addExistingAuthorizationKey(recovery); }).toThrowError()


		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

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
	})
	test("testRemoveAuthorizationKey", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

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


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getAuthorizationKey("#test1");
		expect(pk).toBeNull();

		pk = doc.getAuthorizationKey("#test2");
		expect(pk).not.toBeNull();

		pk = doc.getAuthorizationKey("#recovery");
		expect(pk).toBeNull();

		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(6)
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		expect(doc.getAuthorizationKeyCount()).toBe(1);
	})
	test("testGetCredential", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getCredentialCount()).toBe(2);

		let vcs = doc.getCredentials();
		expect(vcs.length).toBe(2);

		vcs.forEach(vc => {
			expect(vc.getId().getDid()).toEqual(doc.getSubject())
			expect(vc.getSubject().getId()).toEqual(doc.getSubject())
			expect(vc.getId().getFragment() == "profile"
				|| vc.getId().getFragment() == "email").toBeTruthy()
		});

		// Credential getter.
		let vc = doc.getCredential("#profile");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));

		vc = doc.getCredential(DIDURL.from("#email", doc.getSubject()));
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#email", doc.getSubject()));

		// Credential not exist.
		vc = doc.getCredential("#notExistVc");
		expect(vc).toBeNull();

		// Credential selector.
		vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()),
			"SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));


		vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()), null);
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));

		vcs = doc.selectCredentials(null, "SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));

		vcs = doc.selectCredentials(null, "TestingCredential");
		expect(vcs.length).toBe(0);
	})

	test("testGetCredentialWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		await cd.getDocument("user1");
		await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getCredentialCount()).toBe(2);
		let vcs = doc.getCredentials();
		expect(vcs.length).toBe(2);

		vcs.forEach(vc => {
			expect(vc.getId().getDid()).toEqual(doc.getSubject())
			expect(vc.getSubject().getId()).toEqual(doc.getSubject())
			expect(vc.getId().getFragment() == "profile"
				|| vc.getId().getFragment() == "email").toBeTruthy()
		});



		// Credential getter.
		let vc = doc.getCredential("#profile");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));

		vc = doc.getCredential(DIDURL.from("#email", doc.getSubject()));
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#email", doc.getSubject()));

		// Credential not exist.
		vc = doc.getCredential("#notExistVc");
		expect(vc).toBeNull();

		// Credential selector.
		vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()),
			"SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.from("#profile", doc.getSubject(), ));

		vcs = doc.selectCredentials(DIDURL.from("#profile", doc.getSubject()), null);
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));

		vcs = doc.selectCredentials(null, "SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.from("#profile", doc.getSubject()));

		vcs = doc.selectCredentials(null, "TestingCredential");
		expect(vcs.length).toBe(0);
	})
	test("testAddCredential", async () => {
		let cd = testData.getCompatibleData(2);

		testData.getRootIdentity();

		let doc = await cd.getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add credentials.
		let vc = await cd.getCredential("user1", "passport");
		db.addCredential(vc);

		vc = await cd.getCredential("user1", "twitter");
		db.addCredential(vc);

		let fvc = vc;
		// Credential already exist, should fail.
		expect(() => { db.addCredential(fvc); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check new added credential.
		vc = doc.getCredential("#passport");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#passport", doc.getSubject()));

		let id = DIDURL.from("#twitter", doc.getSubject());
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);

		// Should contains 3 credentials.
		expect(doc.getCredentialCount()).toBe(4);
	})
	test("testAddCredentialWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// Add credentials.
		let vc = await cd.getCredential("foobar", "license");
		db.addCredential(vc);

		vc = await cd.getCredential("foobar", "services");
		db.addCredential(vc);

		let fvc = vc;
		// Credential already exist, should fail.
		expect(() => { db.addCredential(fvc); }).toThrowError();


		// Credential not belongs to current did, should fail.
		await expect(async () => { db.addCredential(await cd.getCredential("user1", "passport")); }).toThrowError();

		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check new added credential.
		vc = doc.getCredential("#license");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#license", doc.getSubject()));
		assertEquals(DIDURL.from("#license", doc.getSubject()), vc.getId());

		let id = DIDURL.from("#services", doc.getSubject());
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);

		expect(doc.getCredentialCount()).toBe(4);
	})
	test("testAddSelfClaimedCredential", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add credentials.
		let subject = {
			"passport": "S653258Z07"
		};
		db.createAndAddCredential(TestConfig.storePass, "#passport", subject);

		let json = "{\"name\":\"Jay Holtslander\",\"alternateName\":\"Jason Holtslander\"}";
		db.createAndAddCredential(TestConfig.storePass, "#name", json);

		json = "{\"twitter\":\"@john\"}";
		db.createAndAddCredential(TestConfig.storePass, "#twitter", json);

		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check new added credential.
		let vc = doc.getCredential("#passport");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#passport", doc.getSubject()));
		expect(vc.isSelfProclaimed()).toBeTruthy();

		let id = DIDURL.from("#name", doc.getSubject());
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();

		id = DIDURL.from("#twitter", doc.getSubject());
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();
		expect(doc.getCredentialCount()).toBe(5);
	})
	test("testAddSelfClaimedCredentialWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user2);

		// Add credentials.
		let subject = {
			"foo": "bar"
		};
		db.createAndAddCredential(TestConfig.storePass, "#testvc", subject);

		let json = "{\"name\":\"Foo Bar\",\"alternateName\":\"Jason Holtslander\"}";
		db.createAndAddCredential(TestConfig.storePass, "#name", json);

		json = "{\"twitter\":\"@foobar\"}";
		db.createAndAddCredential(TestConfig.storePass, "#twitter", json);

		doc = db.seal(TestConfig.storePass);
		doc = user1.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check new added credential.
		let vc = doc.getCredential("#testvc");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.from("#testvc", doc.getSubject()));
		expect(vc.isSelfProclaimed()).toBeTruthy();

		let id = DIDURL.from("#name", doc.getSubject());
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();

		id = DIDURL.from("#twitter", doc.getSubject());
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();

		expect(doc.getCredentialCount()).toBe(5);
	})
	test("testRemoveCredential", async () => {
		testData.getRootIdentity();
		let cd = testData.getCompatibleData(2);

		let doc = await cd.getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add test credentials.
		let vc = await cd.getCredential("user1", "passport");
		db.addCredential(vc);

		vc = await cd.getCredential("user1", "twitter");
		db.addCredential(vc);

		// Remove credentials
		db.removeCredential("#profile");

		db.removeCredential(DIDURL.from("#twitter", doc.getSubject()));

		// Credential not exist, should fail.
		expect(() => { db.removeCredential("#notExistCredential"); }).toThrowError();


		let did = doc.getSubject();
		expect(() => { db.removeCredential(DIDURL.from("#notExistCredential", did)); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		vc = doc.getCredential("#profile");
		expect(vc).toBeNull();

		vc = doc.getCredential(DIDURL.from("#twitter", doc.getSubject()));
		expect(vc).toBeNull();

		// Check the final count.
		expect(doc.getCredentialCount()).toBe(2);
	})
	test("testRemoveCredentialWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		let user2 = await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// Remove credentials
		db.removeCredential("#profile");

		db.removeCredential(DIDURL.from("#email", doc.getSubject()));

		// Credential not exist, should fail.
		expect(() => { db.removeCredential("#notExistCredential"); }).toThrowError();


		let did = doc.getSubject();
		expect(() => { db.removeCredential(DIDURL.from("#notExistCredential", did)); }).toThrowError();

		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let vc = doc.getCredential("#profile");
		expect(vc).toBeNull();

		vc = doc.getCredential(DIDURL.from("#email", doc.getSubject()));
		expect(vc).toBeNull();

		// Check the final count.
		expect(doc.getCredentialCount()).toBe(0);
	})
	test("testGetService", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list
		expect(doc.getServiceCount()).toBe(3);
		let svcs = doc.getServices();
		expect(svcs.length).toBe(3);

		svcs.forEach(svc => {
			expect(svc.getId().getDid()).toEqual(doc.getSubject())
			expect(svc.getId().getFragment() == "openid"
				|| svc.getId().getFragment() == "vcr"
				|| svc.getId().getFragment() == "carrier").toBeTruthy()
		});


		// Service getter, should success.
		let svc = doc.getService("#openid");
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(doc.getSubject())
		expect(svc.getType()).toEqual("OpenIdConnectVersion1.0Service")
		expect(svc.getServiceEndpoint()).toEqual("https://openid.example.com/")


		let props = svc.getProperties();
		expect(Object.keys(props).length === 0).toBeTruthy()

		svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(DIDURL.from("#vcr", doc.getSubject()))
		props = svc.getProperties();
		expect(Object.keys(props).length === 0).toBeTruthy()

		// Service not exist, should fail.
		svc = doc.getService("#notExistService");
		expect(svc).toBeNull();

		// Service selector.
		svcs = doc.selectServices("#vcr", "CredentialRepositoryService");
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.from("#vcr", doc.getSubject()))

		svcs = doc.selectServices(DIDURL.from("#openid", doc.getSubject()), null);
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.from("#openid", doc.getSubject()))


		svcs = doc.selectServices(null, "CarrierAddress");
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.from("#carrier", doc.getSubject()))

		props = svcs[0].getProperties();
		expect(svcs.length).toBe(1);
		expect(props.length).toBe(12);
		expect(props["foobar"]).toEqual("lalala...")
		expect(props["FOOBAR"]).toEqual("Lalala...")

		// Service not exist, should return a empty list.
		svcs = doc.selectServices("#notExistService",
			"CredentialRepositoryService");
		expect(svcs.length).toBe(0);

		svcs = doc.selectServices(null, "notExistType");
		expect(svcs.length).toBe(0);

	})
	test("testGetServiceWithCid", async () => {

		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		await cd.getDocument("user1");
		await cd.getDocument("user2");
		await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list
		expect(doc.getServiceCount()).toBe(2);

		let svcs = doc.getServices();
		expect(svcs.length).toBe(2);

		svcs.forEach(svc => {
			expect(svc.getId().getDid()).toEqual(doc.getSubject())
			expect(svc.getId().getFragment() == "vault"
				|| svc.getId().getFragment() == "vcr").toBeTruthy()
		});



		// Service getter, should success.
		let svc = doc.getService("#vault");
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(DIDURL.from("#vault", doc.getSubject()))
		expect(svc.getType()).toEqual("Hive.Vault.Service")
		expect(svc.getServiceEndpoint()).toEqual("https://foobar.com/vault")

		let props = svc.getProperties();
		expect(Object.keys(props).length === 0).toBeTruthy()

		svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(DIDURL.from("#vcr", doc.getSubject()))
		props = svc.getProperties();
		expect(props.length).toBe(12);
		expect(props["foobar"]).toEqual("lalala...")
		expect(props["FOOBAR"]).toEqual("Lalala...")

		// Service not exist, should fail.
		svc = doc.getService("#notExistService");
		expect(svc).toBeNull();

		// Service selector.
		svcs = doc.selectServices("#vcr", "CredentialRepositoryService");
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.from("#vcr", doc.getSubject()))

		svcs = doc.selectServices(DIDURL.from("#openid", doc.getSubject()), null);
		expect(svcs.length).toBe(0);

		// Service not exist, should return a empty list.
		svcs = doc.selectServices("#notExistService", "CredentialRepositoryService");
		expect(svcs.length).toBe(0);

		svcs = doc.selectServices(null, "notExistType");
		expect(svcs.length).toBe(0);
	})
	test("testAddService", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add services
		db.addService("#test-svc-1", "Service.Testing",
			"https://www.elastos.org/testing1");

		db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
			"Service.Testing", "https://www.elastos.org/testing2");

		// Service id already exist, should failed.
		expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test"); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check the final count
		expect(doc.getServiceCount()).toBe(5);

		// Try to select new added 2 services
		let svcs = doc.selectServices(null, "Service.Testing");
		expect(svcs.length).toBe(2);
		expect(svcs[0].getType()).toEqual("Service.Testing")
		expect(svcs[1].getType()).toEqual("Service.Testing")
	})
	test("testAddServiceWithDescription", async () => {
		testData.getRootIdentity();

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


		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add services
		db.addService("#test-svc-1", "Service.Testing",
			"https://www.elastos.org/testing1", props);

		db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
			"Service.Testing", "https://www.elastos.org/testing2", props);

		db.addService(DIDURL.from("#test-svc-3", doc.getSubject()),
			"Service.Testing", "https://www.elastos.org/testing3");

		// Service id already exist, should failed.+
		expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test", props); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check the final count
		expect(doc.getServiceCount()).toBe(6);

		// Try to select new added 2 services
		let svcs = doc.selectServices(null, "Service.Testing");
		expect(svcs.length).toBe(3);
		expect(svcs[0].getType()).toEqual("Service.Testing")
		expect(svcs[0].getProperties()).not.toBeNull()
		expect(svcs[0].getProperties()).not.toBeUndefined()
		expect(Object.keys(svcs[0].getProperties()).length).toBeGreaterThan(0)
		expect(svcs[0].getProperties().constructor).toBe(Object)

		expect(svcs[1].getType()).toEqual("Service.Testing")
		expect(svcs[1].getProperties()).not.toBeNull()
		expect(svcs[1].getProperties()).not.toBeUndefined()
		expect(Object.keys(svcs[1].getProperties()).length).toBeGreaterThan(0)
		expect(svcs[1].getProperties().constructor).toBe(Object)

		expect(svcs[2].getType()).toEqual("Service.Testing")
		expect(svcs[2].getProperties()).toBeNull()
	})
	test("testAddServiceWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user3);

		// Add services
		db.addService("#test-svc-1", "Service.Testing",
			"https://www.elastos.org/testing1");

		db.addService(DIDURL.from("#test-svc-2", doc.getSubject()),
			"Service.Testing", "https://www.elastos.org/testing2");

		// Service id already exist, should failed.
		expect(() => { db.addService("#vcr", "test", "https://www.elastos.org/test"); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		doc = user1.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check the final count
		expect(doc.getServiceCount()).toBe(4);

		// Try to select new added 2 services
		let svcs = doc.selectServices(null, "Service.Testing");
		expect(svcs.length).toBe(2);
		expect(svcs[0].getType()).toEqual("Service.Testing")
		expect(svcs[1].getType()).toEqual("Service.Testing")
	})
	test("testAddServiceWithCidAndDescription", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user3);

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


		doc = db.seal(TestConfig.storePass);
		doc = user1.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check the final count
		expect(doc.getServiceCount()).toBe(5);

		// Try to select new added 2 services
		let svcs = doc.selectServices(null, "Service.Testing");
		expect(svcs.length).toBe(3);
		expect(svcs[0].getType()).toEqual("Service.Testing")
		expect(svcs[0].getProperties()).not.toBeNull()
		expect(svcs[0].getProperties()).not.toBeUndefined()
		expect(Object.keys(svcs[0].getProperties()).length).toBeGreaterThan(0)
		expect(svcs[0].getProperties().constructor).toBe(Object)
		expect(svcs[1].getType()).toEqual("Service.Testing")
		expect(svcs[1].getProperties()).not.toBeNull()
		expect(svcs[1].getProperties()).not.toBeUndefined()
		expect(Object.keys(svcs[1].getProperties()).length).toBeGreaterThan(0)
		expect(svcs[1].getProperties().constructor).toBe(Object)

		expect(svcs[2].getType()).toEqual("Service.Testing")
		expect(svcs[2].getProperties()).toBeNull()
	})
	test("testRemoveService", async () => {
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// remove services
		db.removeService("#openid");

		db.removeService(DIDURL.from("#vcr", doc.getSubject()));

		// Service not exist, should fail.
		expect(() => { db.removeService("#notExistService"); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let svc = doc.getService("#openid");
		expect(svc).toBeNull();

		svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
		expect(svc).toBeNull();

		// Check the final count
		expect(doc.getServiceCount()).toBe(1);
	})
	test("testRemoveServiceWithCid", async () => {
		let cd = testData.getCompatibleData(2);
		testData.getRootIdentity();

		await cd.getDocument("issuer");
		let user1 = await cd.getDocument("user1");
		await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		await cd.getDocument("examplecorp");

		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// remove services
		db.removeService("#vault");

		db.removeService(DIDURL.from("#vcr", doc.getSubject()));

		// Service not exist, should fail.
		expect(() => { db.removeService("#notExistService"); }).toThrowError();


		doc = db.seal(TestConfig.storePass);
		doc = user3.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let svc = doc.getService("#openid");
		expect(svc).toBeNull();

		svc = doc.getService(DIDURL.from("#vcr", doc.getSubject()));
		expect(svc).toBeNull();

		// Check the final count
		expect(doc.getServiceCount()).toBe(0);

	})

	test("testParseAndSerializeDocument", async () => {
		let version = 2;
		let cd = testData.getCompatibleData(version);
		await cd.loadAll();
		let dids = [
			"examplecorp",
			"foobar",
			"foo",
			"bar",
			"baz"]

		for(const did of dids){


			let compactJson = cd.getDocumentJson(did, "compact");
			let compact = DIDDocument.parse<DIDDocument>(compactJson, DIDDocument);
			expect(compact).not.toBeNull()
			expect(compact.isValid()).toBeTruthy()


			let normalizedJson = cd.getDocumentJson(did, "normalized");
			let normalized = DIDDocument.parse<DIDDocument>(normalizedJson, DIDDocument);
			expect(normalized).not.toBeNull()
			expect(normalized.isValid()).toBeTruthy()

			let doc = await cd.getDocument(did);
			expect(doc).not.toBeNull();
			expect(doc.isValid()).toBeTruthy()

			expect(compact.toString(true)).toEqual(normalizedJson)
			expect(normalized.toString(true)).toEqual(normalizedJson)
			expect(doc.toString(true)).toEqual(normalizedJson)


			// Don't check the compact mode for the old versions
			if (cd.isLatestVersion()) {
				expect(compact.toString(false)).toEqual(compactJson)
				expect(normalized.toString(false)).toEqual(compactJson)
				expect(doc.toString(false)).toEqual(compactJson)
			}
		}


	})

	test("testSignAndVerify", async () => {
		let identity = testData.getRootIdentity();
		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let data = Buffer.alloc(1024)
		let pkid = DIDURL.from("#primary", doc.getSubject());

		for (let i = 0; i < 10; i++) {
			data.fill(i)

			let sig = doc.signWithId(pkid, TestConfig.storePass, data);
			let result = doc.verify(pkid, sig, data);
			expect(result).toBeTruthy()

			data[0] = 0xF;
			result = doc.verify(pkid, sig, data);
			expect(result).toBeFalsy()

			sig = doc.signWithStorePass(TestConfig.storePass, data);
			result = doc.verify(pkid, sig, data);
			expect(result).toBeTruthy()

			data[0] = i;
			result = doc.verify(pkid, sig, data);
			expect(result).toBeFalsy()
		}


	})

	test("testDerive", async () => {
		let identity = testData.getRootIdentity();
		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		for (let i = 0; i < 10; i++) {
			let strKey = doc.derive(i, TestConfig.storePass);
			let key = HDKey.deserializeBase58(strKey);

			let binKey = Base58.decode(strKey);
			let sk = Buffer.from(binKey.slice(46, 78));

			expect(sk.length).toEqual(key.getPrivateKeyBytes().length)
			expect(sk).toEqual(key.getPrivateKeyBytes())
		}
	})
	test("testDeriveFromIdentifier", async () => {
		let identifier = "org.elastos.did.test";
		let identity = testData.getRootIdentity();
		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		for (let i = -100; i < 100; i++) {
			let strKey = doc.derive(i, TestConfig.storePass);
			let key = HDKey.deserializeBase58(strKey);

			let binKey = Base58.decode(strKey);
			let sk = Buffer.from(binKey.slice(46, 78));

			expect(sk.length).toEqual(key.getPrivateKeyBytes().length)
			expect(sk).toEqual(key.getPrivateKeyBytes())
		}
	})
	test("testCreateCustomizedDid", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()

		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature())


		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass, false);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()
	})
	test("testCreateMultisigCustomizedDid", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())


		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())


		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())


		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()], 2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();

		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);

		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()
	})
	test("testUpdateDid", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update again
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(3);
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testUpdateCustomizedDid", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");

		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());


		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update again
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(3);
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testUpdateMultisigCustomizedDid", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");

		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();


		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		doc = ctrl1.signWithDocument(doc, TestConfig.storePass);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
		expect(doc.getPublicKeyCount()).toBe(4);
		expect(doc.getAuthenticationKeyCount()).toBe(4)

		// Update again
		db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl3);
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
		expect(doc.getPublicKeyCount()).toBe(5);
		expect(doc.getAuthenticationKeyCount()).toBe(5)
	})
	test("testTransferCustomizedDidAfterCreate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// create new controller
		let newController = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		resolved = await newController.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await newController.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(newController.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(newController.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// create the transfer ticket
		doc.setEffectiveController(controller.getSubject());
		let ticket = await doc.createTransferTicket(newController.getSubject(), TestConfig.storePass);
		await expect(async () => { return await ticket.isValid() }).toBeTruthy();

		// create new document for customized DID
		doc = await newController.newCustomized(did, 1, TestConfig.storePass, true);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(newController.getSubject())

		// transfer
		await doc.publishWithTicket(ticket, DIDURL.fromDID(doc.getController()), TestConfig.storePass);

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(newController.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()
	})
	test("testTransferCustomizedDidAfterUpdate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// create new controller
		let newController = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		resolved = await newController.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await newController.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(newController.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(newController.getProof().getSignature())


		expect(resolved.isValid()).toBeTruthy()

		// create the transfer ticket
		let ticket = await controller.createTransferTicket(did, TestConfig.storePass, newController.getSubject());
		expect(ticket.isValid()).toBeTruthy()

		// create new document for customized DID
		doc = await newController.newCustomized(did, 1, TestConfig.storePass, true);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(newController.getSubject())

		// transfer
		await doc.publishWithTicket(ticket, DIDURL.fromDID(doc.getSubject()), TestConfig.storePass);

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(newController.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()
	})
	test("testTransferMultisigCustomizedDidAfterCreate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();


		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());


		expect(resolved.isValid()).toBeTruthy()

		// new controllers for the did
		let td = testData.getInstantData();
		await td.getIssuerDocument();
		let u1 = await td.getUser1Document();
		let u2 = await td.getUser2Document();
		let u3 = await td.getUser3Document();
		let u4 = await td.getUser4Document();

		// transfer ticket
		let ticket = await ctrl1.createTransferTicket(did, TestConfig.storePass, u1.getSubject());
		ticket = await ctrl2.signWithTicket(ticket, TestConfig.storePass);
		expect(ticket.isValid()).toBeTruthy()

		doc = await u1.newCustomizedDidWithController(did, [u2.getSubject(), u3.getSubject(), u4.getSubject()],
			3, TestConfig.storePass, true);
		doc = await u2.signWithDocument(doc, TestConfig.storePass);
		doc = await u3.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(4);
		expect(doc.getMultiSignature().toString()).toEqual("3:4");

		// transfer
		await doc.publishWithTicket(ticket, doc.getSubject().toString(), TestConfig.storePass);

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()
	})
	test("testTransferMultisigCustomizedDidAfterUpdate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();

		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		doc = ctrl1.signWithDocument(doc, TestConfig.storePass);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
		expect(doc.getPublicKeyCount()).toBe(4);
		expect(doc.getAuthenticationKeyCount()).toBe(4)

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
		expect(ticket.isValid()).toBeTruthy()

		doc = await u1.newCustomizedDidWithController(did, [u2.getSubject(), u3.getSubject(), u4.getSubject()],
			3, TestConfig.storePass, true);
		doc = await u2.signWithDocument(doc, TestConfig.storePass);
		doc = await u3.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(4);
		expect(doc.getMultiSignature().toString()).toEqual("3:4");

		// transfer
		await doc.publishWithTicket(ticket, doc.getSubject().toString(), TestConfig.storePass);

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()
	})
	test("testUpdateDidWithoutPrevSignature", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setPreviousSignature(null);

		// Update again
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(3);
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testUpdateDidWithoutSignature", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setSignature(null);

		// Update again
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(3);
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		store.storeDid(doc);

		let d = doc;
		await expect(async () => {
			try {
				await d.publish(TestConfig.storePass);
				await DIDTestExtension.awaitStandardPublishingDelay();
				return ""
			} catch (error) {
				return error.toString()
			}
		}).toEqual(d.getSubject().toString())

	})
	test("testUpdateDidWithoutAllSignatures", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setPreviousSignature(null);
		doc.getMetadata().setSignature(null);

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		let d = doc;
		await expect(async () => {
			try {
				await d.publish(TestConfig.storePass);
				await DIDTestExtension.awaitStandardPublishingDelay();
				return ""
			} catch (error) {
				return error.toString()
			}
		}).toEqual(d.getSubject().toString())
	})
	test("testForceUpdateDidWithoutAllSignatures", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setPreviousSignature(null);
		doc.getMetadata().setSignature(null);

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass, doc.getDefaultPublicKeyId(), true);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testUpdateDidWithWrongPrevSignature", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setPreviousSignature("1234567890");

		// Update
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(3);
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testUpdateDidWithWrongSignature", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setSignature("1234567890");

		// Update
		db = DIDDocumentBuilder.newFromDocument(doc).edit();
		key = TestData.generateKeypair();
		db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(3);
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		store.storeDid(doc);

		let d = doc;
		await expect(async () => {
			try {
				await d.publish(TestConfig.storePass);
				await DIDTestExtension.awaitStandardPublishingDelay();
				return ""
			} catch (error) {
				return error.toString()
			}
		}).toEqual(d.getSubject().toString())
	})
	test("testForceUpdateDidWithWrongPrevSignature", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setPreviousSignature("1234567890");
		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass, doc.getDefaultPublicKeyId(), true);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testForceUpdateDidWithWrongSignature", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		doc.getMetadata().setSignature("1234567890");

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass, doc.getDefaultPublicKeyId(), true);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
	})
	test("testDeactivateSelfAfterCreate", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		await doc.deactivate(null, TestConfig.storePass);

		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateSelfAfterUpdate", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		await doc.deactivate(null, TestConfig.storePass);
		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateCustomizedDidAfterCreate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Deactivate
		await doc.deactivate(null, TestConfig.storePass);
		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateCustomizedDidAfterUpdate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Deactivate
		await doc.deactivate(null, TestConfig.storePass);
		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateCidAfterCreateByController", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());

		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());


		expect(resolved.isValid()).toBeTruthy()

		// Deactivate
		await controller.deactivateTargetDID(did, null, TestConfig.storePass);
		doc = await did.resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateCidAfterUpdateByController", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let controller = await identity.newDid(TestConfig.storePass);
		expect(controller.isValid()).toBeTruthy()

		let resolved = await controller.getSubject().resolve();
		expect(resolved).toBeNull()

		await controller.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await controller.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(controller.getProof().getSignature());


		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld");
		let doc = await controller.newCustomized(did, 1, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getController()).toEqual(controller.getSubject());

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getController()).toEqual(controller.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());


		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		expect(doc.getPublicKeyCount()).toBe(2);
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		// Deactivate
		await controller.deactivateTargetDID(did, null, TestConfig.storePass);
		doc = await did.resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateMultisigCustomizedDidAfterCreate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();

		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Deactivate
		await doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass);
		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateMultisigCustomizedDidAfterUpdate", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();

		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());


		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		doc = ctrl1.signWithDocument(doc, TestConfig.storePass);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
		expect(doc.getPublicKeyCount()).toBe(4);
		expect(doc.getAuthenticationKeyCount()).toBe(4)

		// Deactivate
		await doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass);
		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateMultisigCidAfterCreateByController", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();

		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Deactivate
		await ctrl1.deactivateTargetDID(did, null, TestConfig.storePass);
		doc = await did.resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateMultisigCidAfterUpdateByController", async () => {
		let identity = testData.getRootIdentity();

		// Create normal DID first
		let ctrl1 = await identity.newDid(TestConfig.storePass);
		expect(ctrl1.isValid()).toBeTruthy()
		await ctrl1.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await ctrl1.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl1.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl1.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl2 = await identity.newDid(TestConfig.storePass);
		expect(ctrl2.isValid()).toBeTruthy()
		await ctrl2.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl2.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl2.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl2.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		let ctrl3 = await identity.newDid(TestConfig.storePass);
		expect(ctrl3.isValid()).toBeTruthy()
		await ctrl3.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await ctrl3.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(ctrl3.getSubject())
		expect(resolved.getProof().getSignature()).toEqual(ctrl3.getProof().getSignature())
		expect(resolved.isValid()).toBeTruthy()

		// Create customized DID
		let did = new DID("did:elastos:helloworld3");
		let doc = await ctrl1.newCustomizedDidWithController(did, [ctrl2.getSubject(), ctrl3.getSubject()],
			2, TestConfig.storePass);
		expect(doc.isValid()).toBeFalsy()

		const d = doc;
		expect(() => { ctrl1.signWithDocument(d, TestConfig.storePass); }).toThrowError();

		doc = ctrl2.signWithDocument(doc, TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		expect(doc.getSubject()).toEqual(did);
		expect(doc.getControllerCount()).toBe(3);

		let ctrls = new Array<DID>();
		ctrls.push(ctrl1.getSubject());
		ctrls.push(ctrl2.getSubject());
		ctrls.push(ctrl3.getSubject());
		ctrls.sort()

		expect(ctrls).toEqual(doc.getControllers())

		resolved = await did.resolve();
		expect(resolved).toBeNull()

		doc.setEffectiveController(ctrl1.getSubject());
		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await did.resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.getSubject()).toEqual(did)
		expect(resolved.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(resolved.isValid()).toBeTruthy()

		// Update
		let db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
		let key = TestData.generateKeypair();
		db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
		doc = db.seal(TestConfig.storePass);
		doc = ctrl1.signWithDocument(doc, TestConfig.storePass);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())
		expect(doc.getPublicKeyCount()).toBe(4);
		expect(doc.getAuthenticationKeyCount()).toBe(4)

		// Deactivate
		await ctrl2.deactivateTargetDID(did, null, TestConfig.storePass);
		doc = await did.resolve();
		expect(doc.isDeactivated()).toBeTruthy()
	})
	test("testDeactivateWithAuthorization1", async () => {
		let identity = testData.getRootIdentity();

		let doc = await identity.newDid(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		let target = await identity.newDid(TestConfig.storePass);
		let db = DIDDocumentBuilder.newFromDocument(target).edit();
		await db.authorizationDid(new DIDURL("#recovery"), doc.getSubject(), null);
		target = db.seal(TestConfig.storePass);
		expect(target).not.toBeNull()
		expect(target.getAuthorizationKeyCount()).toBe(1)
		expect(target.getAuthorizationKeys()[0].getController()).toEqual(doc.getSubject())
		store.storeDid(target);

		await target.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await target.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(target.toString())

		await doc.deactivate(DIDURL.fromDID(target.getSubject()), TestConfig.storePass);
		target = await target.getSubject().resolve();
		expect(target.isDeactivated()).toBeTruthy()

		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeFalsy()
	})
	test("testDeactivateWithAuthorization2", async () => {
		let identity = testData.getRootIdentity();
		let doc = await identity.newDid(TestConfig.storePass);
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		let id = DIDURL.from("#key-2", doc.getSubject());

		db.addAuthenticationKey(id, key.getPublicKeyBase58());
		store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
		doc = db.seal(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		let target = await identity.newDid(TestConfig.storePass);
		db = DIDDocumentBuilder.newFromDocument(target).edit();
		db.addAuthorizationKey("#recovery", doc.getSubject().toString(), key.getPublicKeyBase58());
		target = db.seal(TestConfig.storePass);
		expect(target).not.toBeNull()
		expect(target.getAuthorizationKeyCount()).toBe(1)
		expect(target.getAuthorizationKeys()[0].getController()).toEqual(doc.getSubject())
		store.storeDid(target);

		await target.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await target.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(target.toString())

		await doc.deactivate(DIDURL.fromDID(target.getSubject()), TestConfig.storePass);
		target = await target.getSubject().resolve();
		expect(target.isDeactivated()).toBeTruthy()

		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeFalsy()
	})

	test("testDeactivateWithAuthorization3", async () => {
		let identity = testData.getRootIdentity();
		let doc = await identity.newDid(TestConfig.storePass);
		let db = DIDDocumentBuilder.newFromDocument(doc).edit();
		let key = TestData.generateKeypair();
		let id = DIDURL.from("#key-2", doc.getSubject());
		db.addAuthenticationKey(id, key.getPublicKeyBase58());
		store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
		doc = db.seal(TestConfig.storePass);
		expect(doc.isValid()).toBeTruthy()
		expect(doc.getAuthenticationKeyCount()).toBe(2);
		store.storeDid(doc);

		await doc.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		let resolved = await doc.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(doc.toString())

		let target = await identity.newDid(TestConfig.storePass);
		db = DIDDocumentBuilder.newFromDocument(target).edit();
		db.addAuthorizationKey("#recovery", doc.getSubject().toString(),
			key.getPublicKeyBase58());
		target = db.seal(TestConfig.storePass);
		expect(target).not.toBeNull()
		expect(target.getAuthorizationKeyCount()).toBe(1)
		expect(target.getAuthorizationKeys()[0].getController()).toEqual(doc.getSubject())
		store.storeDid(target);

		await target.publish(TestConfig.storePass);
		await DIDTestExtension.awaitStandardPublishingDelay();

		resolved = await target.getSubject().resolve();
		expect(resolved).not.toBeNull()
		expect(resolved.toString()).toEqual(target.toString())

		await doc.deactivate(DIDURL.fromDID(target.getSubject()), TestConfig.storePass);
		target = await target.getSubject().resolve();
		expect(target.isDeactivated()).toBeTruthy()

		doc = await doc.getSubject().resolve();
		expect(doc.isDeactivated()).toBeFalsy()
	});
});