import { IllegalArgumentException } from "./exceptions/exceptions"
import { checkArgument } from "./internals";
import { FieldInfo, GenericSerializer, FieldType } from "./serializers";

class MultisigDeserializer {
    public static serialize(normalized: boolean, value: DIDDocumentMultiSignature, sourceInstance: any): string {
        return value.toString();
    }

    public static deserialize(value: string, fullJsonObj: any): DIDDocumentMultiSignature {
        try {
            if (value)
               return DIDDocumentMultiSignature.newFromJson(value);
        } catch (e) {
            throw new IllegalArgumentException("Invalid multisig specification");
        }
    }
}

//@JsonDeserialize({using:  MultisigDeserializer.deserialize})
export class DIDDocumentMultiSignature {
    public static ONE_OF_ONE = new DIDDocumentMultiSignature(1, 1);
    private mv: number;
    private nv: number;

    public static FIELDSMAP = new Map<string, FieldInfo>([
        ["multisig", FieldInfo.forType(FieldType.METHOD).withDeserializerMethod(MultisigDeserializer.deserialize).withSerializerMethod(MultisigDeserializer.serialize)]
    ]);

    public constructor(m: number, n: number) {
        this.apply(m, n);
    }

    public static createFromValues(fieldValues: Map<string, any>): DIDDocumentMultiSignature {
        return DIDDocumentMultiSignature.newFromJson(fieldValues["multisig"]);
    }

    public getAllValues(): Map<string, any> {
        return new Map<string, any>([
            ["multisig", this.toString()]
        ]);
    }

    public serialize(normalized = true): string {
        return GenericSerializer.serialize(normalized, this, DIDDocumentMultiSignature.FIELDSMAP);
    }

    public static deserialize(json: string): DIDDocumentMultiSignature {
        return GenericSerializer.deserialize(json, DIDDocumentMultiSignature, DIDDocumentMultiSignature.FIELDSMAP);
    }

    //@JsonCreator()
    public static placeHolder(mOfN: string): DIDDocumentMultiSignature {
        // The Jackson parser will call JsonCreator with null after called the
        // customized deserializer. Here should return null to keep the
        // deserialized result.
        return null;
    }

    public static newFromJson(mOfN: string): DIDDocumentMultiSignature {
        if (!mOfN || mOfN == null)
            throw new IllegalArgumentException("Invalid multisig spec");

        let mn: string[] = mOfN.split(":");
        if (mn == null || mn.length != 2)
            throw new IllegalArgumentException("Invalid multisig spec");

        return new DIDDocumentMultiSignature(Number.parseInt(mn[0]), Number.parseInt(mn[1]));
    }

    public static newFromMultiSignature(ms: DIDDocumentMultiSignature): DIDDocumentMultiSignature {
        return new DIDDocumentMultiSignature(ms.m(), ms.n());
    }

    protected apply(m: number, n: number) {
        checkArgument(n > 0, "Invalid multisig spec: n should > 0");
        checkArgument(m > 0 && m <= n, "Invalid multisig spec: m should > 0 and <= n");

        this.mv = m;
        this.nv = n;
    }

    public m(): number {
        return this.mv;
    }

    public n(): number {
        return this.nv;
    }

    public equals(multisig: DIDDocumentMultiSignature): boolean {
        if (this == multisig)
            return true;

        return this.mv == multisig.mv && this.nv == multisig.nv;
    }

    //@JsonValue()
    public toString(): string {
        return this.mv.toString() + ":" + this.nv.toString();
    }
}
