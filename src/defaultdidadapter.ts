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

import { DIDAdapter } from "./internals";
import { IllegalArgumentException, NetworkException, ResolveException, UnsupportedOperationException } from "./exceptions/exceptions";
import { JSONObject } from "./json";
import { Logger } from "./logger";
import { checkArgument } from "./internals";

const log = new Logger("DefaultDIDAdapter");

export class DefaultDIDAdapter implements DIDAdapter {
	private static MAINNET_RESOLVER = "http://api.elastos.io:20606";
	private static TESTNET_RESOLVER = "http://api.elastos.io:21606";

	private resolver: URL;

	/**
	 * Set default resolver according to specified url.
	 *
	 * @param resolver the resolver url string
	 * @throws IllegalArgumentException throw this exception if setting resolver url failed.
	 */
	public constructor(resolver: string) {
		checkArgument(resolver && resolver != null, "Invalid resolver URL");

		switch (resolver.toLowerCase()) {
		case "mainnet":
			resolver = DefaultDIDAdapter.MAINNET_RESOLVER;
			break;

		case "testnet":
			resolver = DefaultDIDAdapter.TESTNET_RESOLVER;
			break;
		}

		try {
			this.resolver = new URL(resolver);
		} catch (e) {
			// MalformedURLException
			throw new IllegalArgumentException("Invalid resolver URL", e);
		}
	}

	// NOTE: synchronous HTTP calls are deprecated and wrong practice. Though, as JAVA SDK currently
	// mainly uses synchronous calls, we don't want to diverge our code from that. We then wait for the
	// "main" java implementation to rework synchronous calls and we will also migrate to Promises/Async.
	protected performRequest(url: URL, body: string): JSONObject {
		var request = new XMLHttpRequest();
		request.open('POST', url.toString(), false);  // `false` makes the request synchronous
		request.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11");
		request.setRequestHeader("Content-Type", "application/json");
		request.setRequestHeader("Accept", "application/json");
		request.send(body);

		if (request.status < 200 || request.status > 299) {
			log.error("HTTP request error, status: "+request.status+", message: "+request.statusText);
			throw new ResolveException("HTTP error with status: " + request.status);
		}

		// Try to parse as json or throw an exception
		try {
			let responseJSON = JSON.parse(request.responseText);
			return responseJSON;
		}
		catch (e) {
			throw new ResolveException("Unable to parse resolver response as a JSON object", e);
		}
	}

	public resolve(request: string): JSONObject {
		checkArgument(request && request != null, "Invalid request");

		try {
			return this.performRequest(this.resolver, request);
		} catch (e) {
			// IOException
			throw new NetworkException("Network error.", e);
		}
	}

	public createIdTransaction(payload: string, memo: string) {
		throw new UnsupportedOperationException("Not implemented");
	}
}
