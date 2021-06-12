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

import type { DIDAdapter } from "./internals";
import { IllegalArgumentException, NetworkException, ResolveException, UnsupportedOperationException } from "./exceptions/exceptions";
import type { JSONObject } from "./json";
import { Logger } from "./logger";
import { checkArgument } from "./internals";
import { request as httpsRequest } from "https";
import { request as httpRequest } from "http";
import { runningInBrowser } from "./utils";
import axios from "axios";

const log = new Logger("DefaultDIDAdapter");

export class DefaultDIDAdapter implements DIDAdapter {
	private static MAINNET_RESOLVER = "https://api.elastos.io/did/v2";
	private static TESTNET_RESOLVER = "https://api-testnet.elastos.io/did/v2";

	protected resolver: URL;

	/**
	 * Set default resolver according to specified url.
	 *
	 * @param resolver the resolver url string
	 * @throws IllegalArgumentException throw this exception if setting resolver url failed.
	 */
	public constructor(resolver: "mainnet" | "testnet" | string) {
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
	protected performRequest(url: URL, body?: string): Promise<JSONObject> {
		return new Promise((resolve, reject) => {
			if (runningInBrowser()) {
				void axios({
					method: "post",
					url: url.toString(),
					headers: {
						// Don't set user-agent in browser environment, this is forbidden by modern browsers.
						"Content-Type": "application/json",
						"Accept": "application/json"
					},
					data: body
				  }).then((response) => {
					  if (response.status >= 200 && response.status < 400) {
						  resolve(response.data);
					  }
					  else {
						  reject(new ResolveException("HTTP error: " + response.statusText));
					  }
				  })
			}
			else {
				// NODEJS

				// Use a different module if we call http or https
				let requestMethod = (url.protocol.indexOf("https") === 0 ? httpsRequest : httpRequest);
				let req = requestMethod({
					protocol: url.protocol,
					hostname: url.hostname,
					port: url.port,
					path: url.pathname,
					method: 'POST',

					headers: {
						"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11",
						"Content-Type": "application/json",
						"Accept": "application/json"
					}
				}, (res)=>{
					let wholeData = "";
					res.on('data', d => {
						// Concatenate data that can reach us in several pieces.
						wholeData += d;
					})
					res.on("end", () => {
						if (wholeData !== null && wholeData.length > 0) {
							let responseJSON = JSON.parse(wholeData);
							resolve(responseJSON);
						} else {
							resolve({})
						}
					})
				});
				req.on('error', error => {
					reject(new ResolveException("HTTP error", error));
				});
				if (body)
					req.write(body);
				req.end();

				/* var request = new XMLHttpRequest();
				request.open('POST', url.toString());
				request.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11");
				request.setRequestHeader("Content-Type", "application/json");
				request.setRequestHeader("Accept", "application/json");
				request.setRequestHeader("Access-Control-Allow-Origin", "*");
				request.onreadystatechange = function() {
					// In case of error, onerror is called but the state also becomes "DONE" with status 0
					if (this.readyState === XMLHttpRequest.DONE && request.status > 0) {
						if (request.status < 200 || request.status > 299) {
							log.error("HTTP request error, status: "+request.status+", message: "+request.statusText);
							reject(new ResolveException("HTTP error with status: " + request.status));
						}

						// Try to parse as json or throw an exception
						try {
							let responseJSON = JSON.parse(request.responseText);
							resolve(responseJSON);
						}
						catch (e) {
							reject(new ResolveException("Unable to parse resolver response as a JSON object", e));
						}
					}
				}
				request.onerror = function(r, e) {
					reject(new ResolveException("Http error in performRequest(): ", e));
				}
				request.send(body); */
			}
		});
	}

	public resolve(request: string): Promise<JSONObject> {
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
