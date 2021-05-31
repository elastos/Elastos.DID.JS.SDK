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
	DID,
	DIDURL
} from "@elastosfoundation/did-js-sdk";

const verifyNewDidCreation = (valueToValidate: string, base: DID = null) =>{
	let url: DIDURL = new DIDURL(valueToValidate, base);
	expect(url.toString()).toBe((base ? base.toString() : "") + valueToValidate);
}

describe('DIDURL Tests', () => {
	let testDID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	let params = ";elastos:foo=testvalue;bar=123;keyonly;elastos:foobar=12345";
	let path = "/path/to/the/resource";
	let query = "?qkey=qvalue&qkeyonly&test=true";
	let fragment = "#testfragment";
	let testURL = testDID + params + path + query + fragment;

	let did: DID;
	let url: DIDURL;

	beforeEach(()=>{
		did = new DID(testDID);
		url = new DIDURL(testURL);
	})

	test('Test Constructor with Canonical URL', () => {
		verifyNewDidCreation(testDID);

		verifyNewDidCreation(testDID + params);

		verifyNewDidCreation(testDID + path);

		verifyNewDidCreation(testDID + query);

		verifyNewDidCreation(testDID + fragment);

		verifyNewDidCreation(testDID + params + path);

		verifyNewDidCreation(testDID + params + path + query);

		verifyNewDidCreation(testDID + params + path + query + fragment);

		verifyNewDidCreation(testDID + path + query + fragment);

		verifyNewDidCreation(testDID + params + query + fragment);

		verifyNewDidCreation(testDID + params + path + fragment);

		verifyNewDidCreation(testDID + params + path + query);

	});

	test('Test Constructor with Base and Relative URL', () => {

		verifyNewDidCreation(params, did);

		verifyNewDidCreation(path, did);

		verifyNewDidCreation(query, did);

		verifyNewDidCreation(fragment, did);

		verifyNewDidCreation(params + path, did);

		verifyNewDidCreation(params + path + query, did);

		verifyNewDidCreation(params + path + query + fragment, did);

		verifyNewDidCreation(path + query + fragment, did);

		verifyNewDidCreation(params + query + fragment, did);

		verifyNewDidCreation(params + path + fragment, did);

		verifyNewDidCreation(params + path + query, did);
	});

	test('Test Constructor with Relative URL', () => {

		verifyNewDidCreation(params);

		verifyNewDidCreation(path);

		verifyNewDidCreation(query);

		verifyNewDidCreation(fragment);

		verifyNewDidCreation(params + path);

		verifyNewDidCreation(params + path + query);

		verifyNewDidCreation(params + path + query + fragment);

		verifyNewDidCreation(path + query + fragment);

		verifyNewDidCreation(params + query + fragment);

		verifyNewDidCreation(params + path + fragment);

		verifyNewDidCreation(params + path + query);
	});


	test('Test compatible with plain fragment', () => {

		let testURL = testDID + "#test";
		let url = new DIDURL(testURL);

		expect(url.toString()).toBe(testURL);
		expect(url.getFragment()).toBe("test");

		url = new DIDURL("test", did)

		expect(url.toString()).toBe(testURL);
		expect(url.getFragment()).toBe("test");

		url = new DIDURL("test")
		expect(url.getFragment()).toBe("test");

	});


	test('Test Constructor Error 1', () => {
		expect(() => {new DIDURL("did:elastos:1234567890;" + params + path + query + fragment)}).toThrowError();
	})

	test('Test Constructor Error 2', () => {

		expect(() => {new DIDURL("did:example:1234567890" + params + path + query + fragment)}).toThrowError();
	})

	test('Test Constructor Error 3', () => {

		expect(() => {new DIDURL("did:elastos::1234567890" + params + path + query + fragment)}).toThrowError();
	})

	test('Test Constructor Error 4', () => {

		expect(() => {new DIDURL("did:example:1234567890" + params + path + "?" + "#" + fragment)}).toThrowError();
	})

	test('Test Constructor Error 5', () => {

		expect(() => {new DIDURL("did:example:1234567890" + params + path + query + "#")}).toThrowError();
	})

	test('Test GetDID', () => {
		expect(url.getDid().toString()).toBe(testDID);
	})

	test('Test GetParameters', () => {
		expect(url.getParametersString()).toBe(params.substring(1));
	})

	test('Test GetParameter', () => {
		expect(url.getParameter("elastos:foo")).toBe("testvalue");
		expect(url.getParameter("foo")).toBeUndefined();
		expect(url.getParameter("bar")).toBe("123");
		expect(url.getParameter("elastos:foobar")).toBe("12345");
		expect(url.getParameter("foobar")).toBeUndefined();
		expect(url.getParameter("keyonly")).toBeNull();
	})

	test('Test HasParameter', () => {
		expect(url.hasParameter("elastos:foo")).toBeTruthy();
		expect(url.hasParameter("bar")).toBeTruthy();
		expect(url.hasParameter("elastos:foobar")).toBeTruthy();
		expect(url.hasParameter("keyonly")).toBeTruthy();


		expect(url.hasParameter("notexist")).toBeFalsy();
		expect(url.hasParameter("foo")).toBeFalsy();
		expect(url.hasParameter("boobar")).toBeFalsy();
	})


	test('Test GetPath', () => {
		expect(url.getPath()).toBe(path);
	})


	test('Test GetQuery', () => {
		expect(url.getQueryString()).toBe(query.substring(1));
	})


	test('Test GetQueryParameter', () => {
		expect(url.getQueryParameter("qkey")).toBe("qvalue");
		expect(url.getQueryParameter("test")).toBe("true");
		expect(url.getQueryParameter("qkeyonly")).toBeNull();
	})

	test('Test HasQueryParameter', () => {
		expect(url.hasQueryParameter("qkeyonly")).toBeTruthy();
		expect(url.hasQueryParameter("qkey")).toBeTruthy();
		expect(url.hasQueryParameter("test")).toBeTruthy();

		expect(url.hasQueryParameter("notexist")).toBeFalsy();
	})

	test('Test GetFragment', () => {
		expect(url.getFragment()).toBe(fragment.substring(1));
	})

	test('Test ToString', () => {
		expect(url.toString()).toBe(testURL);
	})

	test('Test HashCode', () => {
		let other = new DIDURL(testURL);
		expect(other.hashCode()).toBe(url.hashCode());

		other = new DIDURL("did:elastos:1234567890#test");
		expect(other.hashCode()).not.toBe(url.hashCode());
	})

	test('Test Equals', () => {
		let other = new DIDURL(testURL);


		expect(url.equals(other)).toBeTruthy()
		expect(url.equals(testURL)).toBeTruthy()

		other = new DIDURL("did:elastos:1234567890#test");
		expect(url.equals(other)).toBeFalsy();
		expect(url.equals("did:elastos:1234567890#test")).toBeFalsy()

	})

})
