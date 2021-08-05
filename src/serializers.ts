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

import { DIDEntity } from "./internals";
import type { DID } from "./internals";
import { Constants } from "./constants";
import type {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import type {
    ObjectMapper,
} from "@elastosfoundation/jackson-js";

export class Serializer {
    public static context(context: JsonStringifierTransformerContext): DIDEntity.SerializeContext {
        return context.attributes[DIDEntity.CONTEXT_KEY];
    }

    public static mapper(context: JsonStringifierTransformerContext): ObjectMapper {
        return Serializer.context(context).getObjectMapper();
    }

    public static serialize (value: any, context: JsonStringifierTransformerContext): any {
        return value;
    }
}

export class Deserializer {
    public static mapper(context: JsonParserTransformerContext): ObjectMapper {
        return DIDEntity.getDefaultObjectMapper();
    }

    public static deserialize(value: string, context: JsonParserTransformerContext): any {
        return Deserializer.mapper(context).parse(value);
    }
}

// This filter is shared by all publickey related objects
export function keyTypeFilter(value: any, context?: JsonStringifierTransformerContext): boolean {
    let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

    if (!serializeContext || serializeContext.isNormalized())
        return false;

    return value ? value === Constants.DEFAULT_PUBLICKEY_TYPE : false;
}
