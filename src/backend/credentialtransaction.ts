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

import type { DIDURL } from "../internals";
import { JSONObject } from "../json";
import { DIDEntity } from "../internals";
import { CredentialRequest } from "./credentialrequest";
import { IDTransaction } from "./idtransaction";
import { MalformedIDChainTransactionException } from "../exceptions/exceptions";

export class CredentialTransaction extends IDTransaction<CredentialTransaction, CredentialRequest> {
    /**
     * Constructs the DIDTransaction with the given value.
     *
     * @param txid the transaction id string
     * @param timestamp the time stamp
     * @param request the IDChainRequest content
     */
    constructor(txid: string = null, timestamp: Date = null, request: CredentialRequest = null) {
        super(txid, timestamp, request);
    }

    public getId(): DIDURL {
        return this.getRequest().getCredentialId();
    }

    protected requestFromJSON(json: JSONObject): CredentialRequest {
        return CredentialRequest.parse(json);
    }

    public static parse(content: string | JSONObject, context = null): CredentialTransaction {
        try {
            return DIDEntity.deserialize(content, CredentialTransaction, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedIDChainTransactionException)
                throw e;
            else
                throw new MalformedIDChainTransactionException(e);
        }
    }
}
