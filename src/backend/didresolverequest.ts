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
import { ResolveRequest } from "./resolverequest";
import { DIDEntity  } from "../internals";
import { JSONObject } from "../json"
import { hashCode } from "../internals";
import { MalformedResolveRequestException } from "../exceptions/exceptions";

export class DIDResolveRequest extends ResolveRequest<DIDResolveRequest, Parameters> {
    public static PARAMETER_DID = "did";
    public static PARAMETER_ALL = "all";

    public static METHOD_NAME = "did_resolveDID";

    public constructor(requestId: string = null) {
        super(requestId, DIDResolveRequest.METHOD_NAME);
    }

    public setParameters(didOrStringOrParams: DID | string | Parameters, all = false) {
        if (didOrStringOrParams instanceof DID)
            super.setParameters(new Parameters(didOrStringOrParams, all));
        else if (didOrStringOrParams instanceof Parameters)
            super.setParameters(didOrStringOrParams);
        else
            super.setParameters(new Parameters(DID.from(didOrStringOrParams), all));
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

    protected paramsFromJson(json: JSONObject): Parameters {
        return Parameters.parse(json);
    }

    public static parse(content: string | JSONObject, context = null): DIDResolveRequest {
        try {
            return DIDEntity.deserialize(content, DIDResolveRequest, context);
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
    public all: boolean;

    public constructor(did: DID = null, all = false) {
        super();
        this.did = did;
        this.all = all;
    }

    public hashCode(): number {
        let hash = this.did.hashCode();
        hash += hashCode(this.all);
        return hash;
    }

    public equals(o: unknown): boolean {
        if (!(o instanceof Parameters))
            return false;

        let p = o as Parameters;

        if (!this.did.equals(p.did))
            return false;

        return this.all == p.all;
    }

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        json.did = this.did.toString();

        if (this.all && this.all === true)
            json.all = this.all;

        return json;
    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.did = super.getDid("did", json.did, {mandatory: true, nullable: false});
        this.all = this.getBoolean("all", json.all, {mandatory: false, nullable: false, defaultValue: false});
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