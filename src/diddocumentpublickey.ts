import {
    JsonProperty, JsonPropertyOrder, JsonSerialize
} from "jackson-js";
import { Comparable } from "./comparable";
import { Constants } from "./constants";
import { Base58 } from "./crypto/base58";
import { DID } from "./did";
import { DIDDocumentConstants } from "./diddocumentconstants";
import { DIDDocumentPublicKeySerializerFilter } from "./diddocumentpublickeyserializerfilter";
import { DIDObject } from "./didobject";
import { DIDURL } from "./didurl";
import { TypeSerializerFilter } from "./filters";

/**
 * Publickey is used for digital signatures, encryption and
 * other cryptographic operations, which are the basis for purposes such as
 * authentication or establishing secure communication with service endpoints.
 */
    @JsonPropertyOrder({
    value: [
        DIDDocumentConstants.ID, DIDDocumentConstants.TYPE, DIDDocumentConstants.CONTROLLER, DIDDocumentConstants.PUBLICKEY_BASE58
    ]
})
export class DIDDocumentPublicKey implements DIDObject<string>, Comparable<DIDDocumentPublicKey> {
    @JsonProperty({ value: DIDDocumentConstants.ID })
    public id: DIDURL;
    @JsonSerialize({using: TypeSerializerFilter.filter})
    @JsonProperty({ value: DIDDocumentConstants.TYPE })
    public type: string;
    @JsonSerialize({using: DIDDocumentPublicKeySerializerFilter.filter})
    @JsonProperty({ value: DIDDocumentConstants.CONTROLLER })
    public controller: any /* DID */;
    @JsonProperty({ value: DIDDocumentConstants.PUBLICKEY_BASE58 })
    public keyBase58: string;
    private authenticationKey: boolean;
    private authorizationKey: boolean;

    /**
     * Constructs Publickey with the given value.
     *
     * @param id the Id for PublicKey
     * @param type the type string of PublicKey, default type is "ECDSAsecp256r1"
     * @param controller the DID who holds private key
     * @param keyBase58 the string from encoded base58 of public key
     */
    // Java: @JsonCreator
    constructor(@JsonProperty({ value: DIDDocumentConstants.ID, required: true }) id: DIDURL,
        @JsonProperty({ value: DIDDocumentConstants.TYPE }) type: string,
        @JsonProperty({ value: DIDDocumentConstants.CONTROLLER }) controller: any /* DID */,
        @JsonProperty({ value: DIDDocumentConstants.PUBLICKEY_BASE58, required: true }) keyBase58: string) {
        this.id = id;
        this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
        this.controller = controller;
        this.keyBase58 = keyBase58;
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
        return this.keyBase58;
    }

    /**
     * Get public key bytes.
     *
     * @return the key bytes
     */
    public getPublicKeyBytes(): Buffer {
        return Base58.decode(this.keyBase58);
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
            rc = this.keyBase58.localeCompare(key.keyBase58);

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
