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

import {
	DIDDocument, DIDStore, Mnemonic, RootIdentity,
	VerifiableCredential, VerifiablePresentation, TransferTicket, Issuer, DIDURL, DID, Exceptions
} from "../../src/index";
import { File } from "../../src/filesystemstorage";
import { TestConfig } from "./testconfig";
import { Utils } from "./utils";
import { HDKey } from "../../src/crypto/hdkey";
import { readdir } from "fs";
import { JSONObject, JSONValue } from "../../src/json";
export class TestData {
	// HDKey for temporary key generation
	private static rootKey: HDKey;
	private static index: number;

	store: DIDStore;
	mnemonic: string;
	identity: RootIdentity;

	private v1: CompatibleData;
	private v2: CompatibleData;
	private instantData: InstantData;

	public constructor() {
		TestConfig.initialize();
    	Utils.deleteFile(new File(TestConfig.storeRoot));
		this.store = DIDStore.open(TestConfig.storeRoot);
	}

	public cleanup() {
		if (this.store != null)
			this.store.close();

		/* DIDTestExtension.resetData();
		DIDBackend.getInstance().clearCache(); */
	}

	public static generateKeypair(): HDKey {
		if (this.rootKey == null) {
	    	let mnemonic =  new Mnemonic().generate();
	    	this.rootKey = HDKey.newWithMnemonic(mnemonic, "");
	    	this.index = 0;
		}

		return this.rootKey.deriveWithPath(HDKey.DERIVE_PATH_PREFIX + this.index++);
	}

	public getStore(): DIDStore {
    	return this.store;
	}

	public getRootIdentity(): RootIdentity {
		if (this.identity == null) {
	    	this.mnemonic = new Mnemonic().generate();
	    	this.identity = RootIdentity.createFromMnemonic(this.mnemonic, TestConfig.passphrase,
	    			this.store, TestConfig.storePass, true);
		}

    	return this.identity;
	}

	public getMnemonic(): string {
		return this.mnemonic;
	}

	public getCompatibleData(version: number): CompatibleData {
		switch (version) {
		case 1:
			if (this.v1 == null)
				this.v1 = new CompatibleData(this, version);
			return this.v1;

		case 2:
			if (this.v2 == null)
				this.v2 = new CompatibleData(this, version);
			return this.v2;

		default:
			throw new Exceptions.IllegalArgumentException("Unsupported version");
		}
	}

	public getInstantData(): InstantData {
		if (this.instantData == null)
			this.instantData = new InstantData(this);

		return this.instantData;
	}

	/*public void waitForWalletAvaliable() throws DIDException {
		// need synchronize?
		if (DIDTestExtension.getAdapter() instanceof SPVAdapter) {
			SPVAdapter spvAdapter = (SPVAdapter)DIDTestExtension.getAdapter();

			System.out.print("Waiting for wallet available...");
			long start = System.currentTimeMillis();
			while (true) {
				try {
					Thread.sleep(30000);
				} catch (InterruptedException ignore) {
				}

				if (spvAdapter.isAvailable()) {
					long duration = (System.currentTimeMillis() - start + 500) / 1000;
					System.out.println("OK(" + duration + "s)");
					break;
				}
			}
		}
	}*/
}

export class CompatibleData {
	private dataPath: string;
	private storePath: string;
	private data = {};
	private version: number;

	public constructor(private testData: TestData, version: number) {
		this.data = {};

		this.dataPath = "data/v" + version.toString() + "/testdata/";
		this.storePath = "data/v" + version.toString() + "/teststore/";
		this.version = version;
	}

	public isLatestVersion(): boolean {
		return this.version == 2;
	}

	private fileContent(path: string): string {
		let content = "";
		fetch(path)
		.then(response => response.text())
		.then(data => {
			content = data;
		});

		return content;
	}

	private dirContent(path: string): string[] {
		let files: string[];
		readdir(path, (err: Error, list: string[]) => {
			files = list;
		});
		return files;
	}

	private getDidFile(name: string, type: string): string {
		let fileName = name + ".id";
		if (type != null)
			fileName += "." + type;
		fileName += ".json";

		return this.fileContent(this.dataPath + fileName);
	}

	private getCredentialFile(did: string, vc: string, type: string): string {
		let fileName = did + ".vc." + vc;
		if (type != null)
			fileName += "." + type;
		fileName += ".json";

		return this.fileContent(this.dataPath + fileName);
	}

	private getPresentationFile(did: string, vp: string, type: string): string {
		let fileName = did + ".vp." + vp;
		if (type != null)
			fileName += "." + type;
		fileName += ".json";

		return this.fileContent(this.dataPath + fileName);
	}

