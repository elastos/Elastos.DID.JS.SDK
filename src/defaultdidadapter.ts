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

import axios from "axios";
import { Comparable } from "./comparable";
import { IllegalArgumentException, IOException, NetworkException, ResolveException, UnsupportedOperationException } from "./exceptions/exceptions";
import { checkArgument, Collections, DIDAdapter } from "./internals";
import type { JSONObject } from "./json";
import { Logger } from "./logger";

const log = new Logger("DefaultDIDAdapter");

export class DefaultDIDAdapter implements DIDAdapter {
    private static MAINNET_RPC_ENDPOINTS: string[] = [
        "https://api.elastos.io/eid",
        "https://api.trinity-tech.io/eid"
    ];

    private static TESTNET_RPC_ENDPOINTS: string[] = [
        "https://api-testnet.elastos.io/eid",
        "https://api-testnet.trinity-tech.io/eid",
    ];

    protected rpcEndpoint: URL;

    /**
     * Set default resolver according to specified url.
     *
     * @param rpcEndpoint the resolver RPC endpoint
     * @throws IllegalArgumentException throw this exception if setting resolver url failed.
     */
    public constructor(rpcEndpoint: "mainnet" | "testnet" | string) {
        checkArgument(rpcEndpoint && rpcEndpoint != null, "Invalid resolver URL");
        let endpoints: string[] = null;

        switch (rpcEndpoint.toLowerCase()) {
            case "mainnet":
                rpcEndpoint = DefaultDIDAdapter.MAINNET_RPC_ENDPOINTS[0];
                endpoints = DefaultDIDAdapter.MAINNET_RPC_ENDPOINTS;
                break;

            case "testnet":
                rpcEndpoint = DefaultDIDAdapter.TESTNET_RPC_ENDPOINTS[0];
                endpoints = DefaultDIDAdapter.TESTNET_RPC_ENDPOINTS;
                break;
        }

        try {
            this.rpcEndpoint = new URL(rpcEndpoint);
        } catch (e) {
            throw new IllegalArgumentException("Invalid resolver URL", e);
        }

        if (endpoints)
            this.checkNetwork(endpoints);
    }

    private async checkEndpoint(endpoint: URL): Promise<DefaultDIDAdapter.CheckResult> {
        let json: JSONObject = {};

        let id = Date.now();
        json.id = id;
        json.jsonrpc = "2.0";
        json.method = "eth_blockNumber";

        let body = JSON.stringify(json);
        let start = Date.now();

        let response: JSONObject;
        try {
            response = await this.performRequest(endpoint, body);

            let latency = Date.now() - start;
            if (response.id as number != id)
                throw new IOException("Invalid JSON RPC id.");

            let n = response.result as string;
            if (n.startsWith("0x"))
                n = n.substring(2);

            let blockNumber = parseInt(n, 16);
            return new DefaultDIDAdapter.CheckResult(endpoint, latency, blockNumber);
        } catch (e) {
            log.info("Checking the resolver {}...error", endpoint);
            return DefaultDIDAdapter.CheckResult.from(endpoint);
        }
    }

    private async checkNetwork(endpoints: string[]): Promise<void> {
        let results: DefaultDIDAdapter.CheckResult[] = [];
        let ps: Promise<void>[] = [];

        for (let endpoint of endpoints) {
            let p = this.checkEndpoint(new URL(endpoint)).then((result) => {
                results.push(result);
            });
            ps.push(p);
        }

        try {
            await Promise.all(ps);
        } catch (ignore) {
        }

        if (results.length > 0)
            Collections.sort(results);

        let best = results[0];
        if (best.available())
            this.rpcEndpoint = best.endpoint;
    }

    // NOTE: synchronous HTTP calls are deprecated and wrong practice. Though, as JAVA SDK currently
    // mainly uses synchronous calls, we don't want to diverge our code from that. We then wait for the
    // "main" java implementation to rework synchronous calls and we will also migrate to Promises/Async.
    protected performRequest(url: URL, body?: string): Promise<JSONObject> {
        return new Promise((resolve, reject) => {
            void axios({
                method: "post",
                url: url.toString(),
                maxRedirects: 5,
                headers: {
                    // Don't set user-agent in browser environment, this is forbidden by modern browsers.
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                data: body,
                timeout: 6000, // only wait for 6s
            }).then((response) => {
                if (response.status >= 200 && response.status < 400) {
                    resolve(response.data);
                }
                else {
                    reject(new ResolveException("HTTP error: " + response.statusText));
                }
            }).catch(error => {
                reject(new ResolveException("HTTP timeout"));
            });
        });
    }

    public async resolve(request: string): Promise<JSONObject> {
        checkArgument(request && request != null, "Invalid request");

        try {
            return await this.performRequest(this.rpcEndpoint, request);
        } catch (e) {
            throw new NetworkException("Network error.");
        }
    }

    public createIdTransaction(payload: string, memo: string) {
        throw new UnsupportedOperationException("Not implemented");
    }
}

/* eslint-disable no-class-assign */
export namespace DefaultDIDAdapter {
    export class CheckResult implements Comparable<CheckResult> {
        private static MAX_DIFF = 10;

        public endpoint: URL;
        public latency: number;
        public lastBlock: number;

        public constructor(endpoint: URL, latency: number, lastBlock: number) {
            this.endpoint = endpoint;
            this.latency = latency;
            this.lastBlock = lastBlock;
        }

        public static from(endpoint: URL): CheckResult {
            return new CheckResult(endpoint, -1, -1);
        }

        public equals(o: CheckResult): boolean {
            return this.compareTo(o) == 0 ? true : false;
        }

        public compareTo(o: CheckResult): number {
            if (o == null)
                return -1;

            if (o.latency < 0 && this.latency < 0)
                return 0;

            if (o.latency < 0 || this.latency < 0)
                return this.latency < 0 ? 1 : -1;

            let diff = o.lastBlock.valueOf() - this.lastBlock.valueOf();

            if (Math.abs(diff) - CheckResult.MAX_DIFF > 0)
                return diff > 0 ? 1 : -1;

            if (this.latency == o.latency) {
                return diff > 0 ? 1 : -1;
            } else {
                return this.latency - o.latency;
            }
        }

        public available(): boolean {
            return this.latency >= 0;
        }
    }
}
