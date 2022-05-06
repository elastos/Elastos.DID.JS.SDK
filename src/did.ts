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

import { DIDDocument, DIDBiography, DIDBiographyStatus } from "./internals";
import { DIDMetadata } from "./internals";
import { DIDBackend } from "./internals";
import { hashCode } from "./internals";
import { MalformedDIDException } from "./exceptions/exceptions";
import { checkArgument, checkEmpty, checkNotNull } from "./utils";

/**
 * DID is a globally unique identifier that does not require
 * a centralized registration authority.
 */
export class DID {
    public static SCHEMA = "did";
    public static METHOD = "elastos";
    public static METADATA = "metadata";

    private repr : string = null;
    private method: string | null;
    private methodSpecificId: string | null;
    private metadata: DIDMetadata | null;

    private parser = new class {
        constructor(public superThis: DID) {
        }
        public isTokenChar(ch : string, start : boolean ) : boolean {
            if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') ||
                    (ch >= '0' && ch <= '9'))
                return true;

            if (start)
                return false;
            else
                return (ch  == '.' || ch == '_' || ch == '-');
        }

        public scanNextPart(did : string, start : number, limit : number, delimiter : string | string[]) : number {
            let nextPart = limit;
            let tokenStart = true;

            for (let i = start; i < limit; i++) {
                let ch = did.charAt(i);
                if (typeof ch == 'string') {
                    if (ch == delimiter) {
                        nextPart = i;
                        break;
                    }
                } else {
                    for (let i = 0; i < delimiter.length; i++) {
                        if (ch == delimiter[i]) {
                            nextPart = i;
                            break;
                        }
                    }
                }

                if (this.isTokenChar(ch, tokenStart)) {
                    tokenStart = false;
                    continue;
                }

                throw new MalformedDIDException("Invalid char at: " + i);
            }

            return nextPart;
        }

        public parse(did : string, start : number = 0, limit ?: number) : void {
            if (did == null)
                throw new MalformedDIDException("null DID string");

            if (limit == undefined)
                limit = did.length;

            // trim the leading and trailing spaces
            while ((limit > start) && (did.charAt(limit - 1) <= ' '))
                limit--;		//eliminate trailing whitespace

            while ((start < limit) && (did.charAt(start) <= ' '))
                start++;		// eliminate leading whitespace

            if (start == limit) // empty did string
                throw new MalformedDIDException("Empty DID string");

            let pos = start;

            // did
            let nextPart = this.scanNextPart(did, pos, limit, ':');
            let schema = did.substring(pos, nextPart);
            if (schema != DID.SCHEMA)
                throw new MalformedDIDException("Invalid DID schema: '" + schema + "', at: " + pos);

            pos = nextPart;

            // method
            if (pos + 1 >= limit || did.charAt(pos) != ':')
                throw new MalformedDIDException("Missing method and id string at: " + pos);

            nextPart = this.scanNextPart(did, ++pos, limit, ':');
            let method = did.substring(pos, nextPart);
            if (method != DID.METHOD)
                throw new MalformedDIDException("Unknown DID method: '" + method + "', at: " + pos);

            this.superThis.method = DID.METHOD;
            pos = nextPart;

            // id string
            if (pos + 1 >= limit || did.charAt(pos) != ':')
                throw new MalformedDIDException("Missing id string at: " +
                        (pos + 1 > limit ? pos : pos + 1));

            nextPart = this.scanNextPart(did, ++pos, limit, "\x00");
            this.superThis.methodSpecificId = did.substring(pos, nextPart);
        }
    }(this);

    public constructor(methodOrDID : string, methodSpecificId: string | null = null, start ?: number, limit ?: number) {
        this.metadata = null;

        if (methodSpecificId) {
            let method: string = methodOrDID;
            checkEmpty(method, "Invalid method");
            checkEmpty(methodSpecificId, "Invalid methodSpecificId");

            this.method = method;
            this.methodSpecificId = methodSpecificId;
        } else {
            if (!start)
            start = 0;

            if (!limit)
            limit = methodOrDID.length;

            checkEmpty(methodOrDID, "Invalid DID string");
            this.parser.parse(methodOrDID, start, limit);
        }
    }

    public static createFrom(methodOrDID: string, start : number, limit : number) : DID {
        checkArgument(methodOrDID != null && methodOrDID != "", "Invalid DID string");
        checkArgument(start < limit, "Invalid offsets");

        return new DID(methodOrDID, null, start, limit);
    }

    //equal to java 'valueof'
    public static from(did: DID | string | null): DID | null {
        if (!did)
            return null;

        return typeof did === "string" ? new DID(did) : did;
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

    public toJSON(key: string = null): string {
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
        if ((await this.getMetadata()).isDeactivated())
            return true;

        let bio = await DIDBackend.getInstance().resolveDidBiography(this);
        if (bio == null)
            return false;

        let deactivated = bio.getStatus() == DIDBiographyStatus.DEACTIVATED;
        if (deactivated)
            (await this.getMetadata()).setDeactivated(deactivated);

        return deactivated;
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
    public async resolveBiography(): Promise<DIDBiography> {
        return await DIDBackend.getInstance().resolveDidBiography(this);
    }

    public toString(): string {
        if (this.repr == null)
            this.repr = "did:"+this.method+":"+this.methodSpecificId;

        return this.repr;
    }

    public hashCode(): number {
        return 0x0D1D + hashCode(this.toString());
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
