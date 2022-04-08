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
    DIDStore,
    DIDURL,
    Issuer,
    Logger,
    VerifiableCredential,
    IDChainRequest,
    Exceptions,
    VerificationEventListener,
    Features
} from "@elastosfoundation/did-js-sdk";
import { TestData } from "./utils/testdata";
import { TestConfig } from "./utils/testconfig";
import each from "jest-each";

const log = new Logger("VerifiableCredentialTest");

function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

describe('let Tests', () => {
    let testData: TestData;
    let store: DIDStore;

    beforeEach(async () => {
        testData = new TestData();
        await testData.cleanup();
        store = await testData.getStore();
    });

    afterEach(async () => {
    });

    ["1", "2", "2.2"].forEach((version) => {
        test('testKycCredential', async () => {
            let cd = testData.getCompatibleData(version);

            let issuer = await cd.getDocument("issuer");
            let user = await cd.getDocument("user1");

            let vc = await cd.getCredential("user1", "twitter");

            expect(new DIDURL("#twitter", user.getSubject()).equals(vc.getId()));

            if (parseFloat(version) < 2.0) {
                expect(vc.getType().includes("InternetAccountCredential")).toBeTruthy();
                expect(vc.getType().includes("TwitterCredential")).toBeTruthy();
            } else {
                expect(vc.getType().includes("VerifiableCredential")).toBeTruthy();
                expect(vc.getType().includes("SocialCredential")).toBeTruthy();
            }

            expect(issuer.getSubject().equals(vc.getIssuer())).toBeTruthy();
            expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

            expect("@john").toEqual(vc.getSubject().getProperty("twitter"));

            expect(vc.getIssuanceDate()).not.toBeNull();
            await expect(await vc.getExpirationDate()).not.toBeNull();

            expect(vc.isSelfProclaimed()).toBeFalsy();
            let check = await vc.isExpired();
            expect(check).toBeFalsy();
            check = await vc.isGenuine();
            expect(check).toBeTruthy();
            check = await vc.isValid();
            expect(check).toBeTruthy();
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test('testSelfProclaimedCredential', async () => {
            let cd = testData.getCompatibleData(version);

            let user = await cd.getDocument("user1");
            let vc = await cd.getCredential("user1", "passport");

            expect(new DIDURL("#passport", user.getSubject()).equals(vc.getId()));

            if (parseFloat(version) < 2.0) {
                expect(vc.getType().includes("BasicProfileCredential")).toBeTruthy();
                expect(vc.getType().includes("SelfProclaimedCredential")).toBeTruthy();
            } else {
                expect(vc.getType().includes("VerifiableCredential")).toBeTruthy();
                expect(vc.getType().includes("SelfProclaimedCredential")).toBeTruthy();
            }

            expect(user.getSubject().equals(vc.getIssuer()));
            expect(user.getSubject().equals(vc.getSubject().getId()));

            if (parseFloat(version) < 2.0) {
                expect("Singapore").toEqual(vc.getSubject().getProperty("nation"));
                expect("S653258Z07").toEqual(vc.getSubject().getProperty("passport"));
            } else {
                expect("Singapore").toEqual(vc.getSubject().getProperty("nationality"));
                expect("S653258Z07").toEqual(vc.getSubject().getProperty("passport"));
            }

            expect(vc.getIssuanceDate()).not.toBeNull();
            expect(await vc.getExpirationDate()).not.toBeNull();

            expect(vc.isSelfProclaimed()).toBeTruthy();
            let check = await vc.isExpired();
            expect(check).toBeFalsy();
            check = await vc.isGenuine();
            expect(check).toBeTruthy();
            check = await vc.isValid();
            expect(check).toBeTruthy();
        });
    });

    ["1", "2", "2.2"].forEach((version) => {
        test('testJsonCredential', async () => {
            let cd = testData.getCompatibleData(version);

            let issuer = await cd.getDocument("issuer");
            let user = await cd.getDocument("user1");
            let vc = await cd.getCredential("user1", "json");

            expect(new DIDURL("#json", user.getSubject()).equals(vc.getId()));

            if (parseFloat(version) < 2.0) {
                expect(vc.getType().includes("JsonCredential")).toBeTruthy();
                expect(vc.getType().includes("TestCredential")).toBeTruthy();
            } else {
                expect(vc.getType().includes("VerifiableCredential")).toBeTruthy();
                expect(vc.getType().includes("NonExistsType")).toBeFalsy();
            }

            expect(user.getSubject().equals(vc.getIssuer()));
            expect(user.getSubject().equals(vc.getSubject().getId()));

            expect("Technologist").toEqual(vc.getSubject().getProperty("Description"));
            expect(true).toEqual(vc.getSubject().getProperty("booleanValue"));
            expect(1234).toEqual(vc.getSubject().getProperty("numberValue"));

            expect(vc.getIssuanceDate()).not.toBeNull();
            await expect(await vc.getExpirationDate()).not.toBeNull();

            expect(vc.isSelfProclaimed()).toBeFalsy();
            let check = await vc.isExpired();
            expect(check).toBeFalsy();
            check = await vc.isGenuine();
            expect(check).toBeTruthy();
            check = await vc.isValid();
            expect(check).toBeTruthy();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test('testKycCredentialToCid', async () => {
            let cd = testData.getCompatibleData(version);
            await cd.loadAll();

            let issuer = await cd.getDocument("issuer");
            let foo = await cd.getDocument("foo");

            let vc = await cd.getCredential("foo", "email");

            expect(new DIDURL("#email", foo.getSubject()).equals(vc.getId())).toBeTruthy();

            expect(vc.getType().includes("EmailCredential")).toBeTruthy();
            expect(vc.getType().includes("ProfileCredential")).toBeFalsy();

            expect(issuer.getSubject().equals(vc.getIssuer())).toBeTruthy();
            expect(foo.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

            expect("foo@example.com").toEqual(vc.getSubject().getProperty("email"));

            expect(vc.getIssuanceDate()).not.toBeNull();
            await expect(await vc.getExpirationDate()).not.toBeNull();

            expect(vc.isSelfProclaimed()).toBeFalsy();
            let check = await vc.isExpired();
            expect(check).toBeFalsy();
            check = await vc.isGenuine();
            expect(check).toBeTruthy();
            check = await vc.isValid();
            expect(check).toBeTruthy();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test('testKycCredentialFromCid', async () => {
            let cd = testData.getCompatibleData(version);
            await cd.loadAll();

            let exampleCorp = await cd.getDocument("examplecorp");
            let foobar = await cd.getDocument("foobar");

            let vc = await cd.getCredential("foobar", "license");

            expect(new DIDURL("#license", foobar.getSubject()).equals(vc.getId())).toBeTruthy();

            expect(vc.getType().includes("LicenseCredential")).toBeTruthy();
            expect(vc.getType().includes("ProfileCredential")).toBeFalsy();

            expect(exampleCorp.getSubject().equals(vc.getIssuer())).toBeTruthy();
            expect(foobar.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

            expect(vc.getSubject().getProperty("license-id")).toEqual("20201021C889");
            expect(vc.getSubject().getProperty("scope")).toEqual("Consulting");

            expect(vc.getIssuanceDate()).not.toBeNull();
            await expect(await vc.getExpirationDate()).not.toBeNull();

            expect(vc.isSelfProclaimed()).toBeFalsy();
            let check = await vc.isExpired();
            expect(check).toBeFalsy();
            check = await vc.isGenuine();
            expect(check).toBeTruthy();
            check = await vc.isValid();
            expect(check).toBeTruthy();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test('testSelfProclaimedCredentialFromCid', async () => {
            let cd = testData.getCompatibleData(version);
            await cd.loadAll();

            let foobar = await cd.getDocument("foobar");

            let vc = await cd.getCredential("foobar", "services");

            expect(new DIDURL("#services", foobar.getSubject()).equals(vc.getId()));

            expect(vc.getType().includes("SelfProclaimedCredential")).toBeTruthy();
            expect(vc.getType().includes("VerifiableCredential")).toBeTruthy();

            expect(foobar.getSubject().equals(vc.getIssuer()));
            expect(foobar.getSubject().equals(vc.getSubject().getId()));

            expect(vc.getSubject().getProperty("Outsourceing")).toEqual("https://foobar.com/outsourcing");
            expect(vc.getSubject().getProperty("consultation")).toEqual("https://foobar.com/consultation");

            expect(vc.getIssuanceDate()).not.toBeNull();
            await expect(await vc.getExpirationDate()).not.toBeNull();

            expect(vc.isSelfProclaimed()).toBeTruthy();
            let check = await vc.isExpired();
            expect(check).toBeFalsy();
            check = await vc.isGenuine();
            expect(check).toBeTruthy();
            check = await vc.isValid();
            expect(check).toBeTruthy();
        });
    });

    test('testParseAndSerialize', async () => {
        let csvSource = [
            {version: "1", did:"user1", vc:"twitter"},
            {version: "1", did:"user1", vc:"passport"},
            {version: "1", did:"user1", vc:"json"},
            {version: "2", did:"user1", vc:"twitter"},
            {version: "2", did:"user1", vc:"passport"},
            {version: "2", did:"user1", vc:"json"},
            {version: "2", did:"foobar", vc:"license"},
            {version: "2", did:"foobar", vc:"services"},
            {version: "2", did:"foo", vc:"email"},
            {version: "2.2", did:"user1", vc:"twitter"},
            {version: "2.2", did:"user1", vc:"passport"},
            {version: "2.2", did:"user1", vc:"json"},
            {version: "2.2", did:"foobar", vc:"license"},
            {version: "2.2", did:"foobar", vc:"services"},
            {version: "2.2", did:"foo", vc:"email"}
        ];

        for (let csv of csvSource) {
            let cd = testData.getCompatibleData(csv.version);
            await cd.loadAll();

            let normalizedJson = cd.getCredentialJson(csv.did, csv.vc, "normalized");
            let normalized = VerifiableCredential.parse(normalizedJson);

            let compactJson = cd.getCredentialJson(csv.did, csv.vc, "compact");
            let compact = VerifiableCredential.parse(compactJson);

            let credential = await cd.getCredential(csv.did, csv.vc);

            let check = await credential.isExpired();
            expect(check).toBeFalsy();
            check = await credential.isGenuine();
            expect(check).toBeTruthy();
            check = await credential.isValid();
            expect(check).toBeTruthy();

            expect(normalizedJson).toEqual(normalized.toString(true));
            expect(normalizedJson).toEqual(compact.toString(true));
            expect(normalizedJson).toEqual(credential.toString(true));

            if (cd.isLatestVersion()) {
                expect(compactJson).toEqual(normalized.toString(false));
                expect(compactJson).toEqual(compact.toString(false));
                expect(compactJson).toEqual(credential.toString(false));
            }
        }
    });

    test('testGenuineAndValidWithListener', async () => {
        let listener = VerificationEventListener.getDefault("  ", "- ", "* ");
        let csvSource = [
            {version: "1", did:"user1", vc:"twitter"},
            {version: "1", did:"user1", vc:"passport"},
            {version: "1", did:"user1", vc:"json"},
            {version: "2", did:"user1", vc:"twitter"},
            {version: "2", did:"user1", vc:"passport"},
            {version: "2", did:"user1", vc:"json"},
            {version: "2", did:"foobar", vc:"license"},
            {version: "2", did:"foobar", vc:"services"},
            {version: "2", did:"foo", vc:"email"},
            {version: "2.2", did:"user1", vc:"twitter"},
            {version: "2.2", did:"user1", vc:"passport"},
            {version: "2.2", did:"user1", vc:"json"},
            {version: "2.2", did:"foobar", vc:"license"},
            {version: "2.2", did:"foobar", vc:"services"},
            {version: "2.2", did:"foo", vc:"email"}
        ];

        for (let csv of csvSource) {
            let cd = testData.getCompatibleData(csv.version);
            await cd.loadAll();

            let credential = await cd.getCredential(csv.did, csv.vc);

            await expect(await credential.isExpired()).toBeFalsy();
            await expect(await credential.isGenuine(listener)).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();

            let valid = await credential.isValid(listener);
            expect(valid).toBeTruthy();
            expect(listener.toString().startsWith("  - ")).toBeTruthy();
            listener.reset();
        }
    });

    each([
        [ "1", "user1", "twitter" ],
        [ "1", "user1", "passport" ],
        [ "1", "user1", "json" ],
        [ "2", "user1", "twitter" ],
        [ "2", "user1", "passport" ],
        [ "2", "user1", "json" ],
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "user1", "twitter" ],
        [ "2.2", "user1", "passport" ],
        [ "2.2", "user1", "json" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testDeclareCredential', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        // Sign key for customized DID
        let doc = await credential.getSubject().getId().resolve();
        let signKey = null;
        if (doc.getControllerCount() > 1) {
            let index = (randomInt(Number.MAX_VALUE)) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.declare(signKey, TestConfig.storePass);

        let id = credential.getId();
        let resolved = await VerifiableCredential.resolve(id);
        expect(resolved).not.toBeNull();
        expect(credential.toString()).toEqual(resolved.toString());

        let metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeFalsy();

        let bio = await VerifiableCredential.resolveBiography(id, credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toEqual(1);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
    });

    [false, true].forEach((contextEnabled) => {
        test('testDeclareCredentials', async () => {
            Features.enableJsonLdContext(contextEnabled);

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
                let credential = await sd.getCredential(csv.did, csv.vc);
                // Sign key for customized DID
                let doc = await credential.getSubject().getId().resolve();
                expect(doc).not.toBeNull();

                let signKey = null;
                if (doc.getControllerCount() > 1) {
                    let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
                    signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
                }

                await credential.declare(signKey, TestConfig.storePass);

                let id = credential.getId();
                let resolved = await VerifiableCredential.resolve(id);
                expect(resolved).not.toBeNull();
                expect(credential.toString()).toEqual(resolved.toString());

                let metadata = resolved.getMetadata();
                expect(metadata).not.toBeNull();
                expect(metadata.getPublished()).not.toBeNull();
                expect(metadata.getTransactionId()).not.toBeNull();
                expect(await resolved.isRevoked()).toBeFalsy();

                let bio = await VerifiableCredential.resolveBiography(id, credential.getIssuer());
                expect(bio).not.toBeNull();
                expect(bio.getAllTransactions().length).toBe(1);
                expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
            }
        });
    });

    each([
        [ "1", "user1", "twitter" ],
        [ "1", "user1", "passport" ],
        [ "1", "user1", "json" ],
        [ "2", "user1", "twitter" ],
        [ "2", "user1", "passport" ],
        [ "2", "user1", "json" ],
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "user1", "twitter" ],
        [ "2.2", "user1", "passport" ],
        [ "2.2", "user1", "json" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testRevokeCredential', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        expect(await credential.wasDeclared()).toBeFalsy();

        // Sign key for customized DID
        let doc = await credential.getSubject().getId().resolve();
        let signKey = null;
        if (doc.getControllerCount() > 1) {
            let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.declare(signKey, TestConfig.storePass);

        let id = credential.getId();
        let resolved = await VerifiableCredential.resolve(id);
        expect(resolved).not.toBeNull();
        expect(credential.toString()).toEqual(resolved.toString());

        let metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeFalsy();

        expect(await credential.wasDeclared()).toBeTruthy();

        await credential.revoke(signKey, null, TestConfig.storePass);

        expect(credential.toString()).toEqual(resolved.toString());

        metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeTruthy();

        let bio = await VerifiableCredential.resolveBiography(id, credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toBe(2);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
        expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
    });

    each([
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testRevokeCredentialWithDifferentKey', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        expect(await credential.wasDeclared()).toBeFalsy();

        // Sign key for customized DID
        let doc = await credential.getSubject().getId().resolve();
        let signKey = null;
        let index = 0;
        if (doc.getControllerCount() > 1) {
            index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.declare(signKey, TestConfig.storePass);

        let id = credential.getId();
        let resolved = await VerifiableCredential.resolve(id);
        expect(resolved).not.toBeNull();

        expect(credential.toString()).toEqual(resolved.toString());

        let metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeFalsy();

        expect(await credential.wasDeclared()).toBeTruthy();

        if (doc.getControllerCount() > 1) {
            index = ++index % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.revoke(signKey, null, TestConfig.storePass);

        resolved = await VerifiableCredential.resolve(id);
        expect(resolved).not.toBeNull();

        expect(credential.toString()).toEqual(resolved.toString());

        metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeTruthy();

        let bio = await VerifiableCredential.resolveBiography(id, credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toBe(2);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
        expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
    });

    each([
        [ "1", "user1", "twitter" ],
        [ "1", "user1", "passport" ],
        [ "1", "user1", "json" ],
        [ "2", "user1", "twitter" ],
        [ "2", "user1", "passport" ],
        [ "2", "user1", "json" ],
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "user1", "twitter" ],
        [ "2.2", "user1", "passport" ],
        [ "2.2", "user1", "json" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testDeclareAfterRevoke', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeFalsy();

        // Sign key for customized DID
        let doc = await credential.getSubject().getId().resolve();
        let signKey = null;
        if (doc.getControllerCount() > 1) {
            let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.revoke(signKey, null, TestConfig.storePass);

        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeTruthy();

        let resolved = await VerifiableCredential.resolve(credential.getId());
        expect(resolved).toBeNull();

        expect(async() => await credential.declare(signKey, TestConfig.storePass)).rejects.toThrow(Exceptions.CredentialRevokedException);

        let bio = await VerifiableCredential.resolveBiography(credential.getId(), credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toBe(1);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
    });

    each([
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testDeclareAfterRevokeWithDifferentKey', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeFalsy();

        // Sign key for customized DID
        let doc = await credential.getSubject().getId().resolve();
        let signKey = null;
        let index = 0;
        if (doc.getControllerCount() > 1) {
            index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.revoke(signKey, null, TestConfig.storePass);

        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeTruthy();

        let resolved = await VerifiableCredential.resolve(credential.getId());
        expect(resolved).toBeNull();

        if (doc.getControllerCount() > 1) {
            index = ++index % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        expect(async() => await credential.declare(signKey, TestConfig.storePass)).rejects.toThrow(Exceptions.CredentialRevokedException);

        let bio = await VerifiableCredential.resolveBiography(credential.getId(), credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toBe(1);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
    });

    each([
        [ "1", "user1", "twitter" ],
        [ "1", "user1", "passport" ],
        [ "1", "user1", "json" ],
        [ "2", "user1", "twitter" ],
        [ "2", "user1", "passport" ],
        [ "2", "user1", "json" ],
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "user1", "twitter" ],
        [ "2.2", "user1", "passport" ],
        [ "2.2", "user1", "json" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testDeclareAfterRevokeByIssuer', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeFalsy();

        // Sign key for issuer
        let issuer = await credential.getIssuer().resolve();
        let signKey = null;
        if (issuer.getControllerCount() > 1) {
            let index = randomInt(Number.MAX_VALUE) % issuer.getControllerCount();
            signKey = (await issuer.getControllers()[index].resolve()).getDefaultPublicKeyId();
        } else
            signKey = issuer.getDefaultPublicKeyId();

        await credential.revoke(signKey, null, TestConfig.storePass);
        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeTruthy();

        let resolved = await VerifiableCredential.resolve(credential.getId());
        expect(resolved).toBeNull();

        let doc = await credential.getSubject().getId().resolve();
        if (doc.getControllerCount() > 1) {
            let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        expect(async() => await credential.declare(signKey, TestConfig.storePass)).rejects.toThrow(Exceptions.CredentialRevokedException);

        let bio = await VerifiableCredential.resolveBiography(credential.getId(), credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toBe(1);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
    });

    each([
        [ "1", "user1", "twitter" ],
        [ "1", "user1", "passport" ],
        [ "1", "user1", "json" ],
        [ "2", "user1", "twitter" ],
        [ "2", "user1", "passport" ],
        [ "2", "user1", "json" ],
        [ "2", "foobar", "license" ],
        [ "2", "foobar", "services" ],
        [ "2", "foo", "email" ],
        [ "2.2", "user1", "twitter" ],
        [ "2.2", "user1", "passport" ],
        [ "2.2", "user1", "json" ],
        [ "2.2", "foobar", "license" ],
        [ "2.2", "foobar", "services" ],
        [ "2.2", "foo", "email" ]
    ]).test('testDeclareAfterInvalidRevoke', async (version, did, vc) => {
        let cd = testData.getCompatibleData(version);
        let sd = testData.getInstantData();
        await cd.loadAll();

        let credential = await cd.getCredential(did, vc);
        let id = credential.getId();
        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeFalsy();

        let doc = await sd.getUser1Document();
        await VerifiableCredential.revoke(id, doc, null, TestConfig.storePass);
        expect(await credential.wasDeclared()).toBeFalsy();
        expect(await credential.isRevoked()).toBeFalsy();
        expect(await VerifiableCredential.resolve(id)).toBeNull();
        expect(await VerifiableCredential.resolve(id, doc.getSubject())).toBeNull();

        doc = await credential.getSubject().getId().resolve();
        expect(doc).not.toBeNull();

        let signKey = null;
        if (doc.getControllerCount() > 1) {
            let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
            signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
        }

        await credential.declare(signKey, TestConfig.storePass);

        let resolved = await VerifiableCredential.resolve(id);
        expect(resolved).not.toBeNull();

        expect(credential.toString()).toEqual(resolved.toString());

        let metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeFalsy();

        expect(await credential.wasDeclared()).toBeTruthy();

        await credential.revoke(signKey, null, TestConfig.storePass);

        resolved = await VerifiableCredential.resolve(id);
        expect(resolved).not.toBeNull();
        expect(credential.toString()).toEqual(resolved.toString());

        metadata = resolved.getMetadata();
        expect(metadata).not.toBeNull();
        expect(metadata.getPublished()).not.toBeNull();
        expect(metadata.getTransactionId()).not.toBeNull();
        expect(await resolved.isRevoked()).toBeTruthy();

        let bio = await VerifiableCredential.resolveBiography(id, credential.getIssuer());
        expect(bio).not.toBeNull();
        expect(bio.getAllTransactions().length).toBe(2);
        expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.REVOKE));
        expect(bio.getTransaction(1).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
    });

    [false, true].forEach((contextEnabled) => {
        test('testListCredentials', async () => {
            Features.enableJsonLdContext(contextEnabled);
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
                let credential = await sd.getCredential(csv.did, csv.vc);

                // Sign key for customized DID
                let doc = await credential.getSubject().getId().resolve();
                expect(doc).not.toBeNull();

                let signKey = null;
                if (doc.getControllerCount() > 1) {
                    let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
                    signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
                }

                await credential.declare(signKey, TestConfig.storePass);

                let id = credential.getId();
                let resolved = await VerifiableCredential.resolve(id);
                expect(resolved).not.toBeNull();

                expect(credential.toString()).toEqual(resolved.toString());

                let metadata = resolved.getMetadata();
                expect(metadata).not.toBeNull();
                expect(metadata.getPublished()).not.toBeNull();
                expect(metadata.getTransactionId()).not.toBeNull();
                expect(await resolved.isRevoked()).toBeFalsy();

                let bio = await VerifiableCredential.resolveBiography(id, credential.getIssuer());
                expect(bio).not.toBeNull();
                expect(bio.getAllTransactions().length).toBe(1);
                expect(bio.getTransaction(0).getRequest().getOperation().equals(IDChainRequest.Operation.DECLARE));
            }

            let doc = await sd.getUser1Document();
            let did = doc.getSubject();
            let ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(4);

            for (let id of ids) {

                let vc = await VerifiableCredential.resolve(id);
                expect(vc).not.toBeNull();
                expect(vc.getId().equals(id)).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
                expect(await vc.isRevoked()).toBeFalsy();
            }

            doc = await sd.getFooBarDocument();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(2);
            console.log("IDS")
            console.log(ids)
            for (let id of ids) {
                console.log("ID")
                console.log(id)
                let vc = await VerifiableCredential.resolve(id);
                console.log("vc.getId")
                console.log(vc.getId())
                expect(vc).not.toBeNull();
                expect(vc.getId().equals(id)).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
                expect(await vc.isRevoked()).toBeFalsy();
            }

            doc = await sd.getFooDocument();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(1);
            for (let id of ids) {
                let vc = await VerifiableCredential.resolve(id);
                expect(vc).not.toBeNull();
                expect(vc.getId().equals(id)).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
                expect(await vc.isRevoked()).toBeFalsy();
            }

            doc = await sd.getBarDocument();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).toBeNull();

            for (let csv of csvSource) {
                let credential = await sd.getCredential(csv.did, csv.vc);

                // Sign key for customized DID
                doc = await credential.getSubject().getId().resolve();
                let signKey = null;
                if (doc.getControllerCount() > 1) {
                    let index = randomInt(Number.MAX_VALUE) % doc.getControllerCount();
                    signKey = (await doc.getControllers()[index].resolve()).getDefaultPublicKeyId();
                }

                await credential.revoke(signKey, null, TestConfig.storePass);

                let id = credential.getId();
                let resolved = await VerifiableCredential.resolve(id);
                expect(resolved).not.toBeNull();
                expect(await resolved.isRevoked()).toBeTruthy();
            }

            doc = await sd.getUser1Document();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(4);
            for (let id of ids) {
                let vc = await VerifiableCredential.resolve(id);
                expect(vc).not.toBeNull();
                expect(vc.getId().equals(id)).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
                expect(await vc.isRevoked()).toBeTruthy();
            }

            doc = await sd.getFooBarDocument();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(2);
            for (let id of ids) {
                let vc = await VerifiableCredential.resolve(id);
                expect(vc).not.toBeNull();
                expect(vc.getId().equals(id)).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
                expect(await vc.isRevoked()).toBeTruthy();
            }

            doc = await sd.getFooDocument();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).not.toBeNull();
            expect(ids.length).toBe(1);
            for (let id of ids) {
                let vc = await VerifiableCredential.resolve(id);
                expect(vc).not.toBeNull();
                expect(vc.getId().equals(id)).toBeTruthy();
                expect(await vc.wasDeclared()).toBeTruthy();
                expect(await vc.isRevoked()).toBeTruthy();
            }

            doc = await sd.getBarDocument();
            did = doc.getSubject();
            ids = await VerifiableCredential.list(did);
            expect(ids).toBeNull();
        });
    });

    test('testListPagination', async () => {
        let sd = testData.getInstantData();

        let doc = await sd.getUser1Document();
        let did = doc.getSubject();

        let selfIssuer = new Issuer(doc);

        for (let i = 0; i < 36; i++) {
            console.log("Creating test credential {}...", i);

            let vc = await selfIssuer.issueFor(did)
                    .id("#test" + i)
                    .typeWithContext("SelfProclaimedCredential", "https://ns.elastos.org/credentials/v1")
                    .properties({"index": i})
                    .seal(TestConfig.storePass);

            vc.getMetadata().attachStore(doc.getStore());
            await vc.declare(null, TestConfig.storePass);

            expect(await vc.wasDeclared()).toBeTruthy();
        }

        let index = 35;
        let ids = await VerifiableCredential.list(did);
        expect(ids).not.toBeNull();
        expect(ids.length).toBe(36);

        for (let id of ids) {
            console.log("Resolving credential {}...", id.getFragment());

            let ref = new DIDURL("#test" + index--, did);
            expect(ref.equals(id)).toBeTruthy();

            let vc = await VerifiableCredential.resolve(id);
            expect(vc).not.toBeNull();
            expect(ref.equals(vc.getId())).toBeTruthy();
            expect(await vc.wasDeclared()).toBeTruthy();
        }

        index = 35;
        ids = await VerifiableCredential.list(did, 0, 560);
        expect(ids).not.toBeNull();
        expect(ids.length).toBe(36);
        for (let id of ids) {
            //console.log("Resolving credential {}...", id.getFragment());

            let ref = new DIDURL("#test" + index--, did);
            expect(ref.equals(id)).toBeTruthy();

            //let vc = await VerifiableCredential.resolve(id);

            //expect(vc).not.toBeNull();
            //expect(ref.equals(vc.getId())).toBeTruthy();
            //expect(await vc.wasDeclared()).toBeTruthy();
        }

        ids = await VerifiableCredential.list(did, 36, 100);
        expect(ids).toBeNull();

        let skip = 0;
        let limit = 16;
        index = 36;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let resultSize = index >= limit ? limit : index;
            ids = await VerifiableCredential.list(did, skip, limit);
            if (ids == null)
                break;

            expect(ids.length).toEqual(resultSize);
            for (let id of ids) {
                //console.log("Resolving credential {}...", id.getFragment());

                let ref = new DIDURL("#test" + --index, did);
                expect(ref.equals(id)).toBeTruthy();

                //let vc = await VerifiableCredential.resolve(id);

                //expect(vc).not.toBeNull();
                //expect(ref.equals(vc.getId())).toBeTruthy();
                //expect(await vc.wasDeclared()).toBeTruthy();
            }

            skip += ids.length;
        }
        expect(index).toEqual(0);

        skip = 20;
        limit = 10;
        index = 16;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let resultSize = index >= limit ? limit : index;
            ids = await VerifiableCredential.list(did, skip, limit);
            if (ids == null)
                break;

            expect(ids.length).toEqual(resultSize);
            for (let id of ids) {
                //console.log("Resolving credential {}...", id.getFragment());

                let ref = new DIDURL("#test" + --index, did);
                expect(ref.equals(id)).toBeTruthy();

                //let vc = await VerifiableCredential.resolve(id);

                //expect(vc).not.toBeNull();
                //expect(ref.equals(vc.getId())).toBeTruthy();
                //expect(await vc.wasDeclared()).toBeTruthy();
            }

            skip += ids.length;
        }
        expect(index).toBe(0);
    });
});