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

// This value holder for DID fields maybe avoid circular reference
export class DIDValues {
    constructor(readonly value: string, readonly method: string, readonly methodSpecificId: string) {
    }

    public get isEmpty() : boolean {
        return this.value === "" && this.method === "" && this.methodSpecificId === ""
    }

    public static CreateEmpty(): DIDValues{
        return new DIDValues("", "", "")
    }
}

export interface DIDURLValues{
    url: string;
    did: DIDValues;
    params: Map<string, string>;
    path: string;
    query: Map<string, string>;
    fragment: string;
}

export class DIDURLParser{

    public static newFromURL(url: string): DIDURLValues{

        return {
            url,
            did: this.extractDID(url),
            params: this.extractParams(url),
            path: this.extractPath(url),
            query: this.extractQuery(url),
            fragment: this.extractFragment(url)
        }
    }

    private static extractDID(url: string): DIDValues{
        let did = url;
        let match = url.match(/[?#/;]/g)

        if (match && match.length > 0) {
            let indexOf = url.indexOf(match[0])
            did = did.substring(0, indexOf)
        }

        if (did.length === 0) return DIDValues.CreateEmpty()

        if (!did.startsWith("did")){
            throw new Error("Invalid DID")
        }

        let didValues = did.split(":")

        if (!did.startsWith("did") || didValues.length !== 3){
            throw new Error("Invalid DID")
        }

        if (didValues[1].toLowerCase() !== "elastos"){
            throw new Error("Invalid DID method")
        }

        if (didValues[2].length <= 0){
            throw new Error("Invalid DID method")
        }

        return new DIDValues(did, didValues[1], didValues[2])
    }

    private static extractParams(url: string): Map<string, string>{
        let startIn = url.indexOf(";")
        if (startIn < 0) return new Map<string, string>();

        let parameters = url.substring(startIn + 1)

        let match = parameters.match(/[?#/]/g)
        if (match && match.length > 0) {
            parameters = parameters.substring(0, parameters.indexOf(match[0]))
        }

        let values = parameters.split(";")

        return this.generateMapValues(values)
    }

    private static extractPath(url: string): string{
        let startIn = url.indexOf("/")
        if (startIn < 0) return "";

        let path = url.substring(startIn)

        let match = path.match(/[?#]/g)
        if (match && match.length > 0) {
            path = path.substring(0, path.indexOf(match[0]))
        }

        return path
    }

    private static extractQuery(url: string): Map<string, string>{
        let startIn = url.indexOf("?")
        if (startIn < 0) return new Map<string, string>();

        let queryValues = url.substring(startIn + 1)

        let indexOf = queryValues.indexOf("#")
        if (indexOf >= 0) {
            queryValues = queryValues.substring(0, indexOf)
        }

        let values = queryValues.split("&")

        return this.generateMapValues(values)
    }

    private static generateMapValues(values: string[]): Map<string, string>{
        let response = new Map<string, string>();

        values.forEach(value => {
            if (value== null || value=="") throw new Error("Invalid DID Parameter or query")
            let splitValue = value.split("=")
            if (splitValue.length === 1){
                response.set(splitValue[0], null)
            } else {
                response.set(splitValue[0], splitValue[1])
            }
        });

        return response
    }

    private static extractFragment(url: string): string{

        let indexOf = url.indexOf("#")
        if (indexOf < 0) return "";

        return url.substring(indexOf + 1)
    }

}