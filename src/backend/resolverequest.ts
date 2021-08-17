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

import { JsonClassType, JsonGetter, JsonIgnore, JsonProperty, JsonPropertyOrder, JsonSetter } from "@elastosfoundation/jackson-js";
import type { Class } from "../class";
import { DIDEntity } from "../internals";
import type { Hashable } from "../hashable";
import { hashCode } from "../internals";

//@JsonPropertyOrder({ value: ["requestId", "method"]})
export abstract class ResolveRequest<T, P extends Hashable> extends DIDEntity<T> {
    protected static ID = "id";
    protected static METHOD = "method";
    protected static PARAMETERS = "params";

    //@JsonProperty({ value: ResolveRequest.ID }) //@JsonClassType({type: ()=>[String]})
    private requestId: string;
    //@JsonProperty({ value: ResolveRequest.METHOD }) //@JsonClassType({type: ()=>[String]})
    private method: string;
    //@JsonIgnore()
    private _params: P;

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
        this._params = params;
    }

    protected getParameters(): P {
        return this._params;
    }

    /**
     * Map an array(single element) of the parameter objects to parameter object.
     *
     * <p>
     * NOTICE: this is required by the Ethereum RPC call schema.
     * </p>
     *
     * @param params an array of the parameter objects
     */
    @JsonSetter({ value: ResolveRequest.PARAMETERS })
    //@JsonIgnore()
    private _setParameters(params: P[]) {
        this._params = (params == null || params.length == 0) ? null : params[0];
    }

    /**
     * Map the parameter object to an single element array.
     *
     * <p>
     * NOTICE: this is required by the Ethereum RPC call schema.
     * </p>
     *
     * @return an array(single element) of the parameter objects
     */
    @JsonGetter({ value: ResolveRequest.PARAMETERS })
    //@JsonClassType({type: ()=>[Array, [String]]})
    private _getParameters(): P[] {
        if (this._params != null) {
            let ret: P[] = [this._params];
            return ret;
        } else {
            return null;
        }
    }

    public hashCode(): number {
        return hashCode(this.method) + this._params.hashCode();
    }

    public equals(o: unknown): boolean {
        if (!(o instanceof ResolveRequest))
            return false;

        let rr = o as ResolveRequest<any, any>;

        if (this.method !== rr.method)
            return false;

        return this._params === rr._params; // TODO: PROBABLY BUGGY
    }

    public static parse<T extends DIDEntity<T>>(content: string, clazz: Class<T>): Promise<T> {
        return DIDEntity.parse(content, clazz);
    }
}