import {
    JsonProperty,
    JsonPropertyOrder,
    JsonClassType,
    JsonIgnore,
    JsonInclude,
    JsonIncludeType
} from "jackson-js";
import type {
	JsonStringifierTransformerContext,
} from "jackson-js/dist/@types";
import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { Base58 } from "./internals";
import { DID } from "./internals";
import { DIDEntity } from "./internals";
import type { DIDObject } from "./internals";
import { DIDURL } from "./internals";
import { keyTypeFilter } from "./internals";

function keyControllerFilter(value: any, context?: JsonStringifierTransformerContext): boolean {
    let serializeContext: DIDEntity.SerializeContext = context.attributes[DIDEntity.CONTEXT_KEY];

    if (!serializeContext || serializeContext.isNormalized())
        return false;

        return serializeContext.getDid() ? serializeContext.getDid().equals(value as DID) : false;
}

/**
 * Publickey is used for digital signatures, encryption and
 * other cryptographic operations, which are the basis for purposes such as
 * authentication or establishing secure communication with service endpoints.
 */
@JsonPropertyOrder({value: ["id", "type", "controller", "publicKeyBase58"]})
export class DIDDocumentPublicKey implements DIDObject<string>, Comparable<DIDDocumentPublicKey> {
    private static ID = "id";
    private static TYPE = "type";
    private static CONTROLLER = "controller";
    private static PUBLICKEY_BASE58 = "publicKeyBase58";

    @JsonProperty({ value: DIDDocumentPublicKey.ID })
    @JsonClassType({type: () => [DIDURL]})
    public id: DIDURL;
    @JsonProperty({ value: DIDDocumentPublicKey.TYPE })
    @JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyTypeFilter})
    @JsonClassType({type: () => [String]})
    public type: string;
    @JsonProperty({ value: DIDDocumentPublicKey.CONTROLLER })
    @JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyControllerFilter})
    @JsonClassType({type: () => [DID]})
    public controller: DID;
    @JsonProperty({ value: DIDDocumentPublicKey.PUBLICKEY_BASE58 })
    public publicKeyBase58: string;
    @JsonIgnore()
    private authenticationKey: boolean;
    @JsonIgnore()
    private authorizationKey: boolean;

    /**
     * Constructs Publickey with the given value.
     *
     * @param id the Id for PublicKey
     * @param type the type string of PublicKey, default type is "ECDSAsecp256r1"
     * @param controller the DID who holds private key
     * @param publicKeyBase58 the string from encoded base58 of public key
     */
    // Java: @JsonCreator
    constructor(@JsonProperty({ value: DIDDocumentPublicKey.ID, required: true }) id: DIDURL,
        @JsonProperty({ value: DIDDocumentPublicKey.TYPE }) type: string,
        @JsonProperty({ value: DIDDocumentPublicKey.CONTROLLER }) controller: DID,
        @JsonProperty({ value: DIDDocumentPublicKey.PUBLICKEY_BASE58, required: true }) publicKeyBase58: string) {
        this.id = id;
        this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
        this.controller = controller;
        this.publicKeyBase58 = publicKeyBase58;
    }

    /**
     * Get the PublicKey id.
     *
     * @return the identifier
     */
    public getId(): DIDURL {
        return this.id;
    }

    /**
     * Get the PublicKey type.
     *
     * @return the type string
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get the controller of Publickey.
     *
     * @return the controller
     */
    public getController(): DID {
        return this.controller;
    }

    /**
     * Get public key base58 string.
     *
     * @return the key base58 string
     */
    public getPublicKeyBase58(): string {
        return this.publicKeyBase58;
    }

    /**
     * Get public key bytes.
     *
     * @return the key bytes
     */
    public getPublicKeyBytes(): Buffer {
        return Base58.decode(this.publicKeyBase58);
    }

    /**
     * Check if the key is an authentication key or not.
     *
     * @return if the key is an authentication key or not
     */
    public isAuthenticationKey(): boolean {
        return this.authenticationKey;
    }

    public setAuthenticationKey(authenticationKey: boolean) {
        this.authenticationKey = authenticationKey;
    }

    /**
     * Check if the key is an authorization key or not.
     *
     * @return if the key is an authorization key or not
     */
    public isAuthorizationKey(): boolean {
        return this.authorizationKey;
    }

    public setAuthorizationKey(authorizationKey: boolean) {
        this.authorizationKey = authorizationKey;
    }

    public equals(ref: DIDDocumentPublicKey): boolean {
        if (this == ref)
            return true;

        return (this.getId().equals(ref.getId()) &&
            this.getType() === ref.getType() &&
            this.getController().equals(ref.getController()) &&
            this.getPublicKeyBase58() === ref.getPublicKeyBase58())
    }

    public compareTo(key: DIDDocumentPublicKey): number {
        let rc: number = this.id.compareTo(key.id);

        if (rc != 0)
            return rc;
        else
            rc = this.publicKeyBase58.localeCompare(key.publicKeyBase58);

        if (rc != 0)
            return rc;
        else
            rc = this.type.localeCompare(key.type);

        if (rc != 0)
            return rc;
        else
            return this.controller.compareTo(key.controller);
    }
}
