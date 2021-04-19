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

import { JsonClassType, JsonCreator, JsonProperty, JsonFormat, JsonFormatShape, JsonInclude, JsonIncludeType, JsonPropertyOrder, JsonValue, JsonSetter } from "jackson-js";
import { Class } from "../class";
import { DIDEntity } from "../didentity";
import { Hashable } from "../hashable";

@JsonPropertyOrder({value: [
	ResolveRequest.ID,
	ResolveRequest.METHOD,
	ResolveRequest.PARAMETERS
]})
export abstract class ResolveRequest<T, P extends Hashable> extends DIDEntity<T> {
	protected static ID = "id";
	protected static METHOD = "method";
	protected static PARAMETERS = "params";

	@JsonProperty({value: ResolveRequest.ID})
	private requestId: string;
	@JsonProperty({value: ResolveRequest.METHOD})
	private method: string;
	@JsonProperty({value: ResolveRequest.PARAMETERS})
	private params: P;

	protected constructor(requestId: string, method: string) {
		super();
		this.requestId = requestId;
		this.method = method;
	}

	public getRequestId(): string {
		return this.requestId;
	}

	public getMethod(): string {
		return this.method;
	}

	protected setParameters(params: P) {
		this.params = params;
	}

	protected getParameters(): P {
		return this.params;
	}

	public hashCode(): number {
		return this.method.hashCode() + this.params.hashCode();
	}

	public equals(o: Object): boolean {
		if (!(o instanceof ResolveRequest))
			return false;

		let rr = o as ResolveRequest<any, any>;

		if (this.method !== rr.method)
			return false;

		return this.params === rr.params;
	}

	public static parse<T extends DIDEntity<any>>(content: string, clazz: Class<T>): T {
		return DIDEntity.parse(content, clazz);
	}
}