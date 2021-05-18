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

import { JsonCreator, JsonProperty, JsonInclude, JsonFilterType, JsonIncludeType } from "jackson-js";
import { DID } from "../internals";
import { DIDURL } from "../internals";
import { Hashable } from "../hashable";
import { ResolveRequest } from "./resolverequest";
import { hashCode } from "../internals";
@JsonCreator()
export class DIDResolveRequest extends ResolveRequest<DIDResolveRequest, Parameters> {
	public static PARAMETER_DID = "did";
	public static PARAMETER_ALL = "all";

	public static METHOD_NAME = "resolvedid";

	public constructor(@JsonProperty({value: ResolveRequest.ID}) requestId: string) {
		super(requestId, DIDResolveRequest.METHOD_NAME);
	}

	public setParameters(didOrStringOrParams: DID | string | Parameters, all: boolean = false) {
		if (didOrStringOrParams instanceof DID)
			super.setParameters(new Parameters(didOrStringOrParams, all));
		else if (didOrStringOrParams instanceof Parameters)
			super.setParameters(didOrStringOrParams);
		else
			super.setParameters(new Parameters(DID.valueOf(didOrStringOrParams), all));
	}

	public getDid(): DID {
		return this.getParameters().did;
	}

	public isResolveAll(): boolean {
		return this.getParameters().all;
	}

	public toString(): string {
		let builder = new DIDURL.Builder(this.getParameters().did);
		builder.setQueryParameter(DIDResolveRequest.PARAMETER_ALL, this.getParameters().all ? "true":"false");
		return builder.build().toString();
	}
}

@JsonCreator()
class Parameters implements Hashable {
	@JsonProperty({value: DIDResolveRequest.PARAMETER_DID})
	public did: any /* DID */;

	@JsonProperty({value: DIDResolveRequest.PARAMETER_ALL})
	@JsonInclude({value: JsonIncludeType.NON_DEFAULT})
	public all: boolean;

	public constructor(@JsonProperty({value: DIDResolveRequest.PARAMETER_DID, required: true}) did: any /* DID */, all: boolean = false) {
		this.did = did;
		this.all = all;
	}

	public hashCode(): number {
		let hash = this.did.hashCode();
		hash += hashCode(this.all);
		return hash;
	}

	public equals(o: Object): boolean {
		if (!(o instanceof Parameters))
			return false;

		let p = o as Parameters;

		if (!this.did.equals(p.did))
			return false;

		return this.all == p.all;
	}
}