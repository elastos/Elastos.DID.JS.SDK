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
	runningInBrowser,
	DID,
	DIDDocumentBuilder
} from "@elastosfoundation/did-js-sdk";
import {
	TestData,
	CompatibleData
} from "./utils/testdata";
import {
	assertEquals,
	assertTrue,
	assertNotNull,
	assertArrayEquals,
	assertNull
} from "./utils/utils";
import { TestConfig } from "./utils/testconfig";

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
	expect(DIDURL.newWithDID(doc.getSubject(), "#primary")).toEqual(pk.getId());

	let id:DIDURL  = DIDURL.newWithDID(doc.getSubject(), "#key2");
	pk = doc.getPublicKey(id);
	expect(pk).not.toBeNull();
	expect(pk.getId()).toEqual(id);

	id = doc.getDefaultPublicKeyId();
	expect(id).not.toBeNull();
	expect(DIDURL.newWithDID(doc.getSubject(), "#primary")).toEqual(id);

	// Key not exist, should fail.
	pk = doc.getPublicKey("#notExist");
	expect(pk).toBeNull();

	id = DIDURL.newWithDID(doc.getSubject(), "#notExist");
	pk = doc.getPublicKey(id);
	expect(pk).toBeNull();

	// Selector
	id = doc.getDefaultPublicKeyId();
	pks = doc.selectPublicKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
	expect(pks.length).toEqual(1);
	expect(DIDURL.newWithDID(doc.getSubject(), "#primary")).toEqual(pks[0].getId());

	pks = doc.selectPublicKeys(id, null);
	expect(pks.length).toEqual(1);
	expect(DIDURL.newWithDID(doc.getSubject(), "#primary")).toEqual(pks[0].getId());

	pks = doc.selectPublicKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
	expect(pks.length).toEqual(4);

	pks = doc.selectPublicKeys("#key2", Constants.DEFAULT_PUBLICKEY_TYPE);
	expect(pks.length).toEqual(1);
	expect(DIDURL.newWithDID(doc.getSubject(), "#key2")).toEqual(pks[0].getId());

	pks = doc.selectPublicKeys("#key3", null);
	expect(pks.length).toEqual(1);
	expect(DIDURL.newWithDID(doc.getSubject(), "#key3")).toEqual(pks[0].getId());
}

