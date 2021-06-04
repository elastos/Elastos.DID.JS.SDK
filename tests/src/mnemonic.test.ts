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

import { Mnemonic, RootIdentity, DIDStore } from "@elastosfoundation/did-js-sdk";
import { TestData } from "./utils/testdata";
import { TestConfig } from "./utils/testconfig";

describe('Mnemonic Tests', () => {
	let testData: TestData;
	let store: DIDStore;

	beforeEach(async () => {
		testData = new TestData();
		await testData.cleanup();
		store = await testData.getStore();
	})

	afterEach(async () => {
	});

	test('Test builtin wordlist', () => {
		let languages = [
			Mnemonic.DEFAULT,
			Mnemonic.CHINESE_SIMPLIFIED,
			Mnemonic.ENGLISH,
			Mnemonic.FRENCH,
		];

		languages.forEach(lang => {
			let mc = Mnemonic.getInstance(lang);
			let mnemonic = mc.generate();

			expect(mc.isValid(mnemonic)).toBeTruthy()
		    expect(Mnemonic.checkIsValid(mnemonic)).toBeTruthy()

			RootIdentity.createFromMnemonic(mnemonic, TestConfig.passphrase, store, TestConfig.storePass, true);

			expect(mc.isValid(mnemonic + "z")).toBeFalsy()
			expect(Mnemonic.checkIsValid(mnemonic + "z")).toBeFalsy()
		});
	});

	test('Test french mnemonic', () => {
		let mnemonic = "remarque séduire massif boire horde céleste exact dribbler pulpe prouesse vagabond opale";
		let mc = Mnemonic.getInstance(Mnemonic.FRENCH)

		expect(mc.isValid(mnemonic)).toBeTruthy()
		expect(Mnemonic.checkIsValid(mnemonic)).toBeTruthy()
	});
})
