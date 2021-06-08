import type {
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js/dist/@types";
import { DIDDocumentPublicKey } from "./internals";
import { DIDDocumentPublicKeyReference } from "./internals";
import { DIDURL } from "./internals";
import {
    ParentException
} from "./exceptions/exceptions";
import { Deserializer } from "./internals";

export class DIDDocumentPublicKeyReferenceDeserializer extends Deserializer {
    public static deserialize(value: string, context: JsonParserTransformerContext): DIDDocumentPublicKeyReference {
        try {
            if (value && value.includes("{")) {
                let jsonObj = JSON.parse(value);
                return DIDDocumentPublicKeyReference.newWithKey(DIDDocumentPublicKeyReferenceDeserializer.mapper(context).parse<DIDDocumentPublicKey>(jsonObj.key, {mainCreator: () => [DIDDocumentPublicKey]}));
            }
            return DIDDocumentPublicKeyReference.newWithURL(DIDURL.from(value));
        } catch (e) {
            throw new ParentException("Invalid public key");
        }
    }
}