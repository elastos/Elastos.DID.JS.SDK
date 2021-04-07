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

import { JsonClassType, JsonCreator, JsonProperty, JsonFormat, JsonFormatShape, JsonInclude, JsonIncludeType, JsonPropertyOrder, JsonValue, JsonSetter } from "jackson-js";
import { Class } from "../class";
import { Constants } from "../constants";
import { DID } from "../did";
import { DIDDocument } from "../diddocument";
import { DIDEntity } from "../didentity";
import { DIDURL } from "../didurl";
import { IllegalArgumentException } from "../exceptions/exceptions";
import { TransferTicket } from "../transferticket";
import { checkArgument } from "../utils";

/**
 * The class records the information of IDChain Request.
 */
@JsonPropertyOrder({value: [
	IDChainRequest.HEADER,
	IDChainRequest.PAYLOAD,
	IDChainRequest.PROOF
]})
export abstract class IDChainRequest<T> extends DIDEntity<T> {
	/**
	 * The specification string of IDChain DID Request
	 */
	public static DID_SPECIFICATION = "elastos/did/1.0";

	/**
	 * The specification string of IDChain Credential Request
	 */
	public static CREDENTIAL_SPECIFICATION = "elastos/credential/1.0";

	public /*protected*/ static HEADER = "header";
	public /*protected*/ static PAYLOAD = "payload";
	public /*protected*/ static PROOF = "proof";

	public /*protected*/ static SPECIFICATION = "specification";
	public /*private*/ static OPERATION = "operation";
	public /*private*/ static PREVIOUS_TXID = "previousTxid";
	public /*private*/ static TICKET = "ticket";

	public /*private*/ static TYPE = "type";
	public /*private*/ static VERIFICATION_METHOD = "verificationMethod";
	public /*private*/ static SIGNATURE = "signature";

	@JsonProperty({value: IDChainRequest.HEADER})
	private header: Header;
	@JsonProperty({value: IDChainRequest.PAYLOAD})
	private payload: string;
	@JsonProperty({value: IDChainRequest.PROOF})
	private proof: Proof;

	protected IDChainRequest() {}

	protected constructor(operation: Operation) {
		this.header = new Header(operation);
	}

	protected constructor(operation: Operation, previousTxid: string) {
		this.header = new Header(operation, previousTxid);
	}

	protected constructor(operation: Operation, ticket: TransferTicket) {
		this.header = new Header(operation, ticket);
	}

	protected constructor(request: IDChainRequest<?>) {
		this.header = request.header;
		this.payload = request.payload;
		this.proof = request.proof;
	}

	protected getHeader(): Header {
		return this.header;
	}

	/**
	 * Get operation string.
	 * @return the operation string
	 */
	public getOperation(): Operation {
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
	public getProof(): Proof {
		return this.proof;
	}

	protected setProof(proof: Proof) {
		this.proof = proof;
	}

	protected getSigningInputs(): string[] {
		let prevtxid = this.getOperation() == Operation.UPDATE ? this.header.getPreviousTxid() : "";
		let ticket = this.getOperation() == Operation.TRANSFER ? this.header.getTicket() : "";

		let inputs: string[] = [
			this.header.getSpecification(), // .getBytes(),
			this.header.getOperation().toString(), // .getBytes(),
			prevtxid, //.getBytes(),
			ticket, //.getBytes(),
			this.payload //.getBytes()
		];

		return inputs;
	}

	protected abstract getSignerDocument(): DIDDocument;

	protected sanitize() {
	}

	/**
	 * Judge whether the IDChain Request is valid or not.
	 *
	 * @return the returned value is true if IDChain Request is valid;
	 *         the returned value is false if IDChain Request is not valid.
	 * @throws DIDTransactionException there is no invalid key.
	 * @throws
	 */
	public isValid(): boolean {
		let signKey = this.proof.getVerificationMethod();

		let doc = this.getSignerDocument();
		if (doc == null)
			return false;

		if (!doc.isValid())
			return false;

		if (this.getOperation() != Operation.DEACTIVATE) {
			if (!doc.isAuthenticationKey(signKey))
				return false;
		} else {
			if (!doc.isAuthenticationKey(signKey) && !doc.isAuthorizationKey(signKey))
				return false;
		}

		return doc.verify(this.proof.getVerificationMethod(), this.proof.getSignature(), getSigningInputs());
	}

	protected static parse<T extends DIDEntity<?>>(content: JsonNode, clazz: Class<T>): T {
		return DIDEntity.parse(content, clazz);
	}
}

@JsonPropertyOrder({value: [
	IDChainRequest.SPECIFICATION,
	IDChainRequest.OPERATION,
	IDChainRequest.PREVIOUS_TXID,
	IDChainRequest.TICKET
]})
@JsonInclude({value: JsonIncludeType.NON_NULL})
protected static class Header {
	@JsonProperty({value: IDChainRequest.SPECIFICATION})
	private specification: string;
	@JsonProperty({value: IDChainRequest.OPERATION})
	private operation: Operation;
	@JsonProperty({value: IDChainRequest.PREVIOUS_TXID})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private previousTxid: string;
	@JsonProperty({value: IDChainRequest.TICKET})
	@JsonInclude({value: JsonIncludeType.NON_NULL})
	private ticket: string;
	private transferTicket: TransferTicket;

