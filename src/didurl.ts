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

import { AbstractMetadata } from "./abstractmetadata";
import { DID } from "./did";
import { ParentException, MalformedDIDURLException } from "./exceptions/exceptions";
import { ParserHelper } from "./parser/parserhelper";
import { checkArgument, checkNotNull } from "./utils";
import { DIDURLBaseListener } from "./parser/DIDURLBaseListener";
import { DIDURLParser } from "./parser/DIDURLParser";
import { JsonStringifier } from "jackson-js";
import { JsonStringifierContext } from "jackson-js/dist/@types"
/**
 * DID URL defines by the did-url rule, refers to a URL that begins with a DID
 * followed by one or more additional components.
 * <p>
 * A DID URL always identifies the resource to be located.
 * DIDURL includes DID and Url fragment by user defined.
 */
//@JsonSerialize(using = DIDURL.Serializer.class)
//@JsonDeserialize(using = DIDURL.Deserializer.class)
export class DIDURL /* implements Comparable<DIDURL> */ {
	//private static SEPS = ":;/?#";
	private static SEPS = [':', ';', '/', '?', '#'];

	private did?: DID;
	private parameters: Map<string, string> = new Map();
	private path: string = "";
	private query: Map<string, string> = new Map();
	private fragment: string = "";
	private metadata?: AbstractMetadata;

	private constructor() {
		//super();
	}

	public static newWithDID(did: DID): DIDURL {
		let newInstance: DIDURL = new DIDURL();
		newInstance.did = did;

		return newInstance;
	}

	public static newWithUrl(url: string): DIDURL {
		return DIDURL.newWithBaseRef(url);
	}

	public static newWithBaseRef(url: DIDURL | string, baseRef?: DID) {
		let newInstance: DIDURL = new DIDURL();

		if (url instanceof DIDURL) {
			newInstance.did = url.did == null ? baseRef : url.did;
			newInstance.parameters = url.parameters;
			newInstance.path = url.path;
			newInstance.query = url.query;
			newInstance.fragment = url.fragment;
			newInstance.metadata = url.metadata;
		} else {
			// Compatible with v1, support fragment without leading '#'
			if (!url.startsWith("did:")) {
				let noSep: boolean = true;
				let chars: string[] = url.split("");
				for (var ch of chars) {
					if (DIDURL.SEPS.indexOf(ch) >= 0) {
						noSep = false;
						break;
					}
				}

				if (noSep) // fragment only
					url = "#" + url;
			}

			try {
				ParserHelper.parse(url, false, new DIDURL.Listener(newInstance));

				if (!newInstance.parameters)
					newInstance.parameters = new Map();

				if (!newInstance)
					newInstance.query = new Map();

			} catch (e) {
				throw new MalformedDIDURLException(url, e);
			}

			if (!newInstance.did && baseRef)
				newInstance.did = baseRef;
		}

		return newInstance;
	}

	// Deep-copy constructor
	private clone(url: DIDURL): DIDURL {
		let newInstance = new DIDURL();
		newInstance.did = url.did;
		newInstance.parameters = !url.parameters ? new Map() :
				new Map<String, String>(url.parameters);
		newInstance.path = url.path;
		newInstance.query = !url.query ? new Map() :
				new Map<String, String>(url.query);
		newInstance.fragment = url.fragment;

		return newInstance;
	}

