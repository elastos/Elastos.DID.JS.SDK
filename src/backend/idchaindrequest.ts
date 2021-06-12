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

import { JsonClassType, JsonCreator, JsonProperty, JsonFormat,
	JsonFormatShape, JsonInclude, JsonIncludeType, JsonPropertyOrder,
	JsonValue, JsonSetter, JsonSerialize, JsonDeserialize, JsonIgnore
} from "@elastosfoundation/jackson-js";
import type { Class } from "../class";
import { Constants } from "../constants";
import { BASE64, Serializer, DIDBiographyStatus } from "../internals";
import type { DID } from "../internals";
import type { DIDDocument } from "../internals";
import { DIDEntity } from "../internals";
import { DIDURL } from "../internals";
import { IllegalArgumentException } from "../exceptions/exceptions";
import type { JSONObject } from "../json";
import { TransferTicket } from "../internals";
import { checkArgument } from "../internals";
import type { JsonParserTransformerContext, JsonStringifierTransformerContext } from "@elastosfoundation/jackson-js/dist/@types";
import { Deserializer } from "../serializers";

/**
 * The class records the information of IDChain Request.
 */
@JsonPropertyOrder({value: ["header", "payload", "proof"]})
export abstract class IDChainRequest<T> extends DIDEntity<T> {
	/**
	 * The specification string of IDChain DID Request
	 */
	public static DID_SPECIFICATION = "elastos/did/1.0";

	/**
	 * The specification string of IDChain Credential Request
	 */
	public static CREDENTIAL_SPECIFICATION = "elastos/credential/1.0";

	public static HEADER = "header";
	public static PAYLOAD = "payload";
	public static PROOF = "proof";

	public static SPECIFICATION = "specification";
	public static OPERATION = "operation";
	public static PREVIOUS_TXID = "previousTxid";
	public static TICKET = "ticket";

	public static TYPE = "type";
	public static VERIFICATION_METHOD = "verificationMethod";
	public static SIGNATURE = "signature";

	protected header: IDChainRequest.Header;
	protected payload: string;
	protected proof: IDChainRequest.Proof;

	protected IDChainRequest() {}

	// Called by inheriting constructors
	protected constructWithOperation(operation: IDChainRequest.Operation) {
		this.header = IDChainRequest.Header.newWithPreviousTxId(operation, null);
	}

	protected constructWithPreviousTxId(operation: IDChainRequest.Operation, previousTxid: string) {
		this.header = IDChainRequest.Header.newWithPreviousTxId(operation, previousTxid);
	}

	protected constructWithTransferTicket(operation: IDChainRequest.Operation, ticket: TransferTicket) {
		this.header = IDChainRequest.Header.newWithTransferTicket(operation, ticket);
	}

	protected constructWithIDChainRequest(request: IDChainRequest<unknown>) {
		this.header = request.header;
		this.payload = request.payload;
		this.proof = request.proof;
	}

	protected getHeader(): IDChainRequest.Header {
		return this.header;
	}

	/**
	 * Get operation string.
	 * @return the operation string
	 */
	public getOperation(): IDChainRequest.Operation {
		return this.header.getOperation();
	}

	/**
	 * Get payload of IDChain Request.
	 *
	 * @return the payload string
	 */
	public getPayload(): string {
		return this.payload;
	}

	protected setPayload(payload: string) {
		this.payload = payload;
	}

	/**
	 * Get the proof object of the IDChainRequest.
	 *
	 * @return the proof object
	 */
	public getProof(): IDChainRequest.Proof {
		return this.proof;
	}

	protected setProof(proof: IDChainRequest.Proof) {
		this.proof = proof;
	}

	protected getSigningInputs(): Buffer[] {
		let prevtxid = this.getOperation().equals(IDChainRequest.Operation.UPDATE) ? this.header.getPreviousTxid() : "";
		let ticket = this.getOperation().equals(IDChainRequest.Operation.TRANSFER) ? this.header.getTicket() : "";

		let inputs: Buffer[] = [
			Buffer.from(this.header.getSpecification()),
			Buffer.from(this.header.getOperation().toString()),
			Buffer.from(prevtxid),
			Buffer.from(ticket),
			Buffer.from(this.payload)
		];

		return inputs;
	}

	protected abstract getSignerDocument(): Promise<DIDDocument>;

	public async sanitize(): Promise<void> {
	}

	/**
	 * Judge whether the IDChain Request is valid or not.
	 *
	 * @return the returned value is true if IDChain Request is valid;
	 *         the returned value is false if IDChain Request is not valid.
	 * @throws DIDTransactionException there is no invalid key.
	 * @throws
	 */
	public async isValid(): Promise<boolean> {
		let signKey = this.proof.getVerificationMethod();

		let doc = await this.getSignerDocument();
		if (doc == null)
			return false;

		if (!doc.isValid())
			return false;

		if (!this.getOperation().equals(IDChainRequest.Operation.DEACTIVATE)) {
			if (!doc.isAuthenticationKey(signKey))
				return false;
		} else {
			if (!doc.isAuthenticationKey(signKey) && !doc.isAuthorizationKey(signKey))
				return false;
		}

		return doc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), ...this.getSigningInputs());
	}

	public static parse<T extends DIDEntity<unknown>>(content: JSONObject, clazz: Class<T>): Promise<T> {
		return DIDEntity.parse(content, clazz);
	}
}

export namespace IDChainRequest {
	class OperationSerializer extends Serializer {
		public static serialize(value: Operation, context: JsonStringifierTransformerContext): string {
			return value ? String(value) : null;
		}
	}
	class OperationDeserializer extends Deserializer {
		public static deserialize(value: string | number, context: JsonParserTransformerContext): Operation {
			return Operation.fromString(String(value));
		}
	}