	public getDocument(did: string, type: string = null): DIDDocument {
		let baseKey = "res:did:" + did;
		let key = type != null ? baseKey + ":" + type : baseKey;
		if (key in this.data)
			return this.data[key];

		// load the document
		let doc = DIDDocument.parseContent(this.getDidFile(did, type));

		if (!(baseKey in this.data)) {
			// If not stored before, store it and load private keys
			this.testData.store.storeDid(doc);
			let kfs = this.dirContent(this.dataPath).filter((fileName: string, index: number, array: string []) => {
				return fileName.startsWith(did + ".id.") && fileName.endsWith(".sk");
			});
			
			for (let kf of kfs) {
				let start = did.length + 4;
				let end = kf.length - 3;
				let fragment = kf.substring(start, end);
				let id = DIDURL.newWithDID(doc.getSubject(), "#" + fragment);

				let sk = HDKey.deserializeBase58(this.fileContent(kf)).serialize();
				this.testData.store.storePrivateKey(id, sk, TestConfig.storePass);
			}

			switch (did) {
			case "foobar":
			case "foo":
			case "bar":
			case "baz":
				doc.publish(TestConfig.storePass, this.getDocument("user1").getDefaultPublicKeyId());
				break;

			default:
				doc.publish(TestConfig.storePass);
			}
		}

		this.data[key] = doc;
		return doc;
	}

/*
	public synchronized String getDocumentJson(String did, String type)
			throws IOException {
		File file = getDidFile(did, type);
		String key = "res:json:" + file.getName();
		if (data.containsKey(key))
			return (String)data.get(key);

		// load the document
		String text = loadText(file);
		data.put(key, text);
		return text;
	}

	public synchronized VerifiableCredential getCredential(String did, String vc, String type)
			throws DIDException, IOException {
		// Load DID document first for verification
		getDocument(did);

		String baseKey = "res:vc:" + did + ":" + vc;
		String key = type != null ? baseKey + ":" + type : baseKey;
		if (data.containsKey(key))
			return (VerifiableCredential)data.get(key);

		// load the credential
		VerifiableCredential credential = VerifiableCredential.parse(
				getCredentialFile(did, vc, type));

		// If not stored before, store it
		if (!data.containsKey(baseKey))
			store.storeCredential(credential);

		data.put(key, credential);
		return credential;
	}

	public VerifiableCredential getCredential(String did, String vc)
			throws DIDException, IOException {
		return getCredential(did, vc, null);
	}

	public synchronized String getCredentialJson(String did, String vc, String type)
			throws IOException {
		File file = getCredentialFile(did, vc, type);
		String key = "res:json:" + file.getName();
		if (data.containsKey(key))
			return (String)data.get(key);

		// load the document
		String text = loadText(file);
		data.put(key, text);
		return text;
	}

	public synchronized VerifiablePresentation getPresentation(String did, String vp, String type)
			throws DIDException, IOException {
		// Load DID document first for verification
		getDocument(did);

		String baseKey = "res:vp:" + did + ":" + vp;
		String key = type != null ? baseKey + ":" + type : baseKey;
		if (data.containsKey(key))
			return (VerifiablePresentation)data.get(key);

		// load the presentation
		VerifiablePresentation presentation = VerifiablePresentation.parse(
				getPresentationFile(did, vp, type));

		data.put(key, presentation);
		return presentation;
	}

	public VerifiablePresentation getPresentation(String did, String vp)
			throws DIDException, IOException {
		return getPresentation(did, vp, null);
	}

	public synchronized String getPresentationJson(String did, String vp, String type)
			throws IOException {
		File file = getPresentationFile(did, vp, type);
		String key = "res:json:" + file.getName();
		if (data.containsKey(key))
			return (String)data.get(key);

		// load the document
		String text = loadText(file);
		data.put(key, text);
		return text;
	}
*/
	public getStoreDir(): string {
		return this.storePath;
	}

	public loadAll() {
		this.getDocument("issuer");
		this.getDocument("user1");
		this.getDocument("user2");
		this.getDocument("user3");

		if (this.version == 2) {
			this.getDocument("user4");
			this.getDocument("examplecorp");
			this.getDocument("foobar");
			this.getDocument("foo");
			this.getDocument("bar");
			this.getDocument("baz");
		}
	}
}

export class InstantData {
	private idIssuer: DIDDocument;
	private idUser1: DIDDocument;
	private idUser2: DIDDocument;
	private idUser3: DIDDocument;
	private idUser4: DIDDocument;

