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

import { jwtVerify, JWTVerifyOptions } from 'jose/jwt/verify'
import { JWT, JWTHeader } from "../internals"
import { KeyProvider } from "../crypto/keyprovider";
import { decodeProtectedHeader } from 'jose/util/decode_protected_header';
import { UnsecuredJWT } from 'jose/jwt/unsecured'

export class JWTParser {
    private keyprovider : KeyProvider;
    private options : JWTVerifyOptions;

    constructor(keyprovider : KeyProvider, options : JWTVerifyOptions) {
        this.keyprovider = keyprovider;
        this.options = options;
    }

    private isSigned(token : string) : boolean {
        const protectedHeader = decodeProtectedHeader(token);
        return protectedHeader.alg == "none" ? false : true;
    }

    private getSignkey(token : string) : any {
        const protectedHeader = decodeProtectedHeader(token);
        return protectedHeader[JWTHeader.KID];
    }

    public async parse(token : string) : Promise<JWT> {
        if (!this.isSigned(token)) {
            const result = UnsecuredJWT.decode(token, this.options);
            return new JWT(result.header, result.payload);
        } else {
            let pk = await this.keyprovider.getPublicKey(this.getSignkey(token));
            const result = await jwtVerify(token, pk, this.options);
            return new JWT(result.protectedHeader, result.payload);
        }
    }
}

