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

import { JsonCreator } from "jackson-js";
import { DID } from "../did";
import { DIDDocument } from "../diddocument";
import { DIDURL } from "../didurl";
import { InvalidKeyException, MalformedIDChainRequestException, UnknownInternalException } from "../exceptions/exceptions";
import { TransferTicket } from "../transferticket";
import { IDChainRequest, Proof } from "./idchaindrequest";

/**
 * The DID request class.
 */
 @JsonCreator()
export class DIDRequest extends IDChainRequest<DIDRequest> {
	private did: DID;
	private doc: DIDDocument;

	private static newWithOperation(operation: Operation): DIDRequest {
		let didRequest = new DIDRequest();
		didRequest.constructWithOperation(operation);
		return didRequest;
	}

	private static newWithPreviousTxId(operation: Operation, previousTxid: string): DIDRequest {
		let didRequest = new DIDRequest();
		didRequest.constructWithPreviousTxId(operation, previousTxid);
		return didRequest;
	}

	private static newWithTransferTicket(operation: Operation, ticket: TransferTicket): DIDRequest {
		let didRequest = new DIDRequest();
		didRequest.constructWithTransferTicket(operation, ticket);
		return didRequest;
	}

	protected static newWithDIDRequest(request: DIDRequest) {
		let didRequest = new DIDRequest();
		didRequest.constructWithIDChainRequest(request);
		didRequest.did = request.did;
		didRequest.doc = request.doc;
	}

