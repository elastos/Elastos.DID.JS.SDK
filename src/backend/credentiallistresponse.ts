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

import { JsonClassType, JsonCreator, JsonProperty } from "@elastosfoundation/jackson-js";
import { CredentialList } from "./credentiallist";
import { ResolveError } from "./resolveerror";
import { ResolveResponse, RpcConstants, JsonRpcError } from "./resolveresponse";
import { MalformedResolveResponseException } from "../exceptions/exceptions";

//@JsonCreator()
export class CredentialListResponse extends ResolveResponse<CredentialListResponse, CredentialList> {
    //@JsonProperty({value: RpcConstants.RESULT})
    //@JsonClassType({type: ()=>[CredentialList]})
    protected result: CredentialList;

    constructor(responseId: string, resultOrError: CredentialList | ResolveError | JsonRpcError) {
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

    //@JsonCreator()
    public static jacksonCreator(//@JsonProperty({value: RpcConstants.ID, required: true}) id: string, //@JsonProperty({value: RpcConstants.RESULT, required: false}) result: CredentialList, //@JsonProperty({value: RpcConstants.ERROR, required: false}) error: JsonRpcError): CredentialListResponse {
        let newInstance = result ? new CredentialListResponse(id, result) : new CredentialListResponse(id, error);
        if (result) newInstance.result = result;
        return newInstance;
    }

    public getResult(): CredentialList {
        return this.result;
    }

    protected async sanitize(): Promise<void> {
        await super.sanitize();

        if (this.result == null && this.error == null)
            throw new MalformedResolveResponseException("Missing result or error");

        if (this.result != null) {
            try {
                await this.result.sanitize();
            } catch (e) {
                // MalformedResolveResultException
                throw new MalformedResolveResponseException("Invalid result", e);
            }
        }
    }

}
