/*
 * Copyright (c) 20121Elastos Foundation
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
import { JSONObject } from "../json";
import { ResolveError } from "./resolveerror";
import { MalformedResolveResponseException } from "../exceptions/exceptions";

export abstract class ResolveResponse<T, R extends ResolveResponse.Result<R>> extends DIDEntity<T> {
    protected static JSON_RPC_VERSION = "2.0";

    protected id: string;
    protected jsonrpc: string;
    protected result: R;
    protected error: ResolveResponse.JsonRpcError;

    protected constructor(responseId: string = null, resultOrError: R | ResolveError | ResolveResponse.JsonRpcError = null) {
        super();
        this.jsonrpc = ResolveResponse.JSON_RPC_VERSION;
        this.id = responseId;
        if (resultOrError instanceof ResolveError) {
            this.error = new ResolveResponse.JsonRpcError(resultOrError.code, resultOrError.message);
        } else if (resultOrError instanceof ResolveResponse.JsonRpcError) {
            this.error = resultOrError;
        } else {
            this.result = resultOrError;
        }
    }

    public getResponseId(): string {
        return this.id;
    }

    public getErrorCode(): number {
        return this.error.getCode();
    }

    public getErrorMessage(): string {
        return this.error.getMessage();
    }

    public getResult (): R {
        return this.result;
    }

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};
        json.id = this.id;
        json.jsonrpc = this.jsonrpc;

        if (this.result)
            json.result = this.result.toJSON(null);

        if (this.error)
            json.error = this.error.toJSON();

        return json;
    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.id = this.getString("id", json.id, {mandatory: false, nullable: true, defaultValue: null});
        this.jsonrpc = this.getString("jsonrpc", json.jsonrpc, {mandatory: true, nullable: false});
        if (this.jsonrpc == null || this.jsonrpc !== ResolveResponse.JSON_RPC_VERSION)
            throw new MalformedResolveResponseException("Invalid JsonRPC version");

        if (!json.result && !json.error)
            throw new MalformedResolveResponseException("Missing response data");

        if (json.result)
            this.result = this.resultFromJson(json.result as JSONObject);

        if (json.error)
            this.error = ResolveResponse.JsonRpcError.parse(json.error as JSONObject);
    }

    protected abstract resultFromJson(json: JSONObject): R;
}

/* eslint-disable no-class-assign */
export namespace ResolveResponse {
    export class JsonRpcError extends DIDEntity<JsonRpcError> {
        private code: number;
        private message: string;
        private data: string;

        constructor(code = 0, message: string = null, data: string = null) {
            super();
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

        public toJSON(key: string = null): JSONObject {
            return {
                code: this.code,
                message: this.message,
                data: this.data
            }
        }

        protected fromJSON(json: JSONObject, context = null): void {
            this.code = this.getNumber("code", json.code, {mandatory: true, nullable: false, defaultValue: 0});
            this.message = this.getString("message", json.message, {mandatory: false, nullable: true});
            this.data = this.getString("data", json.data, {mandatory: false, nullable: true});
        }

        public static parse(content: string | JSONObject, context = null): JsonRpcError {
            try {
                return DIDEntity.deserialize(content, JsonRpcError, context);
            } catch (e) {
                // DIDSyntaxException
                if (e instanceof MalformedResolveResponseException)
                    throw e;
                else
                    throw new MalformedResolveResponseException(e);
            }
        }
    }

    export abstract class Result<R> extends DIDEntity<R> {
    }
}