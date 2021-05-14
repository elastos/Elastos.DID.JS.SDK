import {
    JsonParserTransformerContext
} from "jackson-js/dist/@types";
import { DIDDocumentPublicKey } from "./diddocumentpublickey";
import { DIDDocumentPublicKeyReference } from "./diddocumentpublickeyreference";
import { DIDURL } from "./didurl";
import {
    ParentException
} from "./exceptions/exceptions";
import { Deserializer } from "./serializers";

export class DIDDocumentPublicKeyReferenceDeserializer extends Deserializer {
    public static deserialize(value: string, context: JsonParserTransformerContext): DIDDocumentPublicKeyReference {
        try {
            if (value && value.includes("{")) {
                let jsonObj = JSON.parse(value);
                return DIDDocumentPublicKeyReference.newWithKey(this.mapper(context).parse<DIDDocumentPublicKey>(jsonObj.key, {mainCreator: () => [DIDDocumentPublicKey]}));
            }
            return DIDDocumentPublicKeyReference.newWithURL(DIDURL.newWithUrl(value));
        } catch (e) {
            throw new ParentException("Invalid public key");
        }
    }
}