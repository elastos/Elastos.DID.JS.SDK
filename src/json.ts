/**
 * Core type that represents a JSON object.
 */
export interface Json {
    [x: string]: string|number|boolean|Date|Json|JsonArray;
}

interface JsonArray extends Array<string|number|boolean|Date|Json|JsonArray> { }