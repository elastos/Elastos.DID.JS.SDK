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

    private did : DID = null;
    private path = null;
    private query: Map<string, string>;
    private fragment = null;
    private metadata?: AbstractMetadata;
    private queryString : string;
    private repr : string;

    private parser = new class {
        constructor(public superThis: DIDURL) {
        }

        public isHexChar(ch : string) : boolean {
            return ((ch >= 'A' && ch <= 'F') || (ch >= 'a' && ch <= 'f') ||
                    (ch >= '0' && ch <= '9'));
        }

        public isTokenChar(ch : string, start : boolean) : boolean {
            if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') ||
                    (ch >= '0' && ch <= '9'))
                return true;

            if (start)
                return false;
            else
                return (ch  == '.' || ch == '_' || ch == '-');
        }

        public scanNextPart(url : string, start : number, limit : number,
                partSeps : string, tokenSeps : string) : number {
            let nextPart = limit;
            let tokenStart = true;

            for (let i = start; i < limit; i++) {
                let ch = url.charAt(i);

                if (partSeps != null && partSeps.indexOf(ch) >= 0) {
                    nextPart = i;
                    break;
                }

                if (tokenSeps != null && tokenSeps.indexOf(ch) >= 0) {
                    if (tokenStart)
                        throw new MalformedDIDURLException("Invalid char at: " + i);

                    tokenStart = true;
                    continue;
                }

                if (this.isTokenChar(ch, tokenStart)) {
                    tokenStart = false;
                    continue;
                }

                if (ch == '%') {
                    if (i + 2 >= limit)
                        throw new MalformedDIDURLException("Invalid char at: " + i);

                    let seq = url.charAt(++i);
                    if (!this.isHexChar(seq))
                        throw new MalformedDIDURLException("Invalid hex char at: " + i);

                    seq = url.charAt(++i);
                    if (!this.isHexChar(seq))
                        throw new MalformedDIDURLException("Invalid hex char at: " + i);

                    tokenStart = false;
                    continue;
                }

                throw new MalformedDIDURLException("Invalid char at: " + i);
            }

            return nextPart;
        }

        public parse(context : DID, url : string) : void {
            if (context == undefined)
                context = null;

            this.superThis.did = context;

            if (url == null)
                throw new MalformedDIDURLException("Null DIDURL string");

            let start = 0;
            let limit = url.length;
            let nextPart;

            // trim the leading and trailing spaces
            while ((limit > 0) && (url.charAt(limit - 1) <= ' '))
                limit--;		//eliminate trailing whitespace

            while ((start < limit) && (url.charAt(start) <= ' '))
                start++;		// eliminate leading whitespace

            if (start == limit) // empty url string
                throw new MalformedDIDURLException("Empty DIDURL string");

            let pos = start;

            // DID
            if (pos < limit && url.substring(pos, pos + 4) == "did:") {
                nextPart = this.scanNextPart(url, pos, limit, "/?#", ":");
                try {
                    this.superThis.did = DID.createFrom(url.toString(), pos, nextPart);
                } catch (e) {
                    throw new MalformedDIDURLException("Invalid did at: " + pos, e);
                }

                pos = nextPart;
            }

            // path
            if (pos < limit && url.charAt(pos) == '/') {
                nextPart = this.scanNextPart(url, pos + 1, limit, "?#", "/");
                this.superThis.path = url.substring(pos, nextPart);
                pos = nextPart;
            }

            // query
            if (pos < limit && url.charAt(pos) == '?') {
                nextPart = this.scanNextPart(url, pos + 1, limit, "#", "&=");
                let queryString = url.substring(pos + 1, nextPart);
                pos = nextPart;

                if (queryString != "") {
                    let query = new Map<string, string>();

                    let pairs = queryString.split("&");
                    for (let pair of pairs) {
                        let parts = pair.split("=");
                        if (parts.length > 0 && parts[0] != "") {
                            let name = parts[0];
                            let value = parts.length == 2 ? parts[1] : null;
                            query.set(name, value);
                        }
                    }

                    this.superThis.query = query;
                }
            } else {
                this.superThis.query = new Map();
            }

            // fragment
            // condition: pos == start
            //	Compatible with v1, support fragment without leading '#'
            if ((pos < limit && url.charAt(pos) == '#') || (pos == start)) {
                if (url.charAt(pos) == '#')
                    pos++;

                nextPart = this.scanNextPart(url, pos, limit, "", null);
                let fragment = url.substring(pos, nextPart);
                if (fragment != "")
                    this.superThis.fragment = fragment;
            }
        }

    } (this);

    // Note: needs to be public to be able to use DIDURL as a constructable json type in other classes
    public constructor(url?: DIDURL | string, context?: DID) {
        checkArgument(!!url || !!context, "Invalid context and url");

        if (!url) {
            this.did = context;
            this.query = new Map();
            return this;
        }

        if (typeof url === 'string') {
            this.parser.parse(context, url);
        } else {
            if (url.did != null)
                this.did = url.did;
            this.path = url.path;
            this.query = url.query;
            this.queryString = url.queryString;
            this.fragment = url.fragment;
            this.repr = url.repr;
            this.metadata = url.metadata;
        }
    }

    public static fromDID(did: DID): DIDURL {
        return new DIDURL(null, did);
    }

    public static from(url: DIDURL | string, context?: DID | string): DIDURL | null {
        if (!url)
             return null;

        let base : DID;
        if (context == null) {
            base = null;
        } else {
            base = typeof context === "string" ? DID.from(context) : context;
        }

        return typeof url === "string" ? new DIDURL(url, base) : (base ? new DIDURL(url, base) : url);
    }

    // Deep-copy constructor
    public clone(readonly : boolean): DIDURL {
        let newInstance = DIDURL.fromDID(this.did);
        newInstance.path = this.path;
        newInstance.query = (this.query.size == 0 && readonly)  ? new Map() :
                new Map<string, string>(this.query);

        newInstance.queryString = this.queryString;
        newInstance.fragment = this.fragment;
        newInstance.repr = this.repr;

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

        if (this.queryString == null)
            this.queryString = this.mapToString(this.query, "&");

        return this.queryString;
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
        let value = this.query.get(name);
        return value == undefined ? null : value;
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

    /**
     * Check if the DIDURL object is full qualified.
     *
     * @return true if the DIDURL is qualified, false otherwise
     */
    public isQualified() : boolean {
        return (this.did != null && this.fragment != null);
    }

    public toJSON(key: string = null): string {
        let base: DID = null;
        if (key)
            base = new DID(key);

        return this.toString(base);
    }

    public toString(context: DID = null): string {
        if (!context && this.repr)
            return this.repr;

        let result = "";
        if (this.did != null && (context == null || !this.did.equals(context)))
            result += this.did;

        if (this.path != null && this.path !== "")
            result += this.path;

        if (this.query != null && this.query.size != 0)
            result += "?" + this.getQueryString();

        if (this.fragment != null && this.fragment !== "")
            result += "#" + this.getFragment();

        if (!context)
            this.repr = result;

        return result;
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

    public hashCode(): number {
        return hashCode(this.toString());
    }
}

/* eslint-disable no-class-assign */
export namespace DIDURL {
    export class Builder {
        private url: DIDURL;

        public constructor(didOrDidUrl: DIDURL | DID) {
            if (didOrDidUrl instanceof DID) {
                this.url = DIDURL.fromDID(didOrDidUrl as DID);
            } else {
                this.url = didOrDidUrl.clone(false);
            }
        }

        public setDid(didOrString: DID | string): Builder {
            checkArgument(didOrString != null, "Invalid did");

            if (typeof didOrString === "string")
                this.url.setDid(DID.from(didOrString));
            else
                this.url.setDid(didOrString);

            return this;
        }

        public clearDid(): Builder {
            this.url.setDid(null);
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
            return this.url.clone(true);
        }
    }
}
