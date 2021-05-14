import {
    JsonStringifierTransformerContext,
} from "jackson-js/dist/@types";
import { Serializer } from "./serializers";
import { DIDDocumentPublicKeyReference } from "./diddocumentpublickeyreference";

export class DIDDocumentPublicKeyReferenceSerializer extends Serializer {
    public static serialize(keyRef: DIDDocumentPublicKeyReference, context: JsonStringifierTransformerContext): string | null {

        return keyRef ? this.mapper(context).stringify(keyRef.getId()) : null;
    }
}
