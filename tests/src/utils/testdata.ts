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

//import type { JSONObject, JSONValue } from "@elastosfoundation/did-js-sdk";
import { join } from "path";
import {
    DIDDocument, DIDStore, Mnemonic, RootIdentity,
    VerifiableCredential, VerifiablePresentation,
    TransferTicket, Issuer, DIDURL, DID, Exceptions,
    File, HDKey, JSONObject, JSONValue, runningInBrowser,
    DIDBackend
} from "@elastosfoundation/did-js-sdk";
import { TestConfig } from "./testconfig";
import { importBundledBrowserData } from "./browserdataimport";
import { DIDTestExtension } from "./didtestextension";
import { Web3Adapter } from "../backend/web3adapter";

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

    public constructor(dummy ?: boolean) {
        try {
            TestConfig.initialize();
            if (File.exists(TestConfig.storeRoot))
                (new File(TestConfig.storeRoot)).delete();
            importBundledBrowserData();

            DIDTestExtension.setup(dummy);
        }
        catch(e) {
            // Catch errors here because Jest will silence them. So we print them to get more clues.
            console.error("Catched exception in TestData constructor", e);
            throw e;
        }
    }

    public async cleanup(): Promise<void> {
        if (this.store != null)
            this.store.close();

        await DIDTestExtension.resetData();
        DIDBackend.getInstance().clearCache();
    }

    public static generateKeypair(): HDKey {
        if (this.rootKey == null) {
            let mnemonic =  Mnemonic.getInstance().generate();
            this.rootKey = HDKey.newWithMnemonic(mnemonic, "");
            this.index = 0;
        }

        return this.rootKey.deriveWithPath(HDKey.DERIVE_PATH_PREFIX + this.index++);
    }

    public async getStore(): Promise<DIDStore> {
        if (!this.store) {
            this.store = await DIDStore.open(TestConfig.storeRoot);
            if (!this.store)
                throw new Error("TestData failed to initialize the store (null or undefined)");
        }

        return this.store;
    }

    public async getRootIdentity(): Promise<RootIdentity> {
        if (this.identity == null) {
            this.mnemonic = Mnemonic.getInstance().generate();
            this.identity = RootIdentity.createFromMnemonic(this.mnemonic, TestConfig.passphrase,
                    await this.getStore(), TestConfig.storePass, true);
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

    public waitForWalletAvailable() {
        // need synchronize?
        if (DIDTestExtension.getAdapter() instanceof Web3Adapter) {
            let adapter = DIDTestExtension.getAdapter() as Web3Adapter;

            /* console.log(("Waiting for wallet available...");
            long start = System.currentTimeMillis();
            while (true) {
                if (adapter.isAvailable()) {
                    long duration = (System.currentTimeMillis() - start + 500) / 1000;
                    System.out.println("OK(" + duration + "s)");
                    break;
                }

                try {
                    Thread.sleep(5000);
                } catch (InterruptedException ignore) {
                }
            } */
        }
    }
}

export class CompatibleData {
    private dataPath: string;
    private storePath: string;
    private data = {};
    private version: number;

    public constructor(private testData: TestData, version: number) {
        this.data = {};

        if (!runningInBrowser()) {
            // NodeJS
            this.dataPath = join(__dirname, "..", "data/v" + version.toString() + "/testdata");
            this.storePath = join(__dirname, "..", "data/v" + version.toString() + "/teststore");
        }
        else {
            // Browser
            this.dataPath = "/testresources/data/v" + version.toString() + "/testdata";
            this.storePath = "/testresources/data/v" + version.toString() + "/teststore";
        }
        this.version = version;
    }

    public getDataPath() : string {
        return this.dataPath;
    }

    public isLatestVersion(): boolean {
        return this.version == 2;
    }

    private fileContent(path: string): string {
        let file = new File(path);
        if (!file.exists())
            throw new Error("No file exists at "+path);

        return file.readText();
    }

    private dirContent(path: string): string[] {
        return (new File(path)).list();
    }

    private getDidFile(name: string, type: string): string {
        let fileName = name + ".id";
        if (type != null)
            fileName += "." + type;
        fileName += ".json";

        return this.fileContent(this.dataPath + "/" + fileName);
    }

    private getCredentialFile(did: string, vc: string, type: string): string {
        let fileName = did + ".vc." + vc;
        if (type != null)
            fileName += "." + type;
        fileName += ".json";

        return this.fileContent(this.dataPath + "/" + fileName);
    }

    private getPresentationFile(did: string, vp: string, type: string): string {
        let fileName = did + ".vp." + vp;
        if (type != null)
            fileName += "." + type;
        fileName += ".json";

        return this.fileContent(this.dataPath + "/" + fileName);
    }

    private getTransferTicketFile(name : string) : string {
        if (this.version == 1)
            return null;

        return this.fileContent(this.dataPath + "/" + name + ".tt.json");
    }

    public async getDocument(did: string, type: string = null): Promise<DIDDocument> {
        let baseKey = "res:did:" + did;
        let key = type != null ? baseKey + ":" + type : baseKey;
        if (key in this.data)
            return this.data[key];

        // load the document
        let doc = await DIDDocument.parseAsync(this.getDidFile(did, type));

        if (!(baseKey in this.data)) {
            // If not stored before, store it and load private keys
            await this.testData.store.storeDid(doc);
            let kfs = this.dirContent(this.dataPath).filter((fileName: string, index: number, array: string []) => {
                return fileName.startsWith(did + ".id.") && fileName.endsWith(".sk");
            });

            for (let kf of kfs) {
                let start = did.length + 4;
                let end = kf.length - 3;
                let fragment = kf.substring(start, end);
                let id = new DIDURL("#" + fragment, doc.getSubject());

                let sk = HDKey.deserializeBase58(this.fileContent(this.dataPath + "/" + kf)).serialize();
                this.testData.store.storePrivateKey(id, sk, TestConfig.storePass);
            }

            switch (did) {
            case "foobar":
            case "foo":
            case "bar":
            case "baz":
                await doc.publish(TestConfig.storePass, (await this.getDocument("user1")).getDefaultPublicKeyId());
                await DIDTestExtension.awaitStandardPublishingDelay();
                break;

            default:
                await doc.publish(TestConfig.storePass);
                await DIDTestExtension.awaitStandardPublishingDelay();
            }
        }

        this.data[key] = doc;
        return doc;
    }

    public getDocumentJson(did: string, type: string) : string {
        let file = this.getDidFile(did, type)
        let fileName = did + ".id";
        if (type != null)
            fileName += "." + type;
        fileName += ".json";
        let key = "res:json:" + fileName
        this.data[key] = file
        return file
    }

    public async getCredential(did: string, vc: string, type: string = null) : Promise<VerifiableCredential> {
        // Load DID document first for verification
        await this.getDocument(did);
        let baseKey = "res:vc:" + did + ":" + vc;
        let key = type != null ? baseKey + ":" + type : baseKey;

        if (this.data[key] !== null && this.data[key] !== undefined)
            return this.data[key];

        let credential = VerifiableCredential.parse(this.getCredentialFile(did, vc, type));

        await this.testData.store.storeCredential(credential);

        this.data[key] = credential
        return credential
    }

    public getCredentialJson(did: string, vc: string, type: string): string{
        let file = this.getCredentialFile(did, vc, type);
        let fileName = did + ".vc." + vc;
        if (type != null)
            fileName += "." + type;
        fileName += ".json";
        let key = "res:json:" + fileName;

        if (this.data[key] !== null &&
            this.data[key] !== undefined)
            return this.data[key];

        this.data[key] =  file;
        return file;
    }

    public async getPresentation(did: string,  vp: string,  type: string = null): Promise<VerifiablePresentation> {
        // Load DID document first for verification
        await this.getDocument(did);

        let baseKey = "res:vp:" + did + ":" + vp;
        let key = type != null ? baseKey + ":" + type : baseKey;
        if (this.data[key] !== null &&
            this.data[key] !== undefined)
            return  this.data[key];

        // load the presentation
        let presentation = VerifiablePresentation.parse(this.getPresentationFile(did, vp, type));
        this.data[key] = presentation;
        return presentation;
    }

    public getPresentationJson(did: string,  vp: string,  type: string): string{
        let file = this.getPresentationFile(did, vp, type);
        let fileName = did + ".vp." + vp;
        if (type != null)
            fileName += "." + type;
        fileName += ".json";

        let key = "res:json:" + fileName;

        if (this.data[key] !== null &&
            this.data[key] !== undefined)
            return  this.data[key];

        // load the document
        this.data[key] =  file;
        return file;
    }

    public async getTransferTicket(did : string) : Promise<TransferTicket> {
        if (this.version == 1)
            throw new Exceptions.UnsupportedOperationException("Not exists");

        let key = "res:tt:" + did;
        if (this.data[key] !== null &&
            this.data[key] !== undefined)
                return this.data[key] as TransferTicket;

        // load the ticket
        let tt = TransferTicket.parse(this.getTransferTicketFile(did));

        this.data[key] = tt;
        return tt;
    }

    public getStoreDir(): string {
        return this.storePath;
    }

    public async loadAll(): Promise<void> {
        await this.getDocument("issuer");
        await this.getDocument("user1");
        await this.getDocument("user2");
        await this.getDocument("user3");

        if (this.version == 2) {
            await this.getDocument("user4");
            await this.getDocument("examplecorp");
            await this.getDocument("foobar");
            await this.getDocument("foo");
            await this.getDocument("bar");
            await this.getDocument("baz");
        }
    }
}

export class InstantData {
    private idIssuer: DIDDocument;
    private idUser1: DIDDocument;
    private idUser2: DIDDocument;
    private idUser3: DIDDocument;
    private idUser4: DIDDocument;

    private vcUser1Passport: VerifiableCredential;  // Issued by idIssuer
    private vcUser1Twitter: VerifiableCredential;   // Self-proclaimed
    private vcUser1Json: VerifiableCredential;      // Issued by idIssuer with complex JSON subject
    private vpUser1Nonempty: VerifiablePresentation;
    private vpUser1Empty: VerifiablePresentation;

    private idExampleCorp: DIDDocument;     // Controlled by idIssuer
    private idFooBar: DIDDocument;      // Controlled by User1, User2, User3 (2/3)
    private idFoo: DIDDocument;             // Controlled by User1, User2 (2/2)
    private idBar: DIDDocument;         // Controlled by User1, User2, User3 (3/3)
    private idBaz: DIDDocument;         // Controlled by User1, User2, User3 (1/3)

    private vcFooBarServices: VerifiableCredential; // Self-proclaimed
    private vcFooBarLicense: VerifiableCredential;  // Issued by idExampleCorp
    private vcFooEmail: VerifiableCredential;       // Issued by idIssuer

    private vpFooBarNonempty: VerifiablePresentation;
    private vpFooBarEmpty: VerifiablePresentation;

    private vcUser1JobPosition: VerifiableCredential;// Issued by idExampleCorp

    private ttFooBar: TransferTicket;
    private ttBaz: TransferTicket;

    constructor(private testData: TestData){}

    public async getIssuerDocument(): Promise<DIDDocument> {
        if (this.idIssuer == null) {
            await this.testData.getRootIdentity();

            let doc = await (await this.testData.getRootIdentity()).newDid(TestConfig.storePass);
            doc.getMetadata().setAlias("Issuer");

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(doc.getSubject());

            let props = {
                name: "Test Issuer",
                nation: "Singapore",
                language: "English",
                email: "issuer@example.com"
            }

            let vc = await cb.id("#profile")
                    .type("BasicProfileCredential", "SelfProclaimedCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);

            let key = TestData.generateKeypair();
            let id = DIDURL.from("#key2", doc.getSubject());
            db.addAuthenticationKey(id, key.getPublicKeyBase58());
            this.testData.store.storePrivateKey(id, key.serialize(), TestConfig.storePass);

            // No private key for testKey
            key = TestData.generateKeypair();
            id = DIDURL.from("#testKey", doc.getSubject());
            db.addAuthenticationKey(id, key.getPublicKeyBase58());

            // No private key for recovery
            key = TestData.generateKeypair();
            id = DIDURL.from("#recovery", doc.getSubject());
            db.addAuthorizationKey(id, new DID("did:elastos:" + key.getAddress()),
                    key.getPublicKeyBase58());

            doc = await db.seal(TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idIssuer = doc;
        }

        return this.idIssuer;
    }

    public async getUser1Document(): Promise<DIDDocument> {
        if (this.idUser1 == null) {
            await this.getIssuerDocument();

            let doc = await (await this.testData.getRootIdentity()).newDid(TestConfig.storePass);
            doc.getMetadata().setAlias("User1");

            // Test document with two embedded credentials
            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            let temp = TestData.generateKeypair();
            db.addAuthenticationKey("#key2", temp.getPublicKeyBase58());
            this.testData.store.storePrivateKey(DIDURL.from("#key2", doc.getSubject()),
                    temp.serialize(), TestConfig.storePass);

            temp = TestData.generateKeypair();
            db.addAuthenticationKey("#key3", temp.getPublicKeyBase58());
            this.testData.store.storePrivateKey(DIDURL.from("#key3", doc.getSubject()),
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

            let vcProfile = await cb.id("#profile")
                    .type("BasicProfileCredential", "SelfProclaimedCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);

            let kycIssuer = new Issuer(this.idIssuer);
            cb = kycIssuer.issueFor(doc.getSubject());

            props = {
                "email": "john@example.com"
            };

            let vcEmail = await cb.id("#email")
                    .type("BasicProfileCredential",
                            "InternetAccountCredential", "EmailCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);

            db.addCredential(vcProfile);
            db.addCredential(vcEmail);
            doc = await db.seal(TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idUser1 = doc;
        }

        return this.idUser1;
    }

    public async getUser1PassportCredential(): Promise<VerifiableCredential> {
        if (this.vcUser1Passport == null) {
            let doc = await this.getUser1Document();

            let id = new DIDURL("#passport", doc.getSubject());

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(doc.getSubject());

            let props = {
                "nation": "Singapore",
                "passpord": "S653258Z07"
            }

            let vcPassport = await cb.id(id)
                    .type("BasicProfileCredential", "SelfProclaimedCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);
            vcPassport.getMetadata().setAlias("Passport");
            await this.testData.store.storeCredential(vcPassport);

            this.vcUser1Passport = vcPassport;
        }

        return this.vcUser1Passport;
    }

    public async getUser1TwitterCredential(): Promise<VerifiableCredential> {
        if (this.vcUser1Twitter == null) {
            let doc = await this.getUser1Document();

            let id = new DIDURL("#twitter", doc.getSubject());

            let kycIssuer = new Issuer(this.idIssuer);
            let cb = kycIssuer.issueFor(doc.getSubject());

            let props = {
                "twitter": "@john"
            }

            let vcTwitter = await cb.id(id)
                    .type("InternetAccountCredential", "TwitterCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);
            vcTwitter.getMetadata().setAlias("Twitter");
            await this.testData.store.storeCredential(vcTwitter);

            this.vcUser1Twitter = vcTwitter;
        }

        return this.vcUser1Twitter;
    }


    public async getUser1JsonCredential(): Promise<VerifiableCredential> {
        if (this.vcUser1Json == null) {
            let doc = await this.getUser1Document();

            let id = new DIDURL("#json", doc.getSubject());

            let kycIssuer = new Issuer(this.idIssuer);
            let cb = kycIssuer.issueFor(doc.getSubject());

            let jsonProps = "{\"name\":\"Jay Holtslander\",\"alternateName\":\"Jason Holtslander\",\"booleanValue\":true,\"numberValue\":1234,\"doubleValue\":9.5,\"nationality\":\"Canadian\",\"birthPlace\":{\"type\":\"Place\",\"address\":{\"type\":\"PostalAddress\",\"addressLocality\":\"Vancouver\",\"addressRegion\":\"BC\",\"addressCountry\":\"Canada\"}},\"affiliation\":[{\"type\":\"Organization\",\"name\":\"Futurpreneur\",\"sameAs\":[\"https://twitter.com/futurpreneur\",\"https://www.facebook.com/futurpreneur/\",\"https://www.linkedin.com/company-beta/100369/\",\"https://www.youtube.com/user/CYBF\"]}],\"alumniOf\":[{\"type\":\"CollegeOrUniversity\",\"name\":\"Vancouver Film School\",\"sameAs\":\"https://en.wikipedia.org/wiki/Vancouver_Film_School\",\"year\":2000},{\"type\":\"CollegeOrUniversity\",\"name\":\"CodeCore Bootcamp\"}],\"gender\":\"Male\",\"Description\":\"Technologist\",\"disambiguatingDescription\":\"Co-founder of CodeCore Bootcamp\",\"jobTitle\":\"Technical Director\",\"worksFor\":[{\"type\":\"Organization\",\"name\":\"Skunkworks Creative Group Inc.\",\"sameAs\":[\"https://twitter.com/skunkworks_ca\",\"https://www.facebook.com/skunkworks.ca\",\"https://www.linkedin.com/company/skunkworks-creative-group-inc-\",\"https://plus.google.com/+SkunkworksCa\"]}],\"url\":\"https://jay.holtslander.ca\",\"image\":\"https://s.gravatar.com/avatar/961997eb7fd5c22b3e12fb3c8ca14e11?s=512&r=g\",\"address\":{\"type\":\"PostalAddress\",\"addressLocality\":\"Vancouver\",\"addressRegion\":\"BC\",\"addressCountry\":\"Canada\"},\"sameAs\":[\"https://twitter.com/j_holtslander\",\"https://pinterest.com/j_holtslander\",\"https://instagram.com/j_holtslander\",\"https://www.facebook.com/jay.holtslander\",\"https://ca.linkedin.com/in/holtslander/en\",\"https://plus.google.com/+JayHoltslander\",\"https://www.youtube.com/user/jasonh1234\",\"https://github.com/JayHoltslander\",\"https://profiles.wordpress.org/jasonh1234\",\"https://angel.co/j_holtslander\",\"https://www.foursquare.com/user/184843\",\"https://jholtslander.yelp.ca\",\"https://codepen.io/j_holtslander/\",\"https://stackoverflow.com/users/751570/jay\",\"https://dribbble.com/j_holtslander\",\"http://jasonh1234.deviantart.com/\",\"https://www.behance.net/j_holtslander\",\"https://www.flickr.com/people/jasonh1234/\",\"https://medium.com/@j_holtslander\"]}";

            let vcJson = await cb.id(id)
                    .type("TestCredential", "JsonCredential")
                    .properties(jsonProps)
                    .seal(TestConfig.storePass);
            vcJson.getMetadata().setAlias("json");
            await this.testData.store.storeCredential(vcJson);
            this.vcUser1Json = vcJson;
        }

        return this.vcUser1Json;
    }


    public async getUser1JobPositionCredential(): Promise<VerifiableCredential> {
        if (this.vcUser1JobPosition == null) {
            await this.getExampleCorpDocument();

            let doc = await this.getUser1Document();

            let id = new DIDURL("#email", doc.getSubject());

            let kycIssuer = new Issuer(this.idExampleCorp);
            let cb = kycIssuer.issueFor(doc.getSubject());

            let props = {
                title: "CEO"
            };

            let vc = await cb.id(id)
                    .type("JobPositionCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);
            await this.testData.store.storeCredential(vc);
            this.vcUser1JobPosition = vc;
        }

        return this.vcUser1JobPosition;
    }

    public async getUser1NonemptyPresentation() : Promise<VerifiablePresentation> {
        if (this.vpUser1Nonempty == null) {
            let doc = await this.getUser1Document();

            let pb = await VerifiablePresentation.createFor(doc.getSubject(), null, this.testData.store);

            let vp = await pb
                    .credentials(doc.getCredential("#profile"), doc.getCredential("#email"))
                    .credentials(await this.getUser1PassportCredential())
                    .credentials(await this.getUser1TwitterCredential())
                    .credentials(await this.getUser1JobPositionCredential())
                    .realm("https://example.com/")
                    .nonce("873172f58701a9ee686f0630204fee59")
                    .seal(TestConfig.storePass);

            this.vpUser1Nonempty = vp;
        }

        return this.vpUser1Nonempty;
    }

    public async getUser1EmptyPresentation() : Promise<VerifiablePresentation> {
        if (this.vpUser1Empty == null) {
            let doc = await this.getUser1Document();

            let pb = await VerifiablePresentation.createFor(doc.getSubject(), null, this.testData.store);

            let vp = await pb.realm("https://example.com/")
            .nonce("873172f58701a9ee686f0630204fee59")
            .seal(TestConfig.storePass);

            this.vpUser1Empty = vp;
        }

        return this.vpUser1Empty;
    }

    public async getUser2Document() : Promise<DIDDocument> {
        if (this.idUser2 == null) {
            let doc = await (await this.testData.getRootIdentity()).newDid(TestConfig.storePass);
            doc.getMetadata().setAlias("User2");

            let db = DIDDocument.Builder.newFromDocument(doc).edit();

            let props = {
                name: "John",
                gender: "Male",
                nation: "Singapore",
                language: "English",
                email: "john@example.com",
                twitter: "@john"
            };

            await db.createAndAddCredential(TestConfig.storePass, "#profile", props);

            doc = await db.seal(TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idUser2 = doc;
        }

        return this.idUser2;
    }

    public async getUser3Document() : Promise<DIDDocument> {
        if (this.idUser3 == null) {
            let doc = await (await this.testData.getRootIdentity()).newDid(TestConfig.storePass);
            doc.getMetadata().setAlias("User3");
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idUser3 = doc;
        }

        return this.idUser3;
    }

    public async getUser4Document() : Promise<DIDDocument> {
        if (this.idUser4 == null) {
            let doc = await (await this.testData.getRootIdentity()).newDid(TestConfig.storePass);
            doc.getMetadata().setAlias("User4");
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idUser4 = doc;
        }

        return this.idUser4;
    }

    public async getExampleCorpDocument() : Promise<DIDDocument> {
        if (this.idExampleCorp == null) {
            await this.getIssuerDocument();

            let did = new DID("did:elastos:example");
            let doc = await this.idIssuer.newCustomized(did, 1, TestConfig.storePass);

            let selfIssuer = new Issuer(doc);
            let cb = selfIssuer.issueFor(doc.getSubject());

            let props = {
                name: "Example LLC",
                website: "https://example.com/",
                email: "contact@example.com"
            };

            let vc = await cb.id("#profile")
                    .type("BasicProfileCredential", "SelfProclaimedCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);

            let db = DIDDocument.Builder.newFromDocument(doc).edit();
            db.addCredential(vc);

            let key = TestData.generateKeypair();
            let id = new DIDURL("#key2", doc.getSubject());
            db.addAuthenticationKey(id, key.getPublicKeyBase58());
            this.testData.store.storePrivateKey(id, key.serialize(), TestConfig.storePass);

            // No private key for testKey
            key = TestData.generateKeypair();
            id = new DIDURL("#testKey", doc.getSubject());
            db.addAuthenticationKey(id, key.getPublicKeyBase58());

            doc = await db.seal(TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idExampleCorp = doc;
        }

        return this.idExampleCorp;
    }

    public async getFooBarDocument() : Promise<DIDDocument> {
        if (this.idFooBar == null) {
            await this.getExampleCorpDocument();
            await this.getUser1Document();
            await this.getUser2Document();
            await this.getUser3Document();

            let controllers = [this.idUser1.getSubject(),
                               this.idUser2.getSubject(),
                               this.idUser3.getSubject()];
            let did = new DID("did:elastos:foobar");
            let doc = await this.idUser1.newCustomizedDidWithController(did, controllers, 2, TestConfig.storePass);
            let signKey = this.idUser1.getDefaultPublicKeyId();

            // Add public keys embedded credentials
            let db = DIDDocument.Builder.newFromDocument(doc).edit(this.idUser1);

            let temp = TestData.generateKeypair();
            db.addAuthenticationKey("#key2", temp.getPublicKeyBase58());
            this.testData.store.storePrivateKey(DIDURL.from("#key2", doc.getSubject()),
                    temp.serialize(), TestConfig.storePass);

            temp = TestData.generateKeypair();
            db.addAuthenticationKey("#key3", temp.getPublicKeyBase58());
            this.testData.store.storePrivateKey(DIDURL.from("#key3", doc.getSubject()),
                    temp.serialize(), TestConfig.storePass);

            db.addService("#vault", "Hive.Vault.Service",
                    "https://foobar.com/vault");

            let map = {
                abc: "helloworld",
                foo: 123,
                bar: "foobar",
                foobar: "lalala...",
                date: new Date().toISOString(),
                ABC: "Helloworld",
                FOO: 678,
                BAR: "Foobar",
                FOOBAR: "Lalala...",
                DATE: new Date().toISOString()
            };

            let props: JSONObject = {
                abc: "helloworld",
                foo: 123,
                bar: "foobar",
                foobar: "lalala...",
                date: new Date().toISOString(),
                map: map,
                ABC: "Helloworld",
                FOO: 678,
                BAR: "Foobar",
                FOOBAR: "Lalala...",
                DATE: new Date().toISOString(),
                MAP: map
            };

            db.addService("#vcr", "CredentialRepositoryService",
                    "https://foobar.com/credentials", props);

            let selfIssuer = new Issuer(doc, signKey);
            let cb = selfIssuer.issueFor(doc.getSubject());

            props = {
                name: "Foo Bar Inc",
                language: "Chinese",
                email: "contact@foobar.com"
            };

            let vcProfile = await cb.id("#profile")
                    .type("BasicProfileCredential", "SelfProclaimedCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);

            let kycIssuer = new Issuer(this.idExampleCorp);
            cb = kycIssuer.issueFor(doc.getSubject());

            props = {
                email: "foobar@example.com"
            };

            let vcEmail = await cb.id("#email")
                    .type("BasicProfileCredential",
                            "InternetAccountCredential", "EmailCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);

            db.addCredential(vcProfile);
            db.addCredential(vcEmail);
            doc = await db.seal(TestConfig.storePass);
            doc = await this.idUser3.signWithDocument(doc, TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass, signKey);
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idFooBar = doc;
        }

        return this.idFooBar;
    }

    public async getFooBarServiceCredential() : Promise<VerifiableCredential> {
        if (this.vcFooBarServices == null) {
            let doc = await this.getFooBarDocument();

            let id = new DIDURL("#services", doc.getSubject());

            let selfIssuer = new Issuer(doc, this.idUser1.getDefaultPublicKeyId());
            let cb = selfIssuer.issueFor(doc.getSubject());

            let props = {
                consultation: "https://foobar.com/consultation",
                Outsourceing: "https://foobar.com/outsourcing"
            };

            let vc = await cb.id(id)
                    .type("BasicProfileCredential", "SelfProclaimedCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);
            await this.testData.store.storeCredential(vc);

            this.vcFooBarServices = vc;
        }

        return this.vcFooBarServices;
    }

    public async getFooBarLicenseCredential() : Promise<VerifiableCredential> {
        if (this.vcFooBarLicense == null) {
            await this.getExampleCorpDocument();
            await this.getUser1Document();
            await this.getUser2Document();
            await this.getUser3Document();

            let doc = await this.getFooBarDocument();

            let id = new DIDURL("#license", doc.getSubject());

            let kycIssuer = new Issuer(this.idExampleCorp);
            let cb = kycIssuer.issueFor(doc.getSubject());

            let props = {
                "license-id": "20201021C889",
                scope: "Consulting"
            };

            let vc = await cb.id(id)
                    .type("LicenseCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);
            await this.testData.store.storeCredential(vc);

            this.vcFooBarLicense = vc;
        }

        return this.vcFooBarLicense;
    }

    public async getFooBarNonemptyPresentation() : Promise<VerifiablePresentation> {
        if (this.vpFooBarNonempty == null) {
            let doc = await this.getFooBarDocument();

            let pb = await VerifiablePresentation.createFor(
                    doc.getSubject(), this.idUser1.getDefaultPublicKeyId(), this.testData.store);

            let vp = await pb
                    .credentials(doc.getCredential("#profile"),
                            doc.getCredential("#email"))
                    .credentials(await this.getFooBarServiceCredential())
                    .credentials(await this.getFooBarLicenseCredential())
                    .realm("https://example.com/")
                    .nonce("873172f58701a9ee686f0630204fee59")
                    .seal(TestConfig.storePass);

            this.vpFooBarNonempty = vp;
        }

        return this.vpFooBarNonempty;
    }

    public async getFooBarEmptyPresentation() : Promise<VerifiablePresentation> {
        if (this.vpFooBarEmpty == null) {
            let doc = await this.getFooBarDocument();

            let pb = await VerifiablePresentation.createFor(
                    doc.getSubject(), new DIDURL("did:elastos:foobar#key2"), this.testData.store);

            let vp = await pb.realm("https://example.com/")
                    .nonce("873172f58701a9ee686f0630204fee59")
                    .seal(TestConfig.storePass);

            this.vpFooBarEmpty = vp;
        }

        return this.vpFooBarEmpty;
    }

    public async getFooBarTransferTicket() : Promise<TransferTicket> {
        if (this.ttFooBar == null) {
            let doc = await this.getFooBarDocument();
            let user4 = await this.getUser4Document();

            let tt = await this.idUser1.createTransferTicket(user4.getSubject(), TestConfig.storePass, doc.getSubject());
            tt = await this.idUser3.signWithTicket(tt, TestConfig.storePass);

            this.ttFooBar = tt;
        }

        return this.ttFooBar;
    }

    public async getFooDocument() : Promise<DIDDocument> {
        if (this.idFoo == null) {
            await this.getUser1Document();
            await this.getUser2Document();

            let controllers : DID[] = [this.idUser2.getSubject()];
            let did = new DID("did:elastos:foo");
            let doc = await this.idUser1.newCustomizedDidWithController(did, controllers, 2, TestConfig.storePass);
            doc = await this.idUser2.signWithDocument(doc, TestConfig.storePass);
            await this.testData.store.storeDid(doc);

            doc.setEffectiveController(this.idUser2.getSubject());
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            doc.setEffectiveController(null);

            this.idFoo = doc;
        }

        return this.idFoo;
    }

    public async getFooEmailCredential() : Promise<VerifiableCredential> {
        if (this.vcFooEmail == null) {
            await this.getIssuerDocument();

            let doc = await this.getFooDocument();

            let id = new DIDURL("#email", doc.getSubject());

            let kycIssuer = new Issuer(this.idIssuer);
            let cb = kycIssuer.issueFor(doc.getSubject());

            let props = {
                email: "foo@example.com"
            };

            let vc = await cb.id(id)
                    .type("InternetAccountCredential")
                    .properties(props)
                    .seal(TestConfig.storePass);
            await this.testData.store.storeCredential(vc);

            this.vcFooEmail = vc;
        }

        return this.vcFooEmail;
    }

    public async getBarDocument() : Promise<DIDDocument> {
        if (this.idBar == null) {
            await this.getUser1Document();
            await this.getUser2Document();
            await this.getUser3Document();

            let controllers = [this.idUser2.getSubject(),
                               this.idUser3.getSubject()];
            let did = new DID("did:elastos:bar");
            let doc = await this.idUser1.newCustomizedDidWithController(did, controllers, 3, TestConfig.storePass);
            doc = await this.idUser2.signWithDocument(doc, TestConfig.storePass);
            doc = await this.idUser3.signWithDocument(doc, TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass, this.idUser3.getDefaultPublicKeyId());
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idBar = doc;
        }

        return this.idBar;
    }

    public async getBazDocument(): Promise<DIDDocument> {
        if (this.idBaz == null) {
            await this.getUser1Document();
            await this.getUser2Document();
            await this.getUser3Document();

            let controllers = [this.idUser2.getSubject(), this.idUser3.getSubject()];
            let did = new DID("did:elastos:baz");
            let doc = await this.idUser1.newCustomizedDidWithController(did, controllers, 1, TestConfig.storePass);
            await this.testData.store.storeDid(doc);
            await doc.publish(TestConfig.storePass, this.idUser1.getDefaultPublicKeyId());
            await DIDTestExtension.awaitStandardPublishingDelay();

            this.idBaz = doc;
        }

        return this.idBaz;
    }

    public async getBazTransferTicket() : Promise<TransferTicket> {
        if (this.ttBaz == null) {
            let doc = await this.getBazDocument();
            let user4 = await this.getUser4Document();

            let tt = await this.idUser2.createTransferTicket(user4.getSubject(), TestConfig.storePass, doc.getSubject());

            this.ttBaz = tt;
        }

        return this.ttBaz;
    }

    public getDocument(did: string): Promise<DIDDocument> {
        switch (did) {
            case "issuer":
                return this.getIssuerDocument();

            case "user1":
                return this.getUser1Document();

            case "user2":
                return this.getUser1Document();

            case "user3":
                return this.getUser1Document();

            case "user4":
                return this.getUser1Document();

            case "examplecorp":
                return this.getExampleCorpDocument();

            case "foobar":
                return this.getFooBarDocument();

            case "foo":
                return this.getFooDocument();

            case "bar":
                return this.getBarDocument();

            case "baz":
                return this.getBazDocument();

            default:
                return null;
            }
    }

    public getCredential(did: string, vc: string) : Promise<VerifiableCredential> {
        switch (did) {
            case "user1":
                switch (vc) {
                case "passport":
                    return this.getUser1PassportCredential();

                case "twitter":
                    return this.getUser1TwitterCredential();

                case "json":
                    return this.getUser1JsonCredential();

                case "jobposition":
                    return this.getUser1JobPositionCredential();

                default:
                    return null;
                }

            case "foobar":
                switch (vc) {
                case "services":
                    return this.getFooBarServiceCredential();

                case "license":
                    return this.getFooBarLicenseCredential();

                default:
                    return null;
                }

            case "foo":
                switch (vc) {
                case "email":
                    return this.getFooEmailCredential();

                default:
                    return null;
                }

            default:
                return null;
            }
    }

    public getPresentation(did: string, vp: string): Promise<VerifiablePresentation> {
        switch (did) {
            case "user1":
                switch (vp) {
                case "nonempty":
                    return this.getUser1NonemptyPresentation();

                case "empty":
                    return this.getUser1EmptyPresentation();

                default:
                    return null;
                }

            case "foobar":
                switch (vp) {
                case "nonempty":
                    return this.getFooBarNonemptyPresentation();

                case "empty":
                    return this.getFooBarEmptyPresentation();

                default:
                    return null;
                }

            default:
                return null;
            }
    }


}