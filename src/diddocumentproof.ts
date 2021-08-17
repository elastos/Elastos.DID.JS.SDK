import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { DIDURL } from "./internals";
import { DateSerializer } from "./dateserializer"
import { FieldInfo, GenericSerializer, FieldType, FilteredTypeSerializer } from "./serializers"

/**
 * The Proof represents the proof content of DID Document.
 */
//@JsonPropertyOrder({value: ["type", "created", "creator", "signature"]})
export class DIDDocumentProof implements Comparable<DIDDocumentProof> {
    private static TYPE = "type";
    private static CREATOR = "creator";
    private static CREATED = "created";
    private static SIGNATURE_VALUE = "signatureValue";

    private static FIELDSMAP = new Map<string, FieldInfo>([
        [DIDDocumentProof.TYPE, FieldInfo.forType(FieldType.METHOD).withDeserializerMethod(FilteredTypeSerializer.deserialize).withSerializerMethod(FilteredTypeSerializer.serialize)],
        [DIDDocumentProof.CREATED, FieldInfo.forType(FieldType.DATE)],
        [DIDDocumentProof.CREATOR, FieldInfo.forType(FieldType.TYPE).withTypeName("DIDURL")],
        [DIDDocumentProof.SIGNATURE_VALUE, FieldInfo.forType(FieldType.LITERAL)]
    ]);

    //@JsonProperty({ value: DIDDocumentProof.TYPE })
    ////@JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyTypeFilter})
    private type: string;
    ////@JsonInclude({ value: JsonIncludeType.NON_NULL })
    //@JsonProperty({ value: DIDDocumentProof.CREATED })
    //@JsonClassType({ type: () => [Date] })
    private created: Date;
    ////@JsonInclude({ value: JsonIncludeType.NON_NULL })
    //@JsonProperty({ value: DIDDocumentProof.CREATOR })
    //@JsonClassType({type: () => [DIDURL]})
    public creator: DIDURL;
    //@JsonProperty({ value: DIDDocumentProof.SIGNATURE_VALUE })
    //@JsonClassType({type: () => [String]})
    private signature: string;

    /**
     * Constructs the proof of DIDDocument with the given value.
     *
     * @param type the type of Proof
     * @param created the time to create DIDDocument
     * @param creator the key to sign
     * @param signature the signature string
     */
    // Java: @JsonCreator
    constructor(
        creator: DIDURL,
        signature: string,
        type?: string,
        created?: Date) {
        this.type = type ? type : Constants.DEFAULT_PUBLICKEY_TYPE;

        if (created === undefined)
            this.created = new Date();
        else if (created !== null)
            this.created = new Date(created);
        else
            this.created = null;

        if (this.created)
            this.created.setMilliseconds(0);

        this.creator = creator;
        this.signature = signature;
    }

    public static createFromValues(fieldValues: Map<string, any>): DIDDocumentProof {
        let newInstance = new DIDDocumentProof(
            fieldValues[DIDDocumentProof.CREATOR],
            fieldValues[DIDDocumentProof.SIGNATURE_VALUE],
            fieldValues[DIDDocumentProof.TYPE],
            fieldValues[DIDDocumentProof.CREATED]
        );

        return newInstance;
    }

    public getAllValues(): Map<string, any> {
        return new Map<string, any>([
            [DIDDocumentProof.TYPE, this.getType()],
            [DIDDocumentProof.CREATED, this.getCreated()],
            [DIDDocumentProof.CREATOR, this.getCreator()],
            [DIDDocumentProof.SIGNATURE_VALUE, this.getSignature()]
        ]);
    }

    public serialize(normalized = true): string {
        return GenericSerializer.serialize(normalized, this, DIDDocumentProof.FIELDSMAP);
    }

    public static deserialize(json: string): DIDDocumentProof {
        return GenericSerializer.deserialize(json, DIDDocumentProof, DIDDocumentProof.FIELDSMAP);
    }

    equals(obj: DIDDocumentProof): boolean {
        return this.compareTo(obj) == 0;
    }

    /**
     * Get Proof type.
     *
     * @return the type string
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get the time to create DIDDocument.
     *
     * @return the time
     */
    public getCreated(): Date {
        return this.created;
    }

    /**
     * Get the key id to sign.
     *
     * @return the key id
     */
    public getCreator(): DIDURL {
        return this.creator;
    }

    /**
     * Get signature string.
     *
     * @return the signature string
     */
    public getSignature(): string {
        return this.signature;
    }

    public compareTo(proof: DIDDocumentProof): number {
        let rc: number = this.created.getTime() - proof.created.getTime();
        if (rc == 0)
            rc = this.creator.compareTo(proof.creator);
        return rc;
    }
}
