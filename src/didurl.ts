/*
 * Copyright (c) 2019 Elastos Foundation
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

import type { AbstractMetadata } from "./internals";
import { DID } from "./internals";
import {
    DIDURLParser,
    checkArgument,
    checkNotNull,
    hashCode,
} from "./internals";
import type { Hashable } from "./hashable";
import type { Comparable } from "./comparable";
import { MalformedDIDURLException } from "./exceptions/exceptions";

/**
 * DID URL defines by the did-url rule, refers to a URL that begins with a DID
 * followed by one or more additional components.
 * <p>
 * A DID URL always identifies the resource to be located.
 * DIDURL includes DID and Url fragment by user defined.
 */
export class DIDURL implements Hashable, Comparable<DIDURL> {
    //private static SEPS = ":;/?#";
    private static SEPS = [':', ';', '/', '?', '#'];

    private did?: DID;
    private parameters: Map<string, string> = new Map();
    private path = "";
    private query: Map<string, string> = new Map();
    private fragment = "";
    private metadata?: AbstractMetadata;

    // Note: needs to be public to be able to use DIDURL as a constructable json type in other classes
    public constructor(url?: DIDURL | string, baseRef?: DID) {
        if (url) {
            if(url instanceof DIDURL) {
                this.did = (!url.did && baseRef) ? baseRef : url.did;
                this.parameters = url.parameters;
                this.path = url.path;
                this.query = url.query;
                this.fragment = url.fragment;
                this.metadata = url.metadata;
            } else {
                // Compatible with v1, support fragment without leading '#'
                if (!url.startsWith("did:")) {
                    let noSep = true;
                    let chars: string[] = url.split("");
                    for (let ch of chars) {
                        if (DIDURL.SEPS.indexOf(ch) >= 0) {
                            noSep = false;
                            break;
                        }
                    }

                    if (noSep) // fragment only
                        url = "#" + url;
                }

                try {
                    let urlParsed = DIDURLParser.newFromURL(url);

                    if (urlParsed.did.isEmpty)
                        this.did = baseRef ? baseRef : null;
                    else
                        this.did = new DID(urlParsed.did.method, urlParsed.did.methodSpecificId);

                    this.parameters = urlParsed.params;
                    this.path = urlParsed.path;
                    this.query = urlParsed.query;
                    this.fragment = urlParsed.fragment;
                } catch (e) {
                    throw new MalformedDIDURLException(url, e);
                }
            }
        } else {
            if (baseRef)
                this.did = baseRef;
        }
    }

    public static fromDID(did: DID): DIDURL {
        return new DIDURL(null, did);
    }

    public static from(url: DIDURL | string, baseRef?: DID | string): DIDURL | null {
        if (!url)
            return null;

        let base = baseRef ? DID.from(baseRef) : null;

        if (url instanceof DIDURL)
            return base ? new DIDURL(url, base) : url;
        else
            return new DIDURL(url, base);
    }

    // Deep-copy constructor
    public static clone(url: DIDURL): DIDURL {
        let newInstance = new DIDURL();
        newInstance.did = url.did;
        newInstance.parameters = !url.parameters ? new Map() :
                new Map<string, string>(url.parameters);
        newInstance.path = url.path;
        newInstance.query = !url.query ? new Map() :
                new Map<string, string>(url.query);
        newInstance.fragment = url.fragment;

        return newInstance;
    }

    /**
     * Get owner of DIDURL.
     *
     * @return the DID object
     */
    public getDid(): DID {
        return this.did;
    }

    /**
     * Set DID to DIDURL.
     *
     * @param did the DID Object
     */
    public setDid(did: DID) {
        this.did = did;
    }

    private mapToString(map: Map<string, string>, sep: string): string {
        let init = true;

        let str = "";
        map.forEach((value, key)=> {
            if (init)
                init = false;
            else
                str += sep;

            str += key;
            if (value != null)
                str += "=" + value;
        });
        return str;
    }

    /**
     * Get all parameters.
     *
     * @return the parameters string
     */
    public getParametersString(): string | null {
        if (this.parameters.size == 0)
            return null;

        return this.mapToString(this.parameters, ";");
    }

    public getParameters(): Map<string, string> {
        return this.parameters;
    }

    public setParameters(parameters: Map<string, string>): void {
        this.parameters = new Map(parameters);
    }

    /**
     * Get the parameter according to the given name.
     *
     * @param name the name string
     * @return the parameter string
     */
    public getParameter(name: string): string | undefined {
        checkArgument(name != null && name !== "", "Invalid parameter name");
        return this.parameters.get(name);
    }

    /**
     * Judge whether there is 'name' parameter in DIDStorage.
     *
     * @param name the key of parameter
     * @return the returned value is true if there is 'name' parameter;
     *         the returned value is true if there is no 'name' parameter.
     */
    public hasParameter(name: string): boolean {
        checkArgument(name != null && name !== "", "Invalid parameter name");
        return this.parameters.has(name);
    }

    /**
     * Get the path of DIDURL.
     *
     * @return the path string
     */
    public getPath(): string {
        return this.path;
    }

    public setPath(path: string): void {

        this.path = path;
    }

    /**
     * Get query of DIDURL.
     *
     * @return the query string
     */
    public getQueryString(): string | null {
        if (this.query.size == 0)
            return null;

        return this.mapToString(this.query, "&");
    }

    public getQuery(): Map<string, string> {
        return this.query;
    }

    public setQuery(query: Map<string, string>): void {
        this.query = new Map(query);
    }

    /**
     * Get 'name' query parameter.
     *
     * @param name the name string
     * @return the value string
     */
    public getQueryParameter(name: string): string | undefined {
        checkArgument(name != null && name !== "", "Invalid parameter name");
        return this.query.get(name);
    }