	// Deep-copy constructor
	public static valueOf(baseRef: DID | string | null, didUrlOrString: DIDURL | string | null = null): DIDURL {
		checkArgument(didUrlOrString != null, "Invalid url");

		if (typeof baseRef === "string")
			baseRef = DID.valueOf(baseRef);

		let didUrl = new DIDURL();
		if (typeof didUrlOrString === "string") {
			checkArgument(didUrlOrString !== "", "Invalid url");

			// Compatible with v1, support fragment without leading '#'
			if (!didUrlOrString.startsWith("did:")) {
				/* JAVA: let noSep = true;
				char[] chars = didUrlOrString.toCharArray();
				for (char ch : chars) {
					if (DIDURL.SEPS.indexOf(ch) >= 0) {
						noSep = false;
						break;
					}
				}*/

				let url: string = didUrlOrString;
				let noSep = !DIDURL.SEPS.some(c => url.includes(c));

				if (noSep) // fragment only
					didUrlOrString = "#" + didUrlOrString;
			}

			try {
				ParserHelper.parse(didUrlOrString, false, new DIDURL.Listener(didUrl));

				if (didUrl.parameters == null || didUrl.parameters.size == 0)
					didUrl.parameters = new Map();

				if (didUrl.query == null || didUrl.query.size == 0)
					didUrl.query = new Map();

			} catch (e) {
				throw new MalformedDIDURLException(didUrlOrString, e);
			}

			if (didUrl.did == null && baseRef != null)
				didUrl.did = baseRef;
		}
		else {
			// url is a string
			didUrl.did = didUrlOrString.did == null ? baseRef : didUrlOrString.did;
			didUrl.parameters = didUrlOrString.parameters.size == 0 ? new Map() : new Map<String, String>(didUrlOrString.parameters);
			didUrl.path = didUrlOrString.path;
			didUrl.query = didUrlOrString.query.size == 0 ? new Map() : new Map<String, String>(didUrlOrString.query);
			didUrl.fragment = didUrlOrString.fragment;
			return didUrl;
		}
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
	public /*protected*/ setDid(did: DID) {
		this.did = did;
	}

	private mapToString(map: Map<string, string>, sep: string): string {
		let init = true;

		let str: string = "";
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
	public /*protected*/ setMetadata(metadata: AbstractMetadata) {
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
		let output: string = "";
		if (this.did != null && (base == null || !this.did.equals(base)))
			output += this.did;

		if (this.parameters != null && this.parameters.size != 0)
			output += ";" + this.getParametersString();

		if (this.path != null && !this.path.isEmpty())
			output += this.path;

		if (this.query != null && this.query.size != 0)
			output += "?" + this.getQueryString();

		if (this.fragment != null && !this.fragment.isEmpty())
			output += "#" + this.getFragment();

		return output;
	}

	public equals(obj: Object): boolean {
		if (obj == this)
			return true;

		if (obj instanceof DIDURL) {
			let id = obj as DIDURL;
			return this.toString().equals(id.toString());
		}

		if (typeof obj === "string") {
			let url = obj as string;
			return this.toString().equals(url);
		}

		return false;
	}

	public compareTo(id: DIDURL): number {
		checkNotNull(id, "id is null");

		return this.toString().compareTo(id.toString());
	}

	/*private int mapHashCode(Map<String, String> map) {
		int hash = 0;

		for (Map.Entry<String, String> entry : map.entrySet()) {
			hash += entry.getKey().hashCode();
			if (entry.getValue() != null)
				hash += entry.getValue().hashCode();
		}

		return hash;
	}

	@Override
	public int hashCode() {
		int hash = did.hashCode();
		hash += mapHashCode(parameters);
		hash += path == null ? 0 : path.hashCode();
		hash += mapHashCode(query);
		hash += fragment == null ? 0 : fragment.hashCode();

		return hash;
	} */

}

export namespace DIDURL {

	class Serializer extends JsonStringifier<DIDURL> {
/*
		public constructor() {
			super();
		}

		public Serializer() {
			super());
		}

		public Serializer(Class<DIDURL> t) {
			super(t);
		}

		@Override
		public stringify(obj: DIDURL, context?: JsonStringifierContext): string {
			let base: DID = null;
			if (!context.features.serialization.isNormalized())
				base = context.getDid() != null ? context.getDid() : id.getDid();

			gen.writeString(id.toString(base));

		}
		public void serialize(DIDURL id, JsonGenerator gen,
				SerializerProvider provider) throws IOException {
			SerializeContext context = (SerializeContext)provider.getConfig()
					.getAttributes().getAttribute(DIDEntity.CONTEXT_KEY);
			// TODO: checkme
			DID base = null;
			if (!context.isNormalized())
				base = context.getDid() != null ? context.getDid() : id.getDid();

			gen.writeString(id.toString(base));
		}
*/
	}

	class NormalizedSerializer /* extends StdSerializer<DIDURL> */ {
		/* private static final long serialVersionUID = -5560151545310632117L;

		public NormalizedSerializer() {
			this(null);
		}

		public NormalizedSerializer(Class<DIDURL> t) {
			super(t);
		}

		@Override
		public void serialize(DIDURL id, JsonGenerator gen,
				SerializerProvider provider) throws IOException {
			gen.writeString(id.toString());
		} */
	}

	class Deserializer /* extends StdDeserializer<DIDURL> */ {
		/* private static final long serialVersionUID = -3649714336670800081L;

		public Deserializer() {
			this(null);
		}

		public Deserializer(Class<Proof> t) {
			super(t);
		}

		@Override
		public DIDURL deserialize(JsonParser p, DeserializationContext ctxt)
				throws IOException, JsonProcessingException {
			JsonToken token = p.getCurrentToken();
			if (!token.equals(JsonToken.VALUE_STRING))
				throw ctxt.weirdStringException(p.getText(), DIDURL.class, "Invalid DIDURL");

			String url = p.getText().trim();
			return new DIDURL(null, url);
		} */
	}

	export class Listener extends DIDURLBaseListener {
		private name: string;
		private value: string;
		private parent: DIDURL;

		public constructor (parent: DIDURL) {
			super();
			this.parent = parent;
		}

		public exitMethod(ctx: DIDURLParser.MethodContext): void {
			let method: string = ctx.text;
			if (method != DID.METHOD)
				throw new ParentException("Unknown method: " + method);

			this.name = method;
		}

		public exitMethodSpecificString(ctx: DIDURLParser.MethodSpecificStringContext): void {
			this.value = ctx.text;
		}

		public exitDid(ctx: DIDURLParser.DidContext): void {
			this.parent.setDid(new DID(this.name, this.value));
			this.name = null;
			this.value = null;
		}

		public exitParamMethod(ctx: DIDURLParser.ParamMethodContext): void {
			let method: string = ctx.text;
			if (method != DID.METHOD)
				throw new ParentException(
						"Unknown parameter method: " + method);
		}

		public exitParamQName(ctx: DIDURLParser.ParamQNameContext): void  {
			this.name = ctx.text;
		}

		public exitParamValue(ctx: DIDURLParser.ParamValueContext): void {
			this.value = ctx.text;
		}

		public exitParam(ctx: DIDURLParser.ParamContext): void {
			let parameters: Map<string, string>;
			if (!this.parent.getParameters()) {
				parameters = new Map<string, string>();
			} else {
				parameters = this.parent.getParameters();
			}
			parameters.set(this.name, this.value);
			this.parent.setParameters(parameters);
			this.name = null;
			this.value = null;
		}

		public exitPath(ctx: DIDURLParser.PathContext): void {
			this.parent.setPath("/" + ctx.text);
		}

		public exitQueryParamName(ctx: DIDURLParser.QueryParamNameContext): void {
			this.name = ctx.text;
		}

		public exitQueryParamValue(ctx: DIDURLParser.QueryParamValueContext): void  {
			this.value = ctx.text;
		}

		public exitQueryParam(ctx: DIDURLParser.QueryParamContext): void {
			let query: Map<string, string>;
			if (!this.parent.getQuery()) {
				query = new Map<string, string>();
			} else {
				query = this.parent.getQuery();
			}
			query.set(this.name, this.value);

			this.parent.setQuery(query);
			this.name = null;
			this.value = null;
		}

		public exitFrag(ctx: DIDURLParser.FragContext): void {
			this.parent.setFragment(ctx.text);
		}
	}

	export class Builder {
		private url: DIDURL;

		public constructor(didOrDidUrl: DIDURL | DID | string) {
			let didUrl: DIDURL;
			if (didOrDidUrl instanceof DID) {
				didUrl = DIDURL.valueOf(didOrDidUrl);
			}
			else if (didOrDidUrl instanceof DID) {
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
				this.url.setDid(DID.valueOf(didOrString));
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