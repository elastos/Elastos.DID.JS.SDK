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

import { DIDStore } from "../src/didstore";
import { File } from "../src/filesystemstorage";
import { Logger } from "../src/logger";
import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";

const log = new Logger("DIDStoreTest");

let testData: TestData;
let store: DIDStore;

beforeEach(()=>{
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

	return File.open(relPath);
}

test("testLoadRootIdentityFromEmptyStore", ()=>{
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
	expect(file.exists()).toBeTruthy();

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
		expect(alias).toStrictEqual(resolved.getMetadata().getAlias());
		expect(doc.getSubject()).toStrictEqual(resolved.getSubject());
		expect(doc.getProof().getSignature()).toStrictEqual(resolved.getProof().getSignature());

		expect(resolved.isValid()).toBeTruthy();
	}

	let dids = store.listDids();
	expect(dids.size).toEqual(100);
});

/*@Test
public void testDeleteDID() throws DIDException {
	RootIdentity identity = testData.getRootIdentity();

	// Create test DIDs
	LinkedList<DID> dids = new LinkedList<DID>();
	for (int i = 0; i < 100; i++) {
		String alias = "my did " + i;
		DIDDocument doc = identity.newDid(TestConfig.storePass);
		doc.getMetadata().setAlias(alias);
		doc.publish(TestConfig.storePass);
		dids.add(doc.getSubject());
	}

	for (int i = 0; i < 100; i++) {
		if (i % 5 != 0)
			continue;

		DID did = dids.get(i);

		boolean deleted = store.deleteDid(did);
		assertTrue(deleted);

		File file = getFile("ids", did.getMethodSpecificId());
		assertFalse(file.exists());

		deleted = store.deleteDid(did);
		assertFalse(deleted);
	}

	List<DID> remains = store.listDids();
	assertEquals(80, remains.size());
}
*/

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
	expect(issuer.getProof().getSignature()).toStrictEqual(doc.getProof().getSignature());
	expect(doc.isValid()).toBeTruthy();

	doc = store.loadDid(test.getSubject().toString());
	expect(issuer.getSubject().equals(doc.getSubject())).toBeTruthy();
	expect(issuer.getProof().getSignature()).toStrictEqual(doc.getProof().getSignature());
	expect(doc.isValid()).toBeTruthy();

	let dids = store.listDids();
	expect(dids.size).toEqual(2);
});

