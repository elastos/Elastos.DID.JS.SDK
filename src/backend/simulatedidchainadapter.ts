/*
 * Copyright (c) 2019 Elastos Foundation
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

import { DefaultDIDAdapter } from "../internals";
import { checkArgument } from "../internals";
import { DIDTransactionException } from "../exceptions/exceptions"

export class SimulatedIDChainAdapter extends DefaultDIDAdapter {
    private serverURL: URL;
    private idtxEndpoint: URL;

    public constructor(endpoint: string) {
        super(new URL("/resolve", new URL(endpoint)).toString());
        this.serverURL = new URL(endpoint);
        this.idtxEndpoint = new URL("/idtx", this.serverURL);
    }

    public async createIdTransaction(payload: string, memo: string) {
        checkArgument(payload !== null && payload.length > 0, "Invalid payload");
        try {
            let ret = await this.performRequest(this.idtxEndpoint, payload);
        } catch (e) {
            throw new DIDTransactionException("Create ID transaction failed.", e);
        }
    }

    public async resetData(): Promise<void> {
        let resetURL = new URL("/reset", this.serverURL);

        await this.performRequest(resetURL);
    }
}
