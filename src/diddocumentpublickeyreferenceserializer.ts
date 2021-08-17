import type {
    JsonStringifierTransformerContext,
} from "@elastosfoundation/jackson-js";
import { DID, DIDEntity, Serializer } from "./internals";
import type { DIDDocumentPublicKeyReference } from "./internals";

export class DIDDocumentPublicKeyReferenceSerializer  {
    public static serialize(keyRef: DIDDocumentPublicKeyReference, context: JsonStringifierTransformerContext): string | null {
        let serializeContext: DIDEntity.SerializeContext = DIDDocumentPublicKeyReferenceSerializer.context(context)
        
        let base: DID = null;
        if (serializeContext && !serializeContext.isNormalized())
            base = serializeContext.getDid();

        return keyRef ? keyRef.getId().toString(base) : null;
    }
}
