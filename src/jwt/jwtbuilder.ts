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

import { SignJWT } from "jose/jwt/sign";
import { UnsecuredJWT } from "jose/jwt/unsecured";
import { DID, DIDURL, checkArgument } from "../internals";
import { JWTHeader, Claims } from "../internals";
import { KeyProvider } from "../internals";
import { JSONObject, JSONValue } from "../json";

export class JWTBuilder {
    private header : JWTHeader = null;
    private payload : Claims = null;
    private keyprovider : KeyProvider;

    public constructor(issuer : DID, keyProvider : KeyProvider) {
        checkArgument(issuer != null, "Invalid issuer");

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

    public setClaimsWithJson(json : string) : JWTBuilder {
        this.payload = new Claims();
        let object = JSON.parse(json);
        this.payload.putObject(object)
        return this;
    }

    public addClaims(claims : JSONObject) : JWTBuilder {
        this.payload.putObject(claims);
        return this;
    }

    public addClaimsWithJson(json : string) : JWTBuilder {
        let object = JSON.parse(json);
        this.addClaims(object);
        return this;
    }

    public addHeader(name : string, value : string) : JWTBuilder {
        if (this.header == null)
            this.header = new JWTHeader();

        this.header.put(name, value);
        return this;
    }

    public claims(name : string, value : JSONValue) : JWTBuilder {
        this.payload.put(name, value);
        return this;
    }

    public claimsWithJson(name : string, json : string) : JWTBuilder {
        let object = JSON.parse(json);
        this.claims(name, object);
        return this;
    }

    public setId(jti : string) : JWTBuilder {
        this.payload.setId(jti);
        return this;
    }

    public setAudience(subject : string) : JWTBuilder {
        this.payload.setAudience(subject);
        return this;
    }

    public setExpiration(expire : number) : JWTBuilder {
        this.payload.setExpiration(expire);
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

    public setNotBefore(nbf : number) : JWTBuilder {
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

    public async sign(password : string, keyid : string = null) : Promise<string> {
        checkArgument(password != null && password != "", "Invalid password");

        if (this.header == null)
            this.header = new JWTHeader();

        this.header.setAlgorithm("ES256");
        this.header.setKeyId(keyid);

        const signjwt = new SignJWT(this.payload.getJWTPayload())
                .setProtectedHeader(this.header.getJWSHeaderParameters());

        let sk = await this.keyprovider.getPrivateKey(keyid.toString(), password);
        return await signjwt.sign(sk);
    }

    public compact() : string {
        return new UnsecuredJWT(this.payload.getJWTPayload()).encode();
    }
}

