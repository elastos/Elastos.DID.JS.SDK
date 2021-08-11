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

import { CredentialList } from "./credentiallist";
import { ResolveError } from "./resolveerror";
import { ResolveResponse, JsonRpcError } from "./resolveresponse";
import { MalformedResolveResponseException } from "../exceptions/exceptions";
import { DIDEntity } from "../internals";
import { JSONObject } from "../json";

export class CredentialListResponse extends ResolveResponse<CredentialListResponse, CredentialList> {
    constructor(responseId: string = null, resultOrError: CredentialList | ResolveError | JsonRpcError = null) {
        super();
        this.jsonrpc = ResolveResponse.JSON_RPC_VERSION;
        this.id = responseId;
        if (resultOrError instanceof ResolveError) {
            this.error = new JsonRpcError(resultOrError.code, resultOrError.message);
        } else if (resultOrError instanceof JsonRpcError) {
            this.error = resultOrError;
        }
        if (resultOrError instanceof CredentialList) {
            this.result = resultOrError
        }
    }

    public getResult(): CredentialList {
        return this.result;
    }

    protected resultFromJson(json: JSONObject): CredentialList {
        return CredentialList.parse(json);
    }

    public static parse(content: string | JSONObject, context = null): CredentialListResponse {
        try {
            return DIDEntity.deserialize(content, CredentialListResponse, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedResolveResponseException)
                throw e;
            else
                throw new MalformedResolveResponseException(e);
        }
    }
}
