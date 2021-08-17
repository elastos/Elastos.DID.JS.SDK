import type { Comparable } from "./comparable";
import { Constants } from "./constants";
import { Base58 } from "./internals";
import { DID } from "./internals";
import type { DIDObject } from "./internals";
import { DIDURL } from "./internals";
import { FieldInfo, GenericSerializer, FieldType, FilteredTypeSerializer } from "./serializers"

export class FilteredControllerSerializer {
    public static serialize(normalized: boolean, value: DID, sourceInstance: any): string {
        let contextDid = null;
        if (!(typeof sourceInstance['getSerializeContextDid'] === 'function')) {
            contextDid = sourceInstance.getSerializeContextDid();
        }

        if (!normalized && contextDid != null && contextDid.equals(value)) {
            return value.serialize(normalized);
        }
        return null;
    }

    public static deserialize(value: string, fullJsonObj: any): DID {
        return DID.deserialize(value);
    }
}

/**
 * Publickey is used for digital signatures, encryption and
 * other cryptographic operations, which are the basis for purposes such as
 * authentication or establishing secure communication with service endpoints.
 */
//@JsonPropertyOrder({value: ["id", "type", "controller", "publicKeyBase58"]})
export class DIDDocumentPublicKey implements DIDObject<string>, Comparable<DIDDocumentPublicKey> {
    private static ID = "id";
    private static TYPE = "type";
    private static CONTROLLER = "controller";
    private static PUBLICKEY_BASE58 = "publicKeyBase58";

    private static FIELDSMAP = new Map<string, FieldInfo>([
        [DIDDocumentPublicKey.ID, FieldInfo.forType(FieldType.TYPE).withTypeName("DID")],
        [DIDDocumentPublicKey.TYPE, FieldInfo.forType(FieldType.METHOD).withDeserializerMethod(FilteredTypeSerializer.deserialize).withSerializerMethod(FilteredTypeSerializer.serialize)],
        [DIDDocumentPublicKey.CONTROLLER, FieldInfo.forType(FieldType.METHOD).withDeserializerMethod(FilteredControllerSerializer.deserialize).withSerializerMethod(FilteredControllerSerializer.serialize)],
        [DIDDocumentPublicKey.PUBLICKEY_BASE58, FieldInfo.forType(FieldType.LITERAL)]
    ]);

    //@JsonProperty({ value: DIDDocumentPublicKey.ID })
    //@JsonClassType({type: () => [DIDURL]})
    public id: DIDURL;
    //@JsonProperty({ value: DIDDocumentPublicKey.TYPE })
    ////@JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyTypeFilter})
    //@JsonClassType({type: () => [String]})
    public type: string;
    //@JsonProperty({ value: DIDDocumentPublicKey.CONTROLLER })
    //@JsonInclude({value: JsonIncludeType.CUSTOM, valueFilter: keyControllerFilter})
    //@JsonClassType({type: () => [DID]})
    public controller: DID;
    //@JsonProperty({ value: DIDDocumentPublicKey.PUBLICKEY_BASE58 })
    public publicKeyBase58: string;
    //@JsonIgnore()
    private authenticationKey: boolean;
    //@JsonIgnore()
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
    constructor(id: DIDURL,
        type: string,
        controller: DID,
        publicKeyBase58: string) {
        this.id = id;
        this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
        this.controller = controller;
        this.publicKeyBase58 = publicKeyBase58;
    }

    public static createFromValues(fieldValues: Map<string, any>): DIDDocumentPublicKey {
        let newInstance = new DIDDocumentPublicKey(
            fieldValues[DIDDocumentPublicKey.ID],
            fieldValues[DIDDocumentPublicKey.TYPE],
            fieldValues[DIDDocumentPublicKey.CONTROLLER],
            fieldValues[DIDDocumentPublicKey.PUBLICKEY_BASE58]
        );

        return newInstance;
    }

    public getAllValues(): Map<string, any> {
        return new Map<string, any>([
            [DIDDocumentPublicKey.ID, this.getId()],
            [DIDDocumentPublicKey.TYPE, this.getType()],
            [DIDDocumentPublicKey.CONTROLLER, this.getController()],
            [DIDDocumentPublicKey.PUBLICKEY_BASE58, this.getPublicKeyBase58()]
        ]);
    }

    public serialize(normalized = true): string {
        return GenericSerializer.serialize(normalized, this, DIDDocumentPublicKey.FIELDSMAP);
    }

    public static deserialize(json: string): DIDDocumentPublicKey {
        return GenericSerializer.deserialize(json, DIDDocumentPublicKey, DIDDocumentPublicKey.FIELDSMAP);
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
