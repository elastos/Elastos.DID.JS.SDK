/**
 * Core type that represents a JSON object.
 */
export interface JSONObject {
    [x: string]: JSONValue;
}

export type JSONValue = string|number|boolean|JSONObject|JSONArray;

export interface JSONArray extends Array<string|number|boolean|JSONObject|JSONArray> { }

export function sortJSONObject(obj: JSONObject): JSONObject {
    let keys = Object.keys(obj);
    let sortedKeys = keys.sort((key1, key2) => {
        // return key1.localeCompare(key2, "en", {sensitivity: 'variant', caseFirst: "upper"});
        if (key1 < key2) return -1;
        if (key1 > key2) return 1;
        return 0;
    });

    let sortedObj: JSONObject = {};

    for(var index in keys){
        let key = keys[index];
        let value = obj[key];
        if (value instanceof Map) {
            sortedObj[key] = sortJSONObject(value as JSONObject);
        } else {
            sortedObj[key] = value;
        }
    }

    return sortedObj;
}
