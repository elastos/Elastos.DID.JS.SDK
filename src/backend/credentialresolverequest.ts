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

import { JsonCreator, JsonInclude, JsonIncludeType, JsonProperty } from "@elastosfoundation/jackson-js";
import type { DID } from "../internals";
import { DIDURL } from "../internals";
import type { Hashable } from "../hashable";
import { ResolveRequest } from "./resolverequest";

export class CredentialResolveRequest extends ResolveRequest<CredentialResolveRequest, Parameters> {
    public static PARAMETER_ID = "id";
    public static PARAMETER_ISSUER = "issuer";

    public static METHOD_NAME = "did_resolveCredential";

    // TODO Java - @JsonCreator
    public constructor(
        //@JsonProperty({value: CredentialResolveRequest.ID}) requestId: string
    ) {
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
}

class Parameters implements Hashable {
    //@JsonProperty({value: CredentialResolveRequest.PARAMETER_ID})
    public id: DIDURL;
    //@JsonProperty({value: CredentialResolveRequest.PARAMETER_ISSUER})
    //@JsonInclude({value: JsonIncludeType.NON_NULL})
    public issuer: DID;

    // TODO Java - @JsonCreator
    public constructor(
        //@JsonProperty({value: CredentialResolveRequest.PARAMETER_ID, required: true})id: DIDURL,
        issuer: DID = null
    ) {
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
}