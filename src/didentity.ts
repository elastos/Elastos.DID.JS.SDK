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

import { ObjectMapper } from "jackson-js";
import { ClassType, JsonStringifierTransformerContext } from "jackson-js/dist/@types";
import { Class } from "./class";
import { Cloneable } from "./cloneable";
import { DID } from "./did";
import { DIDDocument } from "./diddocument";
import { DIDSyntaxException, UnknownInternalException, InvalidDateFormat } from "./exceptions/exceptions";
import { JSONObject } from "./json";
import { checkArgument } from "./utils";

/**
 * Base class for all DID objects.
 */
export class DIDEntity<T> { //implements Cloneable<DIDEntity<T>> {

	public static CONTEXT_KEY = "org.elastos.did.context";

	private static NORMALIZED_DEFAULT = true;

	//protected static SimpleDateFormat dateFormat = new SimpleDateFormat(Constants.DATE_FORMAT);

	//protected static SimpleDateFormat isoDateFormat = new SimpleDateFormat(Constants.DATE_FORMAT_ISO_8601);


	/* static {
		dateFormat.setTimeZone(Constants.UTC);
		isoDateFormat.setTimeZone(Constants.UTC);
	} */

	/**
	 * Get current object's DID context.
	 *
	 * @return the DID object or null
	 */
	protected getSerializeContextDid(): DID | null {
		return null;
	}

	/**
	 * Post sanitize routine after deserialization.
	 *
	 * @throws DIDSyntaxException if the DID object is invalid
	 */
	protected sanitize() {}

	// TODO: CHECK THIS! NOT SURE THIS REALLY CLONES INHERITING CLASSES (FIELDS, METHODS) WELL
	public clone(): DIDEntity<T> {
		const clone = Object.assign({}, this);
		Object.setPrototypeOf(clone, Object.getPrototypeOf(this) );
		return clone;
	}

	/**
	 * Get the ObjectMapper for serialization.
	 *
	 * @param normalized if normalized output, ignored when the sign is true
	 * @return the ObjectMapper instance
	 */
	public static getObjectMapper(normalized: boolean = undefined): ObjectMapper {
		/* TODO FROM JAVA let jsonFactory = new JsonFactory();
		jsonFactory.configure(JsonGenerator.Feature.AUTO_CLOSE_TARGET, false);
		jsonFactory.configure(JsonParser.Feature.AUTO_CLOSE_SOURCE, false);*/

		let mapper = new ObjectMapper();

		/* TODO FROM JAVA mapper.disable(MapperFeature.AUTO_DETECT_CREATORS,
				MapperFeature.AUTO_DETECT_FIELDS,
				MapperFeature.AUTO_DETECT_GETTERS,
				MapperFeature.AUTO_DETECT_SETTERS,
				MapperFeature.AUTO_DETECT_IS_GETTERS);*/

		// Make the ObjectMapper handle the datetime string correctly
		// TODO FROM JAVA mapper.setDateFormat(dateFormat);

		/* TODO FROM JAVA
		NOT SURE IF WE CAN ADD A GLOBAL DESERIALIZER WITH JACKSON JS. THOUGH WE CAN USE
		@JsonSerialize({using: a-method}) on json property fields, for custom handling (Dates...)
		let didModule = new SimpleModule();
		didModule.addDeserializer(Date.class, new DateDeserializer());
		mapper.registerModule(didModule);*/

		mapper.defaultParserContext.features.deserialization.FAIL_ON_UNKNOWN_PROPERTIES = false;

        if (normalized !== undefined) {
            // TODO FROM JAVAmapper.setConfig(mapper.getSerializationConfig().withAttribute(CONTEXT_KEY,new SerializeContext(normalized, this.getSerializeContextDid())));

            /* TODO FROM JAVA
			NOTE: This could be complex here: java uses a method to filter stuff, but jackson-js seems to allow only static filtering.

			let filters = new SimpleFilterProvider();
            filters.addFilter("publicKeyFilter", DIDDocument.PublicKey.getFilter());
            filters.addFilter("didDocumentProofFilter", DIDDocument.Proof.getFilter());
            filters.addFilter("credentialFilter", VerifiableCredential.getFilter());
            filters.addFilter("credentialProofFilter", VerifiableCredential.Proof.getFilter());
            mapper.setFilterProvider(filters);
			*/
        }

		return mapper;
	}

