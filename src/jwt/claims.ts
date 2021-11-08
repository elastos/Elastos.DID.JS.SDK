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

import { JWTPayload } from "jose";
import { JSONObject, JSONValue, sortJSONObject } from "../json";

export class Claims {
    private payload : JWTPayload;

    public constructor(payload ?: JWTPayload) {
        this.payload = payload ? payload : {};
    }

    public put(name : string, value : JSONValue) : Claims {
        if (this.payload[name])
            delete this.payload[name];

        this.payload[name] = value;
        return this;
    }

    public putWithObject(value : JSONObject) : Claims {
        this.payload = { ...this.payload, ...value };
        return this;
    }

    public putWithJson(json : string) : Claims {
        let object = JSON.parse(json);
        this.putWithObject(object);
        return this;
    }

    public get(name : string) : any {
        return this.payload[name];
    }

    public getAsObject(name : string) : JSONObject {
        let value = this.payload[name];
        if (value != null)
            return value as JSONObject;

        return null;
    }

    public getAsJson(name : string) : string {
        let value = this.payload[name];
        if (value == null)
            return null;

        return JSON.stringify(value);
    }

    public setId(jti : string) : Claims {
        this.payload.jti = jti;
        return this;
    }

    public getId() : string {
        return this.payload.jti;
    }

    public setAudience(audience : string | string[]) : Claims {
        this.payload.aud = audience;
        return this;
    }

    public getAudience() : any {
        return this.payload.aud;
    }

    public setExpiration(expire : number) : Claims {
        this.payload.exp = expire;
        return this;
    }

    public getExpiration() : number {
        return this.payload.exp;
    }

    public setIssuedAt(iat : number) : Claims {
        this.payload.iat = iat;
        return this;
    }

    public getIssuedAt() : number {
        return this.payload.iat;
    }

    public setIssuer(issuer : string) : Claims {
        this.payload.iss = issuer;
        return this;
    }

    public getIssuer() : string {
        return this.payload.iss;
    }

    public setJti(jwtid : string) : Claims {
        this.payload.jti = jwtid;
        return this;
    }

    public getJti() : string {
        return this.payload.jti;
    }

    public setNotBefore(nbf : number) : Claims {
        this.payload.nbf = nbf;
        return this;
    }

    public getNotBefore() : number {
        return this.payload.nbf;
    }

    public setSubject(subject : string) : Claims {
        this.payload.sub = subject;
        return this;
    }

    public getSubject() : string {
        return this.payload.sub;
    }

    public getJWTPayload() : JWTPayload {
        return this.payload;
    }
}