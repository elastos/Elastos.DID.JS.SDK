import { Collections } from "./collections";
import type { Comparable } from "./comparable";

export class ComparableMap<K extends Comparable<K>, V> extends Map<K,V> {
    public get(k: K): V {
        for (let e of this.entries()) {
            if (e[0].equals(k))
                return e[1];
        }
        return null;
    }

    /**
     * Slows implementation for a sorted array of values. Can be improved.
     */
    public valuesAsSortedArray(): V[] {
        let keysArray = Array.from(this.keys());
        Collections.sort(keysArray);
        return keysArray.map((k) => this.get(k));
    }
}