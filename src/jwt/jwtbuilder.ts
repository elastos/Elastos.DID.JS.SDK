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

import { SignJWT } from "jose";
import { DID, checkArgument, BASE64 } from "../internals";
import { JWTHeader, Claims } from "../internals";
import { KeyProvider } from "../internals";
import { JSONObject, JSONValue } from "../json";

export class JWTBuilder {
    private header : JWTHeader = null;
    private payload : Claims = null;
    private keyprovider : KeyProvider;

    private issuer : DID;

    /**
     * @Internal (tag for docs)
    */
    public constructor(issuer : DID, keyProvider : KeyProvider) {
        checkArgument(issuer != null, "Invalid issuer");

        this.header = new JWTHeader();
        this.payload = new Claims();
        this.payload.setIssuer(issuer.toString());
        this.keyprovider = keyProvider;
        this.issuer = issuer;
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
        if (!claims.getIssuer())
            this.payload.setIssuer(this.issuer.toString());

        return this;
    }

    public setClaimsWithJson(json : string) : JWTBuilder {
        this.payload = new Claims();
        this.payload.putWithJson(json);
        if (!this.payload.getIssuer())
            this.payload.setIssuer(this.issuer.toString());

        return this;
    }

    public setClaimsWithObject(object : JSONObject) : JWTBuilder {
        this.payload = new Claims();
        this.payload.putWithObject(object);
        if (!this.payload.getIssuer())
            this.payload.setIssuer(this.issuer.toString());

        return this;
    }

    public addClaims(claims : JSONObject) : JWTBuilder {
        this.payload.putWithObject(claims);
        return this;
    }

    public addClaimsWithJson(json : string) : JWTBuilder {
        let object = JSON.parse(json);
        this.addClaims(object);
        return this;
    }

    public addHeader(name : string, value : string) : JWTBuilder {
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

    public setExpiration(expire : number | Date) : JWTBuilder {
        let expiration = expire instanceof Date ?  expire.getUTCSeconds() : expire;
        this.payload.setExpiration(expiration);
        return this;
    }

    public setIssuedAt(iat : number | Date) : JWTBuilder {
        let issuedAt = iat instanceof Date ?  iat.getUTCSeconds() : iat;
        this.payload.setIssuedAt(issuedAt);
        return this;
    }

    public setIssuer(issuer : string) : JWTBuilder {
        this.payload.setIssuer(issuer);
        return this;
    }

    public setJti(jwtid : string) : JWTBuilder {
        this.payload.setJti(jwtid);
        return this;
    }

    public setNotBefore(nbf : number | Date) : JWTBuilder {
        let notBefore = nbf instanceof Date ?  nbf.getUTCSeconds() : nbf;
        this.payload.setNotBefore(notBefore);
        return this;
    }

    public setSubject(subject : string) : JWTBuilder {
        this.payload.setSubject(subject);
        return this;
    }

    public async sign(password : string, keyid : string = null) : Promise<string> {
        checkArgument(password != null && password != "", "Invalid password");

        this.header.setAlgorithm("ES256");
        if (keyid)
            this.header.setKeyId(keyid);

        const signjwt = new SignJWT(this.payload.getJWTPayload())
                .setProtectedHeader(this.header.getJWTHeaderParameters());

        let sk = await this.keyprovider.getPrivateKey(keyid, password);
        return await signjwt.sign(sk);
    }

    public compact() : string {
        this.header.setAlgorithm("none");
        const header = BASE64.fromString(JSON.stringify(this.header.getJWSHeaderParameters()));
        const payload = BASE64.fromString(JSON.stringify(this.payload.getJWTPayload()));

        return `${header}.${payload}.`
    }
}

