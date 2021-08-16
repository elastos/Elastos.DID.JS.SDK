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

import { DIDMetadata } from "./internals";
import {
    checkEmpty,
    checkNotNull,
    hashCode
} from "./internals";
import type { DIDDocument } from "./internals";
import { DIDBackend } from "./internals";
import type { DIDBiography } from "./internals";
import {
    JsonSerialize,
    JsonDeserialize,
    JsonCreator
} from "@elastosfoundation/jackson-js";
import {
    Serializer,
    Deserializer
} from "./internals";
import type {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import { IllegalArgumentException, MalformedDIDException } from "./exceptions/exceptions";
import { checkArgument } from "./utils";

class DIDSerializer extends Serializer {
    public static serialize(did: DID, context: JsonStringifierTransformerContext): string {
        return did ? did.toString() : null;
    }
}

class DIDDeserializer extends Deserializer {
    public static deserialize(value: string, context: JsonParserTransformerContext): DID {
        try {
            if (value && value.includes("{"))
                throw new IllegalArgumentException("Invalid DIDURL");
            return new DID(value);
        } catch (e) {
            throw new IllegalArgumentException("Invalid DID");
        }
    }
}

/**
 * DID is a globally unique identifier that does not require
 * a centralized registration authority.
 */
@JsonSerialize({using:  DIDSerializer.serialize})
@JsonDeserialize({using:  DIDDeserializer.deserialize})
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

        public scanNextPart(did : String, start : number, limit : number, delimiter : string | string[]) : number {
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

        public parse(did : String, start : number = 0, limit ?: number) : void {
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
                throw new MalformedDIDException("empty DID string");

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

    public constructor(methodOrDID: string, methodSpecificId: string | null = null, internal = false) {
        this.metadata = null;
        if (internal) {
            // For jackson creation only
            this.method = null;
            this.methodSpecificId = null;
        } else if (methodSpecificId) {
            let method: string = methodOrDID;
            checkEmpty(method, "Invalid method");
            checkEmpty(methodSpecificId, "Invalid methodSpecificId");

            this.method = method;
            this.methodSpecificId = methodSpecificId;
        } else {
            checkEmpty(methodOrDID, "Invalid DID string");
            this.parser.parse(methodOrDID);
        }
    }

    public static createFrom(methodOrDID: string, start : number, limit : number) : DID {
        checkArgument(methodOrDID != null && methodOrDID != "", "Invalid DID string");
        checkArgument(start < limit, "Invalid offsets");

        let did = new DID("", "", true);
        did.parser.parse(methodOrDID, start, limit);
        return did;
    }

    @JsonCreator()
    public static jacksonCreator() {
        // Already deserialized by our custom deserializer. Don't return an object here otherwise
        // it will replace the deserialized one from the custom deserializer.
        // Jackson seems to call BOTH the custom deserializer first, then call the creator (either "constructor",
        // or the custom @JsonCreator method).
        return null;
    }

    //equal to java 'valueof'
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





/*
import { CoinType, ChangeChain, SignType } from './constants'
import { MnemonicManager, KeyManager } from "./core"

const bip39 = require('bip39')

export class DID {

    public async generateNew (password = "") {
        let mnemonic = MnemonicManager.generateMnemonic(password);
        return await this.loadFromMnemonic(mnemonic, password);
    }

    public async loadFromMnemonic (mnemonic, password = "", index = 0) {
        if (!bip39.validateMnemonic(mnemonic)) {
            return null;
        }
        let seed = await MnemonicManager.getSeedFromMnemonic(mnemonic, password);
        let privateKey = KeyManager.generateSubPrivateKey(this.buf2hex(seed), CoinType.ELA, ChangeChain.EXTERNAL, index).toString('hex');
        let masterPublicKey = KeyManager.getMasterPublicKey(seed, CoinType.ELA);
        let publicKey = KeyManager.generateSubPublicKey(masterPublicKey, ChangeChain.EXTERNAL, index).toString('hex')
        let did = KeyManager.getAddressBase(publicKey, SignType.ELA_IDCHAIN).toString()
        let publicBase58 = KeyManager.getPublicKeyBase58(masterPublicKey)

        return {
            mnemonic: mnemonic,
            seed: this.buf2hex(seed),
            did: `did:elastos:${did}`,
            publicKey: publicKey,
            privateKey: privateKey,
            publicKeyBase58: publicBase58
        }

    }

    private buf2hex(buffer: Buffer): Buffer {
        return Buffer.from(Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join(''));
    }
}
*/