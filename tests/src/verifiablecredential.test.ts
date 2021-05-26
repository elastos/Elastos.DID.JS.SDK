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

import { DIDStore, DIDURL, Logger, VerifiableCredential, IDChainRequest } from "@elastosfoundation/did-js-sdk";
import { randomInt } from "crypto";
import { TestData } from "./utils/testdata";
import { TestConfig } from "./utils/testconfig";
import { CredentialRevokedException } from "../../typings/exceptions/exceptions";

let testData: TestData;
let store: DIDStore;

const log = new Logger("VerifiableCredentialTest");

describe('let Tests', () => {
    beforeEach(() => {
    	testData = new TestData();
    });

    afterEach(() => {
    	testData.cleanup();
    });

	test('testKycCredential', () => {
		let version = 2;
    	let cd = testData.getCompatibleData(version);

    	let issuer = cd.getDocument("issuer");
		let user = cd.getDocument("user1");

		let vc = cd.getCredential("user1", "twitter");

		expect(DIDURL.newWithDID(user.getSubject(), "#twitter").equals(vc.getId()));

		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeTruthy();
		expect(vc.getType().indexOf("TwitterCredential") >= 0).toBeTruthy();

		expect(issuer.getSubject().equals(vc.getIssuer())).toBeTruthy();
		expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

		expect("@john").toEqual(vc.getSubject().getProperty("twitter"));

		expect(vc.getIssuanceDate()).not.toBeNull();
		expect(vc.getExpirationDate()).not.toBeNull();

		expect(vc.isSelfProclaimed()).toBeFalsy();
		expect(vc.isExpired()).toBeFalsy();
		expect(vc.isGenuine()).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();
	});

	test('testSelfProclaimedCredential', () => {
    	let cd = testData.getCompatibleData(2);

    	let user = cd.getDocument("user1");
		let vc = cd.getCredential("user1", "passport");

		expect(DIDURL.newWithDID(user.getSubject(), "#passport").equals(vc.getId()));

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy();
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeTruthy();

		expect(user.getSubject().equals(vc.getIssuer()));
		expect(user.getSubject().equals(vc.getSubject().getId()));

		expect("Singapore").toEqual(vc.getSubject().getProperty("nation"));
		expect("S653258Z07").toEqual(vc.getSubject().getProperty("passport"));

		expect(vc.getIssuanceDate()).not.toBeNull();
		expect(vc.getExpirationDate()).not.toBeNull();

		expect(vc.isSelfProclaimed()).toBeTruthy();
		expect(vc.isExpired()).toBeFalsy();
		expect(vc.isGenuine()).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();
	});

	test('testJsonCredential', () => {
    	let cd = testData.getCompatibleData(2);

		let issuer = cd.getDocument("issuer");
    	let user = cd.getDocument("user1");
		let vc = cd.getCredential("user1", "json");

		expect(DIDURL.newWithDID(user.getSubject(), "#json").equals(vc.getId()));

		expect(vc.getType().indexOf("JsonCredential") >= 0).toBeTruthy();
		expect(vc.getType().indexOf("TestCredential") >= 0).toBeTruthy();

		expect(user.getSubject().equals(vc.getIssuer()));
		expect(user.getSubject().equals(vc.getSubject().getId()));

		expect("Technologist").toEqual(vc.getSubject().getProperty("Description"));
		expect(true).toEqual(vc.getSubject().getProperty("booleanValue"));
		expect(1234).toEqual(vc.getSubject().getProperty("numberValue"));

		expect(vc.getIssuanceDate()).not.toBeNull();
		expect(vc.getExpirationDate()).not.toBeNull();

		expect(vc.isSelfProclaimed()).toBeFalsy();
		expect(vc.isExpired()).toBeFalsy();
		expect(vc.isGenuine()).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();
	});

    test('testKycCredentialToCid', () => {
    	let cd = testData.getCompatibleData(2);
    	cd.loadAll();

    	let issuer = cd.getDocument("issuer");
    	let foo = cd.getDocument("foo");

    	let vc = cd.getCredential("foo", "email");

		expect(DIDURL.newWithDID(foo.getSubject(), "#email").equals(vc.getId()));

		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeTruthy();
		expect(vc.getType().indexOf("ProfileCredential") >= 0).toBeTruthy();

		expect(issuer.getSubject().equals(vc.getIssuer()));
		expect(foo.getSubject().equals(vc.getSubject().getId()));

		expect("foo@example.com").toEqual(vc.getSubject().getProperty("email"));

		expect(vc.getIssuanceDate()).not.toBeNull();
		expect(vc.getExpirationDate()).not.toBeNull();

		expect(vc.isSelfProclaimed()).toBeFalsy();
		expect(vc.isExpired()).toBeFalsy();
		expect(vc.isGenuine()).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();
    });

    test('testKycCredentialFromCid', () => {
    	let cd = testData.getCompatibleData(2);
    	cd.loadAll();

    	let exampleCorp = cd.getDocument("examplecorp");
    	let foobar = cd.getDocument("foobar");

    	let vc = cd.getCredential("foobar", "license");

		expect(DIDURL.newWithDID(foobar.getSubject(), "#license").equals(vc.getId()));

		expect(vc.getType().indexOf("LicenseCredential") >= 0).toBeTruthy();
		expect(vc.getType().indexOf("ProfileCredential") >= 0).toBeTruthy();

		expect(exampleCorp.getSubject().equals(vc.getIssuer()));
		expect(foobar.getSubject().equals(vc.getSubject().getId()));

		expect("20201021C889").toEqual(vc.getSubject().getProperty("license-id"));
		expect("Consulting").toEqual(vc.getSubject().getProperty("scope"));

		expect(vc.getIssuanceDate()).not.toBeNull();
		expect(vc.getExpirationDate()).not.toBeNull();

		expect(vc.isSelfProclaimed()).toBeFalsy();
		expect(vc.isExpired()).toBeFalsy();
		expect(vc.isGenuine()).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();
    });

    
    test('testSelfProclaimedCredentialFromCid', () => {
    	let cd = testData.getCompatibleData(2);
    	cd.loadAll();

    	let foobar = cd.getDocument("foobar");

    	let vc = cd.getCredential("foobar", "services");

		expect(DIDURL.newWithDID(foobar.getSubject(), "#services").equals(vc.getId()));

		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeTruthy();
		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy();

		expect(foobar.getSubject().equals(vc.getIssuer()));
		expect(foobar.getSubject().equals(vc.getSubject().getId()));

		expect("https://foobar.com/outsourcing").toEqual(vc.getSubject().getProperty("Outsourceing"));
		expect("https://foobar.com/consultation").toEqual(vc.getSubject().getProperty("consultation"));

		expect(vc.getIssuanceDate()).not.toBeNull();
		expect(vc.getExpirationDate()).not.toBeNull();

		expect(vc.isSelfProclaimed()).toBeTruthy();
		expect(vc.isExpired()).toBeFalsy();
		expect(vc.isGenuine()).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();
    });

	test('testParseAndSerializeJsonCredential', () => {		
		let csvSource = [
			{did:"user1", vc:"twitter"},
			{did:"user1", vc:"passport"},
			{did:"user1", vc:"json"},
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

	   	let cd = testData.getCompatibleData(2);
	   	cd.loadAll();

		for (let csv of csvSource) {
			let normalizedJson = cd.getCredentialJson(csv.did, csv.vc, "normalized");
			let normalized = VerifiableCredential.parseContent(normalizedJson);

			let compactJson = cd.getCredentialJson(csv.did, csv.vc, "compact");
			let compact = VerifiableCredential.parseContent(compactJson);

			let credential = cd.getCredential(csv.did, csv.vc);

			expect(credential.isExpired()).toBeFalsy();
			expect(credential.isGenuine()).toBeTruthy();
			expect(credential.isValid()).toBeTruthy();

			expect(normalizedJson).toEqual(normalized.toString(true));
			expect(normalizedJson).toEqual(compact.toString(true));
			expect(normalizedJson).toEqual(credential.toString(true));

			expect(compactJson).toEqual(normalized.toString(false));
			expect(compactJson).toEqual(compact.toString(false));
			expect(compactJson).toEqual(credential.toString(false));;
		}
	});

    test('testDeclareCrendential', () => {
		let csvSource = [
			{did:"user1", vc:"twitter"},
			{did:"user1", vc:"passport"},
			{did:"user1", vc:"json"},
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

		let cd = testData.getCompatibleData(2);
		cd.loadAll();
		
		for (let csv of csvSource) {
			let credential = cd.getCredential(csv.did, csv.vc);
			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			if (doc.getControllerCount() > 1) {
				let index = (randomInt(Number.MAX_VALUE)) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.declare(signKey, TestConfig.storePass);

			let id = credential.getId();
			let resolved = VerifiableCredential.resolve(id);
			expect(resolved).not.toBeNull();
			expect(credential.toString()).toEqual(resolved.toString());

			let metadata = resolved.getMetadata();
			expect(metadata).not.toBeNull();
			expect(metadata.getPublished()).not.toBeNull();
			expect(metadata.getTransactionId()).not.toBeNull();
			expect(resolved.isRevoked()).toBeFalsy();

			let bio = VerifiableCredential.resolveBiography(id, credential.getIssuer());
			expect(bio).not.toBeNull();
			expect(bio.getAllTransactions().length).toEqual(1);
			expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
		}
	});

    
    test('testDeclareCrendentials', () => {
	   	let sd = testData.getInstantData();

		let csvSource = [
			{did:"user1", vc:"twitter"},
			{did:"user1", vc:"passport"},
			{did:"user1", vc:"json"},
			{did:"user1", vc:"jobposition"},
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

	   	for (let csv of csvSource) {
			let credential = sd.getCredential(csv.did, csv.vc);
			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			if (doc.getControllerCount() > 1) {
				let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.declare(signKey, TestConfig.storePass);

			let id = credential.getId();
			let resolved = VerifiableCredential.resolve(id);
			expect(resolved).not.toBeNull();
			expect(credential.toString()).toEqual(resolved.toString());

			let metadata = resolved.getMetadata();
			expect(metadata).not.toBeNull();
			expect(metadata.getPublished()).not.toBeNull();
			expect(metadata.getTransactionId()).not.toBeNull();
			expect(resolved.isRevoked()).toBeFalsy();

			let bio = VerifiableCredential.resolveBiography(id, credential.getIssuer());
			expect(bio).not.toBeNull();
			expect(bio.getAllTransactions().length).toEqual(1);
			expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
	   	}
    });

    test('testRevokeCrendential', () => {

		let csvSource = [
			{did:"user1", vc:"twitter"},
			{did:"user1", vc:"passport"},
			{did:"user1", vc:"json"},
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

		let cd = testData.getCompatibleData(2);
	   	cd.loadAll();

		for (let csv of csvSource) {

			let credential = cd.getCredential(csv.did, csv.vc);
			expect(credential.wasDeclared()).toBeFalsy();

			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			if (doc.getControllerCount() > 1) {
				let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.declare(signKey, TestConfig.storePass);

			let id = credential.getId();
			let resolved = VerifiableCredential.resolve(id);
			expect(resolved).not.toBeNull();
			expect(credential.toString()).toEqual(resolved.toString());

			let metadata = resolved.getMetadata();
			expect(metadata).not.toBeNull();
			expect(metadata.getPublished()).not.toBeNull();
			expect(metadata.getTransactionId()).not.toBeNull();
			expect(resolved.isRevoked()).toBeFalsy();

			expect(credential.wasDeclared()).toBeTruthy();

			credential.revoke(signKey, null, TestConfig.storePass);

			expect(credential.toString()).toEqual(resolved.toString());

			metadata = resolved.getMetadata();
			expect(metadata).not.toBeNull();
			expect(metadata.getPublished()).not.toBeNull();
			expect(metadata.getTransactionId()).not.toBeNull();
			expect(resolved.isRevoked()).toBeTruthy();

			let bio = VerifiableCredential.resolveBiography(id, credential.getIssuer());
			expect(bio).not.toBeNull();
			expect(bio.getAllTransactions().length).toEqual(2);
			expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
			expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
		}
    });

    test('testRevokeCrendentialWithDifferentKey', () => {

		let csvSource = [
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

		let cd = testData.getCompatibleData(2);
	   	cd.loadAll();

		for (let csv of csvSource) {

			let credential = cd.getCredential(csv.did, csv.vc);
			expect(credential.wasDeclared).toBeFalsy();

			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			let index = 0;
			if (doc.getControllerCount() > 1) {
				index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.declare(signKey, TestConfig.storePass);

			let id = credential.getId();
			let resolved = VerifiableCredential.resolve(id);
			expect(resolved).not.toBeNull();

			expect(credential.toString()).toEqual(resolved.toString());

			let metadata = resolved.getMetadata();
			expect(metadata).not.toBeNull();
			expect(metadata.getPublished()).not.toBeNull();
			expect(metadata.getTransactionId()).not.toBeNull();
			expect(resolved.isRevoked()).toBeFalsy();

			expect(credential.wasDeclared()).toBeTruthy();

			if (doc.getControllerCount() > 1) {
				index = ++index % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.revoke(signKey, null, TestConfig.storePass);

			resolved = VerifiableCredential.resolve(id);
			expect(resolved).not.toBeNull();

			expect(credential.toString()).toEqual(resolved.toString());

			metadata = resolved.getMetadata();
			expect(metadata).not.toBeNull();
			expect(metadata.getPublished()).not.toBeNull();
			expect(metadata.getTransactionId()).not.toBeNull();
			expect(resolved.isRevoked()).toBeTruthy();

			let bio = VerifiableCredential.resolveBiography(id, credential.getIssuer());
			expect(bio).not.toBeNull();
			expect(bio.getAllTransactions().length).toEqual(2);
			expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
			expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
		}
    });

    test('testDeclareAfterRevoke', () => {

		let csvSource = [
			{did:"user1", vc:"twitter"},
			{did:"user1", vc:"passport"},
			{did:"user1", vc:"json"},
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

	   	let cd = testData.getCompatibleData(2);
	   	cd.loadAll();

		for (let csv of csvSource) {
			let credential = cd.getCredential(csv.did, csv.vc);
			expect(credential.wasDeclared()).toBeFalsy();
			expect(credential.isRevoked()).toBeFalsy();

			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			if (doc.getControllerCount() > 1) {
				let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.revoke(signKey, null, TestConfig.storePass);

			expect(credential.wasDeclared()).toBeFalsy();
			expect(credential.isRevoked()).toBeTruthy();

			let resolved = VerifiableCredential.resolve(credential.getId());
			expect(resolved).toBeNull();

			expect(credential.declare(signKey, TestConfig.storePass)).toThrow(CredentialRevokedException);

			let bio = VerifiableCredential.resolveBiography(credential.getId(), credential.getIssuer());
			expect(bio).not.toBeNull();
			expect(bio.getAllTransactions().length).toEqual(1);
			expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
		}
    });

    test('testDeclareAfterRevokeWithDifferentKey', () => {

		let csvSource = [
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

		let cd = testData.getCompatibleData(2);
	   	cd.loadAll();

		for (let csv of csvSource) {
			let credential = cd.getCredential(csv.did, csv.vc);
			expect(credential.wasDeclared()).toBeFalsy();
			expect(credential.isRevoked()).toBeFalsy();

			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			let index = 0;
			if (doc.getControllerCount() > 1) {
				index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.revoke(signKey, null, TestConfig.storePass);

			expect(credential.wasDeclared()).toBeFalsy();
			expect(credential.isRevoked()).toBeTruthy();

			let resolved = VerifiableCredential.resolve(credential.getId());
			expect(resolved).toBeNull();

			if (doc.getControllerCount() > 1) {
				index = ++index % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			expect(credential.declare(signKey, TestConfig.storePass)).toThrow(CredentialRevokedException);

			let bio = VerifiableCredential.resolveBiography(credential.getId(), credential.getIssuer());
			expect(bio).not.toBeNull();
			expect(bio.getAllTransactions().length).toEqual(1);
			expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
		}
    });
/*
    test('testDeclareAfterRevokeByIssuer', () => {

		let csvSource = [
			{did:"user1", vc:"twitter"},
			{did:"user1", vc:"passport"},
			{did:"user1", vc:"json"},
			{did:"foobar", vc:"license"},
			{did:"foobar", vc:"services"},
			{did:"foo", vc:"email"}
		];

		let cd = testData.getCompatibleData(2);
	   	cd.loadAll();

		for (let csv of csvSource) {
			let credential = cd.getCredential(csv.did, csv.vc);
			expect(credential.wasDeclared()).toBeFalsy();
			expect(credential.isRevoked()).toBeFalsy();

			// Sign key for issuer
			let issuer = credential.getIssuer().resolve();
			let signKey = null;
			if (issuer.getControllerCount() > 1) {
				let index = randomInt(Number.MAX_VALUE) % issuer.getControllerCount();
				signKey = issuer.getControllers().get(index).resolve().getDefaultPublicKeyId();
			} else
				signKey = issuer.getDefaultPublicKeyId();

			credential.revoke(signKey, null, TestConfig.storePass);

			assertFalse(credential.wasDeclared());
			assertTrue(credential.isRevoked());

			let resolved = VerifiableCredential.resolve(credential.getId());
			assertNull(resolved);

			let doc = credential.getSubject().getId().resolve();
			if (doc.getControllerCount() > 1) {
				Random rnd = new Random();
				int index = (rnd.nextInt() & Integer.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			final let key = signKey;
			assertThrows(CredentialRevokedException.class, () -> {
				credential.declare(key, TestConfig.storePass);
			});

			CredentialBiography bio = VerifiableCredential.resolveBiography(credential.getId(), credential.getIssuer());
			assertNotNull(bio);
			assertEquals(1, bio.getAllTransactions().size());
			assertEquals(IDChainRequest.Operation.REVOKE, bio.getTransaction(0).getRequest().getOperation());
		}
    }

    @ParameterizedTest
    @CsvSource({
    	"1,user1,twitter",
    	"1,user1,passport",
    	"1,user1,json",
    	"2,user1,twitter",
    	"2,user1,passport",
    	"2,user1,json",
    	"2,foobar,license",
    	"2,foobar,services",
    	"2,foo,email"})
    test('testDeclareAfterInvalidRevoke(int version, String did, String vc)
			throws DIDException, IOException {
	   	TestData.CompatibleData cd = testData.getCompatibleData(version);
	   	TestData.InstantData sd = testData.getInstantData();
	   	cd.loadAll();

		let credential = cd.getCredential(did, vc);
		let id = credential.getId();

		assertFalse(credential.wasDeclared());
		assertFalse(credential.isRevoked());

		let doc = sd.getUser1Document();
		VerifiableCredential.revoke(id, doc, TestConfig.storePass);

		assertFalse(credential.wasDeclared());
		assertFalse(credential.isRevoked());
		assertNull(VerifiableCredential.resolve(id));
		assertNull(VerifiableCredential.resolve(id, doc.getSubject()));

		doc = credential.getSubject().getId().resolve();
		let signKey = null;
		if (doc.getControllerCount() > 1) {
			Random rnd = new Random();
			int index = (rnd.nextInt() & Integer.MAX_VALUE) % doc.getControllerCount();
			signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
		}

		credential.declare(signKey, TestConfig.storePass);

		let resolved = VerifiableCredential.resolve(id);
		assertNotNull(resolved);

		assertEquals(credential.toString(), resolved.toString());

		CredentialMetadata metadata = resolved.getMetadata();
		assertNotNull(metadata);
		assertNotNull(metadata.getPublished());
		assertNotNull(metadata.getTransactionId());
		assertFalse(resolved.isRevoked());

		assertTrue(credential.wasDeclared());

		credential.revoke(signKey, TestConfig.storePass);

		resolved = VerifiableCredential.resolve(id);
		assertNotNull(resolved);

		assertEquals(credential.toString(), resolved.toString());

		metadata = resolved.getMetadata();
		assertNotNull(metadata);
		assertNotNull(metadata.getPublished());
		assertNotNull(metadata.getTransactionId());
		assertTrue(resolved.isRevoked());

		CredentialBiography bio = VerifiableCredential.resolveBiography(id, credential.getIssuer());
		assertNotNull(bio);
		assertEquals(2, bio.getAllTransactions().size());
		assertEquals(IDChainRequest.Operation.REVOKE, bio.getTransaction(0).getRequest().getOperation());
		assertEquals(IDChainRequest.Operation.DECLARE, bio.getTransaction(1).getRequest().getOperation());
    }

    
    test('testListCrendentials() throws DIDException {
	   	TestData.InstantData sd = testData.getInstantData();

	   	String[][] vcds = {
	   			{ "user1", "twitter" },
	   			{ "user1", "passport" },
	   			{ "user1", "json" },
	   			{ "user1", "jobposition" },
	   			{ "foobar", "license" },
	   			{ "foobar", "services" },
	   			{ "foo" , "email" }
	   	};

	   	for (String[] vcd : vcds) {
			let credential = sd.getCredential(vcd[0], vcd[1]);

			// Sign key for customized DID
			let doc = credential.getSubject().getId().resolve();
			let signKey = null;
			if (doc.getControllerCount() > 1) {
				Random rnd = new Random();
				int index = (rnd.nextInt() & Integer.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.declare(signKey, TestConfig.storePass);

			let id = credential.getId();
			let resolved = VerifiableCredential.resolve(id);
			assertNotNull(resolved);

			assertEquals(credential.toString(), resolved.toString());

			CredentialMetadata metadata = resolved.getMetadata();
			assertNotNull(metadata);
			assertNotNull(metadata.getPublished());
			assertNotNull(metadata.getTransactionId());
			assertFalse(resolved.isRevoked());

			CredentialBiography bio = VerifiableCredential.resolveBiography(id, credential.getIssuer());
			assertNotNull(bio);
			assertEquals(1, bio.getAllTransactions().size());
			assertEquals(IDChainRequest.Operation.DECLARE, bio.getTransaction(0).getRequest().getOperation());
	   	}

	   	let doc = sd.getUser1Document();
	   	DID did = doc.getSubject();
	   	List<DIDURL> ids = VerifiableCredential.list(did);
	   	assertNotNull(ids);
	   	assertEquals(4, ids.size());
	   	for (let id : ids) {
	   		let vc = VerifiableCredential.resolve(id);
	   		assertNotNull(vc);
	   		assertEquals(id, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   		assertFalse(vc.isRevoked());
	   	}

	   	doc = sd.getFooBarDocument();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNotNull(ids);
	   	assertEquals(2, ids.size());
	   	for (let id : ids) {
	   		let vc = VerifiableCredential.resolve(id);
	   		assertNotNull(vc);
	   		assertEquals(id, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   		assertFalse(vc.isRevoked());
	   	}

	   	doc = sd.getFooDocument();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNotNull(ids);
	   	assertEquals(1, ids.size());
	   	for (let id : ids) {
	   		let vc = VerifiableCredential.resolve(id);
	   		assertNotNull(vc);
	   		assertEquals(id, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   		assertFalse(vc.isRevoked());
	   	}

	   	doc = sd.getBarDocument();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNull(ids);

	   	for (String[] vcd : vcds) {
			let credential = sd.getCredential(vcd[0], vcd[1]);

			// Sign key for customized DID
			doc = credential.getSubject().getId().resolve();
			let signKey = null;
			if (doc.getControllerCount() > 1) {
				Random rnd = new Random();
				int index = (rnd.nextInt() & Integer.MAX_VALUE) % doc.getControllerCount();
				signKey = doc.getControllers().get(index).resolve().getDefaultPublicKeyId();
			}

			credential.revoke(signKey, TestConfig.storePass);

			let id = credential.getId();
			let resolved = VerifiableCredential.resolve(id);
			assertNotNull(resolved);
			assertTrue(resolved.isRevoked());
	   	}

	   	doc = sd.getUser1Document();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNotNull(ids);
	   	assertEquals(4, ids.size());
	   	for (let id : ids) {
	   		let vc = VerifiableCredential.resolve(id);
	   		assertNotNull(vc);
	   		assertEquals(id, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   		assertTrue(vc.isRevoked());
	   	}

	   	doc = sd.getFooBarDocument();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNotNull(ids);
	   	assertEquals(2, ids.size());
	   	for (let id : ids) {
	   		let vc = VerifiableCredential.resolve(id);
	   		assertNotNull(vc);
	   		assertEquals(id, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   		assertTrue(vc.isRevoked());
	   	}

	   	doc = sd.getFooDocument();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNotNull(ids);
	   	assertEquals(1, ids.size());
	   	for (let id : ids) {
	   		let vc = VerifiableCredential.resolve(id);
	   		assertNotNull(vc);
	   		assertEquals(id, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   		assertTrue(vc.isRevoked());
	   	}

	   	doc = sd.getBarDocument();
	   	did = doc.getSubject();
	   	ids = VerifiableCredential.list(did);
	   	assertNull(ids);
    }

    
    test('testListPagination() throws DIDException {
    	TestData.InstantData sd = testData.getInstantData();

    	let doc = sd.getUser1Document();
    	DID did = doc.getSubject();

    	Issuer selfIssuer = new Issuer(doc);

    	for (int i = 0; i < 1028; i++) {
    		log.trace("Creating test credential {}...", i);

    		let vc = selfIssuer.issueFor(did)
    				.id("#test" + i)
    				.type("SelfProclaimedCredential")
    				.propertie("index", Integer.valueOf(i))
    				.seal(TestConfig.storePass);

    		vc.getMetadata().attachStore(doc.getStore());
    		vc.declare(TestConfig.storePass);

    		assertTrue(vc.wasDeclared());
    	}

    	int index = 1027;
    	List<DIDURL> ids = VerifiableCredential.list(did);
    	assertNotNull(ids);
    	assertEquals(128, ids.size());
	   	for (let id : ids) {
	   		log.trace("Resolving credential {}...", id.getFragment());

	   		let ref = DIDURL.newWithDID(did, "#test" + index--);
	   		assertEquals(ref, id);

	   		let vc = VerifiableCredential.resolve(id);

	   		assertNotNull(vc);
	   		assertEquals(ref, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   	}

    	index = 1027;
    	ids = VerifiableCredential.list(did, 560);
    	assertNotNull(ids);
    	assertEquals(512, ids.size());
	   	for (let id : ids) {
	   		log.trace("Resolving credential {}...", id.getFragment());

	   		let ref = DIDURL.newWithDID(did, "#test" + index--);
	   		assertEquals(ref, id);

	   		let vc = VerifiableCredential.resolve(id);

	   		assertNotNull(vc);
	   		assertEquals(ref, vc.getId());
	   		assertTrue(vc.wasDeclared());
	   	}

    	ids = VerifiableCredential.list(did, 1028, 100);
    	assertNull(ids);

    	int skip = 0;
    	int limit = 256;
    	index = 1028;
    	while (true) {
    		int resultSize = index >= limit ? limit : index;
	    	ids = VerifiableCredential.list(did, skip, limit);
	    	if (ids == null)
	    		break;

	    	assertEquals(resultSize, ids.size());
		   	for (let id : ids) {
		   		log.trace("Resolving credential {}...", id.getFragment());

		   		let ref = DIDURL.newWithDID(did, "#test" + --index);
		   		assertEquals(ref, id);

		   		let vc = VerifiableCredential.resolve(id);

		   		assertNotNull(vc);
		   		assertEquals(ref, vc.getId());
		   		assertTrue(vc.wasDeclared());
		   	}

		   	skip += ids.size();
    	}
    	assertEquals(0, index);

    	skip = 200;
    	limit = 100;
    	index = 828;
    	while (true) {
    		int resultSize = index >= limit ? limit : index;
	    	ids = VerifiableCredential.list(did, skip, limit);
	    	if (ids == null)
	    		break;

	    	assertEquals(resultSize, ids.size());
		   	for (let id : ids) {
		   		log.trace("Resolving credential {}...", id.getFragment());

		   		let ref = DIDURL.newWithDID(did, "#test" + --index);
		   		assertEquals(ref, id);

		   		let vc = VerifiableCredential.resolve(id);

		   		assertNotNull(vc);
		   		assertEquals(ref, vc.getId());
		   		assertTrue(vc.wasDeclared());
		   	}

		   	skip += ids.size();
    	}
    	assertEquals(0, index);
    }*/
});