	private vcUser1Passport: VerifiableCredential;	// Issued by idIssuer
	private vcUser1Twitter: VerifiableCredential;	// Self-proclaimed
	private vcUser1Json: VerifiableCredential;		// Issued by idIssuer with complex JSON subject
	private vpUser1Nonempty: VerifiablePresentation;
	private vpUser1Empty: VerifiablePresentation;

	private idExampleCorp: DIDDocument; 	// Controlled by idIssuer
	private idFooBar: DIDDocument; 		// Controlled by User1, User2, User3 (2/3)
	private idFoo: DIDDocument; 			// Controlled by User1, User2 (2/2)
	private idBar: DIDDocument;			// Controlled by User1, User2, User3 (3/3)
	private idBaz: DIDDocument;			// Controlled by User1, User2, User3 (1/3)

	private vcFooBarServices: VerifiableCredential;	// Self-proclaimed
	private vcFooBarLicense: VerifiableCredential;	// Issued by idExampleCorp
	private vcFooEmail: VerifiableCredential;		// Issued by idIssuer

	private vpFooBarNonempty: VerifiablePresentation;
	private vpFooBarEmpty: VerifiablePresentation;

	private vcUser1JobPosition: VerifiableCredential;// Issued by idExampleCorp

	private ttFooBar: TransferTicket;
	private ttBaz: TransferTicket;

	constructor(private testData: TestData) {}

	public getIssuerDocument(): DIDDocument {
		if (this.idIssuer == null) {
			this.testData.getRootIdentity();

			let doc = this.testData.identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias("Issuer");

			let selfIssuer = new Issuer(doc);
			let cb = selfIssuer.issueFor(doc.getSubject());

			let props = {
				name: "Test Issuer",
				nation: "Singapore",
				language: "English",
				email: "issuer@example.com"
			}

			let vc = cb.id("#profile")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			let db = doc.edit();
			db.addCredential(vc);

			let key = TestData.generateKeypair();
			let id = DIDURL.valueOf(doc.getSubject(), "#key2");
			db.addAuthenticationKey(id, key.getPublicKeyBase58());
			this.testData.store.storePrivateKey(id, key.serialize(), TestConfig.storePass);

			// No private key for testKey
			key = TestData.generateKeypair();
			id = DIDURL.valueOf(doc.getSubject(), "#testKey");
			db.addAuthenticationKey(id, key.getPublicKeyBase58());

			// No private key for recovery
			key = TestData.generateKeypair();
			id = DIDURL.valueOf(doc.getSubject(), "#recovery");
			db.addAuthorizationKey(id, new DID("did:elastos:" + key.getAddress()),
					key.getPublicKeyBase58());

			doc = db.seal(TestConfig.storePass);
			this.testData.store.storeDid(doc);
			doc.publish(TestConfig.storePass);

			this.idIssuer = doc;
		}

		return this.idIssuer;
	}

