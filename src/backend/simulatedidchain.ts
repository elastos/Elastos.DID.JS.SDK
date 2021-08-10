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

import { Logger, DIDAdapter, SimulatedIDChainAdapter } from "../internals";
import { checkArgument } from "../utils";

const log = new Logger("SimulatedIDChain");

export class SimulatedIDChain {
    // For mini HTTP server
    protected static DEFAULT_HOST = "localhost";
    protected static DEFAULT_PORT = 9123;

    private host: string;
    private port: number;

    public constructor(host: string = SimulatedIDChain.DEFAULT_HOST, port: number = SimulatedIDChain.DEFAULT_PORT) {
        checkArgument(host != null && host !== "", "Invalid host");
        checkArgument(port > 0, "Invalid port");

        this.host = host;
        this.port = port;
    }

    public getAdapter(): DIDAdapter {
        try {
            return new SimulatedIDChainAdapter(
                "http://"+this.host+":"+this.port
            );
        } catch (e) {
            log.error("INTERNAL - error create DIDAdapter", e);
            throw e;
        }
    }
}