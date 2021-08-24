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

import { IllegalArgumentException } from "./exceptions/exceptions"
import { checkArgument } from "./internals";

export class DIDDocumentMultiSignature {
    public static ONE_OF_ONE = new DIDDocumentMultiSignature(1, 1);
    private mv: number;
    private nv: number;

    public constructor(m: number, n: number) {
        this.apply(m, n);
    }

    public static fromString(mOfN: string): DIDDocumentMultiSignature {
        if (!mOfN || mOfN == null)
            throw new IllegalArgumentException("Invalid multisig spec");

        let mn: string[] = mOfN.split(":");
        if (mn == null || mn.length != 2)
            throw new IllegalArgumentException("Invalid multisig spec");

        return new DIDDocumentMultiSignature(Number.parseInt(mn[0]), Number.parseInt(mn[1]));
    }

    public static newFromMultiSignature(ms: DIDDocumentMultiSignature): DIDDocumentMultiSignature {
        return new DIDDocumentMultiSignature(ms.m(), ms.n());
    }

    protected apply(m: number, n: number) {
        checkArgument(n > 0, "Invalid multisig spec: n should > 0");
        checkArgument(m > 0 && m <= n, "Invalid multisig spec: m should > 0 and <= n");

        this.mv = m;
        this.nv = n;
    }

    public m(): number {
        return this.mv;
    }

    public n(): number {
        return this.nv;
    }

    public equals(multisig: DIDDocumentMultiSignature): boolean {
        if (this == multisig)
            return true;

        return this.mv == multisig.mv && this.nv == multisig.nv;
    }

    public toString(): string {
        return this.mv.toString() + ":" + this.nv.toString();
    }
}
