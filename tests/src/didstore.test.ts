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

import { DID, DIDDocument, DIDURL, Issuer, Mnemonic, RootIdentity, Exceptions } from "@elastosfoundation/did-js-sdk";
import { DIDStore, File, Logger } from "@elastosfoundation/did-js-sdk";
import { DIDTestExtension } from "./utils/didtestextension";
import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";
import { Utils } from "./utils/utils";

const log = new Logger("DIDStoreTest");

let testData: TestData;
let store: DIDStore;

describe("DIDStore Tests", ()=>{
    beforeEach(async () => {
        testData = await TestData.init();
        await testData.cleanup();
        store = await testData.getStore();
    })

    afterEach(async () => {
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

    test("testLoadRootIdentityFromEmptyStore", async () => {
        let file = getFile(".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        let identity = await store.loadRootIdentity();
        expect(identity).toBeNull();
    });

    test("testBulkCreate", async ()=>{
        let file = getFile(".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        let identity = await testData.getRootIdentity();

        file = getFile("roots", identity.getId(), "mnemonic");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("roots", identity.getId(), "private");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("roots", identity.getId(), "public");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("roots", identity.getId(), "index");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("roots", identity.getId(), ".metadata");
        expect(file.exists()).toBeFalsy();

        identity.setAlias("default");
        file = getFile("roots", identity.getId(), ".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        let valid : boolean;
        for (let i = 0; i < TestConfig.DID_INDEX_LOOPS; i++) {
            let alias = "my did " + i;
            let doc = await identity.newDid(TestConfig.storePass);
            doc.getMetadata().setAlias(alias);
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let resolved = await doc.getSubject().resolve();
            expect(resolved).toBeNull();

            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            file = getFile("ids", doc.getSubject().getMethodSpecificId(), "document");
            expect(file.exists()).toBeTruthy();
            expect(file.isFile()).toBeTruthy();

            file = getFile("ids", doc.getSubject().getMethodSpecificId(), ".metadata");
            expect(file.exists()).toBeTruthy();
            expect(file.isFile()).toBeTruthy();

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull();
            await store.storeDid(resolved);
            expect(alias).toEqual(resolved.getMetadata().getAlias());
            expect(doc.getSubject().equals(resolved.getSubject())).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(resolved.getProof().getSignature());

            valid = await resolved.isValid();
            expect(valid).toBeTruthy();
        }

        let dids = await store.listDids();
        expect(dids.length).toBe(TestConfig.DID_INDEX_LOOPS);
        expect(store.containsDids()).toBeTruthy();
    });

    test("testDeleteDID", async ()=>{
        let identity = await testData.getRootIdentity();

        // Create test DIDs
        let dids: DID[] = [];
        for (let i = 0; i < TestConfig.DID_INDEX_LOOPS; i++) {
            let alias = "my did " + i;
            let doc = await identity.newDid(TestConfig.storePass);
            doc.getMetadata().setAlias(alias);
            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();
            dids.push(doc.getSubject());
        }

        for (let i = 0; i < TestConfig.DID_INDEX_LOOPS; i++) {
            if (i % 3 != 0)
                continue;

            let did = dids[i];

            let deleted = await store.deleteDid(did);
            expect(deleted).toBeTruthy();

            let file = getFile("ids", did.getMethodSpecificId());
            expect(file.exists()).toBeFalsy();

            deleted = await store.deleteDid(did);
            expect(deleted).toBeFalsy();
        }

        let remains = await store.listDids();
        expect(remains.length).toBe(6);
    });

    test("testStoreAndLoadDID", async ()=>{
        // Store test data into current store
        let issuer = await testData.getInstantData().getIssuerDocument();

        let file = getFile("ids", issuer.getSubject().getMethodSpecificId(), "document");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("ids", issuer.getSubject().getMethodSpecificId(), ".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        let test = await testData.getInstantData().getUser1Document();

        file = getFile("ids", test.getSubject().getMethodSpecificId(), "document");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("ids", test.getSubject().getMethodSpecificId(), ".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        let doc = await store.loadDid(issuer.getSubject());
        expect(issuer.getSubject().equals(doc.getSubject())).toBeTruthy();
        expect(issuer.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        let valid = await doc.isValid();
        expect(valid).toBeTruthy();

        doc = await store.loadDid(test.getSubject().toString());
        expect(test.getSubject().equals(doc.getSubject())).toBeTruthy();
        expect(test.getProof().getSignature()).toEqual(doc.getProof().getSignature());
        valid = await doc.isValid();
        expect(valid).toBeTruthy();

        let dids = await store.listDids();
        expect(dids.length).toBe(2);
    });

    test("testLoadCredentials", async ()=>{
        // Store test data into current store
        await testData.getInstantData().getIssuerDocument();
        let user = await testData.getInstantData().getUser1Document();

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

        vc = await testData.getInstantData().getUser1TwitterCredential();
        vc.getMetadata().setAlias("Twitter");

        file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
                "credentials", "#" + vc.getId().getFragment(), "credential");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
                "credentials", "#" + vc.getId().getFragment(), ".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        vc = await testData.getInstantData().getUser1PassportCredential();
        vc.getMetadata().setAlias("Passport");

        file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
                "credentials", "#" + vc.getId().getFragment(), "credential");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        file = getFile("ids", vc.getId().getDid().getMethodSpecificId(),
                "credentials", "#" + vc.getId().getFragment(), ".metadata");
        expect(file.exists()).toBeTruthy();
        expect(file.isFile()).toBeTruthy();

        let id = DIDURL.from("#profile", user.getSubject());
        vc = await store.loadCredential(id);
        expect("MyProfile").toEqual(vc.getMetadata().getAlias());
        expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();
        expect(id.equals(vc.getId())).toBeTruthy();
        await expect(await vc.isValid()).toBeTruthy();

        // try with full id string
        vc = await store.loadCredential(id.toString());
        expect(vc).not.toBeNull();
        expect("MyProfile").toEqual(vc.getMetadata().getAlias());
        expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();
        expect(id.equals(vc.getId())).toBeTruthy();
        await expect(await vc.isValid()).toBeTruthy();

        id = DIDURL.from("#twitter", user.getSubject());
        vc = await store.loadCredential(id.toString());
        expect(vc).not.toBeNull();
        expect("Twitter").toEqual(vc.getMetadata().getAlias());
        expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();
        expect(id.equals(vc.getId())).toBeTruthy();
        await expect(await vc.isValid()).toBeTruthy();

        vc = await store.loadCredential(DIDURL.from("#notExist", user.getSubject()));
        expect(vc).toBeNull();

        id = DIDURL.from("#twitter", user.getSubject());
        await expect(await store.containsCredential(id)).toBeTruthy();
        await expect(await store.containsCredential(id.toString())).toBeTruthy();
        await expect(await store.containsCredentials(user.getSubject())).toBeTruthy();
        await expect(await store.containsCredential(DIDURL.from("#notExists", user.getSubject()))).toBeFalsy();
    });

    test("testListCredentials", async ()=>{
        await testData.getRootIdentity();

        // Store test data into current store
        await testData.getInstantData().getIssuerDocument();
        let user = await testData.getInstantData().getUser1Document();
        let vc = user.getCredential("#profile");
        vc.getMetadata().setAlias("MyProfile");
        vc = user.getCredential("#email");
        vc.getMetadata().setAlias("Email");
        vc = await testData.getInstantData().getUser1TwitterCredential();
        vc.getMetadata().setAlias("Twitter");
        vc = await testData.getInstantData().getUser1PassportCredential();
        vc.getMetadata().setAlias("Passport");

        let vcs = await store.listCredentials(user.getSubject());
        expect(vcs.length).toBe(4);

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

    test("testDeleteCredential", async ()=>{
        // Store test data into current store
        await testData.getInstantData().getIssuerDocument();
        let user = await testData.getInstantData().getUser1Document();
        let vc = user.getCredential("#profile");
        vc.getMetadata().setAlias("MyProfile");
        vc = user.getCredential("#email");
        vc.getMetadata().setAlias("Email");
        vc = await testData.getInstantData().getUser1TwitterCredential();
        vc.getMetadata().setAlias("Twitter");
        vc = await testData.getInstantData().getUser1PassportCredential();
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

        let deleted = await store.deleteCredential(DIDURL.from("#twitter", user.getSubject()));
        expect(deleted).toBeTruthy();

        deleted = await store.deleteCredential(DIDURL.from("#passport", user.getSubject()).toString());
        expect(deleted).toBeTruthy();

        deleted = await store.deleteCredential(user.getSubject().toString() + "#notExist");
        expect(deleted).toBeFalsy();

        file = getFile("ids", user.getSubject().getMethodSpecificId(),
                "credentials", "#twitter");
        expect(file.exists()).toBeFalsy();

        file = getFile("ids", user.getSubject().getMethodSpecificId(),
                "credentials", "#passport");
        expect(file.exists()).toBeFalsy();

        await expect(await store.containsCredential(DIDURL.from("#email", user.getSubject()))).toBeTruthy();
        await expect(await store.containsCredential(user.getSubject().toString() + "#profile")).toBeTruthy();

        await expect(await store.containsCredential(DIDURL.from("#twitter", user.getSubject()))).toBeFalsy();
        await expect(await store.containsCredential(user.getSubject().toString() + "#passport")).toBeFalsy();
    });

    test("testSynchronizeStore", async ()=> {
        let identity = await testData.getRootIdentity();
        let valid : boolean;
        for (let i = 0; i < 5; i++) {
            let alias = "my did " + i;
            let doc = await identity.newDid(TestConfig.storePass);
            doc.getMetadata().setAlias(alias);
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let resolved = await doc.getSubject().resolve();
            expect(resolved).toBeNull();

            await doc.publish(TestConfig.storePass);

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull();
        }

        let store = await testData.getStore();
        let dids: DID[] = Array.from(await store.listDids());
        dids.sort((a,b) => a.compareTo(b));
        for (let did of dids) {
            await expect(await store.deleteDid(did)).toBeTruthy();
        }

        let empty: DID[] = Array.from(await store.listDids());
        expect(empty.length).toBe(0);

        await store.synchronize();
        let syncedDids: DID[] =  Array.from(await store.listDids());
        syncedDids.sort((a,b) => a.compareTo(b));

        for (let i = 0; i < 5; i++)
            expect(dids[i].equals(syncedDids[i])).toBeTruthy();
    });

    test("testChangePassword", async ()=>{
        let identity = await testData.getRootIdentity();

        let LOOP_COUNT = 1; // TODO: restore to 4
        let valid : boolean;
        for (let i = 0; i < LOOP_COUNT; i++) {
            let alias = "my did " + i;
            let doc = await identity.newDid(TestConfig.storePass);
            doc.getMetadata().setAlias(alias);
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

            let resolved = await doc.getSubject().resolve();
            expect(resolved).toBeNull();

            await doc.publish(TestConfig.storePass);
            await DIDTestExtension.awaitStandardPublishingDelay();

            let file = getFile("ids", doc.getSubject().getMethodSpecificId(), "document");
            expect(file.exists()).toBeTruthy();
            expect(file.isFile()).toBeTruthy();

            file = getFile("ids", doc.getSubject().getMethodSpecificId(), ".metadata");
            expect(file.exists()).toBeTruthy();
            expect(file.isFile()).toBeTruthy();

            file = getFile("ids", doc.getSubject().getMethodSpecificId(), "privatekeys", "#primary");
            expect(file.exists()).toBeTruthy();
            expect(file.isFile()).toBeTruthy();

            resolved = await doc.getSubject().resolve();
            expect(resolved).not.toBeNull();
            await store.storeDid(resolved);
            expect(alias).toEqual(resolved.getMetadata().getAlias());
            expect(doc.getSubject().equals(resolved.getSubject())).toBeTruthy();
            expect(doc.getProof().getSignature()).toEqual(
                    resolved.getProof().getSignature());

            valid = await resolved.isValid();
            expect(valid).toBeTruthy();
        }

        let dids: DID[] = Array.from(await store.listDids());
        expect(dids.length).toBe(LOOP_COUNT);

        await store.changePassword(TestConfig.storePass, "newpasswd");

        dids = Array.from(await store.listDids());
        expect(dids.length).toBe(LOOP_COUNT);

        for (let i = 0; i < LOOP_COUNT; i++) {
            let alias = "my did " + i;
            let did = identity.getDid(i);
            let doc = await store.loadDid(did);
            expect(doc).not.toBeNull();
            valid = await doc.isValid();
            expect(valid).toBeTruthy();

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

        let doc = await identity.newDid("newpasswd");
        expect(doc).not.toBeNull();
    });

    test("testChangePasswordWithWrongPassword", async ()=>{
        let identity = await testData.getRootIdentity();

        let valid : boolean;
        for (let i = 0; i < 4; i++) {
            let alias = "my did " + i;
            let doc = await identity.newDid(TestConfig.storePass);
            doc.getMetadata().setAlias(alias);
            valid = await doc.isValid();
            expect(valid).toBeTruthy();
        }

        let dids = await store.listDids();
        expect(dids.length).toBe(4);

        await expect(async () => {
            await store.changePassword("wrongpasswd", "newpasswd");
        }).toThrowError(Exceptions.WrongPasswordException);
    });

    //js can't need to check v1
    ["2", "2.2"].forEach((version) => {
        test("testCompatibility", async ()=>{
            let data = Buffer.from("Hello World");

            let cd = testData.getCompatibleData(version);
            await cd.loadAll();

            let store = await DIDStore.open(cd.getStoreDir());

            let dids = await store.listDids();
            expect(dids.length).toBe(parseFloat(version) >= 2.0 ? 10 : 4);

            for (let did of dids) {
                let alias = (await did.getMetadata()).getAlias();

                if (alias === "Issuer") {
                    let vcs = await store.listCredentials(did);
                    expect(vcs.length).toBe(1);

                    for (let id of vcs)
                        await expect(await store.loadCredential(id)).not.toBeNull();
                } else if (alias === "User1") {
                    let vcs = await store.listCredentials(did);
                    expect(vcs.length).toBe(parseFloat(version) >= 2.0 ? 5 : 4);

                    for (let id of vcs)
                        await expect(await store.loadCredential(id)).not.toBeNull();
                } else if (alias === "User2") {
                    let vcs = await store.listCredentials(did);
                    expect(vcs.length).toBe(1);

                    for (let id of vcs)
                        await expect(await store.loadCredential(id)).not.toBeNull();
                } else if (alias === "User3") {
                    let vcs = await store.listCredentials(did);
                    expect(vcs.length).toBe(0);
                }

                let doc = await store.loadDid(did);
                if (!doc.isCustomizedDid() || doc.getControllerCount() <= 1) {
                    let sig = await doc.signWithStorePass(TestConfig.storePass, data);
                    expect(doc.verify(null, sig, data)).toBeTruthy();
                }
            }
        });
    });

    //js can't need to check v1
    ["2", "2.2"].forEach((version) => {
        test("testNewDIDWithWrongPass", async ()=>{
            let store = await DIDStore.open(testData.getCompatibleData(version).getStoreDir());
            let identity = await store.loadRootIdentity();

            await expect(async ()=>{
                await identity.newDid("wrongpass");
            }).rejects.toThrowError(Exceptions.WrongPasswordException);
        });
    });

    //js can't need to check v1
    ["2", "2.2"].forEach((version) => {
        test("testNewDIDandGetDID", async ()=>{
            let store = await DIDStore.open(testData.getCompatibleData(version).getStoreDir());
            let identity = await store.loadRootIdentity();

            let doc = await identity.newDid(TestConfig.storePass);
            expect(doc).not.toBeNull();

            await store.deleteDid(doc.getSubject());

            let did = identity.getDid(1000);

            doc = await identity.newDid(TestConfig.storePass, 1000);
            expect(doc).not.toBeNull();
            expect(doc.getSubject().equals(did)).toBeTruthy();

            await store.deleteDid(doc.getSubject());
        });
    });

    async function createDataForPerformanceTest(store: DIDStore) {
        let props = {
            "name": "John",
            "gender": "Male",
            "nationality": "Singapore",
            "email": "ohn@example.com",
            "twitter": "@john"
        };

        let identity = await store.loadRootIdentity();

        for (let i = 0; i < 10; i++) {
            let alias = "my did " + i;
            let doc = await identity.newDid(TestConfig.storePass);
            doc.getMetadata().setAlias(alias);
            let issuer = await Issuer.create(doc);
            let cb = issuer.issueFor(doc.getSubject());
            let vc = await cb.id("#cred-1")
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .typeWithContext("ProfileCredential", "https://ns.elastos.org/credentials/profile/v1")
                    .typeWithContext("EmailCredential", "https://ns.elastos.org/credentials/email/v1")
                    .typeWithContext("SocialCredential", "https://ns.elastos.org/credentials/social/v1")
                    .properties(props)
                    .seal(TestConfig.storePass);

            await store.storeCredential(vc);
        }
    }

    [false, true].forEach((cached)=>{
        test("testStoreCachePerformance", async ()=>{
            Utils.deleteFile(new File(TestConfig.storeRoot));
            let store: DIDStore = null;
            if (cached)
                store = await DIDStore.open(TestConfig.storeRoot);
            else
                store = await DIDStore.open(TestConfig.storeRoot, DIDStore.DEFAULT_STORAGE, 0, 0);

            let mnemonic = Mnemonic.getInstance().generate();
            await RootIdentity.createFromMnemonic(mnemonic, TestConfig.passphrase,
                    store, TestConfig.storePass, true);

            await createDataForPerformanceTest(store);

            let dids = await store.listDids();
            expect(dids.length).toBe(10);

            let start = new Date().getTime();

            for (let i = 0; i < 1000; i++) {
                for (let did of dids) {
                    let doc = await store.loadDid(did);
                    expect(did.equals(doc.getSubject())).toBeTruthy();

                    let id = DIDURL.from("#cred-1", did);
                    let vc = await store.loadCredential(id);
                    expect(id.equals(vc.getId())).toBeTruthy();
                }
            }

            let end = new Date().getTime();

            log.info("Store loading {} cache took {} milliseconds.", (cached ? "with" : "without"), end - start);
        });
    });

    test("testMultipleStore", async ()=>{
        let stores: DIDStore[] = [];
        let docs: DIDDocument[] = [];

        for (let i = 0; i < stores.length; i++) {
            Utils.deleteFile(new File(TestConfig.storeRoot + i));
            stores[i] = await DIDStore.open(TestConfig.storeRoot + i);
            expect(stores[i]).not.toBeNull();
            let mnemonic = Mnemonic.getInstance().generate();
            await RootIdentity.createFromMnemonic(mnemonic, "", stores[i], TestConfig.storePass);
        }

        for (let i = 0; i < stores.length; i++) {
            docs[i] = await (await stores[i].loadRootIdentity()).newDid(TestConfig.storePass);
            expect(docs[i]).not.toBeNull();
        }

        for (let i = 0; i < stores.length; i++) {
            let doc = await stores[i].loadDid(docs[i].getSubject());
            expect(doc).not.toBeNull();
            expect(docs[i].toString(true)).toEqual(doc.toString(true));
        }
    });

    test("testOpenStoreOnExistEmptyFolder", async ()=>{
        let emptyFolder = new File(TestConfig.tempDir + File.SEPARATOR + "DIDTest-EmptyStore");
        if (emptyFolder.exists())
            emptyFolder.delete();

        emptyFolder.createDirectory();

        let store = await DIDStore.open(emptyFolder.getAbsolutePath());
        expect(store).not.toBeNull();

        store.close();
    });

    test("testExportAndImportDid", async ()=>{
        let storeDir = new File(TestConfig.storeRoot);

        await testData.getInstantData().getIssuerDocument();
        await testData.getInstantData().getUser1Document();
        await testData.getInstantData().getUser1PassportCredential();
        await testData.getInstantData().getUser1TwitterCredential();

        let did = (await store.listDids())[0];

        let tempDir = new File(TestConfig.tempDir);
        tempDir.createDirectory(true);
        //let exportFile = new File(tempDir, "didexport.json");

        let data = await store.exportDid(did, "password", TestConfig.storePass);
        //exportFile.writeText(data);

        let restoreDir = new File(tempDir, "restore");
        Utils.deleteFile(restoreDir);
        let store2 = await DIDStore.open(restoreDir.getAbsolutePath());
        await store2.importDid(data, "password", TestConfig.storePass);

        let path = "data" + File.SEPARATOR + "ids" + File.SEPARATOR + did.getMethodSpecificId();
        let didDir = new File(storeDir, path);
        let reDidDir = new File(restoreDir, path);
        expect(didDir.exists()).toBeTruthy();
        expect(reDidDir.exists()).toBeTruthy();
        expect(Utils.equals(reDidDir, didDir)).toBeTruthy();
    });

    test("testExportAndImportRootIdentity", async ()=>{
        let storeDir = new File(TestConfig.storeRoot);

        await testData.getInstantData().getIssuerDocument();
        await testData.getInstantData().getUser1Document();
        await testData.getInstantData().getUser1PassportCredential();
        await testData.getInstantData().getUser1TwitterCredential();

        let rootidentity = await store.loadRootIdentity();
        let id = rootidentity.getId();

        let tempDir = new File(TestConfig.tempDir);
        tempDir.createDirectory();
        //let exportFile = new File(tempDir, "idexport.json");

        let data = await store.exportRootIdentity(id, "password", TestConfig.storePass);

        let restoreDir = new File(tempDir, "restore");
        Utils.deleteFile(restoreDir);
        let store2 = await DIDStore.open(restoreDir.getAbsolutePath());
        await store2.importRootIdentity(data, "password", TestConfig.storePass);

        let path = "data" + File.SEPARATOR + "roots" + File.SEPARATOR + id;
        let privateDir = new File(storeDir, path);
        let rePrivateDir = new File(restoreDir, path);
        expect(privateDir.exists()).toBeTruthy();
        expect(rePrivateDir.exists()).toBeTruthy();
        expect(Utils.equals(rePrivateDir, privateDir)).toBeTruthy();
    });

    test("testExportAndImportStore", async ()=>{
        await testData.getRootIdentity();

        // Store test data into current store
        let instance = testData.getInstantData();
        await instance.getIssuerDocument();
        let user = await instance.getUser1Document();
        let vc = user.getCredential("#profile");
        vc.getMetadata().setAlias("MyProfile");
        vc = user.getCredential("#email");
        vc.getMetadata().setAlias("Email");
        vc = await instance.getUser1TwitterCredential();
        vc.getMetadata().setAlias("Twitter");
        vc = await instance.getUser1PassportCredential();
        vc.getMetadata().setAlias("Passport");

        let tempDir = new File(TestConfig.tempDir);
        tempDir.createDirectory();
        let exportFile = new File(tempDir, "storeexport.zip");

        await store.exportStore(exportFile.getAbsolutePath(), "password", TestConfig.storePass);

        let restoreDir = new File(tempDir, "restore");
        Utils.deleteFile(restoreDir);
        let store2 = await DIDStore.open(restoreDir.getAbsolutePath());
        await store2.importStore(exportFile.getAbsolutePath(), "password", TestConfig.storePass);

        let storeDir = new File(TestConfig.storeRoot);

        expect(storeDir.exists()).toBeTruthy();
        expect(restoreDir.exists()).toBeTruthy();
        expect(Utils.equals(restoreDir, storeDir)).toBeTruthy();
    });

    test("testImportCompatible", async ()=>{
        await testData.getRootIdentity();

        let cb = testData.getCompatibleData("2");

        let exportFile = new File(cb.getDataPath(), "store-export.zip");

        let tempDir = new File(TestConfig.tempDir);
        tempDir.createDirectory();
        let restoreDir = new File(tempDir, "imported-store");
        Utils.deleteFile(restoreDir);

        let store2 = await DIDStore.open(restoreDir.getAbsolutePath());
        await store2.importStore(exportFile.getAbsolutePath(), "password", TestConfig.storePass);

        // Root identity
        let ids = await store2.listRootIdentities();
        expect(ids.length).toBe(1);
        expect(ids[0].getId()).toEqual("d2f3c0f07eda4e5130cbdc59962426b1");
        expect(ids[0].getIndex()).toBe(5);

        // DIDs
        let dids = await store2.listDids();
        expect(dids.length).toBe(10);

        let user1Did = new DID("did:elastos:iXcRhYB38gMt1phi5JXJMjeXL2TL8cg58y");
        let user2Did = new DID("did:elastos:idwuEMccSpsTH4ZqrhuHqg6y8XMVQAsY5g");
        let user3Did = new DID("did:elastos:igXiyCJEUjGJV1DMsMa4EbWunQqVg97GcS");
        let user4Did = new DID("did:elastos:igHbSCez6H3gTuVPzwNZRrdj92GCJ6hD5d");
        let issuerDid = new DID("did:elastos:imUUPBfrZ1yZx6nWXe6LNN59VeX2E6PPKj");
        let exampleDid = new DID("did:elastos:example");
        let fooDid = new DID("did:elastos:foo");
        let foobarDid = new DID("did:elastos:foobar");
        let barDid = new DID("did:elastos:bar");
        let bazDid = new DID("did:elastos:baz");

        for (let i = 0; i < dids.length; i++) {
            let d = dids[i];
            expect(d.equals(user1Did) || d.equals(user2Did) || d.equals(user3Did) ||
                    d.equals(user4Did) || d.equals(issuerDid) || d.equals(exampleDid) ||
                    d.equals(fooDid) || d.equals(foobarDid) || d.equals(barDid) || d.equals(bazDid));
        }

        // DID: User1
        let doc = await store2.loadDid(user1Did);
        expect(doc).not.toBeNull();
        expect(doc.getMetadata().getAlias()).toEqual("User1");
        await doc.publish(TestConfig.storePass);

        //List<String> names = new ArrayList<String>();
        let names : string[] = [];
        names.push("email");
        names.push("json");
        names.push("passport");
        names.push("profile");
        names.push("twitter");

        let vcIds = await store2.listCredentials(user1Did);
        expect(vcIds.length).toBe(names.length);
        for (let id of vcIds) {
            let vc = await store2.loadCredential(id);
            expect(vc).not.toBeNull();
            names = names.filter(function(item) {
                return item != vc.getId().getFragment();
            });
        }
        expect(names.length).toBe(0);

        // DID: User2
        doc = await store2.loadDid(user2Did);
        expect(doc).not.toBeNull();
        expect(doc.getMetadata().getAlias()).toEqual("User2");
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(user2Did);
        expect(vcIds.length).toBe(1);
        expect(vcIds[0].getFragment()).toEqual("profile");
        let vc = await store2.loadCredential(vcIds[0]);
        expect(vc).not.toBeNull();

        // DID: User3
        doc = await store2.loadDid(user3Did);
        expect(doc).not.toBeNull();
        expect(doc.getMetadata().getAlias()).toEqual("User3");
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(user3Did);
        expect(vcIds.length).toBe(0);

        // DID: User4
        doc = await store2.loadDid(user4Did);
        expect(doc).not.toBeNull();
        expect(doc.getMetadata().getAlias()).toEqual("User4");
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(user4Did);
        expect(vcIds.length).toBe(0);

        // DID: Issuer
        doc = await store2.loadDid(issuerDid);
        expect(doc).not.toBeNull();
        expect(doc.getMetadata().getAlias()).toEqual("Issuer");
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(issuerDid);
        expect(vcIds.length).toBe(1);
        expect(vcIds[0].getFragment()).toEqual("profile");
        vc = await store2.loadCredential(vcIds[0]);
        expect(vc).not.toBeNull();

        // DID: Example
        doc = await store2.loadDid(exampleDid);
        expect(doc).not.toBeNull();
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(exampleDid);
        expect(vcIds.length).toBe(1);
        expect(vcIds[0].getFragment()).toEqual("profile");
        vc = await store2.loadCredential(vcIds[0]);
        expect(vc).not.toBeNull();

        // DID: Foo
        doc = await store2.loadDid(fooDid);
        expect(doc).not.toBeNull();
        doc.setEffectiveController(new DID("did:elastos:iXcRhYB38gMt1phi5JXJMjeXL2TL8cg58y"));
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(fooDid);
        expect(vcIds.length).toBe(1);
        expect(vcIds[0].getFragment()).toEqual("email");
        vc = await store2.loadCredential(vcIds[0]);
        expect(vc).not.toBeNull();

        // DID: FooBar
        doc = await store2.loadDid(foobarDid);
        expect(doc).not.toBeNull();
        doc.setEffectiveController(new DID("did:elastos:iXcRhYB38gMt1phi5JXJMjeXL2TL8cg58y"));
        await doc.publish(TestConfig.storePass);

        names = [];
        names.push("email");
        names.push("license");
        names.push("profile");
        names.push("services");

        vcIds = await store2.listCredentials(foobarDid);
        expect(vcIds.length).toBe(names.length);
        for (let id of vcIds) {
            let vc = await store2.loadCredential(id);
            expect(vc).not.toBeNull();
            names = names.filter(function(item) {
                return item != vc.getId().getFragment();
            });
        }
        expect(names.length).toBe(0);

        // DID: Bar
        doc = await store2.loadDid(barDid);
        expect(doc).not.toBeNull();
        doc.setEffectiveController(new DID("did:elastos:iXcRhYB38gMt1phi5JXJMjeXL2TL8cg58y"));
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(barDid);
        expect(vcIds.length).toBe(0);

        // DID: Baz
        doc = await store2.loadDid(bazDid);
        expect(doc).not.toBeNull();
        doc.setEffectiveController(new DID("did:elastos:iXcRhYB38gMt1phi5JXJMjeXL2TL8cg58y"));
        await doc.publish(TestConfig.storePass);

        vcIds = await store2.listCredentials(bazDid);
        expect(vcIds.length).toBe(0);
    });
});
