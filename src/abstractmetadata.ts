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
import type { DIDStore } from "./internals";
import type { JSONObject, JSONValue } from "./json";
import { sortJSONObject } from "./json";
import type { Cloneable } from "./cloneable";
import { checkArgument } from "./internals";

/**
 * The class defines the base interface of Meta data.
 */
export abstract class AbstractMetadata extends DIDEntity<AbstractMetadata> implements Cloneable<AbstractMetadata> {
    private static ALIAS = "alias";

    protected static USER_EXTRA_PREFIX = "UX-";

    // TODO @carl (BPI): I temporarily remplace this Map/String/String type with a raw Object, because
    // this throws a "incompatible receiver 'size' or #Map" runtime error. Not sure how to fix this correctly
    // but for now i want to keep validating the "internals" fix and Object does the job for now.
    public props: JSONObject = {};
    protected store?: DIDStore;

    /**
     * Constructs the AbstractMetadata and attach with the store.
     *
     * @param store the DIDStore
     */
    constructor(store?: DIDStore) {
        super();
        this.store = store;
        this.props = {};
    }

    /**
     * Set store for Abstract Metadata.
     * @param store the DIDStore
     */
    public attachStore(store: DIDStore) {
        checkArgument(store != null, "Invalid store");
        this.store = store;
    }

    public detachStore() {
        this.store = null;
    }

    /**
     * Get store from Abstract Metadata.
     *
     * @return the DIDStore object
     */
     public getStore(): DIDStore {
        return this.store;
    }

    /**
     * Judge whether the Abstract Metadata attach the store or not.
     *
     * @return the returned value is true if there is store attached meta data;
     *         the returned value is false if there is no store attached meta data.
     */
    public attachedStore(): boolean {
        return this.store != null;
    }

    protected get(name: string): JSONValue {
        return this.props[name];
    }

    protected put(name: string, value: JSONValue | Date ) {
        if  (value === null || value === undefined)
            delete this.props[name];
        else
            this.props[name] = value instanceof Date ? value.toISOString() : value;

        this.save();
    }

    protected getBoolean(name: string, defaultValue: boolean = false): boolean {
        let strValue = this.get(name);
        return strValue != null ? new Boolean(strValue).valueOf() : defaultValue;
    }

    protected getInteger(name: string, defaultValue: number = -1): number {
        let strValue = this.get(name);
        let value = defaultValue;
        if (strValue != null) {
            try {
                value = new Number(strValue).valueOf();
            } catch (ignore) {
            }
        }
        return value;
    }

    protected getDate(name: string, defaultValue: Date = null): Date /* throws ParseException */ {
        let strValue = this.get(name);
        let value = defaultValue;
        if (strValue != null) {
            try {
                value = new Date(strValue as string);
            } catch (ignore) {
            }
        }
        return value;
    }

    protected remove(name: string): any {
        let value = this.props[name];
        delete this.props[name];
        this.save();
        return value;
    }

    public isEmpty(): boolean {
        return this.props.size == 0;
    }

    /**
     * Set alias.
     *
     * @param alias alias string
     */
    public setAlias(alias: string) {
        this.put(AbstractMetadata.ALIAS, alias);
    }

    /**
     * Get alias.
     *
     * @return alias string
     */
    public getAlias(): string {
        return this.get(AbstractMetadata.ALIAS) as string;
    }

    /**
     * Set Extra element.
     *
     * @param key the key string
     * @param value the value
     */
    public setExtra(key: string, value: any) {
        checkArgument(key != null && key != "", "Invalid key");
        this.put(AbstractMetadata.USER_EXTRA_PREFIX + key, value);
    }

    /**
     * Get Extra element.
     *
     * @param key the key string
     * @return the value string
     */
    public getExtra(key: string): string {
        checkArgument(key && key != null, "Invalid key");
        return this.get(AbstractMetadata.USER_EXTRA_PREFIX + key) as string;
    }

    public getExtraBoolean(key: string, defaultValue: boolean = false): boolean {
        checkArgument(key && key != null, "Invalid key");
        return this.getBoolean(AbstractMetadata.USER_EXTRA_PREFIX + key, defaultValue);
    }

    public getExtraInteger(key: string, defaultValue: number = -1): number {
        checkArgument(key && key != null, "Invalid key");
        return this.getInteger(AbstractMetadata.USER_EXTRA_PREFIX + key, defaultValue);
    }

    public getExtraDate(key: string, defaultValue: Date = null): Date /* throws ParseException */ {
        checkArgument(key && key != null, "Invalid key");
        return this.getDate(AbstractMetadata.USER_EXTRA_PREFIX + key, defaultValue);
    }

    public removeExtra(key: string): string {
        checkArgument(key && key != null, "Invalid key");
        return this.remove(AbstractMetadata.USER_EXTRA_PREFIX + key);
    }

    /**
     * Merge two metadata.
     *
     * @param metadata the metadata to be merged.
     */
    public merge(metadata: AbstractMetadata) {
        if (metadata == this || metadata == null)
            return;

        this.props = {...metadata.props, ...this.props};
    }


    /**
     * Returns a shallow copy of this instance: the keys and values themselves
     * are not cloned.
     *
     * @return a shallow copy of this object
     */
     public clone(): any {
        let result = super.clone() as AbstractMetadata;
        result.store = this.store;
        result.props = this.props;

        return result;
     }

     public toJSON(key: string = null): JSONObject {
        return sortJSONObject(this.props);
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        this.props = JSON.parse(JSON.stringify(json));
    }

    protected abstract save();
}
