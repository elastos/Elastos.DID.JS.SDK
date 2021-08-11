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

import type { DIDDocument, DIDBiography } from "./internals";
import { DIDMetadata } from "./internals";
import { DIDBackend } from "./internals";
import {
    DIDURLParser,
    checkEmpty,
    checkNotNull,
    hashCode
} from "./internals";

/**
 * DID is a globally unique identifier that does not require
 * a centralized registration authority.
 */
export class DID {
    public static METHOD = "elastos";
    //public static METHOD_SPECIFIC_ID = "elastos";
    public static METADATA = "metadata";

    private method: string | null;
    private methodSpecificId: string | null;
    private metadata: DIDMetadata | null;

    public constructor(methodOrDID: string, methodSpecificId: string | null = null) {
        this.metadata = null;
        if (methodSpecificId) {
            let method: string = methodOrDID;
            checkEmpty(method, "Invalid method");
            checkEmpty(methodSpecificId, "Invalid methodSpecificId");

            this.method = method;
            this.methodSpecificId = methodSpecificId;
        } else {
            let did = methodOrDID;
            checkEmpty(did, "Invalid DID string");
            this.method = null;
            this.methodSpecificId = null;
            let didParsed = DIDURLParser.newFromURL(methodOrDID)
            this.method = didParsed.did.method;
            this.methodSpecificId = didParsed.did.methodSpecificId;
        }
    }

    public static from(did: DID | string | null): DID | null {
        if (!did)
            return null;

        if (did instanceof DID)
            return did;

        return did.length == 0 ? null : new DID(did);
    }

    public getMethod(): string | null {
        return this.method;
    }

    public getMethodSpecificId(): string | null {
        return this.methodSpecificId;
    }

    public setMetadata(metadata: DIDMetadata): void {
        this.metadata = metadata;
    }

    public toJSON(key: String = null): string {
        return this.toString();
    }

    public async getMetadata(): Promise<DIDMetadata> {
        if (this.metadata == null) {
            try {
                let resolved: DIDDocument = await this.resolve();
                this.metadata = resolved != null ? resolved.getMetadata() : new DIDMetadata(this);
            } catch (e) {
                this.metadata = new DIDMetadata(this);
            }
        }

        return this.metadata;
    }

    public async isDeactivated(): Promise<boolean> {
        return (await this.getMetadata()).isDeactivated();
    }

    /**
     * Resolve DID content(DIDDocument).
     *
     * @param force force = true, DID content must be from chain.
     *              force = false, DID content could be from chain or local cache.
     * @return the DIDDocument object
     * @throws DIDResolveException throw this exception if resolving did failed.
     */
    public async resolve(force = false): Promise<DIDDocument> {
        let doc = await DIDBackend.getInstance().resolveDid(this, force);
        if (doc != null)
            this.setMetadata(doc.getMetadata());

        return doc;
    }

    /**
     * Resolve all DID transactions.
     *
     * @return the DIDBiography object
     * @throws DIDResolveException throw this exception if resolving all did transactions failed.
     */
    public resolveBiography(): Promise<DIDBiography> {
        return DIDBackend.getInstance().resolveDidBiography(this);
    }

    public toString(): string {
        return "did:"+this.method+":"+this.methodSpecificId;
    }

    public hashCode(): number {
        return hashCode(DID.METHOD) + hashCode(this.methodSpecificId);
    }

    public equals(obj: unknown): boolean {
        if (obj == this)
            return true;

        if (obj instanceof DID) {
            let did = obj;
            let eq = this.method === did.method;
            return eq ? this.methodSpecificId === did.methodSpecificId : eq;
        }

        if (typeof obj === "string") {
            let did = obj;
            return this.toString() === did;
        }

        return false;
    }

    public compareTo(did: DID): number {
        checkNotNull(did, "did is null");

        let strcmp = (s1: string, s2: string) => {
            if (s1 < s2) return -1;
            if (s1 > s2) return 1;
            return 0;
        };

        let rc = strcmp(this.method, did.method);
        return rc == 0 ? strcmp(this.methodSpecificId, did.methodSpecificId) : rc;
    }
}
