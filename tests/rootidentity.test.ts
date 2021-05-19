import { Logger, DIDStore, RootIdentity, DIDDocument, DID } from "../dist/did";
import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";

const log = new Logger("DIDStoreTest");

let testData: TestData;
let store: DIDStore;

describe("RootIdentity Tests", ()=>{
    beforeEach(() => {
    	testData = new TestData();
    	store = testData.getStore();
    });

    afterEach(() => {
    	testData.cleanup();
    });

	test("testInitPrivateIdentity", () => {
    	expect(store.containsRootIdentities()).toBeFalsy();

    	let identity = testData.getRootIdentity();
    	expect(store.containsRootIdentities()).toBeTruthy();

    	let store2 = DIDStore.open(TestConfig.storeRoot);
    	expect(store2.containsRootIdentities()).toBeTruthy();
    	let identity2 = store2.loadRootIdentity();
    	expect(identity2).not.toBeNull();

    	expect(identity.getPreDerivedPublicKey().serializePublicKeyBase58().equals(
    			identity2.getPreDerivedPublicKey().serializePublicKeyBase58())).toBeTruthy();

    	let exportedMnemonic = identity2.exportMnemonic(TestConfig.storePass);
    	expect(testData.getMnemonic()).toEqual(exportedMnemonic);
	});

	test("testInitPrivateIdentityWithMnemonic", () => {
		let expectedIDString = "iY4Ghz9tCuWvB5rNwvn4ngWvthZMNzEA7U";
		let mnemonic = "cloth always junk crash fun exist stumble shift over benefit fun toe";

    	expect(store.containsRootIdentities()).toBeFalsy();

    	RootIdentity.createFromMnemonic(mnemonic, "", store, TestConfig.storePass);
    	expect(store.containsRootIdentities()).toBeTruthy();

    	let store2 = DIDStore.open(TestConfig.storeRoot);
    	expect(store2.containsRootIdentities()).toBeTruthy();

    	let identity2 = store2.loadRootIdentity();

    	let doc = identity2.newDid(TestConfig.storePass);
    	expect(doc).not.toBeNull();
    	expect(expectedIDString).toEqual(doc.getSubject().getMethodSpecificId());
	});

	test("testInitPrivateIdentityWithRootKey", () => {
		let expectedIDString = "iYbPqEA98rwvDyA5YT6a3mu8UZy87DLEMR";
		let rootKey = "xprv9s21ZrQH143K4biiQbUq8369meTb1R8KnstYFAKtfwk3vF8uvFd1EC2s49bMQsbdbmdJxUWRkuC48CXPutFfynYFVGnoeq8LJZhfd9QjvUt";

    	expect(store.containsRootIdentities()).toBeFalsy();

    	RootIdentity.createFromPrivateKey(rootKey, store, TestConfig.storePass);
    	expect(store.containsRootIdentities()).toBeTruthy();

    	let store2 = DIDStore.open(TestConfig.storeRoot);
    	expect(store2.containsRootIdentities()).toBeTruthy();

    	let identity2 = store2.loadRootIdentity();

    	let doc = identity2.newDid(TestConfig.storePass);
    	expect(doc).not.toBeNull();
    	expect(expectedIDString).toEqual(doc.getSubject().getMethodSpecificId());
	});

	test("testCreateDIDWithAlias", () => {
    	let identity = testData.getRootIdentity();

    	let alias = "my first did";

    	let doc = identity.newDid(TestConfig.storePass);
    	doc.getMetadata().setAlias(alias);
    	expect(doc.isValid()).toBeTruthy();

    	let resolved = doc.getSubject().resolve();
    	expect(resolved).toBeNull();

    	doc.publish(TestConfig.storePass);

    	resolved = doc.getSubject().resolve();
    	expect(resolved).not.toBeNull();

    	// test alias
    	store.storeDid(resolved);
    	expect(alias).toEqual(resolved.getMetadata().getAlias());
    	expect(doc.getSubject().equals(resolved.getSubject())).toBeTruthy();
    	expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());

    	expect(resolved.isValid()).toBeTruthy();
	});

	test("testCreateDIDWithoutAlias", () => {
    	let identity = testData.getRootIdentity();

    	let doc = identity.newDid(TestConfig.storePass);
    	expect(doc.isValid()).toBeTruthy();

    	let resolved = doc.getSubject().resolve();
    	expect(resolved).toBeNull();

    	doc.publish(TestConfig.storePass);

    	resolved = doc.getSubject().resolve();
    	expect(resolved).not.toBeNull();
    	expect(doc.getSubject()).toEqual(resolved.getSubject());
    	expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());

    	expect(resolved.isValid()).toBeTruthy();
    });

	test("testCreateDIDByIndex", () => {
	    let identity = testData.getRootIdentity();

	    let did = identity.getDid(0);
	    let doc = identity.newDid(0, TestConfig.storePass);
	    expect(doc.isValid()).toBeTruthy();
	    expect(did.equals(doc.getSubject())).toBeTruthy();

		expect(identity.newDid(TestConfig.storePass)).toThrowError("DID already exists in the store.");

	    let success = store.deleteDid(did);
	    expect(success).toBeTruthy();
	    doc = identity.newDid(TestConfig.storePass);
	    expect(doc.isValid()).toBeTruthy();
	    expect(did.equals(doc.getSubject())).toBeTruthy();
	});

	test("testGetDid", () => {
	    let identity = testData.getRootIdentity();

	    for (let i = 0; i < 100; i++) {
		    let doc = identity.newDid(i, TestConfig.storePass);
		    expect(doc.isValid()).toBeTruthy();

		    let did = identity.getDid(i);

		    expect(doc.getSubject().equals(did)).toBeTruthy();
	    }
	});
});