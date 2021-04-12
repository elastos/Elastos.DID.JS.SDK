export interface Comparable<T> {
    equals(obj: T): boolean
    compareTo(obj: T): number;
}