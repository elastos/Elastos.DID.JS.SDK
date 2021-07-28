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

import { SignJWT } from 'jose/jwt/sign'
import { UnsecuredJWT } from 'jose/jwt/unsecured'
import { DID, DIDURL, checkArgument } from '../internals';
import { JWTHeader, Claims } from '../internals';
import { KeyProvider } from '../internals';

export class JWTBuilder {
    private issuer : DID;
    private header : JWTHeader = null;
    private payload : Claims = null;
    private keyprovider : KeyProvider;

    public constructor(issuer : DID, keyProvider : KeyProvider) {
        checkArgument(issuer != null, "Invalid issuer");

        this.issuer = issuer;
        this.setIssuer(issuer.toString());
        this.keyprovider = keyProvider;
    }

    public static createHeader() : JWTHeader {
        return new JWTHeader();
    }

    public static createClaims() : Claims {
        return new Claims();
    }

    public setHeader(header : JWTHeader) : JWTBuilder {
        this.header = header;
        return this;
    }

    public setClaims(claims : Claims) : JWTBuilder {
        this.payload = claims;
        return this;
    }

    public addHeader(name : string, value : string) : JWTBuilder {
        if (this.header == null)
            this.header = new JWTHeader();

        this.header.put(name, value);
        return this;
    }

    public addClaims(name : string, value : string | number | string[]) : JWTBuilder {
        this.payload.put(name, value);
        return this;
    }

    public setAudience(subject : string) : JWTBuilder {
        this.payload.setAudience(subject);
        return this;
    }

    public setExpirationTime(expire : string | number) : JWTBuilder {
        this.payload.setExpirationTime(expire);
        return this;
    }

    public setIssuedAt(iat : number) : JWTBuilder {
        this.payload.setIssuedAt(iat);
        return this;
    }

    public setIssuer(issuer : string) : JWTBuilder {
        if (this.payload == null)
            this.payload = new Claims();

        this.payload.setIssuer(issuer);
        return this;
    }

    public setJti(jwtid : string) : JWTBuilder {
        if (this.payload == null)
            this.payload = new Claims();

        this.payload.setJti(jwtid);
        return this;
    }

    public setNotBefore(nbf : string | number) : JWTBuilder {
        if (this.payload == null)
            this.payload = new Claims();

        this.payload.setNotBefore(nbf);
        return this;
    }

    public setSubject(subject : string) : JWTBuilder {
        if (this.payload == null)
            this.payload = new Claims();

        this.payload.setSubject(subject);
        return this;
    }

    public async sign(keyid : DIDURL = null, password : string) : Promise<string> {
        checkArgument(password != null && password != "", "Invalid password");

        if (this.header == null)
            this.header = new JWTHeader();

        this.header.setAlgorithm("ES256");
        this.header.setKeyId(keyid.toString());

        const signjwt = new SignJWT(this.payload.getJWTPayload())
                .setProtectedHeader(this.header.getJWSHeaderParameters());

        let sk = await this.keyprovider.getPrivateKey(keyid.toString(), password);
        return await signjwt.sign(sk);
    }

    public compact() : string {
        return new UnsecuredJWT(this.payload.getJWTPayload()).encode();
    }
}

