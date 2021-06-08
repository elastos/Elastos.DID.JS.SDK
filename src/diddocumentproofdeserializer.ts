import type {
    JsonParserTransformerContext
} from "@elastosfoundation/jackson-js/dist/@types";

import {
    ParentException
} from "./exceptions/exceptions";
import { Deserializer } from "./internals";
import { DIDDocumentProof } from "./diddocumentproof";

export class DIDDocumentProofDeserializer extends Deserializer {
    public static deserialize(value: any | Array<any>, context: JsonParserTransformerContext): DIDDocumentProof[] {
        try {
            if (value instanceof Array) {
                return value.map((v) => DIDDocumentProofDeserializer.mapper(context).parse(JSON.stringify(v), {mainCreator: () => [DIDDocumentProof]}));
            }
            else
                return [DIDDocumentProofDeserializer.mapper(context).parse(JSON.stringify(value), {mainCreator: () => [DIDDocumentProof]})]
        } catch (e) {
            throw new ParentException("DIDDocumentProofDeserializer exception", e);
        }
    }
}
