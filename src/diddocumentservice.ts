import {
    JsonClassType,
    JsonProperty,
    JsonPropertyOrder,
    JsonAnySetter
} from "jackson-js";
import { DIDURL } from "./internals";
import { DIDObject } from "./internals";
import {
    Map as ImmutableMap
} from "immutable";
import { JSONObject, JSONValue } from "./json";

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
    private static ID: string = "id";
    private static TYPE: string = "type";
    private static SERVICE_ENDPOINT: string = "serviceEndpoint";
    
    @JsonProperty({ value: DIDDocumentService.ID })
    @JsonClassType({type: () => [DIDURL]})
    private id: DIDURL;
    @JsonProperty({ value: DIDDocumentService.TYPE }) @JsonClassType({ type: () => [String] })
    private type: string;
    @JsonProperty({ value: DIDDocumentService.SERVICE_ENDPOINT }) @JsonClassType({ type: () => [String] })
    private endpoint: string;
    private properties: JSONObject;

    /**
     * Constructs Service with the given value.
     *
     * @param id the id for Service
     * @param type the type of Service
     * @param endpoint the address of service point
     */
    constructor(@JsonProperty({ value: DIDDocumentService.ID, required: true }) id: DIDURL,
        @JsonProperty({ value: DIDDocumentService.TYPE, required: true }) type: string,
        @JsonProperty({ value: DIDDocumentService.SERVICE_ENDPOINT, required: true }) endpoint: string,
        properties?: JSONObject) {
        this.id = id;
        this.type = type;
        this.endpoint = endpoint;
        this.properties = properties ? properties : {};

        if (properties.size > 0) {
            delete this.properties[DIDDocumentService.ID];
            delete this.properties[DIDDocumentService.TYPE];
            delete this.properties[DIDDocumentService.SERVICE_ENDPOINT];
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

    public getProperties(): ImmutableMap<string, JSONValue> { // TODO: JSONObject instead of immutablemap?
        // TODO: make it unmodifiable recursively
        return ImmutableMap(this.properties != null ? this.properties : {});
    }
}
