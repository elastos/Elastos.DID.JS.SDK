import { List as ImmutableList } from "immutable";
import { Comparable } from "./comparable";

/**
 * Convenience class that helps during migration from JAVA SDK.
 * Could be replace with something else.
 */
export class Collections {
    public static unmodifiableList(list: any[]): ImmutableList<any> {
        return ImmutableList(list);
    }

    public static sort(list: any[]) {
        list.sort((n1,n2) => {
            if (typeof n1 === "string")
                return n1.localeCompare(n2);
            return n1.compareTo(n2);
        });
    }
}