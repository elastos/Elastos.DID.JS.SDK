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

import { JsonClassType, JsonCreator, JsonInclude, JsonIncludeType, JsonProperty, JsonPropertyOrder } from "@elastosfoundation/jackson-js";
import { DIDEntity } from "../internals";
import { MalformedResolveResponseException } from "../exceptions/exceptions";
import type { ResolveResult } from "./resolveresult";

export class RpcConstants {
    public static ID = "id";
    public static JSON_RPC = "jsonrpc";
    public static RESULT = "result";
    public static ERROR = "error";
    public static ERROR_CODE = "code";
    public static ERROR_MESSAGE = "message";
    public static ERROR_DATA = "data";
}

@JsonPropertyOrder({value: ["code", "message", "data" ]})
@JsonCreator()
export class JsonRpcError {
    @JsonProperty({value: RpcConstants.ERROR_CODE}) @JsonClassType({type: ()=>[Number]})
    private code: number;
    @JsonProperty({value: RpcConstants.ERROR_MESSAGE}) @JsonClassType({type: ()=>[String]})
    private message: string;
    @JsonProperty({value: RpcConstants.ERROR_DATA}) @JsonClassType({type: ()=>[String]})
    private data: string;

    constructor(@JsonProperty({value: RpcConstants.ERROR_CODE, required: true}) code: number, @JsonProperty({value: RpcConstants.ERROR_MESSAGE, required: true}) message: string, @JsonProperty({value: RpcConstants.ERROR_DATA, required: false}) data?: string) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public getCode(): number {
        return this.code;
    }

    public getMessage(): string {
        return this.message;
    }

    public getData(): string {
        return this.data;
    }
}

@JsonPropertyOrder({value: ["id", "jsonrpc", "result", "error"]})
@JsonInclude({value: JsonIncludeType.NON_NULL})
export class ResolveResponse<T, R extends ResolveResult<R>> extends DIDEntity<T> {
    protected static JSON_RPC_VERSION = "2.0";

    @JsonProperty({value: RpcConstants.ID}) @JsonClassType({type: ()=>[String]})
    protected id: string;
    @JsonProperty({value: RpcConstants.JSON_RPC}) @JsonClassType({type: ()=>[String]})
    protected jsonrpc: string;
    @JsonProperty({value: RpcConstants.ERROR}) @JsonClassType({type: ()=>[JsonRpcError]})
    @JsonInclude({value: JsonIncludeType.NON_NULL})
    protected error: JsonRpcError;

    protected constructor() { super(); }

    public getResponseId(): string {
        return this.id;
    }

    public getErrorCode(): number {
        return this.error.getCode();
    }

    public getErrorMessage(): string {
        return this.error.getMessage();
    }

    // eslint-disable-next-line require-await
    protected async sanitize(): Promise<void> {
        if (this.jsonrpc == null || this.jsonrpc !== ResolveResponse.JSON_RPC_VERSION)
            throw new MalformedResolveResponseException("Invalid JsonRPC version");
    }

    public getResult () { return null; }
}
