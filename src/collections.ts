import type { Comparable } from "./comparable";

/**
 * Convenience class that helps during migration from JAVA SDK.
 * Could be replace with something else.
 */
export class Collections {
    public static sort(list: Comparable<any>[] | string[]) {
        list.sort((n1,n2) => {
            if (typeof n1 === "string")
                return n1.localeCompare(n2);
            return n1.compareTo(n2);
        });
    }
}