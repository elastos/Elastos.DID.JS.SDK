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
	DIDURL,
	DIDStore,
	VerifiablePresentation
} from "@elastosfoundation/did-js-sdk";
import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";

let testData: TestData;
let store: DIDStore;

describe('VerifiablePresentation Tests', () => {
    beforeEach(async () => {
    	testData = new TestData();
		await testData.cleanup();
    	store = await testData.getStore();
    });

    afterEach(async () => {
    });

	test('testReadPresentationNonempty', async () => {
		let version = 2;
    	let cd = testData.getCompatibleData(version);

    	// For integrity check
		await cd.getDocument("issuer");
		let user = await cd.getDocument("user1");
		let vp = await cd.getPresentation("user1", "nonempty");

		expect(vp.getId()).toBeNull();
		expect(vp.getType().length).toEqual(1);
		expect(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE).toEqual(vp.getType()[0]);
		expect(user.getSubject().equals(vp.getHolder())).toBeTruthy();

		expect(vp.getCredentialCount()).toEqual(4);
		let vcs = vp.getCredentials();
		for (let vc of vcs) {
			expect(user.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

			expect(vc.getId().getFragment() === "profile"
					|| vc.getId().getFragment() === "email"
					|| vc.getId().getFragment() === "twitter"
					|| vc.getId().getFragment() === "passport").toBeTruthy();
		}

		expect(vp.getCredential(new DIDURL("#profile", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#email", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#twitter", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#passport", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#notExist", vp.getHolder()))).toBeNull();

		await expect(await vp.isGenuine()).toBeTruthy();
		await expect(await vp.isValid()).toBeTruthy();
	});

	test('testReadPresentationEmpty', async () => {
		let version = 2;
    	let cd = testData.getCompatibleData(version);

    	// For integrity check
		await cd.getDocument("issuer");
		let user = await cd.getDocument("user1");
		let vp = await cd.getPresentation("user1", "empty");

		expect(vp.getId()).toBeNull();
		expect(1).toEqual(vp.getType().length);
		expect(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE).toEqual(vp.getType()[0]);
		expect(user.getSubject().equals(vp.getHolder())).toBeTruthy();

		expect(0).toEqual(vp.getCredentialCount());
		expect(vp.getCredential(new DIDURL("#notExist", vp.getHolder()))).toBeNull();

		await expect(await vp.isGenuine()).toBeTruthy();
		await expect(await vp.isValid()).toBeTruthy();
	});

	[
    	"user1,empty",
    	"user1,nonempty",
    	"user1,optionalattrs",
    	"foobar,empty",
    	"foobar,nonempty",
    	"foobar,optionalattrs"
	].forEach((entry)=>{
		let entryParts = entry.split(',');
		let did = entryParts[0];
		let presentation = entryParts[1];
		test('testParseAndSerializeNonempty', async () => {
			let version = 2;
			let cd = testData.getCompatibleData(2);
			// For integrity check
			await cd.loadAll();

			let vp = await cd.getPresentation(did, presentation);

			expect(vp).not.toBeNull();
			await expect(await vp.isGenuine()).toBeTruthy();
			await expect(await vp.isValid()).toBeTruthy();

			let normalizedJson = cd.getPresentationJson(did, presentation, "normalized");

			let normalized = await VerifiablePresentation.parseContent(normalizedJson);
			expect(normalized).not.toBeNull();
			await expect(await normalized.isGenuine()).toBeTruthy();
			await expect(await normalized.isValid()).toBeTruthy();

			expect(normalizedJson).toEqual(normalized.toString(true));
			expect(normalizedJson).toEqual(vp.toString(true));
		});
	});

	test('testBuildNonempty', async () => {
		let td = await testData.getInstantData();
		let doc = await td.getUser1Document();

		let pb = await VerifiablePresentation.createFor(doc.getSubject(), null, store);

		let vp = await pb
				.credentials(doc.getCredential("#profile"))
				.credentials(doc.getCredential("#email"))
				.credentials(await td.getUser1TwitterCredential())
				.credentials(await td.getUser1PassportCredential())
				.realm("https://example.com/")
				.nonce("873172f58701a9ee686f0630204fee59")
				.seal(TestConfig.storePass);

		expect(vp).not.toBeNull();

		expect(vp.getId()).toBeNull();
		expect(1).toEqual(vp.getType().length);
		expect(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE).toEqual(vp.getType()[0]);
		expect(doc.getSubject().equals(vp.getHolder())).toBeTruthy();

		expect(4).toEqual(vp.getCredentialCount());
		let vcs = vp.getCredentials();
		for (let vc of vcs) {
			expect(doc.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

			expect(vc.getId().getFragment() === "profile"
					|| vc.getId().getFragment() === "email"
					|| vc.getId().getFragment() === "twitter"
					|| vc.getId().getFragment() === "passport").toBeTruthy();
		}

		expect(vp.getCredential(new DIDURL("#profile", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#email", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#twitter", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#passport", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#notExist", vp.getHolder()))).toBeNull();

		await expect(await vp.isGenuine()).toBeTruthy();
		await expect(await vp.isValid()).toBeTruthy();
	});

	test('testBuildNonemptyWithOptionalAttrs', async () => {
		let td = await testData.getInstantData();
		let doc = await td.getUser1Document();

		let pb = await VerifiablePresentation.createFor(doc.getSubject(), null, store);

		let vp = await pb
				.id("#test-vp")
				.type("Trail", "TestPresentation")
				.credentials(doc.getCredential("#profile"))
				.credentials(doc.getCredential("#email"))
				.credentials(await td.getUser1TwitterCredential())
				.credentials(await td.getUser1PassportCredential())
				.realm("https://example.com/")
				.nonce("873172f58701a9ee686f0630204fee59")
				.seal(TestConfig.storePass);

		expect(vp).not.toBeNull();

		expect(new DIDURL("#test-vp", doc.getSubject()).equals(vp.getId())).toBeTruthy();
		expect(2).toEqual(vp.getType().length);
		expect("TestPresentation").toEqual(vp.getType()[0]);
		expect("Trail").toEqual(vp.getType()[1]);
		expect(doc.getSubject().equals(vp.getHolder())).toBeTruthy();

		expect(4).toEqual(vp.getCredentialCount());
		let vcs = vp.getCredentials();
		for (let vc of vcs) {
			expect(doc.getSubject().equals(vc.getSubject().getId())).toBeTruthy();

			expect(vc.getId().getFragment() === "profile"
					|| vc.getId().getFragment() === "email"
					|| vc.getId().getFragment() === "twitter"
					|| vc.getId().getFragment() === "passport").toBeTruthy();
		}

		expect(vp.getCredential(new DIDURL("#profile", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#email", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#twitter", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#passport", vp.getHolder()))).not.toBeNull();
		expect(vp.getCredential(new DIDURL("#notExist", vp.getHolder()))).toBeNull();

		await expect(await vp.isGenuine()).toBeTruthy();
		await expect(await vp.isValid()).toBeTruthy();
	});

	test('testBuildEmpty', async () => {
		let doc = await testData.getInstantData().getUser1Document();

		let pb = await VerifiablePresentation.createFor(doc.getSubject(), null, store);

		let vp = await pb
				.realm("https://example.com/")
				.nonce("873172f58701a9ee686f0630204fee59")
				.seal(TestConfig.storePass);

		expect(vp).not.toBeNull();

		expect(vp.getId()).toBeFalsy(); // null or undefined
		expect(1).toEqual(vp.getType().length);
		expect(VerifiablePresentation.DEFAULT_PRESENTATION_TYPE).toEqual(vp.getType()[0]);
		expect(doc.getSubject().equals(vp.getHolder())).toBeTruthy();

		expect(0).toEqual(vp.getCredentialCount());
		expect(vp.getCredential(new DIDURL("#notExist", vp.getHolder()))).toBeFalsy(); // null or undefined

		let resolved = await vp.getHolder().resolve();
		expect(resolved).not.toBeNull();

		await expect(await vp.isGenuine()).toBeTruthy();
		await expect(await vp.isValid()).toBeTruthy();
	});

	test('testBuildEmptyWithOptionsAttrs', async () => {
		let doc = await testData.getInstantData().getUser1Document();

		let pb = await VerifiablePresentation.createFor(doc.getSubject(), null, store);

		let vp = await pb
				.id("#test-vp")
				.type("HelloWorld", "FooBar", "Baz")
				.realm("https://example.com/")
				.nonce("873172f58701a9ee686f0630204fee59")
				.seal(TestConfig.storePass);

		expect(vp).not.toBeNull();

		expect(new DIDURL("#test-vp", doc.getSubject()).equals(vp.getId())).toBeTruthy();
		expect(3).toEqual(vp.getType().length);
		expect("Baz").toEqual(vp.getType()[0]);
		expect("FooBar").toEqual(vp.getType()[1]);
		expect("HelloWorld").toEqual(vp.getType()[2]);
		expect(doc.getSubject().equals(vp.getHolder())).toBeTruthy();

		expect(0).toEqual(vp.getCredentialCount());
		expect(vp.getCredential(new DIDURL("#notExist", vp.getHolder()))).toBeFalsy(); // null or undefined

		let resolved = await vp.getHolder().resolve();
		expect(resolved).not.toBeNull();

		await expect(await vp.isGenuine()).toBeTruthy();
		await expect(await vp.isValid()).toBeTruthy();
	});
});