	@JsonCreator()
	private constructor(@JsonProperty(value = SPECIFICATION, required = true) String spec) {
		this.specification = spec;
	}

	private constructor(Operation operation, String previousTxid) {
		this(operation.getSpecification());
		this.operation = operation;
		this.previousTxid = previousTxid;
	}

	private constructor(Operation operation, TransferTicket ticket) {
		this(operation.getSpecification());
		this.operation = operation;

		String json = ticket.toString(true);
		this.ticket = Base64.encodeToString(json.getBytes(),
				Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
		this.transferTicket = ticket;
	}

	private constructor(Operation operation) {
		this(operation.getSpecification());
		this.operation = operation;
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

		let json = CryptoJS.enc.Base64.parse(ticket).toString();
		try {
			this.transferTicket = TransferTicket.parse(json);
		} catch (e) {
			// MalformedTransferTicketException
			throw new IllegalArgumentException("Invalid ticket", e);
		}

		this.ticket = ticket;
	}

	public getTransferTicket(): TransferTicket {
		return this.transferTicket;
	}
}

@JsonPropertyOrder({value:[
	IDChainRequest.TYPE,
	IDChainRequest.VERIFICATION_METHOD,
	IDChainRequest.SIGNATURE
]})
export class Proof {
	@JsonProperty({value: IDChainRequest.TYPE})
	private type: string;
	@JsonProperty({value: IDChainRequest.VERIFICATION_METHOD})
	private verificationMethod: DIDURL;
	@JsonProperty({value: IDChainRequest.SIGNATURE})
	private signature: string;

	@JsonCreator()
	private constructor(
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

	public /*protected*/ qualifyVerificationMethod(ref: DID) {
		// TODO: need improve the impl
		if (this.verificationMethod.getDid() == null)
			this.verificationMethod = new DIDURL(ref, this.verificationMethod);
	}

	public getSignature(): string {
		return this.signature;
	}
}

/**
 * The IDChain Request Operation
 * TODO: DOESNT WORK
 */
class Operation {
	/**
	 * Create a new DID
	 */
	public static CREATE = new Operation(IDChainRequest.DID_SPECIFICATION);
	/**
	 * Update an exist DID
	 */
	public static UPDATE = new Operation(IDChainRequest.DID_SPECIFICATION);
	/**
	 * Transfer the DID' ownership
	 */
	public static TRANSFER = new Operation(IDChainRequest.DID_SPECIFICATION);
	/**
	 * Deactivate a DID
	 */
	public static DEACTIVATE = new Operation(IDChainRequest.DID_SPECIFICATION);
	/**
	 * Declare a credential
	 */
	public static DECLARE = new Operation(IDChainRequest.CREDENTIAL_SPECIFICATION);
	/**
	 * Revoke a credential
	 */
	public static REVOKE = new Operation(IDChainRequest.CREDENTIAL_SPECIFICATION);

	private constructor(private specification: string) {}

	public getSpecification(): string {
		return this.specification;
	}

	@JsonValue()
	public toString(): string {
		return name().toLowerCase();
	}

	@JsonCreator()
	public static fromString(name: string): Operation {
		return valueOf(name.toUpperCase());
	}
}