import { List as ImmutableList } from "immutable";

/**
 * Convenience class that helps during migration from JAVA SDK.
 * Could be replace with something else.
 */
export class Collections {
    public static unmodifiableList(list: any[]): ImmutableList<any> {
        return ImmutableList(list);
    }

    public static sort(list: any[]) {
        console.error("Collections.sort(): not implemented");
    }
}