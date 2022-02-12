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

import { DIDEntity } from "../internals";
import { JSONObject } from "../json";
import type { Hashable } from "../hashable";
import { hashCode } from "../internals";
import { MalformedResolveRequestException } from "../exceptions/exceptions";

export abstract class ResolveRequest<T, P extends ResolveRequest.Parameters<P>> extends DIDEntity<T> {
    protected static ID = "id";
    protected static METHOD = "method";
    protected static PARAMETERS = "params";

    private requestId: string;
    private method: string;
    private params: P;

    public constructor(requestId: string = null, method: string = null) {
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
        return hashCode(this.method) + this.params.hashCode();
    }

    public equals(o: unknown): boolean {
        if (!(o instanceof ResolveRequest))
            return false;

        let rr = o as ResolveRequest<any, any>;

        if (this.method !== rr.method)
            return false;

        return this.params === rr.params; // TODO: PROBABLY BUGGY
    }

    public toJSON(key: string = null): JSONObject {
        return {
            id: this.requestId,
            method: this.method,
            params: [this.params.toJSON(null)]
        };

    }

    protected fromJSON(json: JSONObject, context = null): void {
        this.requestId = super.getString("id", json.id, {mandatory: false, nullable: true});
        this.method = this.getString("method", json.method, {mandatory: true, nullable: false});

        if (!json.params)
            throw new MalformedResolveRequestException("Missing parameters");

        if (!Array.isArray(json.params))
            throw new MalformedResolveRequestException("Invalid parameters");

        this.params = this.paramsFromJson(json.params[0] as JSONObject);
    }

    protected abstract paramsFromJson(json: JSONObject): P;
}

/* eslint-disable no-class-assign */
export namespace ResolveRequest {
    export abstract class Parameters<T> extends DIDEntity<T> implements Hashable {
        public abstract hashCode(): number;
    }
}
