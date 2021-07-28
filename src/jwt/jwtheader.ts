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

import { JWSHeaderParameters } from "jose/webcrypto/types";

export class JWTHeader {
    private header : JWSHeaderParameters;

    public constructor() {}

    public static newWithJwsHeader(header : JWSHeaderParameters) {
        let object = new JWTHeader();
        object.header = header;
        return object;
    }

    public setAlgorithm(algorithm : string) : JWTHeader {
        this.header.alg = algorithm;
        return this;
    }

    public getAlgorithm() : string {
        return this.header.alg;
    }

    public setKid(keyid : string) : JWTHeader {
        this.header.kid = keyid;
        return this;
    }

    public getKid() : string {
        return this.header.kid;
    }

    public setType(type : string) : JWTHeader {
        this.header.typ = type;
        return this;
    }

    public setKeyId(keyid : string) : JWTHeader {
        this.header.kid = keyid;
        return this;
    }

    public getKeyId() : string {
        return this.header.kid;
    }

    public put(name : string, value: string) : JWTHeader {
        if (name != "alg" && name != "kid")
            this.header = {...this.header, name : value};
        return this;
    }

    public get(name : string) : any {
        if (this.header)
            this.header[name];

        return null;
    }

    public getJWSHeaderParameters() : JWSHeaderParameters {
        return this.header;
    }
}