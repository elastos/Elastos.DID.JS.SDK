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

import { JWTPayload } from 'jose/jwt/sign'

export class Claims {
	private static ISSUER = "iss";
	private static SUBJECT = "sub";
	private static AUDIENCE = "aud";
	private static EXPIRATION = "exp";
	private static NOT_BEFORE = "nbf";
	private static ISSUED_AT = "iat";
	private static ID = "jti";

    private payload : JWTPayload;

    public constructor() {}

    public static newWithPayload(payload : JWTPayload) : Claims {
        let claims = new Claims();
        claims.payload = payload;
        return claims;
    }

    public put(name : string, value : number | string | string[]) : Claims {
        this.payload = { ... this.payload, name : value };
        return this;
    }

    public get(name : string) : any {
        return this.payload[name];
    }

    public setAudience(audience : string) : Claims {
        this.put(Claims.AUDIENCE, audience);
        return this;
    }

    public setExpirationTime(expire : string | number) : Claims {
        this.put(Claims.EXPIRATION, expire);
        return this;
    }

    public setIssuedAt(iat : number) : Claims {
        this.put(Claims.ISSUED_AT, iat);
        return this;
    }

    public setIssuer(issuer : string) : Claims {
        this.put(Claims.ISSUER, issuer);
        return this;
    }

    public setJti(jwtid : string) : Claims {
        this.put(Claims.ID, jwtid);
        return this;
    }

    public setNotBefore(nbf : string | number) : Claims {
        this.put(Claims.NOT_BEFORE, nbf);
        return this;
    }

    public setSubject(subject : string) : Claims {
        this.put(Claims.SUBJECT, subject);
        return this;
    }

    public getJWTPayload() : JWTPayload {
        return this.payload;
    }
}