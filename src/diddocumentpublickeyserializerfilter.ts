import {
    JsonStringifierTransformerContext,
} from "jackson-js/dist/@types";
import { DID } from "./did";
import {
    PropertySerializerFilter,
} from "./serializers";

export class DIDDocumentPublicKeySerializerFilter extends PropertySerializerFilter<DID> {
    public static include (controller: DID, context: JsonStringifierTransformerContext): boolean {
        let serializeContext =  this.context(context);

        return serializeContext.isNormalized() || (!(serializeContext && controller && controller.equals(serializeContext.getDid())));
    }
}
