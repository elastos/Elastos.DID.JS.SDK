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

/**
 * Core type that represents a JSON object.
 */
export interface JSONObject {
    [x: string]: JSONValue;
}

export type JSONValue = string|number|boolean|JSONObject|JSONArray;

export interface JSONArray extends Array<string|number|boolean|JSONObject|JSONArray> { }

function sortJSONArray(value: JSONArray): JSONArray {
    if (!value || value.length == 0)
        return value;

    return Array.from(value, (v) => {
        if (value && typeof v === "object" && Object.keys(v).length > 0 && !Array.isArray(v))
            return sortJSONObject(v);
        else if (value && Array.isArray(v) && value.length > 0)
            return sortJSONArray(v);
        else
            return v;
    });
}

export function sortJSONObject(obj: JSONObject): JSONObject {
    let keys = Object.keys(obj);
    keys.sort((key1, key2) => {
        // return key1.localeCompare(key2, "en", {sensitivity: 'variant', caseFirst: "upper"});
        if (key1 < key2) return -1;
        if (key1 > key2) return 1;
        return 0;
    });

    let sortedObj: JSONObject = {};

    for(var index in keys){
        let key = keys[index];
        let value = obj[key];
        if (value && typeof value === "object" && Object.keys(value).length > 0 && !Array.isArray(value)) { // Objects with properties only.
            sortedObj[key] = sortJSONObject(value as JSONObject);
        } else if (value && Array.isArray(value) && value.length > 0) {
            sortedObj[key] = sortJSONArray(value);
        }else {
            sortedObj[key] = value;
        }
    }

    return sortedObj;
}