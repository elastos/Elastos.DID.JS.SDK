import { Hashable } from "./hashable";

export class LruCache<K extends Hashable | string, V> {
    private values: Map<K, V> = new Map<K, V>();

    constructor(private maxEntries: number = 20) {}

    public get(key: K, createIfMissing?: (key: K)=>V): V {
      const hasKey = this.values.has(key);
      let entry: V;
      if (hasKey) {
        // peek the entry, re-insert for LRU strategy
        entry = this.values.get(key);
        this.values.delete(key);
        this.values.set(key, entry);
      }
      else {
          if (createIfMissing) {
            // Create the entry if missing
            entry = createIfMissing(key);
            this.values.set(key, entry);
          }
      }

      return entry;
    }

    public put(key: K, value: V) {
      if (this.values.size >= this.maxEntries) {
        // least-recently used cache eviction strategy
        const keyToDelete = this.values.keys().next().value;

        this.values.delete(keyToDelete);
      }

      this.values.set(key, value);
    }

    public invalidate(key: K) {
        this.values.delete(key);
    }

    public invalidateAll() {
        this.values.clear();
    }

    public keys(): IterableIterator<K> {
        return this.values.keys();
    }
  }