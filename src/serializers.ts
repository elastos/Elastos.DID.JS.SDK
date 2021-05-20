import {
    JsonStringifierTransformerContext,
    JsonParserTransformerContext
} from "jackson-js/dist/@types";
import { DIDEntity } from "./internals";
import { DID } from "./internals";
import { Constants } from "./constants";
import { ObjectMapper } from "jackson-js";

export class Serializer {

    public static context(context: JsonStringifierTransformerContext): DIDEntity.SerializeContext {
        return context.attributes[DIDEntity.CONTEXT_KEY];
    }

    public static mapper(context: JsonStringifierTransformerContext): ObjectMapper {
        return Serializer.context(context).getObjectMapper();
    }

    public static serialize (value: any, context: JsonStringifierTransformerContext): string {
        return Serializer.mapper(context).stringify(value);
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

export class PropertySerializerFilter<T> extends Serializer {

    public static filter (value: any, context: JsonStringifierTransformerContext): string | null {
        return PropertySerializerFilter.serialize(value, context);
    }

    public static serialize (value: any, context: JsonStringifierTransformerContext): string | null {
        let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

        if ((serializeContext && serializeContext.isNormalized()) || PropertySerializerFilter.include(value, context)) {
            return serializeContext.getObjectMapper().stringify(value);
        }

        return null;
    }

    public static include (value: any, context: JsonStringifierTransformerContext): boolean {
        return true;
    }

    public static serializeType (type: string, context: JsonStringifierTransformerContext): string | null {
        let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

        if (serializeContext && serializeContext.isNormalized()) {
            return serializeContext.getObjectMapper().stringify(type);
        }

        if (type && type === Constants._DEFAULT_PUBLICKEY_TYPE) {
            return null;
        }
        return serializeContext.getObjectMapper().stringify(type);
    }
    public static serializeController (controller: DID, context: JsonStringifierTransformerContext): DID | null {
        let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

        if (serializeContext && serializeContext.isNormalized()) {
            return controller;
        }

        if (serializeContext && controller && controller.equals(serializeContext.getDid())) {
            return null;
        }
        return controller;
    }
}