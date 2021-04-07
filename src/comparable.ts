export interface Comparable<T> {
    compareTo(proof: T): number;
}