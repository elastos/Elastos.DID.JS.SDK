import {
    JsonStringifierTransformerContext,
} from "jackson-js/dist/@types";
import { Serializer } from "./internals";
import { DIDDocumentPublicKeyReference } from "./internals";

export class DIDDocumentPublicKeyReferenceSerializer extends Serializer {
    public static serialize(keyRef: DIDDocumentPublicKeyReference, context: JsonStringifierTransformerContext): string | null {

        return keyRef ? this.mapper(context).stringify(keyRef.getId()) : null;
    }
}
