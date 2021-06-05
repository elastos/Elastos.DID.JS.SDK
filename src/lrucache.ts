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

import type { Hashable } from "./hashable";

type Loadable<K,V> = (key: K) => {value: V, meta?: LRUCacheMeta};
type AsyncLoadable<K,V> = (key: K) => Promise<{value: V, meta?: LRUCacheMeta}>;

export type LRUCacheOptions<K, V> = {
  maxItems?: number;
  maxAge?: number;
  loader?: Loadable<K,V>;
  asyncLoader?: AsyncLoadable<K,V>;
}

export type LRUCacheMeta = unknown;

export type LRUCacheItem<K, V> = {
  key: K,
  value: V,
  prev: LRUCacheItem<K, V>,
  next: LRUCacheItem<K, V>,
  expires?: number; // Expiration timestamp (seconds)
  meta?: LRUCacheMeta
}

export class LRUCache<K extends Hashable | string, V> {
    private options: LRUCacheOptions<K, V>;
    private count = 0;
    private items: Map<string, LRUCacheItem<K, V>> = new Map();
    private first: LRUCacheItem<K, V> = null;
    private last: LRUCacheItem<K, V> = null;

    constructor(options: LRUCacheOptions<K, V> = {}) {
      this.options = Object.assign({
        maxItems: undefined,
        maxAge: undefined,
        loader: undefined
      }, options);

      this.invalidateAll();
    }

    public put(key: K, value: V, meta?: LRUCacheMeta) {
      this.putInternal(key, value, meta);
    }

    private putInternal(key: K, value: V, meta?: LRUCacheMeta): LRUCacheItem<K, V> {
      // set new key or replace existing
      // either way, move item to head of list
      // run maintenance after
      let hash = this.getHash(key);

      let item = this.items.get(hash);

      if (item) {
        // replace existing
        item.value = value;
      }
      else {
        // add new
        let k = this.getHash(key);
        item = {
          key: key,
          value: value,
          prev: null,
          next: null,
          meta: meta
        };

        this.items.set(k, item);
        this.count++;
      }

      // set expiration if maxAge is set
      if (this.options.maxAge)
        item.expires = (Date.now() / 1000) + this.options.maxAge;

      // promote to front of list
      this.promote(item);

      // maintenance
      if (this.options.maxItems && (this.count > this.options.maxItems)) {
        this.invalidate(this.last.key);
      }

      return item;
    }

    private getHash(key: string | Hashable): string {
      if (typeof key === "string"){
        return key;
      }
      return key.hashCode().toString();
    }

    public get(key: K, localLoader?: Loadable<K,V>): V {
      // fetch key and return value
      // move object to head of list
      let hash = this.getHash(key)
      let item = this.items.get(hash);

      if (item && item.expires && (Date.now() / 1000 >= item.expires)) {
        this.invalidate(key);
        item = null;
      }

      if (!item) {
        // Try to load the item from the loader if there is one
        let loader: Loadable<K,V> = null;
        if (localLoader)
          loader = localLoader;
        else if (this.options.loader)
          loader = this.options.loader;

        if (loader) {
          let {value, meta} = loader(key);
          if (value !== undefined && value !== null) {
            item = this.putInternal(key, value, meta);
          }
        }

        if (!item)
          return null;
      }

      this.promote(item);

      return item.value;
    }

    public async getAsync(key: K, asyncLocalLoader?: AsyncLoadable<K,V>): Promise<V> {
      // fetch key and return value
      // move object to head of list
      let hash = this.getHash(key)
      let item = this.items.get(hash);

      if (item && item.expires && (Date.now() / 1000 >= item.expires)) {
        this.invalidate(key);
        item = null;
      }

      if (!item) {
        // Try to load the item from the loader if there is one
        let loader: AsyncLoadable<K,V> = null;
        if (asyncLocalLoader)
          loader = asyncLocalLoader;
        else if (this.options.asyncLoader)
          loader = this.options.asyncLoader;

        if (loader) {
          let {value, meta} = await loader(key);
          if (value !== undefined && value !== null) {
            item = this.putInternal(key, value, meta);
          }
        }

        if (!item)
          return null;
      }

      this.promote(item);

      return item.value;
    }

    public invalidateAll(invalidationFilter?: (key: K)=>boolean) {
      // Empty the cache
      if (invalidationFilter) {
        this.items.forEach((v, k, map)=> {
          if (invalidationFilter(v.key))
            this.invalidate(v.key);
        });
      }
      else {
        // Delete all
        this.items.clear();
        this.first = null;
        this.last = null;

        // Stats
        this.count = 0;
      }
    }

    public invalidate(key: K) {
      // remove key from cache
      let hash = this.getHash(key);
      let item = this.items.get(hash);
      if (!item)
        return false;

      this.count--;
      this.items.delete(hash)

      // adjust linked list
      if (item.prev)
        item.prev.next = item.next;
      if (item.next)
        item.next.prev = item.prev;
      if (item === this.first)
        this.first = item.next;
      if (item === this.last)
        this.last = item.prev;

      return true;
    }

    public has(key: K) {
      // return true if key is present in cache
      // (do not change order)
      let hash = this.getHash(key);
      let item = this.items.get(hash);
      if (!item) return false;
      if (item.expires && (Date.now() / 1000 >= item.expires)) {
        return false;
      }
      return true;
    }

    private promote(item: LRUCacheItem<K, V>) {
      // promote item to head of list
      // (accepts new item or existing item)
      if (item !== this.first) {
        if (item.prev)
          item.prev.next = item.next;
        if (item.next)
          item.next.prev = item.prev;
        if (item === this.last)
          this.last = item.prev;

        // install as new head
        item.prev = null;
        item.next = this.first;
        if (this.first)
          this.first.prev = item;
        this.first = item;
        if (!this.last)
          this.last = item;
      }
    }

    public getMeta(key: K): LRUCacheMeta {
      // fetch key and return internal cache wrapper object
      // will contain any metadata user added when key was set
      // (this still moves object to front of list)
      let hash = this.getHash(key);
      let item = this.items.get(hash);
      if (!item)
        return null;

      if (item.expires && (Date.now() / 1000 >= item.expires)) {
        this.invalidate(key);
        return null;
      }
      this.promote(item);

      return item.meta;
    }

    /* public keys(): IterableIterator<K> {
        return this.values.keys();
    } */
  }