	/**
	 * Constructs the 'create' DID Request.
	 *
	 * @param doc the DID Document be packed into Request
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach.
	 */
	public static create(doc: DIDDocument, signKey: DIDURL, storepass: string): DIDRequest {
		let request = new DIDRequest(Operation.CREATE);
		request.setPayload(doc);
		try {
			request.seal(signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}

	/**
	 * Constructs the 'update' DID Request.
	 *
	 * @param doc the DID Document be packed into Request
	 * @param previousTxid the previous transaction id string
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach.
	 */
	public static update(doc: DIDDocument, previousTxid: string, signKey: DIDURL, storepass: string): DIDRequest {
		let request = new DIDRequest(Operation.UPDATE, previousTxid);
		request.setPayload(doc);
		try {
			request.seal(signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}

	/**
	 * Constructs the 'transfer' DID Request.
	 *
	 * @param doc target DID document
	 * @param ticket the transfer ticket object
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach.
	 */
	public static transfer(doc: DIDDocument, ticket: TransferTicket, signKey: DIDURL, storepass: string): DIDRequest {
		let request = new DIDRequest(Operation.TRANSFER, ticket);
		request.setPayload(doc);
		try {
			request.seal(signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}


	/**
	 * Constructs the 'deactivate' DID Request.
	 *
	 * @param doc the DID Document be packed into Request
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach.
	 */
	public static deactivate(doc: DIDDocument, signKey: DIDURL, storepass: string): DIDRequest {
		let request = new DIDRequest(Operation.DEACTIVATE);
		request.setPayload(doc);
		try {
			request.seal(signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}

	/**
	 * Constructs the 'deactivate' DID Request.
	 *
	 * @param target the DID to be deactivated
	 * @param targetSignKey the target DID's key to sign
	 * @param doc the authorizer's document
	 * @param signKey the key to sign Request
	 * @param storepass the password for DIDStore
	 * @return the IDChainRequest object
	 * @throws DIDStoreException there is no store to attach
	 */
	public static deactivate(target: DIDDocument, targetSignKey: DIDURL, doc: DIDDocument, signKey: DIDURL, storepass: string): DIDRequest {
		let request = new DIDRequest(Operation.DEACTIVATE);
		request.setPayload(target);
		try {
			request.seal(targetSignKey, doc, signKey, storepass);
		} catch (ignore) {
			// MalformedIDChainRequestException
			throw new UnknownInternalException(ignore);
		}

		return request;
	}

	/**
	 * Get previous transaction id string.
	 *
	 * @return the transaction id string
	 */
	public getPreviousTxid(): string {
		return this.getHeader().getPreviousTxid();
	}

	/**
	 * Get transfer ticket object.
	 *
	 * @return the TransferTicket object
	 */
	public getTransferTicket(): TransferTicket {
		return this.getHeader().getTransferTicket();
	}

	/**
	 * Get target DID of DID Request.
	 *
	 * @return the DID object
	 */
	public getDid(): DID {
		return this.did;
	}

	/**
	 * Get DID Document of DID Request.
	 *
	 * @return the DIDDocument object
	 */
	public getDocument(): DIDDocument {
		return this.doc;
	}

	public /*private*/ setPayload(docOrString: DIDDocument | string) {
		if (docOrString instanceof DIDDocument) {
			this.did = this.doc.getSubject();
			this.doc = this.doc;

			if (this.getHeader().getOperation() != Operation.DEACTIVATE) {
				let json = this.doc.toString(true);

				this.setPayload(Base64.encodeToString(json.getBytes(),
						Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));
			} else {
				super.setPayload(this.doc.getSubject().toString());
			}
		}
		else {
			super.setPayload(docOrString);
		}
	}

	public /*protected*/ sanitize() {
		let header = this.getHeader();

		if (header == null)
			throw new MalformedIDChainRequestException("Missing header");

		if (header.getSpecification() == null)
			throw new MalformedIDChainRequestException("Missing specification");

		if (header.getSpecification() !== DIDRequest.DID_SPECIFICATION)
			throw new MalformedIDChainRequestException("Unsupported specification");

		switch (header.getOperation()) {
		case CREATE:
			break;

		case UPDATE:
			if (header.getPreviousTxid() == null || header.getPreviousTxid().isEmpty())
				throw new MalformedIDChainRequestException("Missing previousTxid");
			break;

		case TRANSFER:
			if (header.getTicket() == null || header.getTicket().isEmpty())
				throw new MalformedIDChainRequestException("Missing ticket");
			break;

		case DEACTIVATE:
			break;

		default:
			throw new MalformedIDChainRequestException("Invalid operation " + header.getOperation());
		}

		let payload = this.getPayload();
		if (payload == null || payload === "")
			throw new MalformedIDChainRequestException("Missing payload");

		let proof = this.getProof();
		if (proof == null)
			throw new MalformedIDChainRequestException("Missing proof");

		try {
			if (header.getOperation() != Operation.DEACTIVATE) {
				let json = CryptoJS.enc.Base64.parse(payload).toString();
				this.doc = DIDDocument.parse(json);
				this.did = this.doc.getSubject();
			} else {
				this.did = new DID(payload);
			}
		} catch (e) {
			// DIDException
			throw new MalformedIDChainRequestException("Invalid payload", e);
		}

		proof.qualifyVerificationMethod(did);
	}

	private seal(signKey: DIDURL, storepass: string) {
		if (!this.doc.isAuthenticationKey(signKey))
			throw new InvalidKeyException("Not an authentication key.");

		if (this.getPayload() == null || this.getPayload() === "")
			throw new MalformedIDChainRequestException("Missing payload");

		let signature = this.doc.sign(signKey, storepass, this.getSigningInputs());
		this.setProof(new Proof(signKey, signature));
	}

	private seal(targetSignKey: DIDURL, doc: DIDDocument, signKey: DIDURL, storepass: string) {
		if (!this.doc.isAuthorizationKey(targetSignKey))
			throw new InvalidKeyException("Not an authorization key: " + targetSignKey);

		if (!doc.isAuthenticationKey(signKey))
			throw new InvalidKeyException("Not an authentication key: " + signKey);

		if (this.getPayload() == null || this.getPayload().isEmpty())
			throw new MalformedIDChainRequestException("Missing payload");

		let signature = doc.sign(signKey, storepass, this.getSigningInputs());
		this.setProof(new Proof(targetSignKey, signature));
	}

	protected getSignerDocument(): DIDDocument {
		if (this.doc == null)
			this.doc = this.did.resolve();

		return this.doc;
	}
}
