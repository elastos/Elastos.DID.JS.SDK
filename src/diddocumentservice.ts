import {
    JsonClassType,
    JsonProperty,
    JsonPropertyOrder,
    JsonAnySetter,
    JsonCreator
} from "jackson-js";
import { DIDURL } from "./internals";
import type { DIDObject } from "./internals";
import type { JSONObject, JSONValue } from "./json";

/**
 * A Service may represent any type of service the subject
 * wishes to advertise, including decentralized identity management services
 * for further discovery, authentication, authorization, or interaction.
 */
@JsonPropertyOrder({
    value: [
        DIDDocumentService.ID, DIDDocumentService.TYPE, DIDDocumentService.SERVICE_ENDPOINT
    ]
})
export class DIDDocumentService implements DIDObject<string> {
    private static ID = "id";
    private static TYPE = "type";
    private static SERVICE_ENDPOINT = "serviceEndpoint";

    @JsonProperty({ value: DIDDocumentService.ID })
    @JsonClassType({type: () => [DIDURL]})
    public id: DIDURL;
    @JsonProperty({ value: DIDDocumentService.TYPE })
    @JsonClassType({ type: () => [String] })
    public type: string;
    @JsonProperty({ value: DIDDocumentService.SERVICE_ENDPOINT })
    @JsonClassType({ type: () => [String] })
    public endpoint: string;

    private properties: JSONObject;

    /**
     * Constructs Service with the given value.
     *
     * @param id the id for Service
     * @param type the type of Service
     * @param endpoint the address of service point
     */
    constructor(id?: DIDURL, type?: string, endpoint?: string, properties?: JSONObject) {
        this.id = id;
        this.type = type;
        this.endpoint = endpoint;
        this.properties = properties ? properties : {};

        if (this.properties.size > 0) {
            delete this.properties[DIDDocumentService.ID];
            delete this.properties[DIDDocumentService.TYPE];
            delete this.properties[DIDDocumentService.SERVICE_ENDPOINT];
        }
    }

    @JsonCreator()
    public static jacksonCreator() {
        return new DIDDocumentService();
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
        return this.endpoint;
    }

    /**
     * Helper getter method for properties serialization.
     * NOTICE: Should keep the alphabetic serialization order.
     *
     * @return a String to object map include all application defined
     *         properties
     */
    @JsonPropertyOrder({ alphabetic: true })
    private _getProperties(): JSONObject {
        return this.properties;
    }

    /**
     * Helper setter method for properties deserialization.
     *
     * @param name the property name
     * @param value the property value
     */
    @JsonAnySetter()
    private setProperty(name: string, value: JSONValue) {
        if (name === DIDDocumentService.ID || name === DIDDocumentService.TYPE || name === DIDDocumentService.SERVICE_ENDPOINT)
            return;

        if (this.properties == null)
            this.properties = {};

        this.properties[name] = value;
    }

    public getProperties(): JSONObject {
        return this.properties != null ? this.properties : {};
    }
}
