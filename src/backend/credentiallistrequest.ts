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

import { hash } from "immutable";
import { JsonCreator, JsonInclude, JsonIncludeType, JsonProperty } from "jackson-js";
import { DID } from "../did";
import { DIDURL } from "../didurl";
import { Hashable } from "../hashable";
import { ResolveRequest } from "./resolverequest";

@JsonCreator()
export class CredentialListRequest extends ResolveRequest<CredentialListRequest, Parameters> {
	public /* protected */ static PARAMETER_DID = "did";
	public /* protected */ static PARAMETER_SKIP = "skip";
	public /* protected */ static PARAMETER_LIMIT = "limit";

	public static METHOD_NAME = "listcredential";

	public constructor(@JsonProperty({value: CredentialListRequest.ID}) requestId: string) {
		super(requestId, CredentialListRequest.METHOD_NAME);
	}

	public setParameters(didOrParams: DID | Parameters, skip: number = 0, limit: number = 0) {
		if (didOrParams instanceof DID)
			super.setParameters(new Parameters(didOrParams, skip, limit));
		else
			super.setParameters(didOrParams);
	}

	public getDid(): DID {
		return this.getParameters().did;
	}

	public getSkip(): number {
		return this.getParameters().skip;
	}

	public getLimit(): number {
		return this.getParameters().limit;
	}

	public toString(): string {
		let builder = new DIDURL.Builder(this.getParameters().did);
		builder.setPath("/credentials");
		builder.setQueryParameter(CredentialListRequest.PARAMETER_SKIP, this.getParameters().skip.toFixed());
		builder.setQueryParameter(CredentialListRequest.PARAMETER_LIMIT, this.getParameters().limit.toFixed());

		return builder.build().toString();
	}
}

@JsonCreator()
class Parameters implements Hashable {
	@JsonProperty({value: CredentialListRequest.PARAMETER_DID})
	public /* private */ did: DID;

	@JsonProperty({value: CredentialListRequest.PARAMETER_SKIP})
	@JsonInclude({value: JsonIncludeType.NON_DEFAULT})
	public /* private */ skip: number;

	@JsonProperty({value: CredentialListRequest.PARAMETER_LIMIT})
	@JsonInclude({value: JsonIncludeType.NON_DEFAULT})
	public /* private */ limit: number;

	public constructor(@JsonProperty({value: CredentialListRequest.PARAMETER_DID, required: true}) did: DID, skip: number = 0, limit: number = 0) {
		this.did = did;
		this.skip = skip;
		this.limit = limit;
	}

	public hashCode(): number {
		let hash = this.did.hashCode();
		hash += this.skip.hashCode();
		hash += this.limit.hashCode();
		return hash;
	}

	public equals(o: Object): boolean {
		if (!(o instanceof Parameters))
			return false;

		let p = o as Parameters;

		if (!this.did.equals(p.did))
			return false;

		if (this.skip != p.skip)
			return false;

		return this.limit == p.limit;
	}
}