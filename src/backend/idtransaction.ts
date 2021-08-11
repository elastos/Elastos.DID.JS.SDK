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

import { DIDEntity } from "../internals";
import { MalformedIDChainTransactionException } from "../exceptions/exceptions";
import type { IDChainRequest } from "./idchaindrequest";
import { JSONObject } from "../json";

export abstract class IDTransaction<T, R extends IDChainRequest<R>> extends DIDEntity<T> {
    protected static TXID = "txid";
    protected static TIMESTAMP = "timestamp";
    protected static OPERATION = "operation";

    private txId: string;
    private timestamp: Date;
    protected request: R;

    /**
     * Constructs the DIDTransaction with the given value.
     *
     * @param txid the transaction id string
     * @param timestamp the time stamp
     * @param request the IDChainRequest content
     */
    public constructor(txid: string = null, timestamp: Date = null, request: R = null) {
        super();
        this.txId = txid;
        this.timestamp = timestamp;
        this.request = request;
    }

    public getTransactionId(): string {
        return this.txId;
    }

    public getTimestamp(): Date {
        return this.timestamp;
    }

    /**
     * Get request object of transaction.
     *
     * @return the IDRequest object
     */
    public getRequest(): R {
        return this.request;
    }

    public toJSON(key: string = null): JSONObject {
        return {
            txid: this.txId,
            timestamp: this.dateToString(this.timestamp),
            operation: this.request.toJSON()
        }
    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.txId = this.getString("txid", json.txid, {mandatory: true, nullable: false});
        this.timestamp = this.getDate("timestamp", json.timestamp, {mandatory: true, nullable: false});
        if (!json.operation)
            throw new MalformedIDChainTransactionException("Missing request");
        this.request = this.requestFromJSON(json.operation as JSONObject);
    }

    protected abstract requestFromJSON(json: JSONObject): R;
}