	/**
	 * Generic method to parse a DID object from a JSON node
	 * representation into given DIDObject type.
	 *
	 * @param <T> the generic DID object type
	 * @param content the JSON node for building the object
	 * @param clazz the class object for DID object
	 * @return the parsed DID object
	 * @throws DIDSyntaxException if a parse error occurs
	 */
	public /* protected */ static parseFromJSON<T extends DIDEntity<any>>(content: JSONObject, clazz: ClassType<T>): T {
		return;
		/*
		let mapper = this.getObjectMapper();

		try {
			let o: T = mapper.treeToValue(content, clazz);
			o.sanitize();
			return o;
		} catch (e) {
            //  JsonProcessingException
			throw DIDSyntaxException.instantiateFor(clazz, e.getMessage(), e);
		}
		*/
	}

	/**
	 * Generic method to parse a DID object from a string JSON
	 * representation into given DIDObject type.
	 *
	 * @param <T> the generic DID object type
	 * @param content the string JSON content for building the object
	 * @param clazz the class object for DID object
	 * @return the parsed DID object
	 * @throws DIDSyntaxException if a parse error occurs
	 */
	public static parseFromString<T extends DIDEntity<any>>(content: string, clazz: Class<T>): T {
		checkArgument(content != null && content !== "", "Invalid JSON content");
		checkArgument(clazz != null, "Invalid result class object");

		let mapper = this.getObjectMapper();

		try {
			let o: T = mapper.readValue(content, clazz);
			o.sanitize();
			return o;
		} catch (e) {
			// JsonProcessingException
			// TODO FROM JAVA throw DIDSyntaxException.instantiateFor(clazz, e.getMessage(), e);
			throw new DIDSyntaxException(e);
		}
	}
	/**
	 * Generic method to parse a DID object from a Reader object
	 * into given DIDObject type.
	 *
	 * @param <T> the generic DID object type
	 * @param src Reader object used to read JSON content for building the object
	 * @param clazz the class object for DID object
	 * @return the parsed DID object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	/*
	public static<T extends DIDEntity<?>> T parseFromReader(Reader src, Class<T> clazz) {
		checkArgument(src != null, "Invalid src reader");
		checkArgument(clazz != null, "Invalid result class object");

		ObjectMapper mapper = getObjectMapper();

		try {
			T o = mapper.readValue(src, clazz);
			o.sanitize();
			return o;
		} catch (JsonParseException | JsonMappingException e) {
			throw DIDSyntaxException.instantiateFor(clazz, e.getMessage(), e);
		}
	}
*/
	/**
	 * Generic method to parse a DID object from a InputStream object
	 * into given DIDObject type.
	 *
	 * @param <T> the generic DID object type
	 * @param src InputStream object used to read JSON content for building the object
	 * @param clazz the class object for DID object
	 * @return the parsed DID object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public static<T extends DIDEntity<?>> T parse(InputStream src, Class<T> clazz)
			throws DIDSyntaxException, IOException {
		checkArgument(src != null, "Invalid src input stream");
		checkArgument(clazz != null, "Invalid result class object");

		ObjectMapper mapper = getObjectMapper();

		try {
			T o = mapper.readValue(src, clazz);
			o.sanitize();
			return o;
		} catch (JsonParseException | JsonMappingException e) {
			throw DIDSyntaxException.instantiateFor(clazz, e.getMessage(), e);
		}
	} */

	/**
	 * Generic method to parse a DID object from a File object
	 * into given DIDObject type.
	 *
	 * @param <T> the generic DID object type
	 * @param src File object used to read JSON content for building the object
	 * @param clazz the class object for DID object
	 * @return the parsed DID object
	 * @throws DIDSyntaxException if a parse error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public static<T extends DIDEntity<?>> T parse(File src, Class<T> clazz)
			throws DIDSyntaxException, IOException {
		checkArgument(src != null, "Invalid src file");
		checkArgument(clazz != null, "Invalid result class object");

		ObjectMapper mapper = getObjectMapper();

		try {
			T o = mapper.readValue(src, clazz);
			o.sanitize();
			return o;
		} catch (JsonParseException | JsonMappingException e) {
			throw DIDSyntaxException.instantiateFor(clazz, e.getMessage(), e);
		}
	} */

