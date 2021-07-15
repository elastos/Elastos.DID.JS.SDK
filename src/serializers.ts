import { DIDEntity } from "./internals";
import type { DID } from "./internals";
import { Constants } from "./constants";
import type {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js";
import type {
    ObjectMapper,
} from "@elastosfoundation/jackson-js";

export class Serializer {
    public static context(context: JsonStringifierTransformerContext): DIDEntity.SerializeContext {
        return context.attributes[DIDEntity.CONTEXT_KEY];
    }

    public static mapper(context: JsonStringifierTransformerContext): ObjectMapper {
        return Serializer.context(context).getObjectMapper();
    }

    public static serialize (value: any, context: JsonStringifierTransformerContext): any {
        return value;
    }
}

export class Deserializer {
    public static mapper(context: JsonParserTransformerContext): ObjectMapper {
        return DIDEntity.getDefaultObjectMapper();
    }

    public static deserialize(value: string, context: JsonParserTransformerContext): any {
        return Deserializer.mapper(context).parse(value);
    }
}

// This filter is shared by all publickey related objects
export function keyTypeFilter(value: any, context?: JsonStringifierTransformerContext): boolean {
    let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

    if (!serializeContext || serializeContext.isNormalized())
        return false;

    return value ? value === Constants.DEFAULT_PUBLICKEY_TYPE : false;
}