	/**
	 * The IDChain Request Operation
	 */
	 @JsonSerialize({using: OperationSerializer.serialize})
	 @JsonDeserialize({using: OperationDeserializer.deserialize})
	 export class Operation {
		constructor(private name: string, private specification: string) {}

		public getSpecification(): string {
			return this.specification;
		}

		@JsonValue()
		public toString(): string {
			return this.name;
		}

		@JsonCreator()
		public static fromString(name: string): Operation {
			return Operation[name.toUpperCase()];
		}

		public equals(operation: Operation): boolean {
			return this.name === operation.name;
		}
	}

	export namespace Operation {
	    /**
		 * Create a new DID
		 */
			export const CREATE = new Operation("create", IDChainRequest.DID_SPECIFICATION)
			 /**
			  * Update an exist DID
			  */
			export const UPDATE = new Operation("update", IDChainRequest.DID_SPECIFICATION);
			 /**
			  * Transfer the DID' ownership
			  */
			export const TRANSFER = new Operation("transfer", IDChainRequest.DID_SPECIFICATION);
			 /**
			  * Deactivate a DID
			  */
			export const DEACTIVATE = new Operation("deactivate", IDChainRequest.DID_SPECIFICATION);
			 /**
			  * Declare a credential
			  */
			export const DECLARE = new Operation("declare", IDChainRequest.CREDENTIAL_SPECIFICATION);
			 /**
			  * Revoke a credential
			  */
			export const REVOKE = new Operation("revoke", IDChainRequest.CREDENTIAL_SPECIFICATION);
	}

	@JsonPropertyOrder({value: [
		"specification",
		"operation",
		"previousTxid",
		"ticket"
	]})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	@JsonCreator()
	export class Header {
		@JsonProperty({value: IDChainRequest.SPECIFICATION})
		@JsonClassType({type: () => [String]})
		private specification: string;
		@JsonProperty({value: IDChainRequest.OPERATION})
		@JsonClassType({type: () => [Operation]})
		private operation: Operation;
		@JsonProperty({value: IDChainRequest.PREVIOUS_TXID})
		@JsonInclude({value: JsonIncludeType.NON_NULL})
		@JsonClassType({type: () => [String]})
		private previousTxid: string;
		@JsonProperty({value: IDChainRequest.TICKET})
		@JsonInclude({value: JsonIncludeType.NON_NULL})
		@JsonClassType({type: () => [String]})
		private ticket: string;

		@JsonIgnore()
		private transferTicket: TransferTicket;

		constructor(@JsonProperty({value: IDChainRequest.SPECIFICATION, required: true}) spec: string) {
			this.specification = spec;
		}

		static newWithPreviousTxId(operation: Operation, previousTxid: string) {
			let header = new Header(operation.getSpecification());
			header.operation = operation;
			header.previousTxid = previousTxid;
			return header;
		}

		static newWithTransferTicket(operation: Operation, ticket: TransferTicket) {
			checkArgument(ticket != null, "Invalid ticket");

			let header = new Header(operation.getSpecification());
			header.operation = operation;

			let json = ticket.toString(true);
			header.ticket = BASE64.fromString(json);
			header.transferTicket = ticket;

			return header;
		}

		public getSpecification(): string {
			return this.specification;
		}

		public getOperation(): Operation {
			return this.operation;
		}

		public getPreviousTxid(): string {
			return this.previousTxid;
		}

		public getTicket(): string {
			return this.ticket;
		}

		@JsonSetter({value: IDChainRequest.TICKET})
		private setTicket(ticket: string) {
			checkArgument(ticket != null && ticket !== "", "Invalid ticket");
			this.ticket = ticket;
		}

		public async getTransferTicket(): Promise<TransferTicket> {
			if (this.ticket && !this.transferTicket) {
				let json = BASE64.toString(this.ticket)
				try {
					this.transferTicket = await TransferTicket.parseContent(json);
				} catch (e) {
					// MalformedTransferTicketException
					throw new IllegalArgumentException("Invalid ticket", e);
				}
			}

			return this.transferTicket;
		}
	}

	@JsonPropertyOrder({value:["type", "verificationMethod", "signature"]})
	export class Proof {
		@JsonProperty({value: IDChainRequest.TYPE})
		@JsonClassType({type: () => [String]})
		private type: string;
		@JsonProperty({value: IDChainRequest.VERIFICATION_METHOD})
		@JsonClassType({type: () => [DIDURL]})
		private verificationMethod: DIDURL;
		@JsonProperty({value: IDChainRequest.SIGNATURE})
		@JsonClassType({type: () => [String]})
		private signature: string;

		// Java: @JsonCreator()
		public constructor(
				@JsonProperty({value: IDChainRequest.VERIFICATION_METHOD, required: true}) verificationMethod: DIDURL,
				@JsonProperty({value: IDChainRequest.SIGNATURE, required: true}) signature: string,
				@JsonProperty({value: IDChainRequest.TYPE}) type: string = null
		) {
			this.type = type != null ? type : Constants.DEFAULT_PUBLICKEY_TYPE;
			this.verificationMethod = verificationMethod;
			this.signature = signature;
		}

		public getType(): string {
			return this.type;
		}

		public getVerificationMethod(): DIDURL {
			return this.verificationMethod;
		}

		public qualifyVerificationMethod(ref: DID) {
			// TODO: need improve the impl
			if (this.verificationMethod.getDid() == null)
				this.verificationMethod = DIDURL.from(this.verificationMethod, ref);
		}

		public getSignature(): string {
			return this.signature;
		}
	}
}