describe('DIDDocument Tests', () => {
	let testData:TestData;
	let store:DIDStore;
	beforeAll(async () => {
		testData = new TestData();
		store = testData.getStore();
	});

	afterAll(() => {
		testData.cleanup();
	});

	test('Test Get Public Key', () => {
		testGetPublicKey(1, testData);
		testGetPublicKey(2, testData);
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
		assertEquals(7, doc.getPublicKeyCount());

		let pks = doc.getPublicKeys();
		assertEquals(7, pks.length);

		let ids: DIDURL[] = [];
		for (let i = 0; i < pks.length; i++) {
			let pk:DIDDocumentPublicKey = pks[i];
			ids.push(pk.getId());
		}
		ids.sort((e1, e2) => {
			return e1.compareTo(e2);
		});

		let refs: DIDURL[] = [];
		refs.push(user1.getDefaultPublicKeyId());
		refs.push(user2.getDefaultPublicKeyId());
		refs.push(user3.getDefaultPublicKeyId());
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key2"));
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key3"));
		refs.push(DIDURL.newWithDID(doc.getSubject(), "#key2"));
		refs.push(DIDURL.newWithDID(doc.getSubject(), "#key3"));

		refs.sort((e1, e2) => {
			return e1.compareTo(e2);
		});

		assertArrayEquals(refs, ids);

		// PublicKey getter.
		let pk: DIDDocumentPublicKey = doc.getPublicKey("#primary");
		expect(pk).toBeNull();

		let id: DIDURL = DIDURL.newWithDID(user1.getSubject(), "#primary");
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(user1.getSubject(), "#key2");
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(doc.getSubject(), "#key2");
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(doc.getSubject(), "#key3");
		pk = doc.getPublicKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = doc.getDefaultPublicKeyId();
		assertNull(id);

		// Key not exist, should fail.
		pk = doc.getPublicKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.newWithDID(doc.getController(), "#notExist");
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

		pks = doc.selectPublicKeys(DIDURL.newWithDID(user1.getSubject(), "#key2"),
				Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key2"));

		pks = doc.selectPublicKeys(DIDURL.newWithDID(doc.getSubject(), "#key3"), null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key3"));
	});

	test('Test Get Public Key With Multi Controller Cid2', async ()=>{
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

		pks.forEach((pk) =>{
			ids.push(pk.getId());
		})


		ids.sort()

		let refs = new Array<DIDURL>(5);
		refs.push(user1.getDefaultPublicKeyId());
		refs.push(user2.getDefaultPublicKeyId());
		refs.push(user3.getDefaultPublicKeyId());
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key2"));
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key3"));

		refs.sort();

		expect(refs).toEqual(ids)

		// PublicKey getter.
		let pk = doc.getPublicKey("#primary");
		expect(pk).toBeNull();


		let id = DIDURL.newWithDID(user1.getSubject(), "#primary");
		pk = doc.getPublicKey(id);

		expect(pk).not.toBeNull()
		expect(id).toEqual(pk.getId())



		id = DIDURL.newWithDID(user1.getSubject(), "#key2");
		pk = doc.getPublicKey(id);

		expect(pk).not.toBeNull()
		expect(id).toEqual(pk.getId())

		id = doc.getDefaultPublicKeyId();
		expect(id).toBeNull()

		// Key not exist, should fail.
		pk = doc.getPublicKey("#notExist");
		expect(pk).toBeNull()

		id = DIDURL.newWithDID(user2.getSubject(), "#notExist");
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

		pks = doc.selectPublicKeys(DIDURL.newWithDID(user1.getSubject(), "#key2"),
				Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1);

		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key2"));

		pks = doc.selectPublicKeys(DIDURL.newWithDID(user1.getSubject(), "#key3"), null);
		expect(pks.length).toEqual(1);
		expect(DIDURL.newWithDID(user1.getSubject(), "#key3")).toEqual(pks[0].getId())
	})

	test("Test Add PublicKey", async ()=>{
		testData.getRootIdentity();

		let doc: DIDDocument = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add 2 public keys
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
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
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test1"))

		pk = doc.getPublicKey("#test2");
		expect(pk).not.toBeNull()
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test2"));


		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(6)
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		expect(doc.getAuthorizationKeyCount()).toBe(1)
	})

	test("Test Add PublicKey With Cid", async ()=>{
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
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
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
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test1"))

		pk = doc.getPublicKey("#test2");
		expect(pk).not.toBeNull()
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test2"))


		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(9)
		expect(doc.getAuthenticationKeyCount()).toBe(7)
		expect(doc.getAuthorizationKeyCount()).toBe(0)

	})

	test("Test Remove PublicKey", async ()=>{
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull()
		expect(doc.isValid()).toBeTruthy();

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// recovery used by authorization, should failed.
		let id = DIDURL.newWithDID(doc.getSubject(), "#recovery");
		expect(() =>{db.removePublicKey(id)}).toThrowError()

		// force remove public key, should success
		db.removePublicKey(id, true);
		db.removePublicKey("#key2", true);

		// Key not exist, should fail.
		expect(() =>{db.removePublicKey("#notExistKey", true);}).toThrowError()


		// Can not remove default publickey, should fail.
		let d = doc;
		expect(() =>{db.removePublicKey(d.getDefaultPublicKeyId(), true);}).toThrowError()


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

	test("Test Remove PublicKey With Cid", async ()=>{
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
		let key2 = DIDURL.newWithDID(user1.getSubject(), "#key2");
		expect(()=>{db.removePublicKey(key2);}).toThrowError()

		// key2 used by authentication, should failed.
		let id = DIDURL.newWithDID(doc.getSubject(), "#key2");
		expect(()=>{db.removePublicKey(id);}).toThrowError()

		// force remove public key, should success
		db.removePublicKey(id, true);

		db.removePublicKey("#key3", true);

		// Key not exist, should fail.
		expect(()=>{db.removePublicKey("#notExistKey", true);}).toThrowError()


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

	test("testGetAuthenticationKey", async ()=>{
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
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject()))

		let id = DIDURL.newWithDID(doc.getSubject(), "#key3");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.newWithDID(doc.getSubject(), "#notExist");
		pk = doc.getAuthenticationKey(id);
		expect(pk).toBeNull();

		// selector
		id = DIDURL.newWithDID(doc.getSubject(), "#key3");
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
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#key2"))

		pks = doc.selectAuthenticationKeys("#key2", null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#key2"))
	})

	test("testGetAuthenticationKeyWithCid", async ()=>{
		let cd = await testData.getCompatibleData(2);

		let issuer = await cd.getDocument("issuer");
		let doc = await cd.getDocument("examplecorp");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Count and list.
		expect(doc.getAuthenticationKeyCount()).toBe(1)

		let pks = doc.getAuthenticationKeys();
		expect(pks.length).toEqual(1)
		expect( pks[0].getId()).toEqual(issuer.getDefaultPublicKeyId())

		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).toBeNull();

		let id = DIDURL.newWithDID(doc.getController(), "#primary");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.newWithDID(doc.getController(), "#notExist");
		pk = doc.getAuthenticationKey(id);
		expect(pk).toBeNull();

		// Selector
		id = doc.getDefaultPublicKeyId();
		pks = doc.selectAuthenticationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(doc.getController(), "#primary"))

		pks = doc.selectPublicKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(doc.getController(), "#primary"))

		pks = doc.selectAuthenticationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
	})

	test("testGetAuthenticationKeyWithMultiControllerCid1", async ()=>{
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
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key2"));
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key3"));
		refs.push(DIDURL.newWithDID(doc.getSubject(), "#key2"));
		refs.push(DIDURL.newWithDID(doc.getSubject(), "#key3"));

		refs.sort()

		expect(refs).toEqual(ids)


		// PublicKey getter.
		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).toBeNull();

		let id = DIDURL.newWithDID(user1.getSubject(), "#primary");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(user1.getSubject(), "#key2");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(doc.getSubject(), "#key2");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(doc.getSubject(), "#key3");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.newWithDID(doc.getController(), "#notExist");
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

		pks = doc.selectAuthenticationKeys(DIDURL.newWithDID(user1.getSubject(), "#key2"),
				Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)

		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key2"));

		pks = doc.selectAuthenticationKeys(DIDURL.newWithDID(doc.getSubject(), "#key3"), null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key3"));
	})
	test("testGetAuthenticationKeyWithMultiControllerCid2", async ()=>{
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
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key2"));
		refs.push(DIDURL.newWithDID(user1.getSubject(), "#key3"));

		refs.sort()

		expect(refs).toEqual(ids)

		// PublicKey getter.
		let pk = doc.getAuthenticationKey("#primary");
		expect(pk).toBeNull();

		let id = DIDURL.newWithDID(user1.getSubject(), "#primary");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		id = DIDURL.newWithDID(user1.getSubject(), "#key2");
		pk = doc.getAuthenticationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthenticationKey("#notExist");
		expect(pk).toBeNull();

		id = DIDURL.newWithDID(user2.getSubject(), "#notExist");
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

		pks = doc.selectAuthenticationKeys(DIDURL.newWithDID(user1.getSubject(), "#key2"),
				Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key2"));

		pks = doc.selectAuthenticationKeys(DIDURL.newWithDID(user1.getSubject(), "#key3"), null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(DIDURL.newWithDID(user1.getSubject(), "#key3"));

	})
	test("testAddAuthenticationKey", async ()=>{
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add 2 public keys for test.
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
		let key = TestData.generateKeypair();
		db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

		key = TestData.generateKeypair();
		db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

		// Add by reference
		db.addExistingAuthenticationKey(DIDURL.newWithDID(doc.getSubject(), "#test1"));

		db.addExistingAuthenticationKey("#test2");

		// Add new keys
		key = TestData.generateKeypair();
		db.addAuthenticationKey(DIDURL.newWithDID(doc.getSubject(), "#test3"),
				key.getPublicKeyBase58());

		key = TestData.generateKeypair();
		db.addAuthenticationKey("#test4", key.getPublicKeyBase58());

		// Try to add a non existing key, should fail.
		expect(() =>{db.addExistingAuthenticationKey("#notExistKey");}).toThrowError()


		// Try to add a key not owned by self, should fail.
		expect(() =>{db.addExistingAuthenticationKey("#recovery");}).toThrowError()

		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getAuthenticationKey("#test1");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test1"));

		pk = doc.getAuthenticationKey("#test2");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test2"))

		pk = doc.getAuthenticationKey("#test3");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test3"))

		pk = doc.getAuthenticationKey("#test4");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test4"))

		// Check the final count.
		expect(doc.getPublicKeyCount()).toBe(8)
		expect(doc.getAuthenticationKeyCount()).toBe(7);
		expect(doc.getAuthorizationKeyCount()).toBe(1);
	})
	test("testAddAuthenticationKeyWithCid", async ()=>{
		let cd = testData.getCompatibleData(2);

		let user1 = await cd.getDocument("user1");
		await cd.getDocument("user2");
		let user3 = await cd.getDocument("user3");
		let doc = await cd.getDocument("foobar");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// Add 2 public keys for test.
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
		let key = TestData.generateKeypair();
		db.createAndAddPublicKey(id, key.getPublicKeyBase58(), db.getSubject());

		key = TestData.generateKeypair();
		db.createAndAddPublicKey("#test2", key.getPublicKeyBase58(), doc.getSubject().toString());

		// Add by reference
		db.addExistingAuthenticationKey(DIDURL.newWithDID(doc.getSubject(), "#test1"));

		db.addExistingAuthenticationKey("#test2");

		// Add new keys
		key = TestData.generateKeypair();
		db.addAuthenticationKey(DIDURL.newWithDID(doc.getSubject(), "#test3"),
				key.getPublicKeyBase58());

		key = TestData.generateKeypair();
		db.addAuthenticationKey("#test4", key.getPublicKeyBase58());

		// Try to add a controller's key, should fail.
		let key3 = DIDURL.newWithDID(user1.getSubject(), "#testkey");
		expect(()=>{db.addExistingAuthenticationKey(key3);}).toThrowError()

		// Try to add a non existing key, should fail.
		expect(()=>{db.addExistingAuthenticationKey("#notExistKey");}).toThrowError()

		// Try to add a key not owned by self, should fail.
		let recovery = DIDURL.newWithDID(user1.getSubject(), "#recovery");
		expect(()=>{db.addExistingAuthenticationKey(recovery);}).toThrowError()


		doc = db.seal(TestConfig.storePass);
		doc = user3.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let pk = doc.getAuthenticationKey("#test1");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test1"));

		pk = doc.getAuthenticationKey("#test2");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test2"))

		pk = doc.getAuthenticationKey("#test3");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test3"))

		pk = doc.getAuthenticationKey("#test4");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test4"))

		// Check the final count.

		expect(doc.getPublicKeyCount()).toBe(11);
		expect(doc.getAuthenticationKeyCount()).toBe(11);
		expect(doc.getAuthorizationKeyCount()).toBe(0);
	})
	test("testRemoveAuthenticationKey", async ()=>{
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add 2 public keys for test
		let key = TestData.generateKeypair();
		db.addAuthenticationKey(
				DIDURL.newWithDID(doc.getSubject(), "#test1"),
				key.getPublicKeyBase58());

		key = TestData.generateKeypair();
		db.addAuthenticationKey("#test2", key.getPublicKeyBase58());

		// Remote keys
		db.removeAuthenticationKey(DIDURL.newWithDID(doc.getSubject(), "#test1"))
			.removeAuthenticationKey("#test2")
			.removeAuthenticationKey("#key2");

		// Key not exist, should fail.
		expect(()=>{db.removeAuthenticationKey("#notExistKey");}).toThrowError();

		// Default publickey, can not remove, should fail.
		let id = doc.getDefaultPublicKeyId();
		expect(()=>{db.removeAuthenticationKey(id);}).toThrowError();


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
	test("testRemoveAuthenticationKeyWithCid", async ()=>{
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
		db.removeAuthenticationKey(DIDURL.newWithDID(doc.getSubject(), "#key2"))
			.removeAuthenticationKey("#key3");

		db.removePublicKey("#key3");

		// Key not exist, should fail.
		expect(()=>{db.removeAuthenticationKey("#notExistKey");}).toThrowError();


		// Remove controller's key, should fail.
		let key2 = DIDURL.newWithDID(user1.getSubject(), "#key2");
		expect(()=>{db.removeAuthenticationKey(key2);}).toThrowError();

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
	test("testGetAuthorizationKey", async ()=>{
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
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#recovery"));

		let id = DIDURL.newWithDID(doc.getSubject(), "#recovery");
		pk = doc.getAuthorizationKey(id);
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(id)

		// Key not exist, should fail.
		pk = doc.getAuthorizationKey("#notExistKey");
		expect(pk).toBeNull();

		id = DIDURL.newWithDID(doc.getSubject(), "#notExistKey");
		pk = doc.getAuthorizationKey(id);
		expect(pk).toBeNull();

		// Selector
		id = DIDURL.newWithDID(doc.getSubject(), "#recovery");
		pks = doc.selectAuthorizationKeys(id, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthorizationKeys(id, null);
		expect(pks.length).toEqual(1)
		expect(pks[0].getId()).toEqual(id)

		pks = doc.selectAuthorizationKeys(null, Constants.DEFAULT_PUBLICKEY_TYPE);
		expect(pks.length).toEqual(1)
	})
	test("testGetAuthorizationKeyWithCid", async ()=>{
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
	test("testAddAuthorizationKey", async ()=>{
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add 2 public keys for test.
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
		let key = TestData.generateKeypair();
		db.createAndAddPublicKey(id,
				key.getPublicKeyBase58(),
				new DID(DID.METHOD, key.getAddress()));

		key = TestData.generateKeypair();
		db.createAndAddPublicKey("#test2",
				key.getPublicKeyBase58(),
				new DID(DID.METHOD, key.getAddress()).toString());

		// Add by reference
		db.addExistingAuthorizationKey(DIDURL.newWithDID(doc.getSubject(), "#test1"));

		db.addExistingAuthorizationKey("#test2");

		// Add new keys
		key = TestData.generateKeypair();
		db.addAuthorizationKey(DIDURL.newWithDID(doc.getSubject(), "#test3"),
				new DID(DID.METHOD, key.getAddress()),
				key.getPublicKeyBase58());

		key = TestData.generateKeypair();
		db.addAuthorizationKey("#test4",
				new DID(DID.METHOD, key.getAddress()).toString(),
				key.getPublicKeyBase58());

		// Try to add a non existing key, should fail.
		expect(()=>{db.addExistingAuthorizationKey("#notExistKey");}).toThrowError();

		// Try to add key owned by self, should fail.
		expect(()=>{db.addExistingAuthorizationKey("#key2");}).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let pk = doc.getAuthorizationKey("#test1");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test1"));

		pk = doc.getAuthorizationKey("#test2");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test2"))

		pk = doc.getAuthorizationKey("#test3");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test3"))

		pk = doc.getAuthorizationKey("#test4");
		expect(pk).not.toBeNull();
		expect(pk.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#test4"))

		// Check the final key count.
		expect(doc.getPublicKeyCount()).toBe(8)
		expect(doc.getAuthenticationKeyCount()).toBe(3)
		expect(doc.getAuthorizationKeyCount()).toBe(5)
	})
	test("testAddAuthorizationKeyWithCid", async ()=>{
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
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
		let key = TestData.generateKeypair();
		db.createAndAddPublicKey(id,
				key.getPublicKeyBase58(),
				new DID(DID.METHOD, key.getAddress()));

		key = TestData.generateKeypair();
		db.createAndAddPublicKey("#test2",
				key.getPublicKeyBase58(),
				new DID(DID.METHOD, key.getAddress()).toString());

		expect(()=>{db.addExistingAuthorizationKey(DIDURL.newWithDID(did, "#test1"));}).toThrowError()

		expect(()=>{db.addExistingAuthorizationKey("#test2");}).toThrowError()

		// Try to add a non existing key, should fail.
		expect(()=>{db.addExistingAuthorizationKey("#notExistKey");}).toThrowError()


		// Try to add controller's, should fail.
		let recovery = DIDURL.newWithDID(user1.getSubject(), "#recovery");
		expect(()=>{db.addExistingAuthorizationKey(recovery);}).toThrowError()


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
	test("testRemoveAuthorizationKey", async ()=>{
		testData.getRootIdentity();

		let doc = await testData.getCompatibleData(2).getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add 2 keys for test.
		let id = DIDURL.newWithDID(db.getSubject(), "#test1");
		let key = TestData.generateKeypair();
		db.addAuthorizationKey(id,
				new DID(DID.METHOD, key.getAddress()),
				key.getPublicKeyBase58());

		key = TestData.generateKeypair();
		db.addAuthorizationKey("#test2",
				new DID(DID.METHOD, key.getAddress()).toString(),
				key.getPublicKeyBase58());

		// Remove keys.
		db.removeAuthorizationKey(DIDURL.newWithDID(doc.getSubject(), "#test1"))
			.removeAuthorizationKey("#recovery");

		// Key not exist, should fail.
		expect(()=>{db.removeAuthorizationKey("#notExistKey");}).toThrowError()


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
	test("testGetCredential", async ()=>{
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
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vc = doc.getCredential(DIDURL.newWithDID(doc.getSubject(), "#email"));
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#email"));

		// Credential not exist.
		vc = doc.getCredential("#notExistVc");
		expect(vc).toBeNull();

		// Credential selector.
		vcs = doc.selectCredentials(DIDURL.newWithDID(doc.getSubject(), "#profile"),
				"SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));


		vcs = doc.selectCredentials(DIDURL.newWithDID(doc.getSubject(), "#profile"), null);
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vcs = doc.selectCredentials(null, "SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vcs = doc.selectCredentials(null, "TestingCredential");
		expect(vcs.length).toBe(0);
	})

	test("testGetCredentialWithCid", async ()=>{
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
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vc = doc.getCredential(DIDURL.newWithDID(doc.getSubject(), "#email"));
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#email"));

		// Credential not exist.
		vc = doc.getCredential("#notExistVc");
		expect(vc).toBeNull();

		// Credential selector.
		vcs = doc.selectCredentials(DIDURL.newWithDID(doc.getSubject(), "#profile"),
				"SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vcs = doc.selectCredentials(DIDURL.newWithDID(doc.getSubject(), "#profile"), null);
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vcs = doc.selectCredentials(null, "SelfProclaimedCredential");
		expect(vcs.length).toBe(1);
		expect(vcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#profile"));

		vcs = doc.selectCredentials(null, "TestingCredential");
		expect(vcs.length).toBe(0);
	})
	test("testAddCredential", async ()=>{
		let cd = testData.getCompatibleData(2);

		testData.getRootIdentity();

		let doc = await cd.getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add credentials.
		let vc = cd.getCredential("user1", "passport");
		db.addCredential(vc);

		vc = cd.getCredential("user1", "twitter");
		db.addCredential(vc);

		let fvc = vc;
		// Credential already exist, should fail.
		expect(()=>{db.addCredential(fvc);}).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check new added credential.
		vc = doc.getCredential("#passport");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#passport"));

		let id = DIDURL.newWithDID(doc.getSubject(), "#twitter");
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);

		// Should contains 3 credentials.
		expect(doc.getCredentialCount()).toBe(4);
	})
	test("testAddCredentialWithCid", async ()=>{
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
		let vc = cd.getCredential("foobar", "license");
		db.addCredential(vc);

		vc = cd.getCredential("foobar", "services");
		db.addCredential(vc);

		let fvc = vc;
		// Credential already exist, should fail.
		expect(()=>{db.addCredential(fvc);}).toThrowError();


		// Credential not belongs to current did, should fail.
		expect(()=>{db.addCredential(cd.getCredential("user1", "passport"));}).toThrowError();


		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check new added credential.
		vc = doc.getCredential("#license");
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#license"));
		assertEquals(DIDURL.newWithDID(doc.getSubject(), "#license"), vc.getId());

		let id = DIDURL.newWithDID(doc.getSubject(), "#services");
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);

		expect(doc.getCredentialCount()).toBe(4);
	})
	test("testAddSelfClaimedCredential", async ()=>{
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
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#passport"));
		expect(vc.isSelfProclaimed()).toBeTruthy();

		let id = DIDURL.newWithDID(doc.getSubject(), "#name");
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();

		id = DIDURL.newWithDID(doc.getSubject(), "#twitter");
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();
		expect(doc.getCredentialCount()).toBe(5);
	})
	test("testAddSelfClaimedCredentialWithCid", async ()=>{
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
		expect(vc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#testvc"));
		expect(vc.isSelfProclaimed()).toBeTruthy();

		let id = DIDURL.newWithDID(doc.getSubject(), "#name");
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();

		id = DIDURL.newWithDID(doc.getSubject(), "#twitter");
		vc = doc.getCredential(id);
		expect(vc).not.toBeNull();
		expect(vc.getId()).toEqual(id);
		expect(vc.isSelfProclaimed()).toBeTruthy();

		expect(doc.getCredentialCount()).toBe(5);
	})
	test("testRemoveCredential", async ()=>{
		testData.getRootIdentity();
    	let cd = testData.getCompatibleData(2);

		let doc = await cd.getDocument("user1");
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// Add test credentials.
		let vc = cd.getCredential("user1", "passport");
		db.addCredential(vc);

		vc = cd.getCredential("user1", "twitter");
		db.addCredential(vc);

		// Remove credentials
		db.removeCredential("#profile");

		db.removeCredential(DIDURL.newWithDID(doc.getSubject(), "#twitter"));

		// Credential not exist, should fail.
		expect(()=>{db.removeCredential("#notExistCredential");}).toThrowError();


		let did = doc.getSubject();
		expect(()=>{db.removeCredential(DIDURL.newWithDID(did, "#notExistCredential"));}).toThrowError();


		doc = db.seal(TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		vc = doc.getCredential("#profile");
		expect(vc).toBeNull();

		vc = doc.getCredential(DIDURL.newWithDID(doc.getSubject(), "#twitter"));
		expect(vc).toBeNull();

		// Check the final count.
		expect(doc.getCredentialCount()).toBe(2);
	})
	test("testRemoveCredentialWithCid", async ()=>{
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

		db.removeCredential(DIDURL.newWithDID(doc.getSubject(), "#email"));

		// Credential not exist, should fail.
		expect(()=>{db.removeCredential("#notExistCredential");}).toThrowError();


		let did = doc.getSubject();
		expect(()=>{db.removeCredential(DIDURL.newWithDID(did, "#notExistCredential"));}).toThrowError();

		doc = db.seal(TestConfig.storePass);
		doc = user2.signWithDocument(doc, TestConfig.storePass);
		expect(doc).not.toBeNull();
		expect(doc.isValid()).toBeTruthy()

		// Check existence
		let vc = doc.getCredential("#profile");
		expect(vc).toBeNull();

		vc = doc.getCredential(DIDURL.newWithDID(doc.getSubject(), "#email"));
		expect(vc).toBeNull();

		// Check the final count.
		expect(doc.getCredentialCount()).toBe(0);
	})
	test("testGetService", async ()=>{
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
			    || svc.getId().getFragment() == "carrier" ).toBeTruthy()
		});


		// Service getter, should success.
		let svc = doc.getService("#openid");
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(doc.getSubject())
		expect(svc.getType()).toEqual("OpenIdConnectVersion1.0Service")
		expect(svc.getServiceEndpoint()).toEqual("https://openid.example.com/")


		let props = svc.getProperties();
		expect(Object.keys(props).length === 0).toBeTruthy()

		svc = doc.getService(DIDURL.newWithDID(doc.getSubject(), "#vcr"));
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#vcr"))
		props = svc.getProperties();
		expect(Object.keys(props).length === 0).toBeTruthy()

		// Service not exist, should fail.
		svc = doc.getService("#notExistService");
		expect(svc).toBeNull();

		// Service selector.
		svcs = doc.selectServices("#vcr", "CredentialRepositoryService");
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#vcr"))

		svcs = doc.selectServices(DIDURL.newWithDID(doc.getSubject(), "#openid"), null);
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#openid"))


		svcs = doc.selectServices(null, "CarrierAddress");
		expect(svcs.length).toBe(1);
		expect(svcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#carrier"))

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
	test("testGetServiceWithCid", async ()=>{

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
			    || svc.getId().getFragment() == "vcr" ).toBeTruthy()
		});



		// Service getter, should success.
		let svc = doc.getService("#vault");
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#vault"))
		expect(svc.getType()).toEqual("Hive.Vault.Service")
		expect(svc.getServiceEndpoint()).toEqual("https://foobar.com/vault")

		let props = svc.getProperties();
		expect(Object.keys(props).length === 0).toBeTruthy()

		svc = doc.getService(DIDURL.newWithDID(doc.getSubject(), "#vcr"));
		expect(svc).not.toBeNull();
		expect(svc.getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#vcr"))
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
		expect(svcs[0].getId()).toEqual(DIDURL.newWithDID(doc.getSubject(), "#vcr"))

		svcs = doc.selectServices(DIDURL.newWithDID(doc.getSubject(), "#openid"), null);
		expect(svcs.length).toBe(0);

		// Service not exist, should return a empty list.
		svcs = doc.selectServices("#notExistService", "CredentialRepositoryService");
		expect(svcs.length).toBe(0);

		svcs = doc.selectServices(null, "notExistType");
		expect(svcs.length).toBe(0);
	})
	test("testAddService", ()=>{
		// testData.getRootIdentity();

		// let doc = testData.getCompatibleData(2).getDocument("user1");
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// // Add services
		// db.addService("#test-svc-1", "Service.Testing",
		// 		"https://www.elastos.org/testing1");

		// db.addService(DIDURL.newWithDID(doc.getSubject(), "#test-svc-2"),
		// 		"Service.Testing", "https://www.elastos.org/testing2");

		// // Service id already exist, should failed.
		// assertThrows(DIDObjectAlreadyExistException.class, () -> {
		// 	db.addService("#vcr", "test", "https://www.elastos.org/test");
		// });

		// doc = db.seal(TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// // Check the final count
		// assertEquals(5, doc.getServiceCount());

		// // Try to select new added 2 services
		// List<Service> svcs = doc.selectServices(null, "Service.Testing");
		// expect(svcs.length).toBe(2);
		// assertEquals("Service.Testing", svcs[0].getType());
		// assertEquals("Service.Testing", svcs[1].getType());
	})
	test("testAddServiceWithDescription", ()=>{
		// testData.getRootIdentity();

		// Map<String, Object> map = new HashMap<String, Object>();
		// map.put("abc", "helloworld");
		// map.put("foo", 123);
		// map.put("bar", "foobar");
		// map.put("foobar", "lalala...");
		// map.put("date", Calendar.getInstance().getTime());
		// map.put("ABC", "Helloworld");
		// map.put("FOO", 678);
		// map.put("BAR", "Foobar");
		// map.put("FOOBAR", "Lalala...");
		// map.put("DATE", Calendar.getInstance().getTime());

		// Map<String, Object> props = new HashMap<String, Object>();
		// props.put("abc", "helloworld");
		// props.put("foo", 123);
		// props.put("bar", "foobar");
		// props.put("foobar", "lalala...");
		// props.put("date", Calendar.getInstance().getTime());
		// props.put("map", map);
		// props.put("ABC", "Helloworld");
		// props.put("FOO", 678);
		// props.put("BAR", "Foobar");
		// props.put("FOOBAR", "Lalala...");
		// props.put("DATE", Calendar.getInstance().getTime());
		// props.put("MAP", map);

		// let doc = testData.getCompatibleData(2).getDocument("user1");
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// // Add services
		// db.addService("#test-svc-1", "Service.Testing",
		// 		"https://www.elastos.org/testing1", props);

		// db.addService(DIDURL.newWithDID(doc.getSubject(), "#test-svc-2"),
		// 		"Service.Testing", "https://www.elastos.org/testing2", props);

		// db.addService(DIDURL.newWithDID(doc.getSubject(), "#test-svc-3"),
		// 		"Service.Testing", "https://www.elastos.org/testing3");

		// // Service id already exist, should failed.
		// assertThrows(DIDObjectAlreadyExistException.class, () -> {
		// 	db.addService("#vcr", "test", "https://www.elastos.org/test", props);
		// });

		// doc = db.seal(TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// // Check the final count
		// assertEquals(6, doc.getServiceCount());

		// // Try to select new added 2 services
		// List<Service> svcs = doc.selectServices(null, "Service.Testing");
		// expect(svcs.length).toBe(3);
		// assertEquals("Service.Testing", svcs[0].getType());
		// assertTrue(!svcs[0].getProperties().isEmpty());
		// assertEquals("Service.Testing", svcs[1].getType());
		// assertTrue(!svcs[1].getProperties().isEmpty());
		// assertEquals("Service.Testing", svcs.get(2).getType());
		// assertTrue(svcs.get(2).getProperties().isEmpty());
	})
	test("testAddServiceWithCid", ()=>{
		// let cd = testData.getCompatibleData(2);
		// testData.getRootIdentity();

		// cd.getDocument("issuer");
		// let user1 = cd.getDocument("user1");
		// cd.getDocument("user2");
		// let user3 = cd.getDocument("user3");
		// cd.getDocument("examplecorp");

		// let doc = cd.getDocument("foobar");
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// DIDDocumentBuilder db = DIDDocumentBuilder.newFromDocument(doc).edit(user3);

		// // Add services
		// db.addService("#test-svc-1", "Service.Testing",
		// 		"https://www.elastos.org/testing1");

		// db.addService(DIDURL.newWithDID(doc.getSubject(), "#test-svc-2"),
		// 		"Service.Testing", "https://www.elastos.org/testing2");

		// // Service id already exist, should failed.
		// assertThrows(DIDObjectAlreadyExistException.class, () -> {
		// 	db.addService("#vcr", "test", "https://www.elastos.org/test");
		// });

		// doc = db.seal(TestConfig.storePass);
		// doc = user1.sign(doc, TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// // Check the final count
		// assertEquals(4, doc.getServiceCount());

		// // Try to select new added 2 services
		// List<Service> svcs = doc.selectServices(null, "Service.Testing");
		// expect(svcs.length).toBe(2);
		// assertEquals("Service.Testing", svcs[0].getType());
		// assertEquals("Service.Testing", svcs[1].getType());
	})
	test("testAddServiceWithCidAndDescription", ()=>{
		// let cd = testData.getCompatibleData(2);
		// testData.getRootIdentity();

		// cd.getDocument("issuer");
		// let user1 = cd.getDocument("user1");
		// cd.getDocument("user2");
		// let user3 = cd.getDocument("user3");
		// cd.getDocument("examplecorp");

		// let doc = cd.getDocument("foobar");
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// DIDDocumentBuilder db = DIDDocumentBuilder.newFromDocument(doc).edit(user3);

		// Map<String, Object> map = new HashMap<String, Object>();
		// map.put("abc", "helloworld");
		// map.put("foo", 123);
		// map.put("bar", "foobar");
		// map.put("foobar", "lalala...");
		// map.put("date", Calendar.getInstance().getTime());
		// map.put("ABC", "Helloworld");
		// map.put("FOO", 678);
		// map.put("BAR", "Foobar");
		// map.put("FOOBAR", "Lalala...");
		// map.put("DATE", Calendar.getInstance().getTime());

		// Map<String, Object> props = new HashMap<String, Object>();
		// props.put("abc", "helloworld");
		// props.put("foo", 123);
		// props.put("bar", "foobar");
		// props.put("foobar", "lalala...");
		// props.put("date", Calendar.getInstance().getTime());
		// props.put("map", map);
		// props.put("ABC", "Helloworld");
		// props.put("FOO", 678);
		// props.put("BAR", "Foobar");
		// props.put("FOOBAR", "Lalala...");
		// props.put("DATE", Calendar.getInstance().getTime());
		// props.put("MAP", map);

		// // Add services
		// db.addService("#test-svc-1", "Service.Testing",
		// 		"https://www.elastos.org/testing1", props);

		// db.addService(DIDURL.newWithDID(doc.getSubject(), "#test-svc-2"),
		// 		"Service.Testing", "https://www.elastos.org/testing2", props);

		// db.addService(DIDURL.newWithDID(doc.getSubject(), "#test-svc-3"),
		// 		"Service.Testing", "https://www.elastos.org/testing3");

		// // Service id already exist, should failed.
		// assertThrows(DIDObjectAlreadyExistException.class, () -> {
		// 	db.addService("#vcr", "test", "https://www.elastos.org/test", props);
		// });

		// doc = db.seal(TestConfig.storePass);
		// doc = user1.sign(doc, TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// // Check the final count
		// assertEquals(5, doc.getServiceCount());

		// // Try to select new added 2 services
		// List<Service> svcs = doc.selectServices(null, "Service.Testing");
		// expect(svcs.length).toBe(3);
		// assertEquals("Service.Testing", svcs[0].getType());
		// assertTrue(!svcs[0].getProperties().isEmpty());
		// assertEquals("Service.Testing", svcs[1].getType());
		// assertTrue(!svcs[1].getProperties().isEmpty());
		// assertEquals("Service.Testing", svcs.get(2).getType());
		// assertTrue(svcs.get(2).getProperties().isEmpty());
	})
	test("testRemoveService", ()=>{
		// testData.getRootIdentity();

		// let doc = testData.getCompatibleData(2).getDocument("user1");
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// let db = DIDDocumentBuilder.newFromDocument(doc).edit();

		// // remove services
		// db.removeService("#openid");

		// db.removeService(DIDURL.newWithDID(doc.getSubject(), "#vcr"));

		// // Service not exist, should fail.
		// assertThrows(DIDObjectNotExistException.class, () -> {
		// 	db.removeService("#notExistService");
		// });

		// doc = db.seal(TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// let svc = doc.getService("#openid");
		// expect(svc).toBeNull();

		// svc = doc.getService(DIDURL.newWithDID(doc.getSubject(), "#vcr"));
		// expect(svc).toBeNull();

		// // Check the final count
		// assertEquals(1, doc.getServiceCount());
	})
	test("testRemoveServiceWithCid", ()=>{
		// let cd = testData.getCompatibleData(2);
		// testData.getRootIdentity();

		// cd.getDocument("issuer");
		// let user1 = cd.getDocument("user1");
		// cd.getDocument("user2");
		// let user3 = cd.getDocument("user3");
		// cd.getDocument("examplecorp");

		// let doc = cd.getDocument("foobar");
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// let db = DIDDocumentBuilder.newFromDocument(doc).edit(user1);

		// // remove services
		// db.removeService("#vault");

		// db.removeService(DIDURL.newWithDID(doc.getSubject(), "#vcr"));

		// // Service not exist, should fail.
		// assertThrows(DIDObjectNotExistException.class, () -> {
		// 	db.removeService("#notExistService");
		// });

		// doc = db.seal(TestConfig.storePass);
		// doc = user3.sign(doc, TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// let svc = doc.getService("#openid");
		// expect(svc).toBeNull();

		// svc = doc.getService(DIDURL.newWithDID(doc.getSubject(), "#vcr"));
		// expect(svc).toBeNull();

		// // Check the final count
		// assertEquals(0, doc.getServiceCount());

	})

	test.each([
	"examplecorp",
	"foobar",
	"foo",
	"bar",
	"baz"])("testParseAndSerializeDocument", (did)=>{
		// let version = 2;
		// let cd = testData.getCompatibleData(version);
    	// cd.loadAll();

    	// let compactJson = cd.getDocumentJson(did, "compact");
		// let compact = DIDDocumentparse(compactJson);
		// assertNotNull(compact);
		// assertTrue(compact.isValid());

	   	// let normalizedJson = cd.getDocumentJson(did, "normalized");
		// let normalized = DIDDocumentparse(normalizedJson);
		// assertNotNull(normalized);
		// assertTrue(normalized.isValid());

		// let doc = cd.getDocument(did);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// assertEquals(normalizedJson, compact.toString(true));
		// assertEquals(normalizedJson, normalized.toString(true));
		// assertEquals(normalizedJson, doc.toString(true));

		// // Don't check the compact mode for the old versions
		// if (cd.isLatestVersion()) {
		// 	assertEquals(compactJson, compact.toString(false));
		// 	assertEquals(compactJson, normalized.toString(false));
		// 	assertEquals(compactJson, doc.toString(false));
		// }
	})

	test("testSignAndVerify", ()=>{
		// RootIdentity identity = testData.getRootIdentity();
		// DIDDocument doc = identity.newDid(TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// byte[] data = new byte[1024];
		// DIDURL pkid = DIDURL.newWithDID(doc.getSubject(), "#primary");

		// for (int i = 0; i < 10; i++) {
		// 	Arrays.fill(data, (byte) i);

		// 	String sig = doc.sign(pkid, TestConfig.storePass, data);
		// 	boolean result = doc.verify(pkid, sig, data);
		// 	assertTrue(result);

		// 	data[0] = 0xF;
		// 	result = doc.verify(pkid, sig, data);
		// 	assertFalse(result);

		// 	sig = doc.sign(TestConfig.storePass, data);
		// 	result = doc.verify(sig, data);
		// 	assertTrue(result);

		// 	data[0] = (byte) i;
		// 	result = doc.verify(sig, data);
		// 	assertFalse(result);
		// }
	})
	test("testDerive", ()=>{
		// RootIdentity identity = testData.getRootIdentity();
		// DIDDocument doc = identity.newDid(TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// for (int i = 0; i < 1000; i++) {
		// 	String strKey = doc.derive(i, TestConfig.storePass);
		// 	HDKey key = HDKey.deserializeBase58(strKey);

		// 	byte[] binKey = Base58.decode(strKey);
		// 	byte[] sk = Arrays.copyOfRange(binKey, 46, 78);

		// 	assertEquals(key.getPrivateKeyBytes().length, sk.length);
		// 	assertArrayEquals(key.getPrivateKeyBytes(), sk);
		// }
	})
	test("testDeriveFromIdentifier", ()=>{
		// String identifier = "org.elastos.did.test";

		// RootIdentity identity = testData.getRootIdentity();
		// DIDDocument doc = identity.newDid(TestConfig.storePass);
		// expect(doc).not.toBeNull();
		// expect(doc.isValid()).toBeTruthy()

		// for (int i = -100; i < 100; i++) {
		// 	String strKey = doc.derive(identifier, i, TestConfig.storePass);
		// 	HDKey key = HDKey.deserializeBase58(strKey);

		// 	byte[] binKey = Base58.decode(strKey);
		// 	byte[] sk = Arrays.copyOfRange(binKey, 46, 78);

		// 	assertEquals(key.getPrivateKeyBytes().length, sk.length);
		// 	assertArrayEquals(key.getPrivateKeyBytes(), sk);
		// }
	})
	test("testCreateCustomizedDid", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());
	})
	test("testCreateMultisigCustomizedDid", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());
	})
	test("testUpdateDid", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update again
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(3, doc.getPublicKeyCount());
    	// expect(doc.getAuthenticationKeyCount()).toBe(3)
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testUpdateCustomizedDid", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update again
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(3, doc.getPublicKeyCount());
    	// expect(doc.getAuthenticationKeyCount()).toBe(3)
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testUpdateMultisigCustomizedDid", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// DIDDocumentBuilder db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// doc = ctrl1.sign(doc, TestConfig.storePass);
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
    	// assertEquals(4, resolved.getPublicKeyCount());
    	// assertEquals(4, resolved.getAuthenticationKeyCount());

    	// // Update again
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl3);
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
    	// assertEquals(5, resolved.getPublicKeyCount());
    	// assertEquals(5, resolved.getAuthenticationKeyCount());
	})
	test("testTransferCustomizedDidAfterCreate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // create new controller
    	// DIDDocument newController = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// resolved = newController.getSubject().resolve();
    	// assertNull(resolved);

    	// newController.publish(TestConfig.storePass);

    	// resolved = newController.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(newController.getSubject(), resolved.getSubject());
    	// assertEquals(newController.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // create the transfer ticket
    	// doc.setEffectiveController(controller.getSubject());
    	// TransferTicket ticket = doc.createTransferTicket(newController.getSubject(), TestConfig.storePass);
    	// assertTrue(ticket.isValid());

    	// // create new document for customized DID
    	// doc = newController.newCustomizedDid(did, true, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(newController.getSubject(), doc.getController());

    	// // transfer
    	// doc.publish(ticket, TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(newController.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());
	})
	test("testTransferCustomizedDidAfterUpdate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // create new controller
    	// DIDDocument newController = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// resolved = newController.getSubject().resolve();
    	// assertNull(resolved);

    	// newController.publish(TestConfig.storePass);

    	// resolved = newController.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(newController.getSubject(), resolved.getSubject());
    	// assertEquals(newController.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // create the transfer ticket
    	// TransferTicket ticket = controller.createTransferTicket(did, newController.getSubject(), TestConfig.storePass);
    	// assertTrue(ticket.isValid());

    	// // create new document for customized DID
    	// doc = newController.newCustomizedDid(did, true, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(newController.getSubject(), doc.getController());

    	// // transfer
    	// doc.publish(ticket, TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(newController.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());
	})
	test("testTransferMultisigCustomizedDidAfterCreate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // new controllers for the did
    	// TestData.InstantData td = testData.getInstantData();
    	// td.getIssuerDocument();
    	// DIDDocument u1 = td.getUser1Document();
    	// DIDDocument u2 = td.getUser2Document();
    	// DIDDocument u3 = td.getUser3Document();
    	// DIDDocument u4 = td.getUser4Document();

    	// // transfer ticket
    	// TransferTicket ticket = ctrl1.createTransferTicket(did, u1.getSubject(), TestConfig.storePass);
    	// ticket = ctrl2.sign(ticket, TestConfig.storePass);
    	// assertTrue(ticket.isValid());

    	// doc = u1.newCustomizedDid(did, new DID[] {u2.getSubject(), u3.getSubject(), u4.getSubject()},
    	// 			3, true, TestConfig.storePass);
    	// doc = u2.sign(doc, TestConfig.storePass);
    	// doc = u3.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(4, doc.getControllerCount());
    	// assertEquals("3:4", doc.getMultiSignature().toString());

    	// // transfer
    	// doc.publish(ticket, TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);

    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());
	})
	test("testTransferMultisigCustomizedDidAfterUpdate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// DIDDocumentBuilder db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// doc = ctrl1.sign(doc, TestConfig.storePass);
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
    	// assertEquals(4, resolved.getPublicKeyCount());
    	// assertEquals(4, resolved.getAuthenticationKeyCount());

    	// // new controllers for the did
    	// TestData.InstantData td = testData.getInstantData();
    	// td.getIssuerDocument();
    	// DIDDocument u1 = td.getUser1Document();
    	// DIDDocument u2 = td.getUser2Document();
    	// DIDDocument u3 = td.getUser3Document();
    	// DIDDocument u4 = td.getUser4Document();

    	// // transfer ticket
    	// doc.setEffectiveController(ctrl1.getSubject());
    	// TransferTicket ticket = doc.createTransferTicket(u1.getSubject(), TestConfig.storePass);
    	// ticket = ctrl2.sign(ticket, TestConfig.storePass);
    	// assertTrue(ticket.isValid());

    	// doc = u1.newCustomizedDid(did, new DID[] {u2.getSubject(), u3.getSubject(), u4.getSubject()},
    	// 			3, true, TestConfig.storePass);
    	// doc = u2.sign(doc, TestConfig.storePass);
    	// doc = u3.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(4, doc.getControllerCount());
    	// assertEquals("3:4", doc.getMultiSignature().toString());

    	// // transfer
    	// doc.publish(ticket, TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);

    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());
	})
	test("testUpdateDidWithoutPrevSignature", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setPreviousSignature(null);

    	// // Update again
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(3, doc.getPublicKeyCount());
    	// expect(doc.getAuthenticationKeyCount()).toBe(3)
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testUpdateDidWithoutSignature", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setSignature(null);

    	// // Update again
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(3, doc.getPublicKeyCount());
    	// expect(doc.getAuthenticationKeyCount()).toBe(3)
    	// store.storeDid(doc);

    	// DIDDocument d = doc;
    	// Exception e = assertThrows(DIDNotUpToDateException.class, () -> {
    	// 	d.publish(TestConfig.storePass);
    	// });
    	// assertEquals(d.getSubject().toString(), e.getMessage());
	})
	test("testUpdateDidWithoutAllSignatures", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setPreviousSignature(null);
    	// doc.getMetadata().setSignature(null);

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// DIDDocument d = doc;
    	// Exception e = assertThrows(DIDNotUpToDateException.class, () -> {
    	// 	d.publish(TestConfig.storePass);
    	// });
    	// assertEquals(d.getSubject().toString(), e.getMessage());
	})
	test("testForceUpdateDidWithoutAllSignatures", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setPreviousSignature(null);
    	// doc.getMetadata().setSignature(null);

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(doc.getDefaultPublicKeyId(), true, TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testUpdateDidWithWrongPrevSignature", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

		// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setPreviousSignature("1234567890");

    	// // Update
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(3, doc.getPublicKeyCount());
    	// expect(doc.getAuthenticationKeyCount()).toBe(3)
    	// store.storeDid(doc);

		// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testUpdateDidWithWrongSignature", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

   		// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setSignature("1234567890");

    	// // Update
    	// db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key2", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(3, doc.getPublicKeyCount());
    	// expect(doc.getAuthenticationKeyCount()).toBe(3)
    	// store.storeDid(doc);

    	// DIDDocument d = doc;
    	// Exception e = assertThrows(DIDNotUpToDateException.class, () -> {
    	// 	d.publish(TestConfig.storePass);
    	// });
    	// assertEquals(d.getSubject().toString(), e.getMessage());
	})
	test("testForceUpdateDidWithWrongPrevSignature", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setPreviousSignature("1234567890");
    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(doc.getDefaultPublicKeyId(), true, TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testForceUpdateDidWithWrongSignature", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.getMetadata().setSignature("1234567890");

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(doc.getDefaultPublicKeyId(), true, TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
	})
	test("testDeactivateSelfAfterCreate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.deactivate(TestConfig.storePass);

    	// doc = doc.getSubject().resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateSelfAfterUpdate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// doc.deactivate(TestConfig.storePass);
    	// doc = doc.getSubject().resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateCustomizedDidAfterCreate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Deactivate
    	// doc.deactivate(TestConfig.storePass);
    	// doc = doc.getSubject().resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateCustomizedDidAfterUpdate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Deactivate
    	// doc.deactivate(TestConfig.storePass);
    	// doc = doc.getSubject().resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateCidAfterCreateByController", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Deactivate
    	// controller.deactivate(did, TestConfig.storePass);
    	// doc = did.resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateCidAfterUpdateByController", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument controller = identity.newDid(TestConfig.storePass);
    	// assertTrue(controller.isValid());

    	// DIDDocument resolved = controller.getSubject().resolve();
    	// assertNull(resolved);

    	// controller.publish(TestConfig.storePass);

    	// resolved = controller.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(controller.getSubject(), resolved.getSubject());
    	// assertEquals(controller.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld");
    	// DIDDocument doc = controller.newCustomizedDid(did, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(controller.getSubject(), doc.getController());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(controller.getSubject(), resolved.getController());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// assertEquals(2, doc.getPublicKeyCount());
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// // Deactivate
    	// controller.deactivate(did, TestConfig.storePass);
    	// doc = did.resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateMultisigCustomizedDidAfterCreate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Deactivate
    	// doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass);
    	// doc = doc.getSubject().resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateMultisigCustomizedDidAfterUpdate", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// DIDDocumentBuilder db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// doc = ctrl1.sign(doc, TestConfig.storePass);
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
    	// assertEquals(4, resolved.getPublicKeyCount());
    	// assertEquals(4, resolved.getAuthenticationKeyCount());

    	// // Deactivate
    	// doc.deactivate(ctrl1.getDefaultPublicKeyId(), TestConfig.storePass);
    	// doc = doc.getSubject().resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateMultisigCidAfterCreateByController", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Deactivate
    	// ctrl1.deactivate(did, TestConfig.storePass);
    	// doc = did.resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateMultisigCidAfterUpdateByController", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// // Create normal DID first
    	// DIDDocument ctrl1 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl1.isValid());
    	// ctrl1.publish(TestConfig.storePass);

    	// DIDDocument resolved = ctrl1.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl1.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl1.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl2 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl2.isValid());
    	// ctrl2.publish(TestConfig.storePass);

    	// resolved = ctrl2.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl2.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl2.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

       	// DIDDocument ctrl3 = identity.newDid(TestConfig.storePass);
    	// assertTrue(ctrl3.isValid());
    	// ctrl3.publish(TestConfig.storePass);

    	// resolved = ctrl3.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(ctrl3.getSubject(), resolved.getSubject());
    	// assertEquals(ctrl3.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Create customized DID
    	// DID did = new DID("did:elastos:helloworld3");
    	// DIDDocument doc = ctrl1.newCustomizedDid(did, new DID[] { ctrl2.getSubject(), ctrl3.getSubject() },
    	// 		2, TestConfig.storePass);
    	// assertFalse(doc.isValid());

    	// final DIDDocument d = doc;
    	// assertThrows(AlreadySignedException.class, () -> {
    	// 	ctrl1.sign(d, TestConfig.storePass);
    	// });

    	// doc = ctrl2.sign(doc, TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// assertEquals(did, doc.getSubject());
    	// assertEquals(3, doc.getControllerCount());
    	// List<DID> ctrls = new ArrayList<DID>();
    	// ctrls.add(ctrl1.getSubject());
    	// ctrls.add(ctrl2.getSubject());
    	// ctrls.add(ctrl3.getSubject());
    	// Collections.sort(ctrls);
    	// assertArrayEquals(doc.getControllers().toArray(), ctrls.toArray());

    	// resolved = did.resolve();
    	// assertNull(resolved);

    	// doc.setEffectiveController(ctrl1.getSubject());
    	// doc.publish(TestConfig.storePass);

    	// resolved = did.resolve();
    	// assertNotNull(resolved);
    	// assertEquals(did, resolved.getSubject());
    	// assertEquals(doc.getProof().getSignature(),
    	// 		resolved.getProof().getSignature());

    	// assertTrue(resolved.isValid());

    	// // Update
    	// DIDDocumentBuilder db = DIDDocumentBuilder.newFromDocument(doc).edit(ctrl2);
    	// let key = TestData.generateKeypair();
    	// db.addAuthenticationKey("#key1", key.getPublicKeyBase58());
    	// doc = db.seal(TestConfig.storePass);
    	// doc = ctrl1.sign(doc, TestConfig.storePass);
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());
    	// assertEquals(4, resolved.getPublicKeyCount());
    	// assertEquals(4, resolved.getAuthenticationKeyCount());

    	// // Deactivate
    	// ctrl2.deactivate(did, TestConfig.storePass);
    	// doc = did.resolve();
    	// assertTrue(doc.isDeactivated());
	})
	test("testDeactivateWithAuthorization1", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// DIDDocument target = identity.newDid(TestConfig.storePass);
    	// DIDDocumentBuilder db = target.edit();
    	// db.authorizationDid("#recovery", doc.getSubject().toString());
    	// target = db.seal(TestConfig.storePass);
    	// assertNotNull(target);
    	// assertEquals(1, target.getAuthorizationKeyCount());
    	// assertEquals(doc.getSubject(), target.getAuthorizationKeys()[0].getController());
    	// store.storeDid(target);

    	// target.publish(TestConfig.storePass);

    	// resolved = target.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(target.toString(), resolved.toString());

    	// doc.deactivate(target.getSubject(), TestConfig.storePass);
    	// target = target.getSubject().resolve();
    	// assertTrue(target.isDeactivated());

    	// doc = doc.getSubject().resolve();
    	// assertFalse(doc.isDeactivated());
	})
	test("testDeactivateWithAuthorization2", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// DIDURL id = DIDURL.newWithDID(doc.getSubject(), "#key-2");
    	// db.addAuthenticationKey(id, key.getPublicKeyBase58());
    	// store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
    	// doc = db.seal(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// DIDDocument target = identity.newDid(TestConfig.storePass);
    	// db = target.edit();
    	// db.addAuthorizationKey("#recovery", doc.getSubject().toString(),
    	// 		key.getPublicKeyBase58());
    	// target = db.seal(TestConfig.storePass);
    	// assertNotNull(target);
    	// assertEquals(1, target.getAuthorizationKeyCount());
    	// assertEquals(doc.getSubject(), target.getAuthorizationKeys()[0].getController());
    	// store.storeDid(target);

    	// target.publish(TestConfig.storePass);

    	// resolved = target.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(target.toString(), resolved.toString());

    	// doc.deactivate(target.getSubject(), id, TestConfig.storePass);
    	// target = target.getSubject().resolve();
    	// assertTrue(target.isDeactivated());

    	// doc = doc.getSubject().resolve();
    	// assertFalse(doc.isDeactivated());
	})
	test("testDeactivateWithAuthorization3", ()=>{
		// RootIdentity identity = testData.getRootIdentity();

    	// DIDDocument doc = identity.newDid(TestConfig.storePass);
    	// let db = DIDDocumentBuilder.newFromDocument(doc).edit();
    	// let key = TestData.generateKeypair();
    	// DIDURL id = DIDURL.newWithDID(doc.getSubject(), "#key-2");
    	// db.addAuthenticationKey(id, key.getPublicKeyBase58());
    	// store.storePrivateKey(id, key.serialize(), TestConfig.storePass);
    	// doc = db.seal(TestConfig.storePass);
    	// expect(doc.isValid()).toBeTruthy()
    	// assertEquals(2, doc.getAuthenticationKeyCount());
    	// store.storeDid(doc);

    	// doc.publish(TestConfig.storePass);

    	// DIDDocument resolved = doc.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(doc.toString(), resolved.toString());

    	// DIDDocument target = identity.newDid(TestConfig.storePass);
    	// db = target.edit();
    	// db.addAuthorizationKey("#recovery", doc.getSubject().toString(),
    	// 		key.getPublicKeyBase58());
    	// target = db.seal(TestConfig.storePass);
    	// assertNotNull(target);
    	// assertEquals(1, target.getAuthorizationKeyCount());
    	// assertEquals(doc.getSubject(), target.getAuthorizationKeys()[0].getController());
    	// store.storeDid(target);

    	// target.publish(TestConfig.storePass);

    	// resolved = target.getSubject().resolve();
    	// assertNotNull(resolved);
    	// assertEquals(target.toString(), resolved.toString());

    	// doc.deactivate(target.getSubject(), TestConfig.storePass);
    	// target = target.getSubject().resolve();
    	// assertTrue(target.isDeactivated());

    	// doc = doc.getSubject().resolve();
    	// assertFalse(doc.isDeactivated());
	})





/*


 */
});


