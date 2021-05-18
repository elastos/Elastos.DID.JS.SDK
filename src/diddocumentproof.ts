import {
    JsonInclude,
    JsonIncludeType,
    JsonProperty,
    JsonPropertyOrder,
    JsonSerialize,
    JsonClassType
} from "jackson-js";
import { Comparable } from "./comparable";
import { Constants } from "./constants";
import { DIDDocumentConstants } from "./diddocumentconstants";
import { DIDURL } from "./internals";
import { TypeSerializerFilter } from "./internals";

/**
 * The Proof represents the proof content of DID Document.
 */
    @JsonPropertyOrder({
    value: [
        DIDDocumentConstants.TYPE, DIDDocumentConstants.CREATED, DIDDocumentConstants.CREATOR, DIDDocumentConstants.SIGNATURE_VALUE
    ]
})
export class DIDDocumentProof implements Comparable<DIDDocumentProof> {
    @JsonSerialize({using: TypeSerializerFilter.serialize})
    @JsonProperty({ value: DIDDocumentConstants.TYPE })
    private type: string;
    @JsonInclude({ value: JsonIncludeType.NON_NULL })
    @JsonProperty({ value: DIDDocumentConstants.CREATED })
    private created: Date;
    @JsonInclude({ value: JsonIncludeType.NON_NULL })
    @JsonProperty({ value: DIDDocumentConstants.CREATOR })
    @JsonClassType({type: () => [DIDURL]})
    public creator: DIDURL;
    @JsonProperty({ value: DIDDocumentConstants.SIGNATURE_VALUE })
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
    constructor(@JsonProperty({ value: DIDDocumentConstants.CREATOR }) creator: DIDURL,
        @JsonProperty({ value: DIDDocumentConstants.SIGNATURE_VALUE, required: true }) signature: string,
        @JsonProperty({ value: DIDDocumentConstants.TYPE }) type?: string,
        @JsonProperty({ value: DIDDocumentConstants.CREATED, required: true }) created?: Date) {

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
