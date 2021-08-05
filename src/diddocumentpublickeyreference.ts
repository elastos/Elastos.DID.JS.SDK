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

import {
    JsonDeserialize, JsonSerialize
} from "@elastosfoundation/jackson-js";
import type { Comparable } from "./comparable";
import type { DIDDocumentPublicKey } from "./internals";
import { DIDDocumentPublicKeyReferenceDeserializer } from "./internals";
import { DIDDocumentPublicKeyReferenceSerializer } from "./internals";
import { DIDURL } from "./internals";
import { checkArgument } from "./internals";


@JsonSerialize({ using: DIDDocumentPublicKeyReferenceSerializer.serialize })
@JsonDeserialize({ using: DIDDocumentPublicKeyReferenceDeserializer.deserialize })
export class DIDDocumentPublicKeyReference implements Comparable<DIDDocumentPublicKeyReference> {
    private id: DIDURL;
    private key?: DIDDocumentPublicKey;

    public constructor(id: DIDURL) {
        this.id = id;
    }

    static newWithURL(id: DIDURL): DIDDocumentPublicKeyReference {
        let instance: DIDDocumentPublicKeyReference = new DIDDocumentPublicKeyReference(id);
        return instance;
    }

    static newWithKey(key: DIDDocumentPublicKey): DIDDocumentPublicKeyReference {
        let instance: DIDDocumentPublicKeyReference = new DIDDocumentPublicKeyReference(key.getId());
        instance.key = key;
        return instance;
    }

    public isVirtual(): boolean {
        return this.key == undefined;
    }

    public getId(): DIDURL {
        return this.id;
    }

    public getPublicKey(): DIDDocumentPublicKey {
        return this.key;
    }

    public update(key: DIDDocumentPublicKey): void {
        checkArgument(key != null && key.getId().equals(this.id), "Invalid key to update the public key reference");

        this.id = key.getId();
        this.key = key;
    }

    public equals(other: DIDDocumentPublicKeyReference): boolean {
        return false;
    }

    public compareTo(ref?: DIDDocumentPublicKeyReference): number {
        if (this.key && ref.key) {
            return this.key.compareTo(ref.key);
        }
        return this.id.compareTo(ref.id);
    }
}
