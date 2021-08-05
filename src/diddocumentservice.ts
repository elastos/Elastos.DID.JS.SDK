/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {
    JsonClassType,
    JsonProperty,
    JsonPropertyOrder,
    JsonAnySetter,
    JsonCreator,
    JsonIgnore,
    JsonAnyGetter
} from "@elastosfoundation/jackson-js";
import { DIDURL } from "./internals";
import type { DIDObject } from "./internals";
import type { JSONObject, JSONValue } from "./json";
import { sortJSONObject } from "./json";
import type { Comparable } from "./comparable";

/**
 * A Service may represent any type of service the subject
 * wishes to advertise, including decentralized identity management services
 * for further discovery, authentication, authorization, or interaction.
 */
@JsonPropertyOrder({value: ["id", "type", "endpoint"]})
export class DIDDocumentService implements DIDObject<string>, Comparable<DIDDocumentService> {
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

    @JsonIgnore()
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

        if (Object.keys(this.properties).length > 0) {
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
    @JsonAnyGetter()
    @JsonClassType({type: () => [String, Object]})
    //@JsonPropertyOrder({ alphabetic: true })
    private getAllProperties(): JSONObject {
        return sortJSONObject(this.properties);
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
            return this.endpoint.localeCompare(svc.endpoint);
    }
}