	/**
	 * Serialize DID object to a JSON string.
	 *
	 * @param normalized whether normalized output
	 * @return the serialized JSON string
	 * @throws DIDSyntaxException if a serialization error occurs
	 */
	public serialize(normalized: boolean = DIDEntity.NORMALIZED_DEFAULT): string {
		try {
			return DIDEntity.getObjectMapper(normalized).stringify(this);
		} catch (e) {
			// JsonProcessingException
			throw new UnknownInternalException(e);
		}
		return null;
	}

	/**
	 * Serialize DID object to a Writer.
	 *
	 * @param out the output writer object
	 * @param normalized whether normalized output
	 * @throws DIDSyntaxException  if a serialization error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public void serialize(Writer out, boolean normalized) throws IOException {
		checkArgument(out != null, "Invalid out writer");

		try {
			getObjectMapper(normalized).writeValue(out, this);
		} catch (JsonGenerationException | JsonMappingException e) {
			throw new UnknownInternalException(e);
		}
	} */

	/**
	 * Serialize DID object to a Writer.
	 *
	 * @param out the output writer object
	 * @throws DIDSyntaxException  if a serialization error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public void serialize(Writer out) throws IOException {
		serialize(out, NORMALIZED_DEFAULT);
	} */

	/**
	 * Serialize DID object to an OutputStream.
	 *
	 * @param out the output stream object
	 * @param normalized whether normalized output
	 * @throws DIDSyntaxException  if a serialization error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public void serialize(OutputStream out, boolean normalized) throws IOException {
		checkArgument(out != null, "Invalid out stream");

		try {
			getObjectMapper(normalized).writeValue(out, this);
		} catch (JsonGenerationException | JsonMappingException e) {
			throw new UnknownInternalException(e);
		}
	} */

	/**
	 * Serialize DID object to an OutputStream.
	 *
	 * @param out the output stream object
	 * @throws DIDSyntaxException  if a serialization error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public void serialize(OutputStream out) throws IOException {
		serialize(out, NORMALIZED_DEFAULT);
	} */

	/**
	 * Serialize DID object to a file.
	 *
	 * @param out the output file object
	 * @param normalized whether normalized output
	 * @throws DIDSyntaxException  if a serialization error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public void serialize(File out, boolean normalized) throws IOException {
		checkArgument(out != null, "Invalid out file");

		try {
			getObjectMapper(normalized).writeValue(out, this);
		} catch (JsonGenerationException | JsonMappingException e) {
			throw new UnknownInternalException(e);
		}
	} */

	/**
	 * Serialize DID object to a file.
	 *
	 * @param out the output file object
	 * @throws DIDSyntaxException  if a serialization error occurs
	 * @throws IOException if an IO error occurs
	 */
	/* public void serialize(File out) throws IOException {
		serialize(out, NORMALIZED_DEFAULT);
	} */

	/**
	 * Get the JSON string representation of the object.
	 *
	 * @param normalized whether normalized output
	 * @return a JSON string representation of the object
	 */
	public toString(normalized: boolean = DIDEntity.NORMALIZED_DEFAULT): string {
		return this.serialize(normalized);
	}
}

export namespace DIDEntity {

	export class SerializeContext {
		private normalized: boolean;
		private did: DID;
		private objectMapper: ObjectMapper;

		protected constructor(normalized: boolean = false, objectMapper: ObjectMapper, did?: DID) {
			this.normalized = normalized;
			this.did = did;
			this.objectMapper = objectMapper;
		}

		public isNormalized(): boolean {
			return this.normalized;
		}

		public setNormalized(normalized: boolean): SerializeContext {
			this.normalized = normalized;
			return this;
		}

		public getObjectMapper() {
			return this.objectMapper;
		}

		public getDid(): DID  {
			return this.did;
		}

		public setDid(did: DID): void {
			this.did = did;
		}
	}

	export class DateSerializer {
		static serialize(dateObj: Date, context: JsonStringifierTransformerContext): string {
			return dateObj ? dateObj.toISOString() : "";
		}

		static deserialize(dateStr: string, context: JsonStringifierTransformerContext): Date {
			if (dateStr && isNaN(Date.parse(dateStr)))
				throw new InvalidDateFormat(dateStr);
			return dateStr ? new Date(dateStr + (dateStr.slice(dateStr.length - 1) == 'Z' ? '':'Z')) : null;
		}
	}
}