import { Constants } from "./constants";
import { Base58 } from "./internals";
import { DID, DIDURL } from "./internals";
import { DIDEntity } from "./internals";
import { JSONObject } from "./json";
import type { DIDObject } from "./internals";
import type { Comparable } from "./comparable";

/**
 * Publickey is used for digital signatures, encryption and
 * other cryptographic operations, which are the basis for purposes such as
 * authentication or establishing secure communication with service endpoints.
 */
export class DIDDocumentPublicKey extends DIDEntity<DIDDocumentPublicKey>
        implements DIDObject<string>, Comparable<DIDDocumentPublicKey> {
    public id: DIDURL;
    public type: string;
    public controller: DID;
    public publicKeyBase58: string;
    //private authenticationKey: boolean;
    //private authorizationKey: boolean;

    /**
     * Constructs Publickey with the given value.
     *
     * @param id the Id for PublicKey
     * @param type the type string of PublicKey, default type is "ECDSAsecp256r1"
     * @param controller the DID who holds private key
     * @param publicKeyBase58 the string from encoded base58 of public key
     */
    constructor(id: DIDURL = null, controller: DID = null, publicKeyBase58: string = null,
            type: string = Constants.DEFAULT_PUBLICKEY_TYPE) {
        super();
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

    public toJSON(key: string = null): JSONObject {
        let context: DID = key ? new DID(key) : null;

        let json: JSONObject = {};
        json.id = this.id.toString(context);
        if (!context || this.type !== Constants.DEFAULT_PUBLICKEY_TYPE)
            json.type = this.type;
        if (!context || !this.controller.equals(context))
            json.controller = this.controller.toString();
        json.publicKeyBase58 = this.publicKeyBase58;

        return json;
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        this.id = this.getDidUrl("publicKey.id", json.id,
                {mandatory: true, nullable: false, context: context});
        this.type = this.getString("publicKey.type", json.type,
                {mandatory: false, defaultValue: Constants.DEFAULT_PUBLICKEY_TYPE});
        this.controller = this.getDid("publicKey.controller", json.controller,
                {mandatory: false, nullable: false, defaultValue: context});
        this.publicKeyBase58 = this.getString("publicKey.publicKeyBase58", json.publicKeyBase58,
                {mandatory: true, nullable: false});
    }
}
