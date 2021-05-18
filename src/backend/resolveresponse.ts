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

import { JsonClassType, JsonCreator, JsonInclude, JsonIncludeType, JsonProperty, JsonPropertyOrder, JsonSubTypes, JsonTypeInfo, JsonTypeInfoAs, JsonTypeInfoId } from "jackson-js";
import { DIDEntity } from "../internals";
import { Class } from "../class";
import { MalformedResolveResponseException } from "../exceptions/exceptions";
import { ResolveError } from "./resolveerror";
import { ResolveResult } from "./resolveresult";
import { DIDResolveResponse } from "./didresolveresponse";

export class RpcConstants {
	public static ID = "id";
	public static JSON_RPC = "jsonrpc";
	public static RESULT = "result";
	public static ERROR = "error";
	public static ERROR_CODE = "code";
	public static ERROR_MESSAGE = "message";
	public static ERROR_DATA = "data";
}

@JsonPropertyOrder({value: [RpcConstants.ERROR_CODE, RpcConstants.ERROR_MESSAGE, RpcConstants.ERROR_DATA ]})
@JsonCreator()
class JsonRpcError {
	@JsonProperty({value: RpcConstants.ERROR_CODE}) @JsonClassType({type: ()=>[Number]})
	private code: number;
	@JsonProperty({value: RpcConstants.ERROR_MESSAGE}) @JsonClassType({type: ()=>[String]})
	private message: string;
	@JsonProperty({value: RpcConstants.ERROR_DATA}) @JsonClassType({type: ()=>[String]})
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

@JsonPropertyOrder({value: [
	RpcConstants.ID,
	RpcConstants.JSON_RPC,
	RpcConstants.RESULT,
	RpcConstants.ERROR
]})
@JsonInclude({value: JsonIncludeType.NON_NULL})
export abstract class ResolveResponse<T, R extends ResolveResult<R>> extends DIDEntity<T> {
	private static JSON_RPC_VERSION = "2.0";

	@JsonProperty({value: RpcConstants.ID}) @JsonClassType({type: ()=>[String]})
	private responseId: string;
	@JsonProperty({value: RpcConstants.JSON_RPC}) @JsonClassType({type: ()=>[String]})
	private jsonRpcVersion: string;
	// NOTE: result here can't use JsonProperty even if responses can be deserialized.
	// This is because of the generic type R that is not a class that jackson can instanciate.
	// Each class overriding ResolveResponse such as DIDResolveResponse needs to override result with the right real
	// @JsonClassType and @JsonProperty
	protected result: R;
	@JsonProperty({value: RpcConstants.ERROR}) @JsonClassType({type: ()=>[JsonRpcError]})
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
