export class StringUtil {
    public static compareTo(str: string, otherString: string): number {
        if (str > otherString) return 1;
        else if (str < otherString) return -1;
        else return 0;
    }
}