import {
    JsonInclude,
    JsonIncludeType,
    JsonProperty,
    JsonPropertyOrder,
    JsonSerialize,
    JsonClassType,
    JsonCreator
} from "jackson-js";
import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { DIDURL } from "./internals";
import { TypeSerializerFilter } from "./internals";

/**
 * The Proof represents the proof content of DID Document.
 */
@JsonPropertyOrder({value: ["type", "created", "creator", "signature"]})
export class DIDDocumentProof implements Comparable<DIDDocumentProof> {
    public static TYPE: string = "type";
    public static CREATOR: string = "creator";
    public static CREATED: string = "created";
    public static SIGNATURE_VALUE: string = "signatureValue";

    @JsonSerialize({using: TypeSerializerFilter.serialize})
    @JsonProperty({ value: DIDDocumentProof.TYPE })
    private type: string;
    @JsonInclude({ value: JsonIncludeType.NON_NULL })
    @JsonProperty({ value: DIDDocumentProof.CREATED })
    @JsonClassType({ type: () => [Date] })
    private created: Date;
    @JsonInclude({ value: JsonIncludeType.NON_NULL })
    @JsonProperty({ value: DIDDocumentProof.CREATOR })
    @JsonClassType({type: () => [DIDURL]})
    public creator: DIDURL;
    @JsonProperty({ value: DIDDocumentProof.SIGNATURE_VALUE })
    @JsonClassType({type: () => [String]})
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
        @JsonProperty({value: "creator"}) creator: DIDURL,
        @JsonProperty({value: "signatureValue"}) signature: string,
        @JsonProperty({value: "type"}) type?: string,
        @JsonProperty({value: "created"}) created?: Date) {
        this.type = type ? type : Constants.DEFAULT_PUBLICKEY_TYPE;

        if (created === undefined)
            this.created = new Date();
        else if (created !== null)
            this.created = new Date(created);
        else
            this.created = null;

        this.creator = creator;
        this.signature = signature;
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
