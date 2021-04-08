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

import { JsonCreator, JsonInclude, JsonIncludeType, JsonProperty, JsonPropertyOrder } from "jackson-js";
import { DIDEntity } from "../didentity";
import { MalformedResolveResponseException } from "../exceptions/exceptions";
import { ResolveError } from "./resolveerror";
import { ResolveResult } from "./resolveresult";

@JsonPropertyOrder({value: [
	ResolveResponse.ID,
	ResolveResponse.JSON_RPC,
	ResolveResponse.RESULT,
	ResolveResponse.ERROR
]})
@JsonInclude({value: JsonIncludeType.NON_NULL})
export abstract class ResolveResponse<T, R extends ResolveResult<R>> extends DIDEntity<T> {
	private static JSON_RPC_VERSION = "2.0";

	public /*protected*/ static ID = "id";
	public /*protected*/ static JSON_RPC = "jsonrpc";
	public /*protected*/ static RESULT = "result";
	public /*protected*/ static ERROR = "error";
	public /*protected*/ static ERROR_CODE = "code";
	public /*protected*/ static ERROR_MESSAGE = "message";
	public /*protected*/ static ERROR_DATA = "data";

	@JsonProperty({value: ResolveResponse.ID})
	private responseId: string;
	@JsonProperty({value: ResolveResponse.JSON_RPC})
	private jsonRpcVersion: string;
	@JsonProperty({value: ResolveResponse.RESULT})
	private result: R;
	@JsonProperty({value: ResolveResponse.ERROR})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private error: JsonRpcError;

	protected constructor(responseId: string, resultOrError: R | ResolveError) {
		super();
		if (resultOrError instanceof ResolveError) {
			// ResolveError
			this.responseId = responseId;
			this.jsonRpcVersion = ResolveResponse.JSON_RPC_VERSION;
			this.error = new JsonRpcError(resultOrError.code, resultOrError.message);
		}
		else {
			this.responseId = responseId;
			this.jsonRpcVersion = ResolveResponse.JSON_RPC_VERSION;
			this.result = resultOrError;
		}
	}

	public getResponseId(): string {
		return this.responseId;
	}

	public getResult(): R {
		return this.result;
	}

	public getErrorCode(): number {
		return this.error.getCode();
	}

	public getErrorMessage(): string {
		return this.error.getMessage();
	}

	protected sanitize() {
		if (this.jsonRpcVersion == null || this.jsonRpcVersion !== ResolveResponse.JSON_RPC_VERSION)
			throw new MalformedResolveResponseException("Invalid JsonRPC version");

		if (this.result == null && this.error == null)
			throw new MalformedResolveResponseException("Missing result or error");

		if (this.result != null) {
			try {
				this.result.sanitize();
			} catch (e) {
				// MalformedResolveResultException
				throw new MalformedResolveResponseException("Invalid result", e);
			}
		}
	}
}

@JsonPropertyOrder({value: [ResolveResponse.ERROR_CODE, ResolveResponse.ERROR_MESSAGE, ResolveResponse.ERROR_DATA ]})
@JsonCreator()
class JsonRpcError {
	@JsonProperty({value: ResolveResponse.ERROR_CODE})
	private code: number;
	@JsonProperty({value: ResolveResponse.ERROR_MESSAGE})
	private message: string;
	@JsonProperty({value: ResolveResponse.ERROR_DATA})
	private data: string;

	constructor(code: number, message: string) {
		this.code = code;
		this.message = message;
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