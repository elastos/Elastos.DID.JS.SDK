import { DID, DIDURL } from "./internals";
import { DIDEntity } from "./internals";
import type { DIDObject } from "./internals";
import type { JSONObject, JSONValue } from "./json";
import { sortJSONObject } from "./json";
import type { Comparable } from "./comparable";

/**
 * A Service may represent any type of service the subject
 * wishes to advertise, including decentralized identity management services
 * for further discovery, authentication, authorization, or interaction.
 */
export class DIDDocumentService extends DIDEntity<DIDDocumentService> implements DIDObject<string>, Comparable<DIDDocumentService> {
    public id: DIDURL;
    public type: string;
    public serviceEndpoint: string;
    private properties: JSONObject;

    /**
     * Constructs Service with the given value.
     *
     * @param id the id for Service
     * @param type the type of Service
     * @param endpoint the address of service point
     */
    constructor(id: DIDURL = null, type: string = null,
            serviceEndpoint: string = null, properties?: JSONObject) {
        super();
        this.id = id;
        this.type = type;
        this.serviceEndpoint = serviceEndpoint;
        this.properties = properties ? sortJSONObject(properties) : {};

        if (Object.keys(this.properties).length > 0) {
            delete this.properties["id"];
            delete this.properties["type"];
            delete this.properties["serviceEndpoint"];
        }
    }

    /**
     * Get the service id.
     *
     * @return the identifier
     */
    public getId(): DIDURL {
        return this.id;
    }

    /**
     * Get the service type.
     *
     * @return the type string
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get service point string.
     *
     * @return the service point string
     */
    public getServiceEndpoint(): string {
        return this.serviceEndpoint;
    }

    public getProperties(): JSONObject {
        return Object.keys(this.properties).length > 0 ? this.properties : null;
    }

    public equals(ref: DIDDocumentService): boolean {
        if (this == ref)
            return true;

        return (this.getId().equals(ref.getId()) &&
            this.getType() === ref.getType() &&
            this.getServiceEndpoint() === ref.getServiceEndpoint())
    }

    public compareTo(svc: DIDDocumentService): number {
        let rc: number = this.id.compareTo(svc.id);

        if (rc != 0)
            return rc;
        else
            rc = this.type.localeCompare(svc.type);

        if (rc != 0)
            return rc;
        else
            return this.serviceEndpoint.localeCompare(svc.serviceEndpoint);
    }

    public toJSON(key: string = null): JSONObject {
        let context: DID = key ? new DID(key) : null;

        let json: JSONObject = {};
        json.id = this.id.toString(context);
        json.type = this.type;
        json.serviceEndpoint = this.serviceEndpoint;

        return {...json, ...this.properties};
    }

    protected fromJSON(json: JSONObject, context: DID = null): void {
        this.id = this.getDidUrl("service.id", json.id,
                {mandatory: true, nullable: false, context: context});
        this.type = this.getString("service.type", json.type,
                {mandatory: true, nullable: false});
        this.serviceEndpoint = this.getString("service.serviceEndpoint", json.serviceEndpoint,
                {mandatory: true, nullable: false});

        if (Object.keys(json).length > 3) {
            this.properties = sortJSONObject(json);
            delete this.properties["id"];
            delete this.properties["type"];
            delete this.properties["serviceEndpoint"];
        }
    }
}
