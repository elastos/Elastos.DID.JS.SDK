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

import type {
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import { DIDDocumentPublicKey } from "./internals";
import { DIDDocumentPublicKeyReference } from "./internals";
import { DIDURL } from "./internals";
import {
    ParentException
} from "./exceptions/exceptions";
import { Deserializer } from "./internals";

export class DIDDocumentPublicKeyReferenceDeserializer extends Deserializer {
    public static deserialize(value: string, context: JsonParserTransformerContext): DIDDocumentPublicKeyReference {
        try {
            if (value && value.includes("{")) {
                let jsonObj = JSON.parse(value);
                return DIDDocumentPublicKeyReference.newWithKey(DIDDocumentPublicKeyReferenceDeserializer.mapper(context).parse<DIDDocumentPublicKey>(jsonObj.key, {mainCreator: () => [DIDDocumentPublicKey]}));
            }
            return DIDDocumentPublicKeyReference.newWithURL(DIDURL.from(value));
        } catch (e) {
            throw new ParentException("Invalid public key");
        }
    }
}