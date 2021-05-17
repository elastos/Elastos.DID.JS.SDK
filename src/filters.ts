import { PropertySerializerFilter } from "./internals";
import { JsonStringifierTransformerContext } from "jackson-js/dist/@types";
import { Constants } from "./constants";

export class TypeSerializerFilter extends PropertySerializerFilter<string> {
    public static include (type: string, context: JsonStringifierTransformerContext): boolean {
        return this.context(context).isNormalized() || (!(type && type === Constants._DEFAULT_PUBLICKEY_TYPE));
    }
}