/*
@Test
public void testLoadCredentials() throws DIDException, IOException {
	// Store test data into current store
	testData.getInstantData().getIssuerDocument();
	DIDDocument user = testData.getInstantData().getUser1Document();

	VerifiableCredential vc = user.getCredential("#profile");
	vc.getMetadata().setAlias("MyProfile");

	File file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), "credential");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), ".metadata");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	vc = user.getCredential("#email");
	vc.getMetadata().setAlias("Email");

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), "credential");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), ".metadata");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	vc = testData.getInstantData().getUser1TwitterCredential();
	vc.getMetadata().setAlias("Twitter");

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), "credential");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), ".metadata");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	vc = testData.getInstantData().getUser1PassportCredential();
	vc.getMetadata().setAlias("Passport");

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), "credential");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
			"credentials", "#" + vc.getId().getFragment(), ".metadata");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	DIDURL id = new DIDURL(user.getSubject(), "#profile");
	vc = store.loadCredential(id);
	assertEquals("MyProfile", vc.getMetadata().getAlias());
	assertEquals(user.getSubject(), vc.getSubject().getId());
	assertEquals(id, vc.getId());
	assertTrue(vc.isValid());

	// try with full id string
	vc = store.loadCredential(id.toString());
	assertNotNull(vc);
	assertEquals("MyProfile", vc.getMetadata().getAlias());
	assertEquals(user.getSubject(), vc.getSubject().getId());
	assertEquals(id, vc.getId());
	assertTrue(vc.isValid());

	id = new DIDURL(user.getSubject(), "#twitter");
	vc = store.loadCredential(id.toString());
	assertNotNull(vc);
	assertEquals("Twitter", vc.getMetadata().getAlias());
	assertEquals(user.getSubject(), vc.getSubject().getId());
	assertEquals(id, vc.getId());
	assertTrue(vc.isValid());

	vc = store.loadCredential(new DIDURL(user.getSubject(), "#notExist"));
	assertNull(vc);

	id = new DIDURL(user.getSubject(), "#twitter");
	assertTrue(store.containsCredential(id));
	assertTrue(store.containsCredential(id.toString()));
	assertFalse(store.containsCredential(new DIDURL(user.getSubject(), "#notExists")));
}

@Test
public void testListCredentials() throws DIDException, IOException {
	testData.getRootIdentity();

	// Store test data into current store
	testData.getInstantData().getIssuerDocument();
	DIDDocument user = testData.getInstantData().getUser1Document();
	VerifiableCredential vc = user.getCredential("#profile");
	vc.getMetadata().setAlias("MyProfile");
	vc = user.getCredential("#email");
	vc.getMetadata().setAlias("Email");
	vc = testData.getInstantData().getUser1TwitterCredential();
	vc.getMetadata().setAlias("Twitter");
	vc = testData.getInstantData().getUser1PassportCredential();
	vc.getMetadata().setAlias("Passport");

	List<DIDURL> vcs = store.listCredentials(user.getSubject());
	assertEquals(4, vcs.size());

	for (DIDURL id : vcs) {
		assertTrue(id.getFragment().equals("profile")
				|| id.getFragment().equals("email")
				|| id.getFragment().equals("twitter")
				|| id.getFragment().equals("passport"));

		assertTrue(id.getMetadata().getAlias().equals("MyProfile")
				|| id.getMetadata().getAlias().equals("Email")
				|| id.getMetadata().getAlias().equals("Twitter")
				|| id.getMetadata().getAlias().equals("Passport"));
	}
}

@Test
public void testDeleteCredential() throws DIDException, IOException {
	// Store test data into current store
	testData.getInstantData().getIssuerDocument();
	DIDDocument user = testData.getInstantData().getUser1Document();
	VerifiableCredential vc = user.getCredential("#profile");
	vc.getMetadata().setAlias("MyProfile");
	vc = user.getCredential("#email");
	vc.getMetadata().setAlias("Email");
	vc = testData.getInstantData().getUser1TwitterCredential();
	vc.getMetadata().setAlias("Twitter");
	vc = testData.getInstantData().getUser1PassportCredential();
	vc.getMetadata().setAlias("Passport");


	File file = getFile("ids", user.getSubject().getMethodSpecificId(),
			"credentials", "#twitter", "credential");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", user.getSubject().getMethodSpecificId(),
			"credentials", "#twitter", ".metadata");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", user.getSubject().getMethodSpecificId(),
			"credentials", "#passport", "credential");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	file = getFile("ids", user.getSubject().getMethodSpecificId(),
			"credentials", "#passport", ".metadata");
	assertTrue(file.exists());
	assertTrue(file.isFile());

	boolean deleted = store.deleteCredential(new DIDURL(user.getSubject(), "#twitter"));
	assertTrue(deleted);

	deleted = store.deleteCredential(new DIDURL(user.getSubject(), "#passport").toString());
	assertTrue(deleted);

	deleted = store.deleteCredential(user.getSubject().toString() + "#notExist");
	assertFalse(deleted);

	file = getFile("ids", user.getSubject().getMethodSpecificId(),
			"credentials", "#twitter");
	assertFalse(file.exists());

	file = getFile("ids", user.getSubject().getMethodSpecificId(),
			"credentials", "#passport");
	assertFalse(file.exists());

	assertTrue(store.containsCredential(new DIDURL(user.getSubject(), "#email")));
	assertTrue(store.containsCredential(user.getSubject().toString() + "#profile"));

	assertFalse(store.containsCredential(new DIDURL(user.getSubject(), "#twitter")));
	assertFalse(store.containsCredential(user.getSubject().toString() + "#passport"));
}

@Test
public void testChangePassword() throws DIDException {
	RootIdentity identity = testData.getRootIdentity();

	for (int i = 0; i < 10; i++) {
		String alias = "my did " + i;
		DIDDocument doc = identity.newDid(TestConfig.storePass);
		doc.getMetadata().setAlias(alias);
		assertTrue(doc.isValid());

		DIDDocument resolved = doc.getSubject().resolve();
		assertNull(resolved);

		doc.publish(TestConfig.storePass);

		File file = getFile("ids", doc.getSubject().getMethodSpecificId(), "document");
		assertTrue(file.exists());
		assertTrue(file.isFile());

		file = getFile("ids", doc.getSubject().getMethodSpecificId(), ".metadata");
		assertTrue(file.exists());
		assertTrue(file.isFile());

		file = getFile("ids", doc.getSubject().getMethodSpecificId(), "privatekeys", "#primary");
		assertTrue(file.exists());
		assertTrue(file.isFile());

		resolved = doc.getSubject().resolve();
		assertNotNull(resolved);
		store.storeDid(resolved);
		assertEquals(alias, resolved.getMetadata().getAlias());
		assertEquals(doc.getSubject(), resolved.getSubject());
		assertEquals(doc.getProof().getSignature(),
				resolved.getProof().getSignature());

		assertTrue(resolved.isValid());
	}

	List<DID> dids = store.listDids();
	assertEquals(10, dids.size());

	store.changePassword(TestConfig.storePass, "newpasswd");

	dids = store.listDids();
	assertEquals(10, dids.size());

	for (int i = 0; i < 10; i++) {
		String alias = "my did " + i;
		DID did = identity.getDid(i);
		DIDDocument doc = store.loadDid(did);
		assertNotNull(doc);
		assertTrue(doc.isValid());

		File file = getFile("ids", did.getMethodSpecificId(), "document");
		assertTrue(file.exists());
		assertTrue(file.isFile());

		file = getFile("ids", did.getMethodSpecificId(), ".metadata");
		assertTrue(file.exists());
		assertTrue(file.isFile());

		file = getFile("ids", did.getMethodSpecificId(), "privatekeys", "#primary");
		assertTrue(file.exists());
		assertTrue(file.isFile());

		assertEquals(alias, doc.getMetadata().getAlias());
	}

	DIDDocument doc = identity.newDid("newpasswd");
	assertNotNull(doc);
}

@Test
public void testChangePasswordWithWrongPassword() throws DIDException {
	RootIdentity identity = testData.getRootIdentity();

	for (int i = 0; i < 10; i++) {
		String alias = "my did " + i;
		DIDDocument doc = identity.newDid(TestConfig.storePass);
		doc.getMetadata().setAlias(alias);
		assertTrue(doc.isValid());
	}

	List<DID> dids = store.listDids();
	assertEquals(10, dids.size());

	assertThrows(DIDStoreException.class, () -> {
		store.changePassword("wrongpasswd", "newpasswd");
	});
}

@ParameterizedTest
@ValueSource(ints = {1, 2})
public void testCompatibility(int version) throws DIDException, IOException {
	byte[] data = "Hello World".getBytes();

	TestData.CompatibleData cd = testData.getCompatibleData(version);
	cd.loadAll();

	DIDStore store = DIDStore.open(cd.getStoreDir());

	List<DID> dids = store.listDids();
	assertEquals(version == 2 ? 10 : 4, dids.size());

	for (DID did : dids) {
		String alias = String.valueOf(did.getMetadata().getAlias());

		if (alias.equals("Issuer")) {
			List<DIDURL> vcs = store.listCredentials(did);
			assertEquals(1, vcs.size());

			for (DIDURL id : vcs)
				assertNotNull(store.loadCredential(id));
		} else if (alias.equals("User1")) {
			List<DIDURL> vcs = store.listCredentials(did);
			assertEquals(version == 2 ? 5 : 4, vcs.size());

			for (DIDURL id : vcs)
				assertNotNull(store.loadCredential(id));
		} else if (alias.equals("User2")) {
			List<DIDURL> vcs = store.listCredentials(did);
			assertEquals(1, vcs.size());

			for (DIDURL id : vcs)
				assertNotNull(store.loadCredential(id));
		} else if (alias.equals("User3")) {
			List<DIDURL> vcs = store.listCredentials(did);
			assertEquals(0, vcs.size());
		}

		DIDDocument doc = store.loadDid(did);
		if (!doc.isCustomizedDid() || doc.getControllerCount() <= 1) {
			String sig = doc.sign(TestConfig.storePass, data);
			assertTrue(doc.verify(sig, data));
		}
	}
}

@ParameterizedTest
@ValueSource(ints = {1, 2})
public void testCompatibilityNewDIDWithWrongPass(int version) throws DIDException {
	DIDStore store = DIDStore.open(testData.getCompatibleData(version).getStoreDir());
	RootIdentity idenitty = store.loadRootIdentity();

	assertThrows(WrongPasswordException.class, () -> {
		idenitty.newDid("wrongpass");
	});
}

@ParameterizedTest
@ValueSource(ints = {1, 2})
public void testCompatibilityNewDIDandGetDID(int version) throws DIDException {
	DIDStore store = DIDStore.open(testData.getCompatibleData(version).getStoreDir());
	RootIdentity identity = store.loadRootIdentity();

	DIDDocument doc = identity.newDid(TestConfig.storePass);
	assertNotNull(doc);

	store.deleteDid(doc.getSubject());

	DID did = identity.getDid(1000);

	doc = identity.newDid(1000, TestConfig.storePass);
	assertNotNull(doc);
	assertEquals(doc.getSubject(), did);

	store.deleteDid(doc.getSubject());

}

private void createDataForPerformanceTest(DIDStore store)
		throws DIDException {
	Map<String, Object> props= new HashMap<String, Object>();
	props.put("name", "John");
	props.put("gender", "Male");
	props.put("nation", "Singapore");
	props.put("language", "English");
	props.put("email", "john@example.com");
	props.put("twitter", "@john");

	RootIdentity identity = store.loadRootIdentity();

	for (int i = 0; i < 10; i++) {
		String alias = "my did " + i;
		DIDDocument doc = identity.newDid(TestConfig.storePass);
		doc.getMetadata().setAlias(alias);
		Issuer issuer = new Issuer(doc);
		VerifiableCredential.Builder cb = issuer.issueFor(doc.getSubject());
		VerifiableCredential vc = cb.id("#cred-1")
				.type("BasicProfileCredential", "SelfProclaimedCredential")
				.properties(props)
				.seal(TestConfig.storePass);

		store.storeCredential(vc);
	}
}

@ParameterizedTest
@ValueSource(booleans = {false, true})
public void testStoreCachePerformance(boolean cached) throws DIDException {
	Utils.deleteFile(new File(TestConfig.storeRoot));
	DIDStore store = null;
	if (cached)
		store = DIDStore.open(TestConfig.storeRoot);
	else
		store = DIDStore.open(TestConfig.storeRoot, 0, 0);

	String mnemonic =  Mnemonic.getInstance().generate();
	RootIdentity.create(mnemonic, TestConfig.passphrase,
			true, store, TestConfig.storePass);

	createDataForPerformanceTest(store);

	List<DID> dids = store.listDids();
	assertEquals(10, dids.size());

	long start = System.currentTimeMillis();

	for (int i = 0; i < 1000; i++) {
		for (DID did : dids) {
			DIDDocument doc = store.loadDid(did);
			assertEquals(did, doc.getSubject());

			DIDURL id = new DIDURL(did, "#cred-1");
			VerifiableCredential vc = store.loadCredential(id);
			assertEquals(id, vc.getId());
		}
	}

	long end = System.currentTimeMillis();

	log.info("Store loading {} cache took {} milliseconds.",
			(cached ? "with" : "without"), end - start);
}

@Test
public void testMultipleStore() throws DIDException {
	DIDStore[] stores = new DIDStore[10];
	DIDDocument[] docs = new DIDDocument[10];

	for (int i = 0; i < stores.length; i++) {
		Utils.deleteFile(new File(TestConfig.storeRoot + i));
		stores[i] = DIDStore.open(TestConfig.storeRoot + i);
		assertNotNull(stores[i]);
		String mnemonic = Mnemonic.getInstance().generate();
		RootIdentity.create(mnemonic, "", stores[i], TestConfig.storePass);
	}

	for (int i = 0; i < stores.length; i++) {
		docs[i] = stores[i].loadRootIdentity().newDid(TestConfig.storePass);
		assertNotNull(docs[i]);
	}

	for (int i = 0; i < stores.length; i++) {
		DIDDocument doc = stores[i].loadDid(docs[i].getSubject());
		assertNotNull(doc);
		assertEquals(docs[i].toString(true), doc.toString(true));
	}
}

@Test
public void testOpenStoreOnExistEmptyFolder() throws DIDException {
	File emptyFolder = new File(TestConfig.tempDir + File.separator + "DIDTest-EmptyStore");
	if (emptyFolder.exists())
		Utils.deleteFile(emptyFolder);

	emptyFolder.mkdirs();

	DIDStore store = DIDStore.open(emptyFolder);
	assertNotNull(store);

	store.close();
}

@Test
public void testExportAndImportDid() throws DIDException, IOException {
	File storeDir = new File(TestConfig.storeRoot);

	testData.getInstantData().getIssuerDocument();
	testData.getInstantData().getUser1Document();
	testData.getInstantData().getUser1PassportCredential();
	testData.getInstantData().getUser1TwitterCredential();

	DID did = store.listDids().get(0);

	File tempDir = new File(TestConfig.tempDir);
	tempDir.mkdirs();
	File exportFile = new File(tempDir, "didexport.json");

	store.exportDid(did, exportFile, "password", TestConfig.storePass);

	File restoreDir = new File(tempDir, "restore");
	Utils.deleteFile(restoreDir);
	DIDStore store2 = DIDStore.open(restoreDir.getAbsolutePath());
	store2.importDid(exportFile, "password", TestConfig.storePass);

	String path = "data" + File.separator + "ids" + File.separator + did.getMethodSpecificId();
	File didDir = new File(storeDir, path);
	File reDidDir = new File(restoreDir, path);
	assertTrue(didDir.exists());
	assertTrue(reDidDir.exists());
	assertTrue(Utils.equals(reDidDir, didDir));
}

@Test
public void testExportAndImportRootIdentity() throws DIDException, IOException {
	File storeDir = new File(TestConfig.storeRoot);

	testData.getInstantData().getIssuerDocument();
	testData.getInstantData().getUser1Document();
	testData.getInstantData().getUser1PassportCredential();
	testData.getInstantData().getUser1TwitterCredential();

	String id = store.loadRootIdentity().getId();

	File tempDir = new File(TestConfig.tempDir);
	tempDir.mkdirs();
	File exportFile = new File(tempDir, "idexport.json");

	store.exportRootIdentity(id, exportFile, "password", TestConfig.storePass);

	File restoreDir = new File(tempDir, "restore");
	Utils.deleteFile(restoreDir);
	DIDStore store2 = DIDStore.open(restoreDir.getAbsolutePath());
	store2.importRootIdentity(exportFile, "password", TestConfig.storePass);

	String path = "data" + File.separator + "roots" + File.separator + id;
	File privateDir = new File(storeDir, path);
	File rePrivateDir = new File(restoreDir, path);
	assertTrue(privateDir.exists());
	assertTrue(rePrivateDir.exists());
	assertTrue(Utils.equals(rePrivateDir, privateDir));
}

@Test
public void testExportAndImportStore() throws DIDException, IOException {
	testData.getRootIdentity();

	// Store test data into current store
	testData.getInstantData().getIssuerDocument();
	DIDDocument user = testData.getInstantData().getUser1Document();
	VerifiableCredential vc = user.getCredential("#profile");
	vc.getMetadata().setAlias("MyProfile");
	vc = user.getCredential("#email");
	vc.getMetadata().setAlias("Email");
	vc = testData.getInstantData().getUser1TwitterCredential();
	vc.getMetadata().setAlias("Twitter");
	vc = testData.getInstantData().getUser1PassportCredential();
	vc.getMetadata().setAlias("Passport");

	File tempDir = new File(TestConfig.tempDir);
	tempDir.mkdirs();
	File exportFile = new File(tempDir, "storeexport.zip");

	store.exportStore(exportFile, "password", TestConfig.storePass);

	File restoreDir = new File(tempDir, "restore");
	Utils.deleteFile(restoreDir);
	DIDStore store2 = DIDStore.open(restoreDir.getAbsolutePath());
	store2.importStore(exportFile, "password", TestConfig.storePass);

	File storeDir = new File(TestConfig.storeRoot);

	assertTrue(storeDir.exists());
	assertTrue(restoreDir.exists());
	assertTrue(Utils.equals(restoreDir, storeDir));
} */
