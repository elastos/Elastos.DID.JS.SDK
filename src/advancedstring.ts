import { Comparable } from "./comparable";
import { StringUtil } from "./stringutil";

export class AdvancedString extends String implements Comparable<AdvancedString> {
    equals(otherString: AdvancedString): boolean {
        return otherString === this;
    }

    compareTo(otherString: AdvancedString): number {
        return StringUtil.compareTo(this.toString(), otherString.toString());
    }
}