import type {
    JsonStringifierTransformerContext,
} from "jackson-js/dist/@types";
import { Serializer } from "./internals";
import type { DIDDocumentPublicKeyReference } from "./internals";

export class DIDDocumentPublicKeyReferenceSerializer extends Serializer {
    public static serialize(keyRef: DIDDocumentPublicKeyReference, context: JsonStringifierTransformerContext): string | null {

        return keyRef ? DIDDocumentPublicKeyReferenceSerializer.mapper(context).stringify(keyRef.getId()) : null;
    }
}
