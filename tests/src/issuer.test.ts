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
	DIDDocument, 
	DIDStore, 
	DIDURL, 
	Issuer 
} from "@elastosfoundation/did-js-sdk";
import { TestConfig } from "./utils/testconfig";
import { TestData } from "./utils/testdata";

describe("Issuer Tests", ()=>{

	let testData : TestData;
	let store : DIDStore;

	let issuerDoc : DIDDocument;
	let testDoc : DIDDocument;

	beforeEach(async ()=>{
		testData = new TestData();
		await testData.cleanup();
    	store = await testData.getStore();
    	testData.getRootIdentity();

    	issuerDoc = await testData.getInstantData().getIssuerDocument();
    	testDoc = await testData.getInstantData().getUser1Document();
	})

	afterEach(async ()=>{
	})

	test('New Issuer Test With Sign Key', async () => {
		let signKey = issuerDoc.getDefaultPublicKeyId();
		let issuer = await Issuer.newWithDID(issuerDoc.getSubject(), store, signKey);

		expect(issuer.getDid()).toEqual(issuerDoc.getSubject())
		expect(issuer.getSignKey()).toEqual(signKey)
	})

	test('New Issuer Test Without Sign Key', async () => {
		let issuer = await Issuer.newWithDID(issuerDoc.getSubject(), store);

		expect(issuer.getDid()).toEqual(issuerDoc.getSubject())
		expect(issuer.getSignKey()).toEqual(issuerDoc.getDefaultPublicKeyId())
	})

	test('New Issuer Test With Invalid Key', () => {

		let signKey = new DIDURL("#testKey", issuerDoc.getSubject());
		let doc = issuerDoc;

		expect(() =>{Issuer.newWithDocument(doc, signKey)}).toThrowError()
	})

	test('New Issuer Test With Invalid Key 2', () => {

		let signKey = new DIDURL("#recovery", issuerDoc.getSubject());
		let doc = issuerDoc;
		expect(()=>{Issuer.newWithDocument(doc, signKey)}).toThrowError()
	})

	test('Issue Kyc Credential Test', async () => {

		let props = {
		    name: "John",
		    gender: "Male",
		    nation: "Singapore",
		    language: "English",
		    email: "john@example.com",
		    twitter: "@john"
		};

		let issuer = new Issuer(issuerDoc);

		let cb = issuer.issueFor(testDoc.getSubject());
		let vc  = await cb.id("#testCredential")
		           .type("BasicProfileCredential", "InternetAccountCredential")
				   .properties(props)
				   .seal(TestConfig.storePass);

		let vcId = new DIDURL("#testCredential", testDoc.getSubject());

		expect(vcId).toEqual(vc.getId())

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeFalsy()

		expect(issuerDoc.getSubject()).toEqual(vc.getIssuer())
		expect(testDoc.getSubject()).toEqual(vc.getSubject().getId())

		expect(vc.getSubject().getProperty("name")).toEqual("John")
		expect(vc.getSubject().getProperty("gender")).toEqual("Male")
		expect(vc.getSubject().getProperty("nation")).toEqual("Singapore")
		expect(vc.getSubject().getProperty("language")).toEqual("English")
		expect(vc.getSubject().getProperty("email")).toEqual("john@example.com")
		expect(vc.getSubject().getProperty("twitter")).toEqual("@john")

		await expect(await vc.isExpired()).toBeFalsy()
		await expect(await vc.isGenuine()).toBeTruthy()
		await expect(await vc.isValid()).toBeTruthy()
	})

	test('Issue Self Proclaimed Credential Test', async () => {

		let props = {
			name: "Testing Issuer",
			nation: "Singapore",
			language: "English",
			email: "issuer@example.com"
		};

		let issuer = new Issuer(issuerDoc);

		let cb = issuer.issueFor(testDoc.getSubject());
		let vc  = await cb.id("#myCredential")
		           .type("BasicProfileCredential", "SelfProclaimedCredential")
				   .properties(props)
				   .seal(TestConfig.storePass);

		let vcId = new DIDURL("#myCredential", testDoc.getSubject());

		expect(vcId).toEqual(vc.getId())

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeFalsy()
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeTruthy()

		expect(issuerDoc.getSubject()).toEqual(vc.getIssuer())
		expect(testDoc.getSubject()).toEqual(vc.getSubject().getId())

		expect(vc.getSubject().getProperty("name")).toEqual("Testing Issuer")
		expect(vc.getSubject().getProperty("nation")).toEqual("Singapore")
		expect(vc.getSubject().getProperty("language")).toEqual("English")
		expect(vc.getSubject().getProperty("email")).toEqual("issuer@example.com")

		await expect(await vc.isExpired()).toBeFalsy()
		await expect(await vc.isGenuine()).toBeTruthy()
		await expect(await vc.isValid()).toBeTruthy()

	})

	test('Issue Kyc Credential For Cid Test', async () => {
		let testDoc = await testData.getInstantData().getBazDocument();

		let props = {
		    name: "John",
		    gender: "Male",
		    nation: "Singapore",
		    language: "English",
		    email: "john@example.com",
		    twitter: "@john"
		};

		let issuer = new Issuer(issuerDoc);

		let cb = issuer.issueFor(testDoc.getSubject());
		let vc  = await cb.id("#testCredential")
		           .type("BasicProfileCredential", "InternetAccountCredential")
				   .properties(props)
				   .seal(TestConfig.storePass);

		let vcId = new DIDURL("#testCredential", testDoc.getSubject());

		expect(vcId).toEqual(vc.getId())

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeFalsy()

		expect(issuerDoc.getSubject()).toEqual(vc.getIssuer())
		expect(testDoc.getSubject()).toEqual(vc.getSubject().getId())

		expect(vc.getSubject().getProperty("name")).toEqual("John")
		expect(vc.getSubject().getProperty("gender")).toEqual("Male")
		expect(vc.getSubject().getProperty("nation")).toEqual("Singapore")
		expect(vc.getSubject().getProperty("language")).toEqual("English")
		expect(vc.getSubject().getProperty("email")).toEqual("john@example.com")
		expect(vc.getSubject().getProperty("twitter")).toEqual("@john")

		await expect(await vc.isExpired()).toBeFalsy()
		await expect(await vc.isGenuine()).toBeTruthy()
		await expect(await vc.isValid()).toBeTruthy()


	})

	test('Issue Kyc Credential From Cid Test', async () => {
		let issuerDoc = await testData.getInstantData().getExampleCorpDocument();

		let props = {
		    name: "John",
		    gender: "Male",
		    nation: "Singapore",
		    language: "English",
		    email: "john@example.com",
		    twitter: "@john"
		};

		let issuer = new Issuer(issuerDoc);

		let cb = issuer.issueFor(testDoc.getSubject());
		let vc = await cb.id("#testCredential")
			.type("BasicProfileCredential", "InternetAccountCredential")
			.properties(props)
			.seal(TestConfig.storePass);

		let vcId = new DIDURL("#testCredential", testDoc.getSubject());

		expect(vcId).toEqual(vc.getId())

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeFalsy()

		expect(issuerDoc.getSubject()).toEqual(vc.getIssuer())
		expect(testDoc.getSubject()).toEqual(vc.getSubject().getId())

		expect(vc.getSubject().getProperty("name")).toEqual("John")
		expect(vc.getSubject().getProperty("gender")).toEqual("Male")
		expect(vc.getSubject().getProperty("nation")).toEqual("Singapore")
		expect(vc.getSubject().getProperty("language")).toEqual("English")
		expect(vc.getSubject().getProperty("email")).toEqual("john@example.com")
		expect(vc.getSubject().getProperty("twitter")).toEqual("@john")

		await expect(await vc.isExpired()).toBeFalsy()
		await expect(await vc.isGenuine()).toBeTruthy()
		await expect(await vc.isValid()).toBeTruthy()
	})

	test('Issue SelfProclaimed Credential From Cid Test', async () => {
		let issuerDoc = await testData.getInstantData().getExampleCorpDocument();

		let props = {
		    name: "Testing Issuer",
		    nation: "Singapore",
		    language: "English",
		    email: "issuer@example.com"
		};

		let issuer = new Issuer(issuerDoc);

		let cb = issuer.issueFor(issuerDoc.getSubject());
		let vc = await cb.id("#myCredential")
			.type("BasicProfileCredential", "SelfProclaimedCredential")
			.properties(props)
			.seal(TestConfig.storePass);

		let vcId = new DIDURL("#myCredential", issuerDoc.getSubject());

		expect(vcId).toEqual(vc.getId())

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeFalsy()

		expect(issuerDoc.getSubject()).toEqual(vc.getIssuer())
		expect(issuerDoc.getSubject()).toEqual(vc.getSubject().getId())

		expect(vc.getSubject().getProperty("name")).toEqual("Testing Issuer")
		expect(vc.getSubject().getProperty("nation")).toEqual("Singapore")
		expect(vc.getSubject().getProperty("language")).toEqual("English")
		expect(vc.getSubject().getProperty("email")).toEqual("issuer@example.com")

		await expect(await vc.isExpired()).toBeFalsy()
		await expect(await vc.isGenuine()).toBeTruthy()
		await expect(await vc.isValid()).toBeTruthy()
	})

	test('Issue Json Props Credential Test', async () => {
		let props = "{\"name\":\"Jay Holtslander\",\"alternateName\":\"Jason Holtslander\",\"booleanValue\":true,\"numberValue\":1234,\"doubleValue\":9.5,\"nationality\":\"Canadian\",\"birthPlace\":{\"type\":\"Place\",\"address\":{\"type\":\"PostalAddress\",\"addressLocality\":\"Vancouver\",\"addressRegion\":\"BC\",\"addressCountry\":\"Canada\"}},\"affiliation\":[{\"type\":\"Organization\",\"name\":\"Futurpreneur\",\"sameAs\":[\"https://twitter.com/futurpreneur\",\"https://www.facebook.com/futurpreneur/\",\"https://www.linkedin.com/company-beta/100369/\",\"https://www.youtube.com/user/CYBF\"]}],\"alumniOf\":[{\"type\":\"CollegeOrUniversity\",\"name\":\"Vancouver Film School\",\"sameAs\":\"https://en.wikipedia.org/wiki/Vancouver_Film_School\",\"year\":2000},{\"type\":\"CollegeOrUniversity\",\"name\":\"CodeCore Bootcamp\"}],\"gender\":\"Male\",\"Description\":\"Technologist\",\"disambiguatingDescription\":\"Co-founder of CodeCore Bootcamp\",\"jobTitle\":\"Technical Director\",\"worksFor\":[{\"type\":\"Organization\",\"name\":\"Skunkworks Creative Group Inc.\",\"sameAs\":[\"https://twitter.com/skunkworks_ca\",\"https://www.facebook.com/skunkworks.ca\",\"https://www.linkedin.com/company/skunkworks-creative-group-inc-\",\"https://plus.google.com/+SkunkworksCa\"]}],\"url\":\"https://jay.holtslander.ca\",\"image\":\"https://s.gravatar.com/avatar/961997eb7fd5c22b3e12fb3c8ca14e11?s=512&r=g\",\"address\":{\"type\":\"PostalAddress\",\"addressLocality\":\"Vancouver\",\"addressRegion\":\"BC\",\"addressCountry\":\"Canada\"},\"sameAs\":[\"https://twitter.com/j_holtslander\",\"https://pinterest.com/j_holtslander\",\"https://instagram.com/j_holtslander\",\"https://www.facebook.com/jay.holtslander\",\"https://ca.linkedin.com/in/holtslander/en\",\"https://plus.google.com/+JayHoltslander\",\"https://www.youtube.com/user/jasonh1234\",\"https://github.com/JayHoltslander\",\"https://profiles.wordpress.org/jasonh1234\",\"https://angel.co/j_holtslander\",\"https://www.foursquare.com/user/184843\",\"https://jholtslander.yelp.ca\",\"https://codepen.io/j_holtslander/\",\"https://stackoverflow.com/users/751570/jay\",\"https://dribbble.com/j_holtslander\",\"http://jasonh1234.deviantart.com/\",\"https://www.behance.net/j_holtslander\",\"https://www.flickr.com/people/jasonh1234/\",\"https://medium.com/@j_holtslander\"]}";

		let issuer = new Issuer(issuerDoc);

		let cb = issuer.issueFor(issuerDoc.getSubject());
		let vc = await cb.id("#myCredential")
			.type("BasicProfileCredential", "SelfProclaimedCredential")
			.properties(props)
			.seal(TestConfig.storePass);

		let vcId = new DIDURL("#myCredential", issuerDoc.getSubject());

		expect(vcId).toEqual(vc.getId())

		expect(vc.getType().indexOf("BasicProfileCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("SelfProclaimedCredential") >= 0).toBeTruthy()
		expect(vc.getType().indexOf("InternetAccountCredential") >= 0).toBeFalsy()

		expect(issuerDoc.getSubject()).toEqual(vc.getIssuer())
		expect(issuerDoc.getSubject()).toEqual(vc.getSubject().getId())

		expect(vc.getSubject().getProperty("Description")).toEqual("Technologist")
		expect(vc.getSubject().getProperty("alternateName")).toEqual("Jason Holtslander")
		expect(vc.getSubject().getProperty("numberValue")).toEqual(1234)
		// JAVA: expect(vc.getSubject().getProperty(9.5)).toEqual("doubleValue")

		expect(vc.getSubject().getProperties()).not.toBeNull()

		await expect(await vc.isExpired()).toBeFalsy()
		await expect(await vc.isGenuine()).toBeTruthy()
		await expect(await vc.isValid()).toBeTruthy()
	})
})
