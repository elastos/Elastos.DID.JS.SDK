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

import { JWTVerifyOptions } from "jose";
import { KeyProvider } from "../crypto/keyprovider";
import { JWTParser } from "../internals";

export class JWTParserBuilder {
    private keyProvider : KeyProvider = null;
    private options : JWTVerifyOptions;

    public constructor() {
        this.options = {};
        return this;
    }

    /**
     * @Internal (tag for docs)
    */
    public static newWithKeyProvider(keyprovider : KeyProvider) : JWTParserBuilder {
        let builder = new JWTParserBuilder();
        builder.keyProvider = keyprovider;
        return builder;
    }

    public requireSubject(subject : string) : JWTParserBuilder {
        this.options.subject = subject;
        return this;
    }

    public requireAudience(audience : string| string[]) : JWTParserBuilder {
        this.options.audience = audience;
        return this;
    }

    public requireIssuer(issuer : string | string[]) : JWTParserBuilder {
        this.options.issuer = issuer;
        return this;
    }

    public requireIssuedAt(iat : number | string) : JWTParserBuilder {
        this.options.maxTokenAge = iat;
        return this;
    }

    public requireAlgorithms(algorithms : string[]) : JWTParserBuilder {
        this.options.algorithms = algorithms;
        return this;
    }

    public requireHeaderType(type : string) : JWTParserBuilder {
        this.options.typ = type;
        return this;
    }

    public setAllowedClockSkewSeconds(clockTolerance : number): JWTParserBuilder {
        this.options.clockTolerance = clockTolerance;
        return this;
    }

    public build() : JWTParser {
        let newOptions = Object.assign({} as JWTVerifyOptions, this.options);
        return new JWTParser(this.keyProvider, this.options);
    }
}