	public getUser1Document(): DIDDocument {
		if (this.idUser1 == null) {
			this.getIssuerDocument();

			let doc = this.testData.identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias("User1");

			// Test document with two embedded credentials
			let db = doc.edit();

			let temp = TestData.generateKeypair();
			db.addAuthenticationKey("#key2", temp.getPublicKeyBase58());
			this.testData.store.storePrivateKey(DIDURL.valueOf(doc.getSubject(), "#key2"),
					temp.serialize(), TestConfig.storePass);

			temp = TestData.generateKeypair();
			db.addAuthenticationKey("#key3", temp.getPublicKeyBase58());
			this.testData.store.storePrivateKey(DIDURL.valueOf(doc.getSubject(), "#key3"),
					temp.serialize(), TestConfig.storePass);

			temp = TestData.generateKeypair();
			db.addAuthorizationKey("#recovery",
					"did:elastos:" + temp.getAddress(),
					temp.getPublicKeyBase58());

			db.addService("#openid", "OpenIdConnectVersion1.0Service",
					"https://openid.example.com/");
			db.addService("#vcr", "CredentialRepositoryService",
					"https://did.example.com/credentials");

			let map: JSONValue = {
				abc: "helloworld",
				foo: 123,
				bar: "foobar",
				date: (new Date()).toISOString(),
				ABC: "Helloworld",
				FOO: 678,
				BAR: "Foobar",
				FOOBAR: "Lalala...",
				DATE: (new Date()).toISOString()
			};

			let props: JSONObject = {
				abc: "helloworld",
				foo: 123,
				bar: "foobar",
				date: (new Date()).toISOString(),
				ABC: "Helloworld",
				FOO: 678,
				BAR: "Foobar",
				FOOBAR: "Lalala...",
				DATE: (new Date()).toISOString(),
				MAP: map
			};

			db.addService("#carrier", "CarrierAddress",
					"carrier://X2tDd1ZTErwnHNot8pTdhp7C7Y9FxMPGD8ppiasUT4UsHH2BpF1d", map);

			let selfIssuer = new Issuer(doc);
			let cb = selfIssuer.issueFor(doc.getSubject());

			props = {
				"name": "John",
				"gender": "Male",
				"nation": "Singapore",
				"language": "English",
				"email": "john@example.com",
				"twitter": "@john"
			}

			let vcProfile = cb.id("#profile")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			let kycIssuer = new Issuer(this.idIssuer);
			cb = kycIssuer.issueFor(doc.getSubject());

			props = {
				"email": "john@example.com"
			};

			let vcEmail = cb.id("#email")
					.type("BasicProfileCredential",
							"InternetAccountCredential", "EmailCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			db.addCredential(vcProfile);
			db.addCredential(vcEmail);
			doc = db.seal(TestConfig.storePass);
			this.testData.store.storeDid(doc);
			doc.publish(TestConfig.storePass);

			this.idUser1 = doc;
		}

		return this.idUser1;
	}

	public getUser1PassportCredential(): VerifiableCredential {
		if (this.vcUser1Passport == null) {
			let doc = this.getUser1Document();

			let id = DIDURL.newWithDID(doc.getSubject(), "#passport");

			let selfIssuer = new Issuer(doc);
			let cb = selfIssuer.issueFor(doc.getSubject());

			let props = {
				"nation": "Singapore",
				"passpord": "S653258Z07"
			}

			let vcPassport = cb.id(id)
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			vcPassport.getMetadata().setAlias("Passport");
			this.testData.store.storeCredential(vcPassport);

			this.vcUser1Passport = vcPassport;
		}

		return this.vcUser1Passport;
	}

	public getUser1TwitterCredential(): VerifiableCredential{
		if (this.vcUser1Twitter == null) {
			let doc = this.getUser1Document();

			let id = DIDURL.newWithDID(doc.getSubject(), "#twitter");

			let kycIssuer = new Issuer(this.idIssuer);
			let cb = kycIssuer.issueFor(doc.getSubject());

			let props = {
				"twitter": "@john"
			}

			let vcTwitter = cb.id(id)
					.type("InternetAccountCredential", "TwitterCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			vcTwitter.getMetadata().setAlias("Twitter");
			this.testData.store.storeCredential(vcTwitter);

			this.vcUser1Twitter = vcTwitter;
		}

		return this.vcUser1Twitter;
	}
/*
	public synchronized VerifiableCredential getUser1JsonCredential() throws DIDException {
		if (vcUser1Json == null) {
			DIDDocument doc = getUser1Document();

			DIDURL id = new DIDURL(doc.getSubject(), "#json");

			Issuer kycIssuer = new Issuer(idIssuer);
			VerifiableCredential.Builder cb = kycIssuer.issueFor(doc.getSubject());

			String jsonProps = "{\"name\":\"Jay Holtslander\",\"alternateName\":\"Jason Holtslander\",\"booleanValue\":true,\"numberValue\":1234,\"doubleValue\":9.5,\"nationality\":\"Canadian\",\"birthPlace\":{\"type\":\"Place\",\"address\":{\"type\":\"PostalAddress\",\"addressLocality\":\"Vancouver\",\"addressRegion\":\"BC\",\"addressCountry\":\"Canada\"}},\"affiliation\":[{\"type\":\"Organization\",\"name\":\"Futurpreneur\",\"sameAs\":[\"https://twitter.com/futurpreneur\",\"https://www.facebook.com/futurpreneur/\",\"https://www.linkedin.com/company-beta/100369/\",\"https://www.youtube.com/user/CYBF\"]}],\"alumniOf\":[{\"type\":\"CollegeOrUniversity\",\"name\":\"Vancouver Film School\",\"sameAs\":\"https://en.wikipedia.org/wiki/Vancouver_Film_School\",\"year\":2000},{\"type\":\"CollegeOrUniversity\",\"name\":\"CodeCore Bootcamp\"}],\"gender\":\"Male\",\"Description\":\"Technologist\",\"disambiguatingDescription\":\"Co-founder of CodeCore Bootcamp\",\"jobTitle\":\"Technical Director\",\"worksFor\":[{\"type\":\"Organization\",\"name\":\"Skunkworks Creative Group Inc.\",\"sameAs\":[\"https://twitter.com/skunkworks_ca\",\"https://www.facebook.com/skunkworks.ca\",\"https://www.linkedin.com/company/skunkworks-creative-group-inc-\",\"https://plus.google.com/+SkunkworksCa\"]}],\"url\":\"https://jay.holtslander.ca\",\"image\":\"https://s.gravatar.com/avatar/961997eb7fd5c22b3e12fb3c8ca14e11?s=512&r=g\",\"address\":{\"type\":\"PostalAddress\",\"addressLocality\":\"Vancouver\",\"addressRegion\":\"BC\",\"addressCountry\":\"Canada\"},\"sameAs\":[\"https://twitter.com/j_holtslander\",\"https://pinterest.com/j_holtslander\",\"https://instagram.com/j_holtslander\",\"https://www.facebook.com/jay.holtslander\",\"https://ca.linkedin.com/in/holtslander/en\",\"https://plus.google.com/+JayHoltslander\",\"https://www.youtube.com/user/jasonh1234\",\"https://github.com/JayHoltslander\",\"https://profiles.wordpress.org/jasonh1234\",\"https://angel.co/j_holtslander\",\"https://www.foursquare.com/user/184843\",\"https://jholtslander.yelp.ca\",\"https://codepen.io/j_holtslander/\",\"https://stackoverflow.com/users/751570/jay\",\"https://dribbble.com/j_holtslander\",\"http://jasonh1234.deviantart.com/\",\"https://www.behance.net/j_holtslander\",\"https://www.flickr.com/people/jasonh1234/\",\"https://medium.com/@j_holtslander\"]}";

			VerifiableCredential vcJson = cb.id(id)
					.type("TestCredential", "JsonCredential")
					.properties(jsonProps)
					.seal(TestConfig.storePass);
			vcJson.getMetadata().setAlias("json");
			store.storeCredential(vcJson);

			vcUser1Json = vcJson;
		}

		return vcUser1Json;
	}

	public synchronized VerifiableCredential getUser1JobPositionCredential() throws DIDException {
		if (vcUser1JobPosition == null) {
			getExampleCorpDocument();

			DIDDocument doc = getUser1Document();

			DIDURL id = new DIDURL(doc.getSubject(), "#email");

			Issuer kycIssuer = new Issuer(idExampleCorp);
			VerifiableCredential.Builder cb = kycIssuer.issueFor(doc.getSubject());

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("title", "CEO");

			VerifiableCredential vc = cb.id(id)
					.type("JobPositionCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			store.storeCredential(vc);

			vcUser1JobPosition = vc;
		}

		return vcUser1JobPosition;
	}

	public synchronized VerifiablePresentation getUser1NonemptyPresentation() throws DIDException {
		if (vpUser1Nonempty == null) {
			DIDDocument doc = getUser1Document();

			VerifiablePresentation.Builder pb = VerifiablePresentation.createFor(
					doc.getSubject(), store);

			VerifiablePresentation vp = pb
					.credentials(doc.getCredential("#profile"), doc.getCredential("#email"))
					.credentials(getUser1PassportCredential())
					.credentials(getUser1TwitterCredential())
					.credentials(getUser1JobPositionCredential())
					.realm("https://example.com/")
					.nonce("873172f58701a9ee686f0630204fee59")
					.seal(TestConfig.storePass);

			vpUser1Nonempty = vp;
		}

		return vpUser1Nonempty;
	}

	public synchronized VerifiablePresentation getUser1EmptyPresentation() throws DIDException {
		if (vpUser1Empty == null) {
			DIDDocument doc = getUser1Document();

			VerifiablePresentation.Builder pb = VerifiablePresentation.createFor(
					doc.getSubject(), store);

			VerifiablePresentation vp = pb.realm("https://example.com/")
					.nonce("873172f58701a9ee686f0630204fee59")
					.seal(TestConfig.storePass);

			vpUser1Empty = vp;
		}

		return vpUser1Empty;
	}

	public synchronized DIDDocument getUser2Document() throws DIDException {
		if (idUser2 == null) {
			DIDDocument doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias("User2");

			DIDDocument.Builder db = doc.edit();

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("name", "John");
			props.put("gender", "Male");
			props.put("nation", "Singapore");
			props.put("language", "English");
			props.put("email", "john@example.com");
			props.put("twitter", "@john");

			db.addCredential("#profile", props, TestConfig.storePass);
			doc = db.seal(TestConfig.storePass);
			store.storeDid(doc);
			doc.publish(TestConfig.storePass);

			idUser2 = doc;
		}

		return idUser2;
	}

	public synchronized DIDDocument getUser3Document() throws DIDException {
		if (idUser3 == null) {
			DIDDocument doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias("User3");
			doc.publish(TestConfig.storePass);

			idUser3 = doc;
		}

		return idUser3;
	}

	public synchronized DIDDocument getUser4Document() throws DIDException {
		if (idUser4 == null) {
			DIDDocument doc = identity.newDid(TestConfig.storePass);
			doc.getMetadata().setAlias("User4");
			doc.publish(TestConfig.storePass);

			idUser4 = doc;
		}

		return idUser4;
	}

	public synchronized DIDDocument getExampleCorpDocument() throws DIDException {
		if (idExampleCorp == null) {
			getIssuerDocument();

			DID did = new DID("did:elastos:example");
			DIDDocument doc = idIssuer.newCustomizedDid(did, TestConfig.storePass);

			Issuer selfIssuer = new Issuer(doc);
			VerifiableCredential.Builder cb = selfIssuer.issueFor(doc.getSubject());

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("name", "Example LLC");
			props.put("website", "https://example.com/");
			props.put("email", "contact@example.com");

			VerifiableCredential vc = cb.id("#profile")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			DIDDocument.Builder db = doc.edit();
			db.addCredential(vc);

			HDKey key = TestData.generateKeypair();
			DIDURL id = new DIDURL(doc.getSubject(), "#key2");
			db.addAuthenticationKey(id, key.getPublicKeyBase58());
			store.storePrivateKey(id, key.serialize(), TestConfig.storePass);

			// No private key for testKey
			key = TestData.generateKeypair();
			id = new DIDURL(doc.getSubject(), "#testKey");
			db.addAuthenticationKey(id, key.getPublicKeyBase58());

			doc = db.seal(TestConfig.storePass);
			store.storeDid(doc);
			doc.publish(TestConfig.storePass);

			idExampleCorp = doc;
		}

		return idExampleCorp;
	}

	public synchronized DIDDocument getFooBarDocument() throws DIDException {
		if (idFooBar == null) {
			getExampleCorpDocument();
			getUser1Document();
			getUser2Document();
			getUser3Document();

			DID[] controllers = {idUser1.getSubject(), idUser2.getSubject(), idUser3.getSubject()};
			DID did = new DID("did:elastos:foobar");
			DIDDocument doc = idUser1.newCustomizedDid(did, controllers, 2, TestConfig.storePass);
			DIDURL signKey = idUser1.getDefaultPublicKeyId();

			// Add public keys embedded credentials
			DIDDocument.Builder db = doc.edit(idUser1);

			HDKey temp = TestData.generateKeypair();
			db.addAuthenticationKey("#key2", temp.getPublicKeyBase58());
			store.storePrivateKey(new DIDURL(doc.getSubject(), "#key2"),
					temp.serialize(), TestConfig.storePass);

			temp = TestData.generateKeypair();
			db.addAuthenticationKey("#key3", temp.getPublicKeyBase58());
			store.storePrivateKey(new DIDURL(doc.getSubject(), "#key3"),
					temp.serialize(), TestConfig.storePass);

			db.addService("#vault", "Hive.Vault.Service",
					"https://foobar.com/vault");

			Map<String, Object> map = new HashMap<String, Object>();
			map.put("abc", "helloworld");
			map.put("foo", 123);
			map.put("bar", "foobar");
			map.put("foobar", "lalala...");
			map.put("date", Calendar.getInstance().getTime());
			map.put("ABC", "Helloworld");
			map.put("FOO", 678);
			map.put("BAR", "Foobar");
			map.put("FOOBAR", "Lalala...");
			map.put("DATE", Calendar.getInstance().getTime());

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("abc", "helloworld");
			props.put("foo", 123);
			props.put("bar", "foobar");
			props.put("foobar", "lalala...");
			props.put("date", Calendar.getInstance().getTime());
			props.put("map", map);
			props.put("ABC", "Helloworld");
			props.put("FOO", 678);
			props.put("BAR", "Foobar");
			props.put("FOOBAR", "Lalala...");
			props.put("DATE", Calendar.getInstance().getTime());
			props.put("MAP", map);

			db.addService("#vcr", "CredentialRepositoryService",
					"https://foobar.com/credentials", props);

			Issuer selfIssuer = new Issuer(doc, signKey);
			VerifiableCredential.Builder cb = selfIssuer.issueFor(doc.getSubject());

			props = new HashMap<String, Object>();
			props.put("name", "Foo Bar Inc");
			props.put("language", "Chinese");
			props.put("email", "contact@foobar.com");

			VerifiableCredential vcProfile = cb.id("#profile")
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			Issuer kycIssuer = new Issuer(idExampleCorp);
			cb = kycIssuer.issueFor(doc.getSubject());

			props.clear();
			props.put("email", "foobar@example.com");

			VerifiableCredential vcEmail = cb.id("#email")
					.type("BasicProfileCredential",
							"InternetAccountCredential", "EmailCredential")
					.properties(props)
					.seal(TestConfig.storePass);

			db.addCredential(vcProfile);
			db.addCredential(vcEmail);
			doc = db.seal(TestConfig.storePass);
			doc = idUser3.sign(doc, TestConfig.storePass);
			store.storeDid(doc);
			doc.publish(signKey, TestConfig.storePass);

			idFooBar = doc;
		}

		return idFooBar;
	}

	public synchronized VerifiableCredential getFooBarServiceCredential() throws DIDException {
		if (vcFooBarServices == null) {
			DIDDocument doc = getFooBarDocument();

			DIDURL id = new DIDURL(doc.getSubject(), "#services");

			Issuer selfIssuer = new Issuer(doc, idUser1.getDefaultPublicKeyId());
			VerifiableCredential.Builder cb = selfIssuer.issueFor(doc.getSubject());

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("consultation", "https://foobar.com/consultation");
			props.put("Outsourceing", "https://foobar.com/outsourcing");

			VerifiableCredential vc = cb.id(id)
					.type("BasicProfileCredential", "SelfProclaimedCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			store.storeCredential(vc);

			vcFooBarServices = vc;
		}

		return vcFooBarServices;
	}

	public synchronized VerifiableCredential getFooBarLicenseCredential() throws DIDException {
		if (vcFooBarLicense == null) {
			getExampleCorpDocument();
			getUser1Document();
			getUser2Document();
			getUser3Document();

			DIDDocument doc = getFooBarDocument();

			DIDURL id = new DIDURL(doc.getSubject(), "#license");

			Issuer kycIssuer = new Issuer(idExampleCorp);
			VerifiableCredential.Builder cb = kycIssuer.issueFor(doc.getSubject());

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("license-id", "20201021C889");
			props.put("scope", "Consulting");

			VerifiableCredential vc = cb.id(id)
					.type("LicenseCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			store.storeCredential(vc);

			vcFooBarLicense = vc;
		}

		return vcFooBarLicense;
	}

	public synchronized VerifiablePresentation getFooBarNonemptyPresentation() throws DIDException {
		if (vpFooBarNonempty == null) {
			DIDDocument doc = getFooBarDocument();

			VerifiablePresentation.Builder pb = VerifiablePresentation.createFor(
					doc.getSubject(), idUser1.getDefaultPublicKeyId(), store);

			VerifiablePresentation vp = pb
					.credentials(doc.getCredential("#profile"),
							doc.getCredential("#email"))
					.credentials(getFooBarServiceCredential())
					.credentials(getFooBarLicenseCredential())
					.realm("https://example.com/")
					.nonce("873172f58701a9ee686f0630204fee59")
					.seal(TestConfig.storePass);

			vpFooBarNonempty = vp;
		}

		return vpFooBarNonempty;
	}

	public synchronized VerifiablePresentation getFooBarEmptyPresentation() throws DIDException {
		if (vpFooBarEmpty == null) {
			DIDDocument doc = getFooBarDocument();

			VerifiablePresentation.Builder pb = VerifiablePresentation.createFor(
					doc.getSubject(), new DIDURL("did:elastos:foobar#key2"), store);

			VerifiablePresentation vp = pb.realm("https://example.com/")
					.nonce("873172f58701a9ee686f0630204fee59")
					.seal(TestConfig.storePass);

			vpFooBarEmpty = vp;
		}

		return vpFooBarEmpty;
	}

	public synchronized TransferTicket getFooBarTransferTicket() throws DIDException {
		if (ttFooBar == null) {
			DIDDocument doc = getFooBarDocument();
			DIDDocument user4 = getUser4Document();

			TransferTicket tt = idUser1.createTransferTicket(doc.getSubject(), user4.getSubject(), TestConfig.storePass);
			tt = idUser3.sign(tt, TestConfig.storePass);

			ttFooBar = tt;
		}

		return ttFooBar;
	}

	public synchronized DIDDocument getFooDocument() throws DIDException {
		if (idFoo == null) {
			getUser1Document();
			getUser2Document();

			DID[] controllers = {idUser2.getSubject()};
			DID did = new DID("did:elastos:foo");
			DIDDocument doc = idUser1.newCustomizedDid(did, controllers, 2, TestConfig.storePass);
			doc = idUser2.sign(doc, TestConfig.storePass);
			store.storeDid(doc);

			doc.setEffectiveController(idUser2.getSubject());
			doc.publish(TestConfig.storePass);
			doc.setEffectiveController(null);

			idFoo = doc;
		}

		return idFoo;
	}

	public synchronized VerifiableCredential getFooEmailCredential() throws DIDException {
		if (vcFooEmail == null) {
			getIssuerDocument();

			DIDDocument doc = getFooDocument();

			DIDURL id = new DIDURL(doc.getSubject(), "#email");

			Issuer kycIssuer = new Issuer(idIssuer);
			VerifiableCredential.Builder cb = kycIssuer.issueFor(doc.getSubject());

			Map<String, Object> props = new HashMap<String, Object>();
			props.put("email", "foo@example.com");

			VerifiableCredential vc = cb.id(id)
					.type("InternetAccountCredential")
					.properties(props)
					.seal(TestConfig.storePass);
			store.storeCredential(vc);

			vcFooEmail = vc;
		}

		return vcFooEmail;
	}

	public synchronized DIDDocument getBarDocument() throws DIDException {
		if (idBar == null) {
			getUser1Document();
			getUser2Document();
			getUser3Document();

			DID[] controllers = {idUser2.getSubject(), idUser3.getSubject()};
			DID did = new DID("did:elastos:bar");
			DIDDocument doc = idUser1.newCustomizedDid(did, controllers, 3, TestConfig.storePass);
			doc = idUser2.sign(doc, TestConfig.storePass);
			doc = idUser3.sign(doc, TestConfig.storePass);
			store.storeDid(doc);
			doc.publish(idUser3.getDefaultPublicKeyId(), TestConfig.storePass);

			idBar = doc;
		}

		return idBar;
	}

	public synchronized DIDDocument getBazDocument() throws DIDException {
		if (idBaz == null) {
			getUser1Document();
			getUser2Document();
			getUser3Document();

			DID[] controllers = {idUser2.getSubject(), idUser3.getSubject()};
			DID did = new DID("did:elastos:baz");
			DIDDocument doc = idUser1.newCustomizedDid(did, controllers, 1, TestConfig.storePass);
			store.storeDid(doc);
			doc.publish(idUser1.getDefaultPublicKeyId(), TestConfig.storePass);

			idBaz = doc;
		}

		return idBaz;
	}

	public synchronized TransferTicket getBazTransferTicket() throws DIDException {
		if (ttBaz == null) {
			DIDDocument doc = getBazDocument();
			DIDDocument user4 = getUser4Document();

			TransferTicket tt = idUser2.createTransferTicket(doc.getSubject(), user4.getSubject(), TestConfig.storePass);

			ttBaz = tt;
		}

		return ttBaz;
	}

	public DIDDocument getDocument(String did) throws DIDException {
		switch (did) {
		case "issuer":
			return getIssuerDocument();

		case "user1":
			return getUser1Document();

		case "user2":
			return getUser1Document();

		case "user3":
			return getUser1Document();

		case "user4":
			return getUser1Document();

		case "examplecorp":
			return getExampleCorpDocument();

		case "foobar":
			return getFooBarDocument();

		case "foo":
			return getFooDocument();

		case "bar":
			return getBarDocument();

		case "baz":
			return getBazDocument();

		default:
			return null;
		}
	}

	public VerifiableCredential getCredential(String did, String vc) throws DIDException {
		switch (did) {
		case "user1":
			switch (vc) {
			case "passport":
				return getUser1PassportCredential();

			case "twitter":
				return getUser1TwitterCredential();

			case "json":
				return getUser1JsonCredential();

			case "jobposition":
				return getUser1JobPositionCredential();

			default:
				return null;
			}

		case "foobar":
			switch (vc) {
			case "services":
				return getFooBarServiceCredential();

			case "license":
				return getFooBarLicenseCredential();

			default:
				return null;
			}

		case "foo":
			switch (vc) {
			case "email":
				return getFooEmailCredential();

			default:
				return null;
			}

		default:
			return null;
		}
	}

	public VerifiablePresentation getPresentation(String did, String vp) throws DIDException {
		switch (did) {
		case "user1":
			switch (vp) {
			case "nonempty":
				return getUser1NonemptyPresentation();

			case "empty":
				return getUser1EmptyPresentation();

			default:
				return null;
			}

		case "foobar":
			switch (vp) {
			case "nonempty":
				return getFooBarNonemptyPresentation();

			case "empty":
				return getFooBarEmptyPresentation();

			default:
				return null;
			}

		default:
			return null;
		}
	}*/
}