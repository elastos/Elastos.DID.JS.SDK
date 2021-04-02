/*
 * Copyright (c) 2019 Elastos Foundation
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

import { DIDStore } from "./DIDStore";
import { checkArgument } from "./utils";

/* package org.elastos.did;

import static com.google.common.base.Preconditions.checkArgument;

import java.text.ParseException;
import java.util.Date;
import java.util.Map;
import java.util.TreeMap;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter; */

/**
 * The class defines the base interface of Meta data.
 *
 */
export abstract class AbstractMetadata /* extends DIDEntity<AbstractMetadata> */
		/* implements Cloneable */ {
	private static ALIAS = "alias";

	protected static USER_EXTRA_PREFIX = "UX-";

	public props: Map<string, string> = new Map();
	private store: DIDStore | null = null;

	/**
	 * Constructs the AbstractMetadata and attach with the store.
	 *
	 * @param store the DIDStore
	 */
	protected constructor(store: DIDStore | null = null) {
		this.store = store;
	}

	/**
	 * Set store for Abstract Metadata.
	 * @param store the DIDStore
	 */
	protected attachStore(store: DIDStore) {
		checkArgument(store != null, "Invalid store");
		this.store = store;
	}

	protected detachStore() {
		this.store = null;
	}

	/**
	 * Get store from Abstract Metadata.
	 *
	 * @return the DIDStore object
	 */
	protected getStore(): DIDStore | null {
		return this.store;
	}

	/**
	 * Judge whether the Abstract Metadata attach the store or not.
	 *
	 * @return the returned value is true if there is store attached meta data;
	 *         the returned value is false if there is no store attached meta data.
	 */
	protected attachedStore(): boolean {
		return this.store != null;
	}

	//@JsonAnyGetter
	protected getProperties(): Map<string, string> | null {
		return this.props;
	}

	protected get(name: string): any | undefined {
		return this.props.get(name);
	}

	//@JsonAnySetter
	protected put(name: string, value: boolean | string | Date | number ) {
		if (typeof value === "boolean")
			this.props.set(name, new String(value).valueOf());
		else if (typeof value === "string")
			this.props.set(name, value);
		else if (value instanceof Date)
			this.props.set(name, (value as Date).toISOString());

		this.save();
	}

	protected getBoolean(name: string): boolean {
		return new Boolean(this.get(name)).valueOf();
	}

	protected getInteger(name: string): number {
		return new Number(this.get(name)).valueOf();
	}

	protected getDate(name: string): Date /* throws ParseException */ {
		return new Date(this.get(name));
	}

	protected remove(name: string): any {
		let value = this.props.get(name);
		this.props.delete(name);
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
		return this.get(AbstractMetadata.ALIAS);
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
		checkArgument(key != null && key !== "", "Invalid key");
		return this.get(AbstractMetadata.USER_EXTRA_PREFIX + key);
	}

	public getExtraBoolean(key: string): boolean {
		checkArgument(key != null && key !== "", "Invalid key");
		return this.getBoolean(AbstractMetadata.USER_EXTRA_PREFIX + key);
	}

	public getExtraInteger(key: string): number {
		checkArgument(key != null && key !== "", "Invalid key");
		return this.getInteger(AbstractMetadata.USER_EXTRA_PREFIX + key);
	}

	public getExtraDate(key: string): Date /* throws ParseException */ {
		checkArgument(key != null && key !== "", "Invalid key");
		return this.getDate(AbstractMetadata.USER_EXTRA_PREFIX + key);
	}

	public removeExtra(key: string): string {
		checkArgument(key != null && key !== "", "Invalid key");
		return this.remove(AbstractMetadata.USER_EXTRA_PREFIX + key);
	}

	/**
	 * Merge two metadata.
	 *
	 * @param metadata the metadata to be merged.
	 */
	protected merge(metadata: AbstractMetadata) {
		if (metadata == this || metadata == null)
			return;

		metadata.props.forEach((k, v) => {
			if (this.props.has(k)) {
				if (this.props.get(k) == null)
					this.props.delete(k);
			} else {
				if (v != null)
					this.props.set(k, v);
			}
		});
	}

    /**
     * Returns a shallow copy of this instance: the keys and values themselves
     * are not cloned.
     *
     * @return a shallow copy of this object
     */
	//@Override
	/* protected clone(): any throws CloneNotSupportedException  {
		let result = (AbstractMetadata)super.clone();
        result.store = store;
        result.props = (TreeMap<String, String>) props.clone();

        return result;
    } */

	protected abstract save();
}
