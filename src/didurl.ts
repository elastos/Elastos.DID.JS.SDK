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
	ParentException,
	MalformedDIDURLException,
	IllegalArgumentException
} from "./exceptions/exceptions";
import {
	checkArgument,
	checkNotNull,
	hashCode
} from "./internals";
import type {
	JsonStringifierTransformerContext,
	JsonParserTransformerContext
} from "jackson-js/dist/@types";
import {
	JsonSerialize,
    JsonDeserialize,
} from "jackson-js";
import type { Hashable } from "./hashable";
import type { Comparable } from "./comparable";
import {
    Serializer,
    Deserializer
} from "./internals";
import { DIDURLParser } from "./parser/DIDURLParser";

class URLSerializer extends Serializer {
	public static serialize(id: DIDURL, context: JsonStringifierTransformerContext): string {
		let base: DID = null;
		let serializeContext = URLSerializer.context(context);
		if (!serializeContext.isNormalized())
			base = serializeContext.getDid() != null ? serializeContext.getDid() : id.getDid();

		return id.toString(base);
	}
}

class URLDeserializer extends Deserializer {
	public static deserialize(value: any, context: JsonParserTransformerContext): DIDURL {
		try {
			return DIDURL.newWithUrl(value);
		} catch (e) {
			throw new ParentException("URLDeserializer deserialization exception", e);
		}
	}
}

/**
 * DID URL defines by the did-url rule, refers to a URL that begins with a DID
 * followed by one or more additional components.
 * <p>
 * A DID URL always identifies the resource to be located.
 * DIDURL includes DID and Url fragment by user defined.
 */
@JsonSerialize({using: URLSerializer.serialize})
@JsonDeserialize({using: URLDeserializer.deserialize})
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
	public constructor() {}

	public static newWithUrl(url: DIDURL | string): DIDURL {
		if (url && url instanceof DIDURL) {
			let newInstance = new DIDURL();
			let urlParameters = url.parameters;
			let urlQuery = url.query;
			newInstance.parameters = urlParameters.size == 0 ? new Map() : new Map(urlParameters);
			newInstance.query = urlQuery.size == 0 ? new Map() : new Map(urlQuery);
			newInstance.did =  url.did;
			newInstance.path = url.path;
			newInstance.fragment = url.fragment;
			return newInstance;
		}
		return DIDURL.newWithDID(null, url as string)
	}

	public static newWithDID(did: DID, url?: DIDURL | string) {
		let newInstance: DIDURL = new DIDURL();

		if (did && !url){
			newInstance.did = did;
		} else {
			if (url instanceof DIDURL) {
				newInstance.did = !url.did || url.did == null ? did : url.did;
				newInstance.parameters = url.parameters;
				newInstance.path = url.path;
				newInstance.query = url.query;
				newInstance.fragment = url.fragment;
				newInstance.metadata = url.metadata;
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
					if (!urlParsed.did.isEmpty)	newInstance.setDid(new DID(urlParsed.did.value));
					newInstance.setFragment(urlParsed.fragment);
					newInstance.setPath(urlParsed.path);
					newInstance.setParameters(urlParsed.params);
					newInstance.setQuery(urlParsed.query);


					if (!newInstance.parameters)
						newInstance.parameters = new Map();

					if (!newInstance)
						newInstance.query = new Map();

				} catch (e) {
					throw new MalformedDIDURLException(url, e);
				}

				if ((!newInstance.did || newInstance.did == null) && did)
					newInstance.did = did;
			}
		}


		return newInstance;
	}

	// Deep-copy constructor
	/* private clone(url: DIDURL): DIDURL {
		let newInstance = new DIDURL();
		newInstance.did = url.did;
		newInstance.parameters = !url.parameters ? new Map() :
				new Map<String, String>(url.parameters);
		newInstance.path = url.path;
		newInstance.query = !url.query ? new Map() :
				new Map<String, String>(url.query);
		newInstance.fragment = url.fragment;

		return newInstance;
	} */

	public static valueOf(inputBaseRefOrUrl: DID | string | null, url?: DIDURL | string): DIDURL {
		if (!url) {
			if (typeof inputBaseRefOrUrl === "string")
				return inputBaseRefOrUrl ? DIDURL.newWithUrl(inputBaseRefOrUrl) : null;
			else if (inputBaseRefOrUrl instanceof DID)
				return DIDURL.newWithDID(inputBaseRefOrUrl);
			else
				throw new IllegalArgumentException("DID is mandatory without an URL");
		}
		let baseRef: DID = typeof inputBaseRefOrUrl === "string" ? DID.from(inputBaseRefOrUrl) : inputBaseRefOrUrl as DID;
		return url ? DIDURL.newWithDID(baseRef, url) : null;
	}

	// Note: in java this was also a valueOf().
	public static valueOfUrl(url: string): DIDURL {
		return (url == null || url !== "") ? null : DIDURL.valueOf(null, url);
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

		return this.toString().localeCompare(id.toString());
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
				didUrl = DIDURL.valueOf(didOrDidUrl);
			}
			else if (typeof didOrDidUrl === "string") {
				didUrl = DIDURL.valueOfUrl(didOrDidUrl);
			}
			else {
				didUrl = didOrDidUrl as DIDURL;
			}

			this.url = DIDURL.valueOf(didUrl.getDid());
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
			return DIDURL.valueOf(null, this.url);
		}
	}
}