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
import { DIDEntity } from "../internals";
import { JSONObject } from "../json";
import { MalformedResolveResultException } from "../exceptions/exceptions";
import { ResolveResponse } from "../internals";

export class CredentialList extends ResolveResponse.Result<CredentialList> {
    public static DEFAULT_SIZE = 128;
    public static MAX_SIZE = 512;

    private did: DID;
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

    public toJSON(key: string = null): JSONObject {
        let json: JSONObject = {};

        json.did = this.did.toString();
        if (this.credentialIds && this.credentialIds.length > 0)
            json.credentials = Array.from(this.credentialIds, (id) => id.toString())

        return json;

    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.did = super.getDid("did", json.did, {mandatory: true, nullable: false});

        if (json.credentials) {
            if (!Array.isArray(json.credentials))
                throw new MalformedResolveResultException("Invalid credential list");

            if (json.credentials.length > 0)
                this.credentialIds = Array.from(json.credentials, (v) => new DIDURL(String(v)));
        }
    }

    public static parse(content: string | JSONObject, context = null): CredentialList {
        try {
            return DIDEntity.deserialize(content, CredentialList, context);
        } catch (e) {
            // DIDSyntaxException
            if (e instanceof MalformedResolveResultException)
                throw e;
            else
                throw new MalformedResolveResultException(e);
        }
    }
}
