import { JsonStringifierTransformerContext } from "jackson-js/dist/@types";
import { DIDEntity } from "./didentity";

export class PropertySerializerFilter<T> {
    public static serialize (value: T, context: JsonStringifierTransformerContext): string | null {
        let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

        if ((serializeContext && serializeContext.isNormalized()) || this.include(value, context)) {
            return serializeContext.getObjectMapper().stringify(value);
        }

        return null;
    }

    public static include (value: T, context: JsonStringifierTransformerContext): boolean {
        return true;
    }

    public static serializeType (type: string, context: JsonStringifierTransformerContext): string | null {
        let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

        if (serializeContext && serializeContext.isNormalized()) {
            return serializeContext.getObjectMapper().stringify(type);
        }

        if (type && type.equals(Constants._DEFAULT_PUBLICKEY_TYPE)) {
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