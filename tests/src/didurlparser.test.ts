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

import { DIDURLParser, DIDURLValues } from "@elastosfoundation/did-js-sdk"

describe('DIDURL Tests', () => {
	let testDID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	let params = ";elastos:foo=testvalue;bar=123;keyonly;elastos:foobar=12345";
	let path = "/path/to/the/resource";
	let query = "?qkey=qvalue&qkeyonly&test=true";
	let fragment = "#testfragment";
	let testURL = testDID + params + path + query + fragment;
	let urlParsed: DIDURLValues;


	beforeEach(()=>{
		urlParsed = DIDURLParser.NewFromURL(testURL)
	})

	test('Test parse DID', () => {
		expect(urlParsed.did.value).toBe(testDID)
        expect(urlParsed.did.method).toBe("elastos")
        expect(urlParsed.did.methodSpecificId).toBe("icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN")
	});

    test('Test parse params', () => {
        expect(urlParsed.params.has("elastos:foo")).toBeTruthy()
		expect(urlParsed.params.has("bar")).toBeTruthy()
		expect(urlParsed.params.has("keyonly")).toBeTruthy()
		expect(urlParsed.params.has("elastos:foobar")).toBeTruthy()
		expect(urlParsed.params.get("elastos:foo")).toBe("testvalue")
		expect(urlParsed.params.get("keyonly")).toBe(null)
    })
    test('Test parse path', () => {
        expect(urlParsed.path).toBe(path)
    })

    test('Test parse query', () => {
        expect(urlParsed.query.has("qkey")).toBeTruthy()
		expect(urlParsed.query.has("qkeyonly")).toBeTruthy()
		expect(urlParsed.query.has("test")).toBeTruthy()
		expect(urlParsed.query.get("qkey")).toBe("qvalue")
		expect(urlParsed.query.get("qkeyonly")).toBe(null)
    })

    test('Test parse fragment', () => {
        expect(urlParsed.fragment).toBe("testfragment")
    })


})