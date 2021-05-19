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

import { DID, DIDDocument, DIDURL, Issuer, Mnemonic, RootIdentity, runningInBrowser } from "../dist/did";
import { DIDStore, File, Logger } from "../dist/did";

import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";
import { Utils } from "./utils/utils";

const log = new Logger("DIDStoreTest");

let testData: TestData;
let store: DIDStore;

describe("DIDStore Tests", ()=>{
	beforeEach(async ()=>{
		testData = new TestData();
		store = testData.getStore();
	})

	afterEach(()=>{
		testData.cleanup();
	});

	// Java: @ExtendWith(DIDTestExtension.class)
	// Java: public class DIDStoreTest {

	function getFile(...path: string[]): File {
		let relPath = "";

		relPath += TestConfig.storeRoot + File.SEPARATOR + "data";
		for (let p of path) {
			relPath += File.SEPARATOR;
			relPath += p;
		}

		return new File(relPath);
	}

	test("testLoadRootIdentityFromEmptyStore", async ()=>{
		let file = getFile(".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		let identity = store.loadRootIdentity();
		expect(identity).toBeNull();
	});


	test("testBulkCreate", ()=>{
		let file = getFile(".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		let identity = testData.getRootIdentity();

		file = getFile("roots", identity.getId(), "mnemonic");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("roots", identity.getId(), "private");;
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("roots", identity.getId(), "public");;
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("roots", identity.getId(), "index");;
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("roots", identity.getId(), ".metadata");;
		expect(file.exists()).toBeFalsy();

		identity.setAlias("default");
		file = getFile("roots", identity.getId(), ".metadata");;
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		for (let i = 0; i < 100; i++) {
			let alias = "my did " + i;
			let doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias(alias);
			expect(doc.isValid()).toBeTruthy();

			let resolved = doc.getSubject().resolve();
			expect(resolved).toBeNull();

			doc.publish(TestConfig.storePass);

			file = getFile("ids", doc.getSubject().getMethodSpecificId(), "document");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			file = getFile("ids", doc.getSubject().getMethodSpecificId(), ".metadata");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			resolved = doc.getSubject().resolve();
			expect(resolved).not.toBeNull();
			store.storeDid(resolved);
			expect(alias).toEqual(resolved.getMetadata().getAlias());
			expect(doc.getSubject()).toEqual(resolved.getSubject());
			expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());

			expect(resolved.isValid()).toBeTruthy();
		}

		let dids = store.listDids();
		expect(dids.size).toEqual(100);
	});

	test("testDeleteDID", ()=>{
		let identity = testData.getRootIdentity();

		// Create test DIDs
		let dids: DID[] = [];
		for (let i = 0; i < 100; i++) {
			let alias = "my did " + i;
			let doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias(alias);
			doc.publish(TestConfig.storePass);
			dids.push(doc.getSubject());
		}

		for (let i = 0; i < 100; i++) {
			if (i % 5 != 0)
				continue;

			let did = dids[i];

			let deleted = store.deleteDid(did);
			expect(deleted).toBeTruthy();

			let file = getFile("ids", did.getMethodSpecificId());
			expect(file.exists()).toBeFalsy();

			deleted = store.deleteDid(did);
			expect(deleted).toBeFalsy();
		}

		let remains = store.listDids();
		expect(80).toEqual(remains.size);
	});

	test("testStoreAndLoadDID", ()=>{
		// Store test data into current store
		let issuer = testData.getInstantData().getIssuerDocument();

		let file = getFile("ids", issuer.getSubject().getMethodSpecificId(), "document");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", issuer.getSubject().getMethodSpecificId(), ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		let test = testData.getInstantData().getUser1Document();

		file = getFile("ids", test.getSubject().getMethodSpecificId(), "document");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", test.getSubject().getMethodSpecificId(), ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		let doc = store.loadDid(issuer.getSubject());
		expect(issuer.getSubject().equals(doc.getSubject())).toBeTruthy();
		expect(issuer.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(doc.isValid()).toBeTruthy();

		doc = store.loadDid(test.getSubject().toString());
		expect(issuer.getSubject().equals(doc.getSubject())).toBeTruthy();
		expect(issuer.getProof().getSignature()).toEqual(doc.getProof().getSignature());
		expect(doc.isValid()).toBeTruthy();

		let dids = store.listDids();
		expect(dids.size).toEqual(2);
	});

	test("testLoadCredentials", ()=>{
		// Store test data into current store
		testData.getInstantData().getIssuerDocument();
		let user = testData.getInstantData().getUser1Document();

		let vc = user.getCredential("#profile");
		vc.getMetadata().setAlias("MyProfile");

		let file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), "credential");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		vc = user.getCredential("#email");
		vc.getMetadata().setAlias("Email");

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), "credential");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		vc = testData.getInstantData().getUser1TwitterCredential();
		vc.getMetadata().setAlias("Twitter");

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), "credential");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		vc = testData.getInstantData().getUser1PassportCredential();
		vc.getMetadata().setAlias("Passport");

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), "credential");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
				"credentials", "#" + vc.getId().getFragment(), ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		let id = DIDURL.valueOf(user.getSubject(), "#profile");
		vc = store.loadCredential(id);
		expect("MyProfile").toEqual(vc.getMetadata().getAlias());
		expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();
		expect(id.equals(vc.getId())).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();

		// try with full id string
		vc = store.loadCredential(id.toString());
		expect(vc).not.toBeNull();
		expect("MyProfile").toEqual(vc.getMetadata().getAlias());
		expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();
		expect(id.equals(vc.getId())).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();

		id = DIDURL.valueOf(user.getSubject(), "#twitter");
		vc = store.loadCredential(id.toString());
		expect(vc).not.toBeNull();
		expect("Twitter").toEqual(vc.getMetadata().getAlias());
		expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();
		expect(id.equals(vc.getId())).toBeTruthy();
		expect(vc.isValid()).toBeTruthy();

		vc = store.loadCredential(DIDURL.valueOf(user.getSubject(), "#notExist"));
		expect(vc).toBeNull();

		id = DIDURL.valueOf(user.getSubject(), "#twitter");
		expect(store.containsCredential(id)).toBeTruthy();
		expect(store.containsCredential(id.toString())).toBeTruthy();
		expect(store.containsCredential(DIDURL.valueOf(user.getSubject(), "#notExists"))).toBeFalsy();
	});

	test("testListCredentials", ()=>{
		testData.getRootIdentity();

		// Store test data into current store
		testData.getInstantData().getIssuerDocument();
		let user = testData.getInstantData().getUser1Document();
		let vc = user.getCredential("#profile");
		vc.getMetadata().setAlias("MyProfile");
		vc = user.getCredential("#email");
		vc.getMetadata().setAlias("Email");
		vc = testData.getInstantData().getUser1TwitterCredential();
		vc.getMetadata().setAlias("Twitter");
		vc = testData.getInstantData().getUser1PassportCredential();
		vc.getMetadata().setAlias("Passport");

		let vcs = store.listCredentials(user.getSubject());
		expect(4).toEqual(vcs.size);

		for (let id of vcs) {
			expect(id.getFragment() ===  "profile"
					|| id.getFragment() === "email"
					|| id.getFragment() === "twitter"
					|| id.getFragment() === "passport").toBeTruthy();

			expect(id.getMetadata().getAlias() === "MyProfile"
					|| id.getMetadata().getAlias() === "Email"
					|| id.getMetadata().getAlias() === "Twitter"
					|| id.getMetadata().getAlias() === "Passport").toBeTruthy();
		}
	});

	test("testDeleteCredential", ()=>{
		// Store test data into current store
		testData.getInstantData().getIssuerDocument();
		let user = testData.getInstantData().getUser1Document();
		let vc = user.getCredential("#profile");
		vc.getMetadata().setAlias("MyProfile");
		vc = user.getCredential("#email");
		vc.getMetadata().setAlias("Email");
		vc = testData.getInstantData().getUser1TwitterCredential();
		vc.getMetadata().setAlias("Twitter");
		vc = testData.getInstantData().getUser1PassportCredential();
		vc.getMetadata().setAlias("Passport");


		let file = getFile("ids", user.getSubject().getMethodSpecificId(),
				"credentials", "#twitter", "credential");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", user.getSubject().getMethodSpecificId(),
				"credentials", "#twitter", ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", user.getSubject().getMethodSpecificId(),
				"credentials", "#passport", "credential");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		file = getFile("ids", user.getSubject().getMethodSpecificId(),
				"credentials", "#passport", ".metadata");
		expect(file.exists()).toBeTruthy();
		expect(file.isFile()).toBeTruthy();

		let deleted = store.deleteCredential(DIDURL.valueOf(user.getSubject(), "#twitter"));
		expect(deleted).toBeTruthy();

		deleted = store.deleteCredential(DIDURL.valueOf(user.getSubject(), "#passport").toString());
		expect(deleted).toBeTruthy();

		deleted = store.deleteCredential(user.getSubject().toString() + "#notExist");
		expect(deleted).toBeFalsy();

		file = getFile("ids", user.getSubject().getMethodSpecificId(),
				"credentials", "#twitter");
		expect(file.exists()).toBeFalsy();

		file = getFile("ids", user.getSubject().getMethodSpecificId(),
				"credentials", "#passport");
		expect(file.exists()).toBeFalsy();

		expect(store.containsCredential(DIDURL.valueOf(user.getSubject(), "#email"))).toBeTruthy();
		expect(store.containsCredential(user.getSubject().toString() + "#profile")).toBeTruthy();

		expect(store.containsCredential(DIDURL.valueOf(user.getSubject(), "#twitter"))).toBeFalsy();
		expect(store.containsCredential(user.getSubject().toString() + "#passport")).toBeFalsy();
	});

	test("testChangePassword", ()=>{
		let identity = testData.getRootIdentity();

		for (let i = 0; i < 10; i++) {
			let alias = "my did " + i;
			let doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias(alias);
			expect(doc.isValid()).toBeTruthy();

			let resolved = doc.getSubject().resolve();
			expect(resolved).toBeNull();

			doc.publish(TestConfig.storePass);

			let file = getFile("ids", doc.getSubject().getMethodSpecificId(), "document");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			file = getFile("ids", doc.getSubject().getMethodSpecificId(), ".metadata");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			file = getFile("ids", doc.getSubject().getMethodSpecificId(), "privatekeys", "#primary");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			resolved = doc.getSubject().resolve();
			expect(resolved).not.toBeNull();
			store.storeDid(resolved);
			expect(alias).toEqual(resolved.getMetadata().getAlias());
			expect(doc.getSubject().equals(resolved.getSubject())).toBeTruthy();
			expect(doc.getProof().getSignature()).toEqual(
					resolved.getProof().getSignature());

			expect(resolved.isValid()).toBeTruthy();
		}

		let dids = store.listDids();
		expect(10).toEqual(dids.size);

		store.changePassword(TestConfig.storePass, "newpasswd");

		dids = store.listDids();
		expect(10).toEqual(dids.size);

		for (let i = 0; i < 10; i++) {
			let alias = "my did " + i;
			let did = identity.getDid(i);
			let doc = store.loadDid(did);
			expect(doc).not.toBeNull();
			expect(doc.isValid()).toBeTruthy();

			let file = getFile("ids", did.getMethodSpecificId(), "document");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			file = getFile("ids", did.getMethodSpecificId(), ".metadata");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			file = getFile("ids", did.getMethodSpecificId(), "privatekeys", "#primary");
			expect(file.exists()).toBeTruthy();
			expect(file.isFile()).toBeTruthy();

			expect(alias).toEqual(doc.getMetadata().getAlias());
		}

		let doc = identity.newDid("newpasswd");
		expect(doc).not.toBeNull();
	});

	test("testChangePasswordWithWrongPassword", ()=>{
		let identity = testData.getRootIdentity();

		for (let i = 0; i < 10; i++) {
			let alias = "my did " + i;
			let doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias(alias);
			expect(doc.isValid()).toBeTruthy();
		}

		let dids = store.listDids();
		expect(10).toEqual(dids.size);

		expect(() => {
			store.changePassword("wrongpasswd", "newpasswd");
		}).toThrow(/*DIDStoreException*/);
	});

	//[1,2].forEach((version)=>{
		test("testCompatibility", ()=>{
			let version = 1;
			let data = Buffer.from("Hello World");

			let cd = testData.getCompatibleData(version);
			cd.loadAll();

			let store = DIDStore.open(cd.getStoreDir());

			let dids = store.listDids();
			expect(version == 2 ? 10 : 4).toEqual(dids.size);

			for (let did of dids) {
				let alias = did.getMetadata().getAlias();

				if (alias === "Issuer") {
					let vcs = store.listCredentials(did);
					expect(1).toEqual(vcs.size);

					for (let id of vcs)
						expect(store.loadCredential(id)).not.toBeNull();
				} else if (alias === "User1") {
					let vcs = store.listCredentials(did);
					expect(version == 2 ? 5 : 4).toEqual(vcs.size);

					for (let id of vcs)
						expect(store.loadCredential(id)).not.toBeNull();
				} else if (alias === "User2") {
					let vcs = store.listCredentials(did);
					expect(1).toEqual(vcs.size);

					for (let id of vcs)
						expect(store.loadCredential(id)).not.toBeNull();
				} else if (alias === "User3") {
					let vcs = store.listCredentials(did);
					expect(0).toEqual(vcs.size);
				}

				let doc = store.loadDid(did);
				if (!doc.isCustomizedDid() || doc.getControllerCount() <= 1) {
					let sig = doc.signWithStorePass(TestConfig.storePass, data);
					expect(doc.verify(null, sig, data)).toBeTruthy();
				}
			}
		});
	//});

	test("testNewDIDWithWrongPass", ()=>{
		let store = DIDStore.open(testData.getCompatibleData(2).getStoreDir());
		let identity = store.loadRootIdentity();

		expect(()=>{
			identity.newDid("wrongpass");
		}).toThrow(); //WrongPasswordException
	});

	test("testNewDIDandGetDID", ()=>{
		let store = DIDStore.open(testData.getCompatibleData(2).getStoreDir());
		let identity = store.loadRootIdentity();

		let doc = identity.newDid(TestConfig.storePass);
		expect(doc).not.toBeNull();

		store.deleteDid(doc.getSubject());

		let did = identity.getDid(1000);

		doc = identity.newDid(TestConfig.storePass, 1000);
		expect(doc).not.toBeNull();
		expect(doc.getSubject().equals(did)).toBeTruthy();

		store.deleteDid(doc.getSubject());
	});

	function createDataForPerformanceTest(store: DIDStore) {
		let props = {
			"name": "John",
			"gender": "Male",
			"nation": "Singapore",
			"language": "English",
			"email": "ohn@example.com",
			"twitter": "@john"
		};

		let identity = store.loadRootIdentity();

		for (let i = 0; i < 10; i++) {
			let alias = "my did " + i;
			let doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias(alias);
			let issuer = new Issuer(doc);
			let cb = issuer.issueFor(doc.getSubject());
			let vc = cb.id("#cred-1")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			store.storeCredential(vc);
		}
	}

	[false, true].forEach((cached)=>{
		test("testStoreCachePerformance", ()=>{
			Utils.deleteFile(new File(TestConfig.storeRoot));
			let store: DIDStore = null;
			if (cached)
				store = DIDStore.open(TestConfig.storeRoot);
			else
				store = DIDStore.open(TestConfig.storeRoot, 0, 0);

			let mnemonic = Mnemonic.getInstance().generate();
			RootIdentity.createFromMnemonic(mnemonic, TestConfig.passphrase,
					store, TestConfig.storePass, true);

			createDataForPerformanceTest(store);

			let dids = store.listDids();
			expect(10).toEqual(dids.size);

			let start = new Date().getTime();

			for (let i = 0; i < 1000; i++) {
				for (let did of dids) {
					let doc = store.loadDid(did);
					expect(did.equals(doc.getSubject())).toBeTruthy();

					let id = DIDURL.valueOf(did, "#cred-1");
					let vc = store.loadCredential(id);
					expect(id.equals(vc.getId())).toBeTruthy();
				}
			}

			let end = new Date().getTime();

			log.info("Store loading {} cache took {} milliseconds.", (cached ? "with" : "without"), end - start);
		});
	});

	test("testMultipleStore", ()=>{
		let stores: DIDStore[] = [];
		let docs: DIDDocument[] = [];

		for (let i = 0; i < stores.length; i++) {
			Utils.deleteFile(new File(TestConfig.storeRoot + i));
			stores[i] = DIDStore.open(TestConfig.storeRoot + i);
			expect(stores[i]).not.toBeNull();
			let mnemonic = Mnemonic.getInstance().generate();
			RootIdentity.createFromMnemonic(mnemonic, "", stores[i], TestConfig.storePass);
		}

		for (let i = 0; i < stores.length; i++) {
			docs[i] = stores[i].loadRootIdentity().newDid(TestConfig.storePass);
			expect(docs[i]).not.toBeNull();
		}

		for (let i = 0; i < stores.length; i++) {
			let doc = stores[i].loadDid(docs[i].getSubject());
			expect(doc).not.toBeNull();
			expect(docs[i].toString(true)).toEqual(doc.toString(true));
		}
	});

	test("testOpenStoreOnExistEmptyFolder", ()=>{
		let emptyFolder = new File(TestConfig.tempDir + File.SEPARATOR + "DIDTest-EmptyStore");
		if (emptyFolder.exists())
			emptyFolder.delete();

		emptyFolder.createDirectory();

		let store = DIDStore.open(emptyFolder.getAbsolutePath());
		expect(store).not.toBeNull();

		store.close();
	});

	/*test("testExportAndImportDid", ()=>{
		let storeDir = File.open(TestConfig.storeRoot);

		testData.getInstantData().getIssuerDocument();
		testData.getInstantData().getUser1Document();
		testData.getInstantData().getUser1PassportCredential();
		testData.getInstantData().getUser1TwitterCredential();

		let did = store.listDids().get(0);

		let tempDir = File.open(TestConfig.tempDir);
		tempDir.mkdirs();
		let exportFile = File.open(tempDir, "didexport.json");

		exportFile.writeText(store.exportDid(did, "password", TestConfig.storePass).serialize(true));

		let restoreDir = File.open(tempDir, "restore");
		Utils.deleteFile(restoreDir);
		let store2 = DIDStore.open(restoreDir.getAbsolutePath());
		store2.importDid(exportFile, "password", TestConfig.storePass);

		let path = "data" + File.SEPARATOR + "ids" + File.SEPARATOR + did.getMethodSpecificId();
		let didDir = File.open(storeDir, path);
		let reDidDir = File.open(restoreDir, path);
		expect(didDir.exists()).toBeTruthy();
		expect(reDidDir.exists()).toBeTruthy();
		expect(Utils.equals(reDidDir, didDir)).toBeTruthy();
	});*/

	/*test("testExportAndImportRootIdentity", ()=>{
		let storeDir = File.open(TestConfig.storeRoot);

		testData.getInstantData().getIssuerDocument();
		testData.getInstantData().getUser1Document();
		testData.getInstantData().getUser1PassportCredential();
		testData.getInstantData().getUser1TwitterCredential();

		let id = store.loadRootIdentity().getId();

		let tempDir = File.open(TestConfig.tempDir);
		tempDir.mkdirs();
		let exportFile = File.open(tempDir, "idexport.json");

		store.exportRootIdentity(id, exportFile, "password", TestConfig.storePass);

		let restoreDir = File.open(tempDir, "restore");
		Utils.deleteFile(restoreDir);
		let store2 = DIDStore.open(restoreDir.getAbsolutePath());
		store2.importRootIdentity(exportFile, "password", TestConfig.storePass);

		let path = "data" + File.SEPARATOR + "roots" + File.SEPARATOR + id;
		let privateDir = File.open(storeDir, path);
		let rePrivateDir = File.open(restoreDir, path);
		expect(privateDir.exists()).toBeTruthy();
		expect(rePrivateDir.exists()).toBeTruthy();
		expect(Utils.equals(rePrivateDir, privateDir)).toBeTruthy();
	});*/

	/*test("testExportAndImportStore", ()=>{
		testData.getRootIdentity();

		// Store test data into current store
		testData.getInstantData().getIssuerDocument();
		let user = testData.getInstantData().getUser1Document();
		let vc = user.getCredential("#profile");
		vc.getMetadata().setAlias("MyProfile");
		vc = user.getCredential("#email");
		vc.getMetadata().setAlias("Email");
		vc = testData.getInstantData().getUser1TwitterCredential();
		vc.getMetadata().setAlias("Twitter");
		vc = testData.getInstantData().getUser1PassportCredential();
		vc.getMetadata().setAlias("Passport");

		let tempDir = File.open(TestConfig.tempDir);
		tempDir.mkdirs();
		let exportFile = File.open(tempDir, "storeexport.zip");

		store.exportStore(exportFile, "password", TestConfig.storePass);

		let restoreDir = File.open(tempDir, "restore");
		Utils.deleteFile(restoreDir);
		let store2 = DIDStore.open(restoreDir.getAbsolutePath());
		store2.importStore(exportFile, "password", TestConfig.storePass);

		let storeDir = new File(TestConfig.storeRoot);

		expect(storeDir.exists()).toBeTruthy();
		expect(restoreDir.exists()).toBeTruthy();
		expect(Utils.equals(restoreDir, storeDir)).toBeTruthy();
	});*/
});