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

import { DID, DIDURL, Logger } from "@elastosfoundation/did-js-sdk";

const log = new Logger("DIDURLSample");
export class DIDURLSample {
	public createFromString(): void {
		let urlString = "did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2#test";
		let url = new DIDURL(urlString);

		// output: did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2
		log.trace(url.getDid());
		// output: test
		log.trace(url.getFragment());
	}

	public createFromParts(): void {
		let did = new DID("did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2");

		// create a url from a DID object and a relative url
		let url = new DIDURL("/vcs/abc?opt=false&value=1#test", did);

		// output: did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2/vcs/abc?opt=false&value=1#test
		log.trace(url.toString());

		// output: did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2
		log.trace(url.getDid());
		// output: /vcs/abc
		log.trace(url.getPath());
		// output: opt=false&value=1
		log.trace(url.getQueryString());
		// output: test
		log.trace(url.getFragment());
	}

	public createWithBuilder(): void {
		let did = new DID("did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2");

		let url = new DIDURL.Builder(did)
				.setPath("/vcs/abc")
				.setQueryParameter("opt","false")
				.setQueryParameter("value", "1")
				.setFragment("test")
				.build();

		// output: did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2/vcs/abc?opt=false&value=1#test
		log.trace(url.toString());

		// output: did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2
		log.trace(url.getDid());
		// output: /vcs/abc
		log.trace(url.getPath());
		// output: opt=false&value=1
		log.trace(url.getQueryString());
		// output: test
		log.trace(url.getFragment());
	}
}

export function initDidurl(argv) {
	let sample = new DIDURLSample();

	sample.createFromString();
	sample.createFromParts();
	sample.createWithBuilder();
}
