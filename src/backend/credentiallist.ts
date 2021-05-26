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

import { JsonCreator, JsonProperty, JsonPropertyOrder } from "jackson-js";
import { DID } from "../internals";
import type { DIDURL } from "../internals";
import { MalformedResolveResultException } from "../exceptions/exceptions";
import { ResolveResult } from "./resolveresult";

@JsonPropertyOrder({
	value: [
		CredentialList.DID,
		CredentialList.CREDENTIALS
	]
})
@JsonCreator()
export class CredentialList extends ResolveResult<CredentialList> {
	protected static DID = "did";
	protected static CREDENTIALS = "credentials";

	public static DEFAULT_SIZE = 128;
	public static MAX_SIZE = 512;

	@JsonProperty({ value: CredentialList.DID })
	private did: DID;
	@JsonProperty({ value: CredentialList.CREDENTIALS })
	private credentialIds: DIDURL[];

	public constructor(did: DID = null) {
		super();
		this.did = did;
	}

	public getDid(): DID {
		return this.did;
	}

	public getCredentialIds(): DIDURL[] {
		return this.credentialIds != null ? this.credentialIds : [];
	}

	public size(): number {
		return this.credentialIds != null ? this.credentialIds.length : 0;
	}

	public getCredentialId(index: number): DIDURL {
		return this.credentialIds != null ? this.credentialIds[index] : null;
	}

	protected addCredentialId(id: DIDURL) {
		if (this.credentialIds == null)
			this.credentialIds = [];

		this.credentialIds.push(id);
	}

	public sanitize() {
		if (this.did == null)
			throw new MalformedResolveResultException("Missing did");
	}
}
