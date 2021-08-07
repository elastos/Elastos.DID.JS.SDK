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

import { ObjectMapper } from "@elastosfoundation/jackson-js";
import type {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import type { Class } from "./class";
import { 
    DID, 
    Logger 
} from "./internals";
import {
    DIDSyntaxException,
    IllegalArgumentException,
    InvalidDateFormat
} from "./exceptions/exceptions";
import type { JSONObject } from "./json";
import { checkArgument } from "./internals";
import { Serializable } from "./serializable";

/**
 * Base class for all DID objects.
 */
export class DIDEntity<T> implements Serializable<T> { //implements Cloneable<DIDEntity<T>> {

    public static CONTEXT_KEY = "org.elastos.did.context";

    private static NORMALIZED_DEFAULT = true;

    /**
     * Get current object's DID context.
     *
     * @return the DID object or null
     */
    protected getSerializeContextDid(): DID | null {
        return null;
    }

    /**
     * Post sanitize routine after deserialization.
     *
     * @throws DIDSyntaxException if the DID object is invalid
     */
    protected async sanitize(): Promise<void> {}

    // TODO: CHECK THIS! NOT SURE THIS REALLY CLONES INHERITING CLASSES (FIELDS, METHODS) WELL
    public clone(): DIDEntity<T> {
        const clone = Object.assign({}, this);
        Object.setPrototypeOf(clone, Object.getPrototypeOf(this) );
        return clone;
    }

    /**
     * Get the ObjectMapper for serialization or deserialization.
     *
     * @return the ObjectMapper instance.
     */
    public static getDefaultObjectMapper(): ObjectMapper {
        let mapper = new ObjectMapper();

        mapper.defaultStringifierContext.features.serialization.DEFAULT_VIEW_INCLUSION = false;
        mapper.defaultStringifierContext.features.serialization.WRITE_SELF_REFERENCES_AS_NULL = true;
        mapper.defaultStringifierContext.features.serialization.FAIL_ON_SELF_REFERENCES = true;

        mapper.defaultStringifierContext.serializers.push({
            type: () => Date,
            order: 0,
            mapper: this.DateSerializer.serialize
        });

        mapper.defaultParserContext.features.deserialization.FAIL_ON_UNKNOWN_PROPERTIES = false;
        mapper.defaultParserContext.features.deserialization.DEFAULT_VIEW_INCLUSION = false;

        mapper.defaultParserContext.deserializers.push({
            type: () => Date,
            order: 0,
            mapper: this.DateSerializer.deserialize
        });

        return mapper;
    }

    /**
     * Get the ObjectMapper for serialization.
     *
     * @param normalized if normalized output, ignored when the sign is true
     * @return the ObjectMapper instance
     */
    protected getObjectMapper(normalized: boolean = undefined): ObjectMapper {
        let mapper = DIDEntity.getDefaultObjectMapper();
        let serializeContext = new DIDEntity.SerializeContext(normalized, mapper, this.getSerializeContextDid());

        mapper.defaultStringifierContext.attributes[DIDEntity.CONTEXT_KEY] = serializeContext;

        return mapper;
    }

    /**
     * Generic method to parse a DID object from a string JSON
     * representation into given DIDObject type.
     *
     * @param <T> the generic DID object type
     * @param content the string JSON content for building the object
     * @param clazz the class object for DID object
     * @return the parsed DID object
     * @throws DIDSyntaxException if a parse error occurs
     */
    public static async parse <T extends DIDEntity<T>>(source: JSONObject | string, clazz: Class<T>): Promise<T> {
        checkArgument(source && source !== "", "Invalid JSON content");
        checkArgument(clazz && clazz !== null, "Invalid result class object");
        let content: string;
        if (typeof source !== "string") {
            content = JSON.stringify(source);
        } else {
            content = source;
        }
        let mapper = DIDEntity.getDefaultObjectMapper();

        try {
            mapper.defaultParserContext.mainCreator = () => [clazz];
            let obj = mapper.parse<T>(content);
            await obj.sanitize();
            return obj;
        } catch (e) {
            throw new DIDSyntaxException("Invalid JSON syntax" + (Logger.levelIs(Logger.DEBUG) ? (" (" + clazz.name + "): " + content) : ""), e);
        }
    }
}

export namespace DIDEntity {

    export class SerializeContext {
        private normalized: boolean;
        // We use a stringified DID instead of a DID because jackson does deep cloning on its context,
        // which includes our custom SerializeContext. But then, lodash deepClones tries to clone our DID,
        // which contains circular dependencies, therefore leading to infinite loop in deepClone. This
        // is not related to serialization or deserialization itself.
        private did: string;
        private objectMapper: ObjectMapper;

        public constructor(normalized = false, objectMapper: ObjectMapper, did?: DID) {
            this.normalized = normalized;
            this.did = did ? did.toString() : null;
            this.objectMapper = objectMapper;
        }

        public isNormalized(): boolean {
            return this.normalized;
        }

        public setNormalized(normalized: boolean): SerializeContext {
            this.normalized = normalized;
            return this;
        }

        public getObjectMapper() {
            return this.objectMapper;
        }

        public getDid(): DID  {
            return DID.from(this.did);
        }

        public setDid(did: DID): void {
            this.did = did ? did.toString() : null;
        }
    }
}