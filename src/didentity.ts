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

import { DID, DIDURL } from "./internals";
import { JSONObject } from "./json";
import { checkArgument } from "./internals";
import {
    DIDSyntaxException,
    UnknownInternalException,
    InvalidDateFormat
} from "./exceptions/exceptions";

export interface ValueOptions {
    mandatory?: boolean;
    nullable?: boolean;
    emptiable?: boolean;
    defaultValue?: number | boolean | string | string[] | DID | DID[] | DIDURL | Date;
    context?: DID;
}

/**
 * Base class for all DID objects.
 */
export abstract class DIDEntity<T> {
    private static NORMALIZED_DEFAULT = true;
    //protected static NORMALIZED_KEY = "elastos.did.normalized";
    //protected static COMPACT_KEY = "elastos.did.compact";

    /**
     * Get current object's DID context.
     *
     * @return the DID object or null
     */
    protected getSerializeContextDid(): DID | null {
        return null;
    }

    // TODO: CHECK THIS! NOT SURE THIS REALLY CLONES INHERITING CLASSES (FIELDS, METHODS) WELL
    public clone(): DIDEntity<T> {
        const clone = Object.assign({}, this);
        Object.setPrototypeOf(clone, Object.getPrototypeOf(this) );
        return clone;
    }

    public abstract toJSON(key: string): JSONObject;

    protected abstract fromJSON(json: JSONObject, context: DID): void;

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
    protected static deserialize<T extends DIDEntity<T>>(source: JSONObject | string, type: (new () => T), context: DID = null): T {
        checkArgument(source && source !== "", "Invalid JSON content");

        let content: JSONObject;
        if (typeof source === "string") {
            content = JSON.parse(source);
        } else {
            content = source;
        }

        let obj = new type();
        obj.fromJSON(content, context);

        return obj;
    }

    protected static async deserializeAsync<T extends DIDEntity<T>>(source: JSONObject | string, type: (new () => T), context: DID = null): Promise<T> {
        checkArgument(source && source !== "", "Invalid JSON content");

        let content: JSONObject;
        if (typeof source === "string") {
            content = JSON.parse(source);
        } else {
            content = source;
        }

        let obj = new type();
        await obj.fromJSON(content, context);

        return obj;
    }

    /**
     * Serialize DID object to a JSON string.
     *
     * @param normalized whether normalized output
     * @return the serialized JSON string
     * @throws DIDSyntaxException if a serialization error occurs
     */
    public serialize(normalized: boolean = DIDEntity.NORMALIZED_DEFAULT): string {
        try {
            let key = (normalized) ? null : this.getSerializeContextDid()?.toString();
            return JSON.stringify(this.toJSON(key)).normalize("NFC");
        } catch (e) {
            throw new UnknownInternalException(e);
        }
    }

    /**
     * Get the JSON string representation of the object.
     *
     * @param normalized whether normalized output
     * @return a JSON string representation of the object
     */
    public toString(normalized: boolean = DIDEntity.NORMALIZED_DEFAULT): string {
        return this.serialize(normalized);
    }

    protected dateToString(dateObj: Date): string {
        return dateObj ? dateObj.toISOString().split('.')[0]+"Z" : null;
    }

    protected dateFromString(dateStr: string): Date {
        if (dateStr && isNaN(Date.parse(dateStr)))
            throw new InvalidDateFormat(dateStr);

        return dateStr ? new Date(dateStr + (dateStr.slice(dateStr.length - 1) == 'Z' ? '':'Z')) : null;
    }

