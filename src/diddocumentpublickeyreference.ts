import {
    JsonDeserialize, JsonSerialize
} from "jackson-js";
import { Comparable } from "./comparable";
import { DIDDocumentPublicKey } from "./internals";
import { DIDDocumentPublicKeyReferenceDeserializer } from "./internals";
import { DIDDocumentPublicKeyReferenceSerializer } from "./internals";
import { DIDURL } from "./internals";
import { checkArgument } from "./internals";


@JsonSerialize({ using: DIDDocumentPublicKeyReferenceSerializer.serialize })
@JsonDeserialize({ using: DIDDocumentPublicKeyReferenceDeserializer.deserialize })
export class DIDDocumentPublicKeyReference implements Comparable<DIDDocumentPublicKeyReference> {
    private id: DIDURL;
    private key?: DIDDocumentPublicKey;

    public constructor(id: DIDURL) {
        this.id = id;
    }

    static newWithURL(id: DIDURL): DIDDocumentPublicKeyReference {
        let instance: DIDDocumentPublicKeyReference = new DIDDocumentPublicKeyReference(id);
        return instance;
    }

    static newWithKey(key: DIDDocumentPublicKey): DIDDocumentPublicKeyReference {
        let instance: DIDDocumentPublicKeyReference = new DIDDocumentPublicKeyReference(key.getId());
        instance.key = key;
        return instance;
    }

    public isVirtual(): boolean {
        return this.key == undefined;
    }

    public getId(): DIDURL {
        return this.id;
    }

    public getPublicKey(): DIDDocumentPublicKey {
        return this.key;
    }

    public update(key: DIDDocumentPublicKey): void {
        checkArgument(key != null && key.getId().equals(this.id), "Invalid key to update the public key reference");

        this.id = key.getId();
        this.key = key;
    }

    public equals(other: DIDDocumentPublicKeyReference): boolean {
        return false;
    }

    public compareTo(ref?: DIDDocumentPublicKeyReference): number {
        if (this.key && ref.key) {
            return this.key.compareTo(ref.key);
        }
        return this.id.compareTo(ref.id);
    }
}