    /**
     * Judge whether there is 'name' parameter
     *
     * @param name the name string
     * @return the returned value is true if there is 'name' parameter;
     *         the returned value is true if there is no 'name' parameter.
     */
    public hasQueryParameter(name: string): boolean {
        checkArgument(name != null && name != "", "Invalid parameter name");
        return this.query.has(name);
    }

    /**
     * Get fragment string of DIDURL.
     *
     * @return the fragment string
     */
    public getFragment(): string {
        return this.fragment;
    }

    public setFragment(fragment: string): void {
        this.fragment = fragment;
    }

    /**
     * Set meta data for Credential.
     *
     * @param metadata the meta data
     */
    public setMetadata(metadata: AbstractMetadata) {
        this.metadata = metadata;
    }

    /**
     * Get meta data from Credential.
     *
     * @return the meta data
     */
    public getMetadata(): AbstractMetadata | null {
        return this.metadata;
    }

    public toJSON(key: string = null): string {
        let base: DID = null;
        if (key)
            base = new DID(key);

        return this.toString(base);
    }

    public toString(base: DID = null): string {
        let output = "";
        if (this.did != null && (base == null || !this.did.equals(base)))
            output += this.did;

        if (this.parameters != null && this.parameters.size != 0)
            output += ";" + this.getParametersString();

        if (this.path !== null && this.path !== "")
            output += this.path;

        if (this.query != null && this.query.size != 0)
            output += "?" + this.getQueryString();

        if (this.fragment != null && this.fragment !== "")
            output += "#" + this.getFragment();

        return output;
    }

    public equals(obj: unknown): boolean {
        if (obj == this)
            return true;

        if (obj instanceof DIDURL) {
            let id = obj as DIDURL;
            return this.toString() === id.toString();
        }

        if (typeof obj === "string") {
            let url = obj as string;
            return this.toString() === url;
        }

        return false;
    }

    public compareTo(id: DIDURL): number {
        checkNotNull(id, "id is null");

        let strcmp = (s1: string, s2: string) => {
            if (s1 < s2) return -1;
            if (s1 > s2) return 1;
            return 0;
        };

        return strcmp(this.toString(), id.toString());
    }

    private mapHashCode(map: Map<string, string>): number {
        let hash = 0;

        for (let entry of map.entries()) {
            hash += hashCode(entry[0]); // key
            if (entry[1] != null) // value
                hash += hashCode(entry[1]);
        }

        return hash;
    }

    public hashCode(): number {
        let hash = this.did.hashCode();
        hash += this.mapHashCode(this.parameters);
        hash += this.path == null ? 0 : hashCode(this.path);
        hash += this.mapHashCode(this.query);
        hash += this.fragment == null ? 0 : hashCode(this.fragment);

        return hash;
    }
}

export namespace DIDURL {
    export class Builder {
        private url: DIDURL;

        public constructor(didOrDidUrl: DIDURL | DID | string) {
            let didUrl: DIDURL;
            if (didOrDidUrl instanceof DID) {
                didUrl = DIDURL.fromDID(didOrDidUrl as DID);
            }
            else if (typeof didOrDidUrl === "string") {
                didUrl = DIDURL.from(didOrDidUrl);
            }
            else {
                didUrl = didOrDidUrl as DIDURL;
            }

            this.url = new DIDURL();
            this.url.setDid(didUrl.getDid());
            this.url.setParameters(didUrl.getParameters());
            this.url.setPath(didUrl.getPath());
            this.url.setQuery(didUrl.getQuery());
            this.url.setFragment(didUrl.getFragment());
        }

        public setDid(didOrString: DID | string): Builder {
            checkArgument(didOrString != null, "Invalid did");

            if (didOrString instanceof DID)
                this.url.setDid(didOrString);
            else
                this.url.setDid(DID.from(didOrString));
            return this;
        }

        public clearDid(): Builder {
            this.url.setDid(null);
            return this;
        }

        public setParameter(name: string, value: string): Builder {
            checkArgument(name != null && name !== "", "Invalid parameter name");

            this.url.getParameters().set(name, value);
            return this;
        }

        public setParameters(params: Map<string, string>): Builder {
            this.url.getParameters().clear();

            if (params != null && params.size > 0)
            params.forEach((v,k)=> this.url.getParameters().set(k, v));

            return this;
        }

        public removeParameter(name: string): Builder {
            checkArgument(name != null && name !== "", "Invalid parameter name");

            this.url.getParameters().delete(name);

            return this;
        }

        public clearParameters(): Builder {
            this.url.getParameters().clear();
            return this;
        }

        public setPath(path: string): Builder {
            this.url.setPath(path);
            return this;
        }

        public clearPath(): Builder {
            this.url.setPath("");
            return this;
        }

        public setQueryParameter(name: string, value: string): Builder {
            checkArgument(name != null && name !== "", "Invalid parameter name");

            this.url.getQuery().set(name, value);
            return this;
        }

        public setQueryParameters(params: Map<string, string>): Builder {
            this.url.getQuery().clear();

            if (params != null && params.size > 0)
                params.forEach((v,k)=> this.url.getQuery().set(k, v));

            return this;
        }

        public removeQueryParameter(name: string): Builder {
            checkArgument(name != null && name !== "", "Invalid parameter name");

            this.url.getQuery().delete(name);
            return this;
        }

        public clearQueryParameters(): Builder {
            this.url.getQuery().clear();
            return this;
        }

        public setFragment(fragment: string): Builder {
            this.url.setFragment(fragment);
            return this;
        }

        public clearFragment(): Builder {
            this.url.setFragment("");
            return this;
        }

        public build(): DIDURL {
            return DIDURL.clone(this.url);
        }
    }
}
