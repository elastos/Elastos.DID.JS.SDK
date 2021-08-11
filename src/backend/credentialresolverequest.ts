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

import type { DID } from "../internals";
import { DIDURL } from "../internals";
import { DIDEntity } from "../internals";
import { ResolveRequest } from "./resolverequest";
import { JSONObject } from "../json"
import { MalformedResolveRequestException } from "../exceptions/exceptions";

export class CredentialResolveRequest extends ResolveRequest<CredentialResolveRequest, Parameters> {
    public static PARAMETER_ID = "id";
    public static PARAMETER_ISSUER = "issuer";

    public static METHOD_NAME = "did_resolveCredential";

    // TODO Java - @JsonCreator
    public constructor(requestId: string = null) {
        super(requestId, CredentialResolveRequest.METHOD_NAME);
    }

    public setParameters(idOrParameters: DIDURL | Parameters, issuer: DID = null) {
        if (idOrParameters instanceof Parameters)
            super.setParameters(idOrParameters);
        else
            super.setParameters(new Parameters(idOrParameters, issuer));
    }

    public getId(): DIDURL {
        return this.getParameters().id;
    }

    public getIssuer(): DID {
        return this.getParameters().issuer;
    }

    public toString(): string {
        let builder = new DIDURL.Builder(this.getParameters().id);
        if (this.getParameters().issuer != null)
            builder.setQueryParameter(CredentialResolveRequest.PARAMETER_ISSUER, this.getParameters().issuer.toString());

        return builder.build().toString();
    }

    protected paramsFromJson(json: JSONObject): Parameters {
        return Parameters.parse(json);
    }

    public static parse(content: string | JSONObject, context = null): CredentialResolveRequest {
        try {
            return DIDEntity.deserialize(content, CredentialResolveRequest, context);
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
    public id: DIDURL;
    public issuer: DID;

    public constructor(id: DIDURL = null, issuer: DID = null) {
        super();
        this.id = id;
        this.issuer = issuer;
    }

    public hashCode(): number {
        let hash = this.id.hashCode();

        if (this.issuer != null)
            hash += this.issuer.hashCode();

        return hash;
    }

    public equals(o: Object): boolean {
        if (!(o instanceof Parameters))
            return false;

        let p = o as Parameters;

        if (!this.id.equals(p.id))
            return false;

        let lIssuer: DID = this.issuer != null ? this.issuer : this.id.getDid();
        let rIssuer: DID = p.issuer != null ? p.issuer : p.id.getDid();

        return lIssuer.equals(rIssuer);
    }

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        json.id = this.id.toString();

        if (this.issuer)
            json.issuer = this.issuer.toString();

        return json;
    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.id = super.getDidUrl("id", json.id, {mandatory: true, nullable: false});
        this.issuer = this.getDid("issuer", json.issuer, {mandatory: false, nullable: true, defaultValue: null});
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
