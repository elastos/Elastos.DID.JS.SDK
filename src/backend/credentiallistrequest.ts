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

import { DID } from "../internals";
import { DIDURL } from "../internals";
import { DIDEntity  } from "../internals";
import { ResolveRequest } from "./resolverequest";
import { JSONObject } from "../json"
import { hashCode } from "../internals";
import { MalformedResolveRequestException } from "../exceptions/exceptions";

export class CredentialListRequest extends ResolveRequest<CredentialListRequest, Parameters> {
    public static PARAMETER_DID = "did";
    public static PARAMETER_SKIP = "skip";
    public static PARAMETER_LIMIT = "limit";

    public static METHOD_NAME = "did_listCredentials";

    public constructor(requestId: string = null) {
        super(requestId, CredentialListRequest.METHOD_NAME);
    }

    public setParameters(didOrParams: DID | Parameters, skip = 0, limit = 0) {
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

    protected paramsFromJson(json: JSONObject): Parameters {
        return Parameters.parse(json);
    }

    public static parse(content: string | JSONObject, context = null): CredentialListRequest {
        try {
            return DIDEntity.deserialize(content, CredentialListRequest, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedResolveRequestException)
                throw e;
            else
                throw new MalformedResolveRequestException(e);
        }
    }
}

class Parameters extends ResolveRequest.Parameters<Parameters> {
    public did: DID;
    public skip: number;
    public limit: number;

    public constructor(did: DID = null, skip = 0, limit = 0) {
        super();
        this.did = did;
        this.skip = skip;
        this.limit = limit;
    }

    public hashCode(): number {
        let hash = this.did.hashCode();
        hash += hashCode(this.skip);
        hash += hashCode(this.limit);
        return hash;
    }

    public equals(o: unknown): boolean {
        if (!(o instanceof Parameters))
            return false;

        let p = o as Parameters;

        if (!this.did.equals(p.did))
            return false;

        if (this.skip != p.skip)
            return false;

        return this.limit == p.limit;
    }

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        json.did = this.did.toString();

        if (this.skip && this.skip != 0)
            json.skip = this.skip;

        if (this.limit && this.limit != 0)
            json.limit = this.limit;

        return json;
    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.did = super.getDid("did", json.did, {mandatory: true, nullable: false});
        this.skip = this.getNumber("skip", json.skip, {mandatory: false, nullable: false, defaultValue: 0});
        this.limit = this.getNumber("limit", json.limit, {mandatory: false, nullable: false, defaultValue: 0});
    }

    public static parse(content: string | JSONObject, context = null): Parameters {
        try {
            return DIDEntity.deserialize(content, Parameters, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedResolveRequestException)
                throw e;
            else
                throw new MalformedResolveRequestException(e);
        }
    }
}