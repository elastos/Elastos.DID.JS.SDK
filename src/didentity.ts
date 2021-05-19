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
import {
	JsonStringifierTransformerContext,
	JsonParserTransformerContext
} from "jackson-js/dist/@types";
import { Class } from "./class";
import { DID } from "./internals";
import {
	DIDSyntaxException,
	UnknownInternalException,
	InvalidDateFormat
} from "./exceptions/exceptions";
import { JSONObject } from "./json";
import { checkArgument } from "./internals";

/**
 * Base class for all DID objects.
 */
export class DIDEntity<T> { //implements Cloneable<DIDEntity<T>> {

	public static CONTEXT_KEY = "org.elastos.did.context";

	private static NORMALIZED_DEFAULT = true;

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
	 * Get the ObjectMapper for serialization or deserialization.
	 *
	 * @return the ObjectMapper instance.
	 */
	public static getDefaultObjectMapper(): ObjectMapper {
		let mapper = new ObjectMapper();
		mapper.defaultParserContext.features.deserialization.FAIL_ON_UNKNOWN_PROPERTIES = false;
		mapper.defaultStringifierContext.serializers.push({
			type: () => Date,
			order: 0,
			mapper: this.DateSerializer.serialize
		});
		mapper.defaultParserContext.deserializers.push({
			type: () => Date,
			order: 0,
			mapper: this.DateSerializer.deserialize
		});

		return mapper;
	}

	/**
	 * Get the ObjectMapper for serialization.
	 *
	 * @param normalized if normalized output, ignored when the sign is true
	 * @return the ObjectMapper instance
	 */
	protected getObjectMapper(normalized: boolean = undefined): ObjectMapper {
		let mapper = DIDEntity.getDefaultObjectMapper();
		let serializeContext = new DIDEntity.SerializeContext(normalized, mapper, this.getSerializeContextDid());

		mapper.defaultStringifierContext.attributes[DIDEntity.CONTEXT_KEY] = serializeContext;

		return mapper;
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
	public static parse <T extends DIDEntity<T>>(source: JSONObject | string, clazz: Class<T>): T {
		checkArgument(source && source !== "", "Invalid JSON content");
		checkArgument(clazz && clazz !== null, "Invalid result class object");

		let content: string;
		if (typeof source !== "string") {
			content = JSON.stringify(source);
		} else {
			content = source;
		}

		let mapper = DIDEntity.getDefaultObjectMapper();

		try {
			mapper.defaultParserContext.mainCreator = () => [clazz];
			let obj = mapper.parse<T>(content);
			obj.sanitize();
			return obj;
		} catch (e) {
			throw new DIDSyntaxException("Invalid JSON syntax", e);
		}
	}

	/**
	 * Serialize DID object to a JSON string.
	 *
	 * @param normalized whether normalized output
	 * @return the serialized JSON string
	 * @throws DIDSyntaxException if a serialization error occurs
	 */
	public serialize(normalized: boolean = DIDEntity.NORMALIZED_DEFAULT): string {
		try {
			return this.getObjectMapper(normalized).stringify(this);
		} catch (e) {
			// JsonProcessingException
			throw new UnknownInternalException(e);
		}
		return null;
	}


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

		public constructor(normalized: boolean = false, objectMapper: ObjectMapper, did?: DID) {
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
		static serialize(key: string, dateObj: Date, context: JsonStringifierTransformerContext): string {
			return dateObj ? dateObj.toISOString() : null;
		}

		static deserialize(key: string, dateStr: string, context: JsonParserTransformerContext): Date {
			if (dateStr && isNaN(Date.parse(dateStr)))
				throw new InvalidDateFormat(dateStr);
			return dateStr ? new Date(dateStr + (dateStr.slice(dateStr.length - 1) == 'Z' ? '':'Z')) : null;
		}
	}
}