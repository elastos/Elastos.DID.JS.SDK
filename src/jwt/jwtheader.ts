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

import { JWSHeaderParameters, JWTHeaderParameters } from "jose";

export class JWTHeader {
    public static JWT_TYPE = "JWT";

    public static TYPE = "typ";
    public static CONTENT_TYPE = "cty";
    public static ALG = "alg";
    public static KID = "kid";

    private header : JWSHeaderParameters;

    public constructor(header ?: JWSHeaderParameters) {
        this.header = header ? header : {};
    }

    public setAlgorithm(algorithm : string) : JWTHeader {
        delete this.header.alg;
        this.header.alg = algorithm;
        return this;
    }

    public getAlgorithm() : string {
        return this.header.alg;
    }

    public setKeyId(kid : string) : JWTHeader {
        this.header.kid = kid;
        return this;
    }

    public getKeyId() : string {
        return this.header.kid;
    }

    public setType(type : string) : JWTHeader {
        this.header.typ = type;
        return this;
    }

    public getType() : string {
        return this.header.typ;
    }

    public setContentType(cty : string) : JWTHeader {
        this.header.cty = cty;
        return this;
    }

    public getContentType() : string {
        return this.header.cty;
    }

    public put(name : string, value: string) : JWTHeader {
        if (name != JWTHeader.ALG && name != JWTHeader.KID) {
            if (this.header[name])
                delete this.header[name];

            this.header[name] = value;
        }

        return this;
    }

    public get(name : string) : any {
        if (this.header)
            return this.header[name];

        return null;
    }

    public getJWSHeaderParameters() : JWSHeaderParameters {
        return this.header;
    }

    public getJWTHeaderParameters() : JWTHeaderParameters {
        if (this.header.alg != null && this.header.alg !== "none")
            return this.header as JWTHeaderParameters;

        return null;
    }
}