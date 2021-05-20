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

import { DID } from "@elastosfoundation/did-js-sdk";

describe('DID Tests', () => {
	const testMethodSpecificID = "icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	const testDID = "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN";
	let did: DID;

	beforeEach(() => {
		did = new DID(testDID);
	});

	test('Test Constructor', () => {
		expect(did.toString()).toEqual(testDID);

		did = new DID("did:elastos:1234567890");
		expect(did.toString()).toEqual("did:elastos:1234567890");
	});

	test('Test Constructor with invalid did string', () => {
		expect(() =>{ new DID("id:elastos:1234567890")}).toThrowError()
		expect(() =>{ new DID("did:example:1234567890")}).toThrowError()
		expect(() =>{ new DID("did:elastos:")}).toThrowError()
	});

	test('Test Get Method', () => {
		expect(did.getMethod()).toEqual(DID.METHOD);
	});

	test('Test Get Specific Id', () => {
		expect(did.getMethodSpecificId()).toEqual(testMethodSpecificID);
	});

	test('Test hashcode', () => {
		let otherDID = new DID(testDID);
		expect(otherDID.hashCode()).toEqual(did.hashCode());

		otherDID = new DID("did:elastos:1234567890");
		expect(otherDID.hashCode()).not.toEqual(did.hashCode());
	});

	test('Test Equals', () => {
		let otherDID = new DID(testDID);
		expect(did.equals(otherDID)).toBeTruthy();
		expect(did.equals(testDID)).toBeTruthy();

		otherDID = new DID("did:elastos:1234567890");
		expect(did.equals(otherDID)).toBeFalsy();
		expect(did.equals("did:elastos:1234567890")).toBeFalsy();
	});
});