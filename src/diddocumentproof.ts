import {
    JsonInclude,
    JsonIncludeType,
    JsonProperty,
    JsonPropertyOrder,
    JsonClassType,
    JsonCreator
} from "@elastosfoundation/jackson-js";
import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { DIDURL, keyTypeFilter } from "./internals";

/**
 * The Proof represents the proof content of DID Document.
 */
@JsonPropertyOrder({value: ["type", "created", "creator", "signatureValue"]})
export class DIDDocumentProof implements Comparable<DIDDocumentProof> {
    public static TYPE = "type";
    public static CREATOR = "creator";
    public static CREATED = "created";
    public static SIGNATURE_VALUE = "signatureValue";

    @JsonProperty({ value: DIDDocumentProof.TYPE })
    @JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyTypeFilter})
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
    private signatureValue: string;

    /**
     * Constructs the proof of DIDDocument with the given value.
     *
     * @param type the type of Proof
     * @param created the time to create DIDDocument
     * @param creator the key to sign
     * @param signatureValue the signature string
     */
    // Java: @JsonCreator
    constructor(creator: DIDURL, signatureValue: string, type?: string, created?: Date) {
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
        this.signatureValue = signatureValue;
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
        return this.signatureValue;
    }

    public compareTo(proof: DIDDocumentProof): number {
        let rc: number = this.created.getTime() - proof.created.getTime();
        if (rc == 0)
            rc = this.creator.compareTo(proof.creator);
        return rc;
    }
}