    protected getString(name: string, value: any, option: ValueOptions = {} as ValueOptions): string | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as string : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as string : null;
        }

        if (typeof value !== 'string')
            throw new DIDSyntaxException("Invalid property value: " + name + ", type error");

        return value;
    }

    protected getNumber(name: string, value: any, option: ValueOptions = {} as ValueOptions): number | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as number : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as number : null;
        }

        if (typeof value !== 'number')
            throw new DIDSyntaxException("Invalid property value: " + name + ", type error");

        return value;
    }

    protected getBoolean(name: string, value: any, option: ValueOptions = {} as ValueOptions): boolean | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as boolean : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as boolean : null;
        }

        if (typeof value !== 'boolean')
            throw new DIDSyntaxException("Invalid property value: " + name + ", type error");

        return value;
    }

    protected getStrings(name: string, value: any, option: ValueOptions = {} as ValueOptions): string[] | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as string[] : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as string[] : null;
        }

        if (typeof value === 'string')
            return [ value as string ];

        if (Array.isArray(value)) {
            let strings = Array.from(value, (s) => {
                if(typeof s !== 'string')
                    new DIDSyntaxException("Invalid property value: " + name + ", type error");
                return s;
            });

            return strings.sort();
        }

        throw new DIDSyntaxException("Invalid property value: " + name + ", type error");
    }

    protected getContext(name: string, value: any, option: ValueOptions = {} as ValueOptions): string[] | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as string[] : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as string[] : null;
        }

        if (Array.isArray(value)) {
            let context = Array.from(value, (s) => {
                if(typeof s !== 'string')
                    new DIDSyntaxException("Invalid property value: " + name + ", type error");

                return s;
            });

            return context;
        }

        throw new DIDSyntaxException("Invalid property value: " + name + ", type error");
    }

    protected getDids(name: string, value: any, option: ValueOptions = {} as ValueOptions): DID[] | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as DID[] : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as DID[] : null;
        }

        if (typeof value === 'string') {
            try {
                return [ new DID(value) ];
            } catch (e) {
                new DIDSyntaxException("Invalid property value: " + name + ", " + e, e);
            }
        }

        if (Array.isArray(value)) {
            let dids = Array.from(value, (s) => {
                if(typeof s !== 'string')
                    new DIDSyntaxException("Invalid property value: " + name + ", type error");

                try {
                    return new DID(s);
                } catch (e) {
                    new DIDSyntaxException("Invalid property value: " + name + ", " + e, e);
                }
            });

            return dids.sort((a, b) => a.compareTo(b));
        }

        throw new DIDSyntaxException("Invalid property value: " + name + ", type error");
    }

    protected getDate(name: string, value: any, option: ValueOptions = {} as ValueOptions): Date | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as Date : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as Date : null;
        }

        if (typeof value !== 'string')
            throw new DIDSyntaxException("Invalid property value: " + name + ", type error");

        try {
            return this.dateFromString(value);
        } catch (e) {
            throw new DIDSyntaxException("Invalid property value: " + name + ", " + e, e);
        }
    }

    protected getDid(name: string, value: any, option: ValueOptions = {} as ValueOptions): DID | null {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as DID : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as DID : null;
        }

        if (typeof value !== 'string')
            throw new DIDSyntaxException("Invalid property value: " + name + ", type error");

        try {
            return new DID(value);
        } catch (e) {
            throw new DIDSyntaxException("Invalid property value: " + name + ", " + e, e);
        }
    }

    protected getDidUrl(name: string, value: any, option: ValueOptions = {} as ValueOptions): DIDURL | null | undefined {
        if (typeof value === 'undefined') {
            if (option.mandatory)
                throw new DIDSyntaxException("Missing property: " + name);

            return option.defaultValue ? option.defaultValue as DIDURL : null;
        }

        if (value === null) {
            if (!option.defaultValue && !option.nullable)
                throw new DIDSyntaxException("Invalid property: " + name + ", can not be null");

            return option.defaultValue ? option.defaultValue as DIDURL : null;
        }

        if (typeof value !== 'string')
            throw new DIDSyntaxException("Invalid property value: " + name + ", type error");

        try {
            return new DIDURL(value, option.context);
        } catch (e) {
            throw new DIDSyntaxException("Invalid property value: " + name + ", " + e, e);
        }
    }
}
